export const TERRAIN_VERTEX = `#version 300 es
in vec2 aCorner;
uniform vec4 uView; // x, y, largeur, hauteur de la vue, en unités du monde
out vec2 vWorld;

void main() {
  vec2 uv = aCorner * 0.5 + 0.5;
  vWorld = uView.xy + vec2(uv.x, 1.0 - uv.y) * uView.zw;
  gl_Position = vec4(aCorner, 0.0, 1.0);
}
`;

export const TERRAIN_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision mediump sampler2DArray;

in vec2 vWorld;
out vec4 outColor;

uniform sampler2DArray uColors;
uniform sampler2DArray uNormals;
uniform sampler2D uCells;    // r : couche du biome de chaque case (0-255)
uniform sampler2D uOverlay;  // calque de données par case, transparent si inactif
uniform vec2 uGrid;
uniform float uCellSize;
uniform float uTime;
uniform vec2 uSelectedCell;  // -1 si aucune

const int WATER_FRESH = 7;
const int WATER_OCEAN = 8;
const float TEXTURE_WORLD_SIZE = 7.0;
const vec3 SUN = normalize(vec3(-0.45, -0.55, 0.70));

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amplitude * valueNoise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    amplitude *= 0.5;
  }
  return sum;
}

int cellLayer(ivec2 cell) {
  ivec2 clamped = clamp(cell, ivec2(0), ivec2(uGrid) - 1);
  return int(texelFetch(uCells, clamped, 0).r * 255.0 + 0.5);
}

// Deux échelles mélangées : cache la répétition de la texture quand on dézoome.
void sampleGround(int layer, vec2 p, vec2 dx, vec2 dy, out vec3 albedo, out vec3 normal) {
  vec2 uvA = p / TEXTURE_WORLD_SIZE;
  vec2 uvB = p / (TEXTURE_WORLD_SIZE * 3.7) + 0.37;
  vec2 dxA = dx / TEXTURE_WORLD_SIZE, dyA = dy / TEXTURE_WORLD_SIZE;
  vec2 dxB = dx / (TEXTURE_WORLD_SIZE * 3.7), dyB = dy / (TEXTURE_WORLD_SIZE * 3.7);
  vec3 a = textureGrad(uColors, vec3(uvA, float(layer)), dxA, dyA).rgb;
  vec3 b = textureGrad(uColors, vec3(uvB, float(layer)), dxB, dyB).rgb;
  albedo = mix(a, b, 0.45);
  vec3 na = textureGrad(uNormals, vec3(uvA, float(layer)), dxA, dyA).xyz * 2.0 - 1.0;
  vec3 nb = textureGrad(uNormals, vec3(uvB, float(layer)), dxB, dyB).xyz * 2.0 - 1.0;
  normal = normalize(vec3((na.xy + nb.xy) * 0.9, na.z * nb.z));
}

vec3 waterColor(int layer, vec2 p, float shoreDistance, out float specular) {
  float t = uTime * 0.35;
  vec2 q = p * 0.9;
  vec2 drift = vec2(t, t * 0.6);
  float h = fbm(q + drift) + 0.5 * fbm(q * 2.7 - drift * 1.4);
  float hx = fbm(q + vec2(0.2, 0.0) + drift) + 0.5 * fbm((q + vec2(0.2, 0.0)) * 2.7 - drift * 1.4);
  float hy = fbm(q + vec2(0.0, 0.2) + drift) + 0.5 * fbm((q + vec2(0.0, 0.2)) * 2.7 - drift * 1.4);
  vec3 n = normalize(vec3((h - hx) * 2.4, (h - hy) * 2.4, 1.0));

  vec3 deep = layer == WATER_OCEAN ? vec3(0.035, 0.16, 0.30) : vec3(0.07, 0.27, 0.36);
  vec3 shallow = layer == WATER_OCEAN ? vec3(0.09, 0.42, 0.50) : vec3(0.20, 0.47, 0.46);
  vec3 color = mix(shallow, deep, smoothstep(0.0, 1.0, shoreDistance));
  color *= 0.84 + 0.24 * h;
  color += vec3(0.05, 0.09, 0.11) * max(dot(n, SUN) - 0.55, 0.0);

  vec3 halfVector = normalize(SUN + vec3(0.0, 0.0, 1.0));
  specular = pow(max(dot(n, halfVector), 0.0), 160.0) * 0.16;
  return color;
}

void main() {
  vec2 p = vWorld;
  vec2 worldSize = uGrid * uCellSize;
  if (p.x < 0.0 || p.y < 0.0 || p.x >= worldSize.x || p.y >= worldSize.y) {
    outColor = vec4(0.098, 0.102, 0.098, 1.0);
    return;
  }

  vec2 dx = dFdx(p);
  vec2 dy = dFdy(p);

  // Frontières organiques : les cases restent les cases du moteur, mais leur bord
  // ondule et se mélange au lieu de former une grille de carrés.
  vec2 warp = (vec2(fbm(p * 0.045), fbm(p * 0.045 + 41.0)) - 0.47) * 1.5;
  warp += vec2(fbm(p * 0.13 + 5.0), fbm(p * 0.13 + 29.0)) - 0.47;
  warp += (vec2(fbm(p * 0.6 + 7.0), fbm(p * 0.6 + 23.0)) - 0.47) * 0.25;
  vec2 g = (p + warp * uCellSize * 0.8) / uCellSize - 0.5;
  ivec2 base = ivec2(floor(g));
  vec2 f = fract(g);
  vec2 grain = (vec2(fbm(p * 0.8 + 3.0), fbm(p * 0.8 + 19.0)) - 0.47) * 0.16;
  vec2 w = smoothstep(vec2(0.0), vec2(1.0), f + grain);

  int layers[4] = int[4](cellLayer(base), cellLayer(base + ivec2(1, 0)), cellLayer(base + ivec2(0, 1)), cellLayer(base + ivec2(1, 1)));
  float weights[4] = float[4]((1.0 - w.x) * (1.0 - w.y), w.x * (1.0 - w.y), (1.0 - w.x) * w.y, w.x * w.y);

  // Champ d'eau continu : son seuil dessine le rivage, jamais les bords des cases.
  float waterField = 0.0;
  int waterLayer = WATER_FRESH;
  for (int i = 0; i < 4; i++) {
    if (layers[i] >= WATER_FRESH) {
      waterField += weights[i];
      if (weights[i] > 0.05) waterLayer = layers[i];
    }
  }

  // Sols : poids accentués pour une transition courte et sans bord net.
  vec3 landAlbedo = vec3(0.0);
  vec3 landNormal = vec3(0.0);
  float landWeight = 0.0;
  for (int i = 0; i < 4; i++) {
    if (layers[i] >= WATER_FRESH || weights[i] < 0.02) continue;
    float weight = pow(weights[i], 5.0);
    if (weight < 0.0005) continue;
    vec3 albedo, normal;
    sampleGround(layers[i], p, dx, dy, albedo, normal);
    landAlbedo += albedo * weight;
    landNormal += normal * weight;
    landWeight += weight;
  }

  float macro = 0.80 + 0.40 * fbm(p * 0.07 + 3.0);
  vec3 color = vec3(0.0);

  if (landWeight > 0.0) {
    landAlbedo /= landWeight;
    vec3 n = normalize(landNormal / landWeight);
    float diffuse = max(dot(n, SUN), 0.0);
    color = landAlbedo * macro * (0.42 + 0.85 * diffuse);
    // Sol humide et sombre près de l'eau.
    color *= 1.0 - 0.42 * smoothstep(0.12, 0.47, waterField);
  }

  if (waterField > 0.0) {
    float edge = max(0.012, fwidth(waterField));
    float mask = smoothstep(0.5 - edge, 0.5 + edge, waterField);
    if (mask > 0.0) {
      float spec;
      float away = smoothstep(0.5, 0.95, waterField) * (0.75 + 0.5 * fbm(p * 0.05 + 11.0));
      vec3 water = waterColor(waterLayer, p, away, spec);
      float wave = 0.54 + 0.018 * sin(uTime * 0.8 + p.x * 0.7 + p.y * 0.5);
      float foam = (1.0 - smoothstep(0.0, 0.035, abs(waterField - wave))) * smoothstep(0.38, 0.62, fbm(p * 2.2 + uTime * 0.1));
      water += vec3(0.62) * foam + vec3(spec);
      color = mix(color, water, mask);
    }
  }

  ivec2 trueCell = ivec2(floor(p / uCellSize));
  vec4 overlay = texture(uOverlay, (g + 0.5) / uGrid);
  color = mix(color, overlay.rgb, overlay.a);

  if (uSelectedCell.x >= 0.0 && ivec2(uSelectedCell) == trueCell) {
    vec2 local = (p / uCellSize) - vec2(trueCell);
    float edge = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
    float width = max(length(dx), length(dy)) * 2.0 / uCellSize;
    if (edge < width) color = vec3(0.90, 0.82, 0.57);
  }

  outColor = vec4(color, 1.0);
}
`;

export const CREATURE_VERTEX = `#version 300 es
in vec2 aCorner;
in vec4 aPlacement;   // x, y, demi-largeur (négative : regarde à gauche), demi-hauteur
in vec4 aColorFrame;  // r, g, b, image de l'atlas
in vec4 aMotion;      // phase, en mouvement, image fixe (ne marche pas), inutilisé

uniform vec4 uView;
uniform vec2 uAtlasGrid;
uniform float uTime;
uniform float uShadow;
uniform float uShadowFrame;

out vec2 vUv;
out vec3 vColor;

void main() {
  vec2 scaled = aCorner * aPlacement.zw;
  float frame = aColorFrame.a;
  vec2 world = aPlacement.xy;

  if (uShadow > 0.5) {
    // Ombre posée au sol, sous les pattes.
    scaled = aCorner * vec2(abs(aPlacement.z) * 0.72, aPlacement.w * 0.2);
    world.y += aPlacement.w * 0.8;
    frame = uShadowFrame;
  } else if (aMotion.y > 0.5) {
    float step = floor(uTime * 7.0 + aMotion.x);
    frame += mod(step, 2.0) * uAtlasGrid.x;
    world.y -= abs(sin((uTime * 7.0 + aMotion.x) * 3.14159)) * aPlacement.w * 0.05;
  }

  vec2 clip = (world + scaled - uView.xy) / uView.zw * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  vec2 cellIndex = vec2(mod(frame, uAtlasGrid.x), floor(frame / uAtlasGrid.x));
  vUv = (cellIndex + aCorner * 0.5 + 0.5) / uAtlasGrid;
  vColor = aColorFrame.rgb;
}
`;

export const CREATURE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vColor;
out vec4 outColor;
uniform sampler2D uAtlas;
uniform float uShadow;

void main() {
  vec4 t = texture(uAtlas, vUv);
  if (uShadow > 0.5) {
    outColor = vec4(0.0, 0.0, 0.0, t.a * 0.42);
    return;
  }
  // Les parties colorées de l'atlas (bec, pattes) gardent leur couleur. La teinte de
  // la lignée est adoucie pour rester naturelle.
  vec3 rgb = t.a > 0.0 ? t.rgb / t.a : vec3(0.0);
  float chroma = max(rgb.r, max(rgb.g, rgb.b)) - min(rgb.r, min(rgb.g, rgb.b));
  float luminance = dot(vColor, vec3(0.3, 0.59, 0.11));
  vec3 tint = mix(vec3(luminance), vColor, 0.72) * 1.15;
  outColor = vec4(mix(rgb * tint, rgb, smoothstep(0.05, 0.14, chroma)) * t.a, t.a);
}
`;
