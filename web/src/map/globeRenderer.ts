import type { MapWorld } from './mapRenderer';

/** Couches de sol, dans le même ordre que la carte ; 7 et 8 sont l'eau. */
const GROUND_TEXTURES = ['grass', 'forest', 'tropical', 'wetland', 'rock', 'sand', 'snow'];
const TEXTURE_SIZE = 512;
const MIN_DISTANCE = 1.6;
const MAX_DISTANCE = 5.0;
const MAX_PITCH = 1.35;
/** Inclinaison de l'axe : le soleil passe au-dessus de cette latitude au cœur de l'été. */
const AXIAL_TILT = 0.41;

/** Ce que le globe montre d'une case : tout vient du moteur. */
export interface GlobeCell {
  gridX: number;
  gridY: number;
  layer: number;
  plants: number;
  rain: number;
  fire: number;
  scorch: number;
  /** °C */
  temperature: number;
}

const VERTEX = `#version 300 es
in vec2 aCorner;
void main() { gl_Position = vec4(aCorner, 0.0, 1.0); }
`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision mediump sampler2DArray;
out vec4 outColor;

uniform vec2 uResolution;
uniform mat3 uRotation;   // de la vue vers la planète
uniform float uDistance;  // distance de la caméra au centre, en rayons
uniform vec2 uGrid;
uniform sampler2DArray uColors;
uniform sampler2D uCells;    // r : couche, g : plantes, b : neige, a : feu
uniform sampler2D uWeather;  // r : pluie, g : trace d'incendie
uniform sampler2D uOverlay;
uniform vec3 uSun;           // direction du soleil, repère de la planète
uniform vec2 uSelected;      // -1 si aucune
uniform float uTime;

const float PI = 3.14159265;
const int WATER_FRESH = 7;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * noise3(p); p = p * 2.03 + 11.0; a *= 0.5; }
  return s;
}

vec4 cellAt(ivec2 c) {
  int w = int(uGrid.x + 0.5);
  c.x = ((c.x % w) + w) % w;            // l'est rejoint l'ouest
  c.y = clamp(c.y, 0, int(uGrid.y) - 1); // pas au-delà des pôles
  return texelFetch(uCells, c, 0);
}

// Textures projetées sur trois plans : pas de couture ni d'étirement aux pôles.
vec3 ground(int layer, vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z);
  vec3 q = p * 2.6;
  return texture(uColors, vec3(q.yz, float(layer))).rgb * w.x
       + texture(uColors, vec3(q.xz, float(layer))).rgb * w.y
       + texture(uColors, vec3(q.xy, float(layer))).rgb * w.z;
}

vec3 stars(vec3 rd) {
  // Une étoile au plus par cellule, ponctuelle et décalée au hasard dans sa cellule.
  vec3 q = rd * 160.0;
  vec3 cell = floor(q);
  float h = hash3(cell);
  vec3 star = cell + 0.5 + (vec3(hash3(cell + 1.0), hash3(cell + 2.0), hash3(cell + 4.0)) - 0.5) * 0.6;
  float d = length(q - star);
  return vec3(0.85, 0.9, 1.0) * step(0.985, h) * smoothstep(0.12, 0.0, d) * (0.4 + 0.6 * hash3(cell + 3.0));
}

void main() {
  vec2 ndc = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  ndc.x *= uResolution.x / uResolution.y;
  vec3 ro = vec3(0.0, 0.0, uDistance);
  vec3 rd = normalize(vec3(ndc * 0.62, -1.0));

  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float disc = b * b - c;
  vec3 space = vec3(0.012, 0.014, 0.022) + stars(rd);
  // Halo de l'atmosphère autour du disque.
  float closest = length(ro - rd * b);
  float halo = exp(-max(closest - 1.0, 0.0) * 9.0) * step(1.0, closest);
  if (disc < 0.0) {
    outColor = vec4(space + vec3(0.25, 0.5, 0.95) * halo * 0.55, 1.0);
    return;
  }

  float t = -b - sqrt(disc);
  vec3 n = normalize(ro + rd * t);
  vec3 p = uRotation * n;               // point de la planète
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lon = atan(p.x, p.z);
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);

  // Frontières de biomes qui ondulent, comme sur la carte.
  vec3 warpP = p * 3.0;
  vec2 warp = (vec2(fbm3(warpP), fbm3(warpP + 17.0)) - 0.47) * 0.9;
  vec2 g = uv * uGrid + warp - 0.5;
  ivec2 base = ivec2(floor(g));
  vec2 f = smoothstep(0.0, 1.0, fract(g));
  vec4 c00 = cellAt(base), c10 = cellAt(base + ivec2(1, 0)), c01 = cellAt(base + ivec2(0, 1)), c11 = cellAt(base + ivec2(1, 1));
  vec4 cells[4] = vec4[4](c00, c10, c01, c11);
  float weights[4] = float[4]((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);

  float water = 0.0;
  vec3 land = vec3(0.0);
  float landW = 0.0;
  vec4 mixed = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    int layer = int(cells[i].r * 255.0 + 0.5);
    mixed += cells[i] * weights[i];
    if (layer >= WATER_FRESH) { water += weights[i]; continue; }
    float w = pow(weights[i], 3.0);
    land += ground(layer, p, p) * w;
    landW += w;
  }
  vec3 color = landW > 0.0 ? land / landW : vec3(0.3, 0.3, 0.25);
  float plants = mixed.g, snow = mixed.b, fire = mixed.a;
  vec4 weather = texture(uWeather, uv);

  // Plus de plantes, plus vert ; une case broutée jaunit.
  color *= mix(vec3(1.08, 0.98, 0.78), vec3(0.86, 1.02, 0.82), plants);
  color = mix(color, vec3(0.07, 0.065, 0.06), weather.g * 0.8 * smoothstep(0.3, 0.6, noise3(p * 9.0)));
  float snowMask = smoothstep(0.55 - snow * 0.55, 0.75 - snow * 0.55, fbm3(p * 6.0)) * step(0.02, snow);
  color = mix(color, vec3(0.88, 0.9, 0.94), snowMask);

  float shore = smoothstep(0.42, 0.58, water + (noise3(p * 12.0) - 0.5) * 0.12);
  vec3 sea = mix(vec3(0.05, 0.26, 0.36), vec3(0.03, 0.12, 0.27), smoothstep(0.6, 1.0, water));
  sea = mix(sea, vec3(0.8, 0.86, 0.92), snowMask * 0.85); // eau gelée
  color = mix(color, sea, shore);

  vec4 overlay = texture(uOverlay, uv);
  color = mix(color, overlay.rgb, overlay.a);

  // Soleil : jour, nuit, et reflet sur l'eau.
  float sunlight = dot(p, uSun);
  // La nuit reste lisible : RimWorld non plus ne plonge pas la planète dans le noir.
  float day = smoothstep(-0.35, 0.3, sunlight);
  vec3 viewP = uRotation * (-rd);
  vec3 halfV = normalize(uSun + viewP);
  float spec = pow(max(dot(p, halfV), 0.0), 60.0) * shore * 0.5;
  color = color * (0.32 + 0.68 * day * (0.45 + 0.7 * max(sunlight, 0.0))) * mix(vec3(0.7, 0.78, 1.0), vec3(1.0), day) + vec3(spec) * day;
  // Lueur des feux, visible même de nuit.
  color += vec3(1.0, 0.42, 0.08) * fire * (0.5 + 0.5 * noise3(p * 40.0 + uTime));

  // Nuages : partout un peu, épais là où il pleut vraiment.
  vec3 cloudP = p * 4.0 + vec3(uTime * 0.02, 0.0, uTime * 0.013);
  float clouds = smoothstep(0.5, 0.75, fbm3(cloudP) + weather.r * 0.35);
  color = mix(color, vec3(0.92) * (0.35 + 0.65 * day), clouds * 0.75);

  // Case sélectionnée : son contour exact.
  if (uSelected.x >= 0.0) {
    vec2 exact = uv * uGrid;
    int w = int(uGrid.x + 0.5);
    ivec2 cell = ivec2(floor(exact));
    cell.x = ((cell.x % w) + w) % w;
    if (cell == ivec2(uSelected)) {
      vec2 local = fract(exact);
      float edge = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
      if (edge < 0.035) color = vec3(0.9, 0.82, 0.57);
    }
  }

  // Bord de l'atmosphère, côté jour.
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  color += vec3(0.3, 0.55, 1.0) * rim * (0.15 + 0.6 * day);
  outColor = vec4(color, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext): WebGLProgram {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader du globe invalide : ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.bindAttribLocation(program, 0, 'aCorner');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Programme du globe invalide : ${gl.getProgramInfoLog(program)}`);
  return program;
}

/** Rotation de la vue vers la planète : lacet autour de l'axe des pôles, puis tangage. */
function rotation(yaw: number, pitch: number): number[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Ry(yaw) * Rx(pitch), rangée par colonnes pour WebGL.
  return [cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp];
}

function apply(m: number[], v: [number, number, number]): [number, number, number] {
  return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
}

/**
 * La planète entière, en 3D, d'après les vraies données du moteur : biomes, plantes, neige,
 * pluie, feux et calques. Le monde du moteur fait le tour de la sphère : chaque colonne de
 * cases est une tranche de longitude, chaque rangée une bande de latitude.
 */
export class GlobeRenderer {
  private gl: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private quad!: WebGLVertexArrayObject;
  private colors!: WebGLTexture;
  private cellTexture: WebGLTexture | null = null;
  private weatherTexture: WebGLTexture | null = null;
  private overlayTexture: WebGLTexture | null = null;
  private world: MapWorld | null = null;
  private cells: GlobeCell[] = [];
  private overlay: Uint8Array | null = null;
  private selected: [number, number] = [-1, -1];
  private yaw = 0;
  private pitch = 0.25;
  private distance = 3.0;
  private targetYaw: number | null = null;
  private targetPitch: number | null = null;
  private sunLatitude = 0;
  private targetSunLatitude = 0;
  private frameHandle = 0;
  private startMs = performance.now();
  private lastFrameMs = 0;
  private lastInteractionMs = 0;
  private ready = false;
  private lost = false;

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.ready = false;
    cancelAnimationFrame(this.frameHandle);
  };

  private onContextRestored = () => {
    this.lost = false;
    this.init().then(() => { this.frameHandle = requestAnimationFrame(this.frame); }).catch((e) => this.onError?.(e));
  };

  constructor(private canvas: HTMLCanvasElement, private onError?: (error: Error) => void) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL2 indisponible sur ce navigateur');
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  async start() {
    await this.init();
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.frameHandle);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
  }

  private async init() {
    const gl = this.gl;
    this.program = compile(gl);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.cellTexture = this.weatherTexture = this.overlayTexture = null;
    this.colors = await this.loadColors();
    this.upload();
    this.uploadOverlay();
    this.ready = true;
  }

  private async loadColors(): Promise<WebGLTexture> {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 10, gl.RGBA8, TEXTURE_SIZE, TEXTURE_SIZE, GROUND_TEXTURES.length);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d')!;
    const base = import.meta.env.BASE_URL;
    await Promise.all(
      GROUND_TEXTURES.map(
        (name, layer) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            const put = (source: TexImageSource) => {
              gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
              gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, TEXTURE_SIZE, TEXTURE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, source);
              resolve();
            };
            image.onload = () => put(image);
            // Une image manquante ne doit jamais empêcher d'afficher la planète.
            image.onerror = () => {
              ctx.fillStyle = 'rgb(120,120,100)';
              ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
              put(canvas);
            };
            image.src = `${base}textures/${name}_color.jpg`;
          })
      )
    );
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return texture;
  }

  private texture(width: number, height: number, data: Uint8Array, filter: number, wrapS: number): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  setWorld(world: MapWorld) {
    this.world = world;
    this.upload();
    this.uploadOverlay();
  }

  setCells(cells: GlobeCell[]) {
    this.cells = cells;
    this.upload();
  }

  setOverlay(rgba: Uint8Array | null) {
    this.overlay = rgba;
    this.uploadOverlay();
  }

  setSelection(cell: [number, number] | null) {
    this.selected = cell ?? [-1, -1];
  }

  /** Saison de l'hémisphère nord, 0 printemps à 3 hiver : le soleil monte et descend. */
  setSeason(season: number) {
    this.targetSunLatitude = [0, AXIAL_TILT, 0, -AXIAL_TILT][((season % 4) + 4) % 4];
  }

  private upload() {
    const world = this.world;
    if (!world || !this.program) return;
    const gl = this.gl;
    const cells = new Uint8Array(world.gridWidth * world.gridHeight * 4);
    const weather = new Uint8Array(world.gridWidth * world.gridHeight * 4);
    world.layers.forEach((layer, i) => {
      cells[i * 4] = layer;
      cells[i * 4 + 1] = 255;
    });
    for (const c of this.cells) {
      const at = (c.gridY * world.gridWidth + c.gridX) * 4;
      cells[at] = c.layer;
      cells[at + 1] = Math.round(Math.max(0, Math.min(1, c.plants)) * 255);
      cells[at + 2] = Math.round(Math.max(0, Math.min(1, -c.temperature / 8)) * 255);
      cells[at + 3] = Math.round(Math.max(0, Math.min(1, c.fire)) * 255);
      weather[at] = Math.round(Math.max(0, Math.min(1, c.rain)) * 255);
      weather[at + 1] = Math.round(Math.max(0, Math.min(1, c.scorch)) * 255);
      weather[at + 3] = 255;
    }
    if (this.cellTexture) gl.deleteTexture(this.cellTexture);
    if (this.weatherTexture) gl.deleteTexture(this.weatherTexture);
    this.cellTexture = this.texture(world.gridWidth, world.gridHeight, cells, gl.NEAREST, gl.REPEAT);
    this.weatherTexture = this.texture(world.gridWidth, world.gridHeight, weather, gl.LINEAR, gl.REPEAT);
  }

  private uploadOverlay() {
    const world = this.world;
    if (!world || !this.program) return;
    const gl = this.gl;
    if (this.overlayTexture) gl.deleteTexture(this.overlayTexture);
    this.overlayTexture = this.overlay
      ? this.texture(world.gridWidth, world.gridHeight, this.overlay, gl.LINEAR, gl.REPEAT)
      : this.texture(1, 1, new Uint8Array([0, 0, 0, 0]), gl.NEAREST, gl.CLAMP_TO_EDGE);
  }

  /** Glisser fait tourner la planète ; la latitude reste bornée pour ne pas passer à l'envers. */
  rotateBy(dxPixels: number, dyPixels: number) {
    const scale = 2.2 / Math.max(this.canvas.clientHeight, 1) * (this.distance - 1);
    this.yaw -= dxPixels * scale;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dyPixels * scale));
    this.targetYaw = this.targetPitch = null;
    this.lastInteractionMs = performance.now();
  }

  zoomBy(factor: number) {
    this.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, 1 + (this.distance - 1) * factor));
    this.lastInteractionMs = performance.now();
  }

  /** Tourne la planète pour mettre une case face à la caméra. */
  focusCell(gx: number, gy: number) {
    const world = this.world;
    if (!world) return;
    const u = (gx + 0.5) / world.gridWidth;
    const v = (gy + 0.5) / world.gridHeight;
    const lon = (u - 0.5) * 2 * Math.PI;
    const lat = (0.5 - v) * Math.PI;
    this.targetYaw = lon;
    this.targetPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, -lat));
    this.lastInteractionMs = performance.now();
  }

  /** Case sous un point de l'écran, ou null si on vise l'espace. */
  pickCell(clientX: number, clientY: number): [number, number] | null {
    const world = this.world;
    if (!world) return null;
    const rect = this.canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const ndcX = (((clientX - rect.left) / rect.width) * 2 - 1) * aspect;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
    const len = Math.hypot(ndcX * 0.62, ndcY * 0.62, 1);
    const rd: [number, number, number] = [(ndcX * 0.62) / len, (ndcY * 0.62) / len, -1 / len];
    const ro: [number, number, number] = [0, 0, this.distance];
    const b = ro[2] * rd[2];
    const c = this.distance * this.distance - 1;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    const n: [number, number, number] = [rd[0] * t, rd[1] * t, ro[2] + rd[2] * t];
    const p = apply(rotation(this.yaw, this.pitch), n);
    const lat = Math.asin(Math.max(-1, Math.min(1, p[1])));
    const lon = Math.atan2(p[0], p[2]);
    const u = lon / (2 * Math.PI) + 0.5;
    const v = 0.5 - lat / Math.PI;
    const gx = ((Math.floor(u * world.gridWidth) % world.gridWidth) + world.gridWidth) % world.gridWidth;
    const gy = Math.max(0, Math.min(world.gridHeight - 1, Math.floor(v * world.gridHeight)));
    return [gx, gy];
  }

  private frame = (now: number) => {
    if (this.lost) return;
    this.frameHandle = requestAnimationFrame(this.frame);
    const dt = this.lastFrameMs > 0 ? Math.min(0.1, (now - this.lastFrameMs) / 1000) : 0;
    this.lastFrameMs = now;
    if (!this.ready || !this.world || !this.cellTexture) return;

    // Vers la case demandée, puis lente rotation quand personne ne touche à rien.
    if (this.targetYaw !== null && this.targetPitch !== null) {
      let delta = this.targetYaw - this.yaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.yaw += delta * Math.min(1, dt * 4);
      this.pitch += (this.targetPitch - this.pitch) * Math.min(1, dt * 4);
      if (Math.abs(delta) < 1e-3 && Math.abs(this.targetPitch - this.pitch) < 1e-3) this.targetYaw = this.targetPitch = null;
    } else if (now - this.lastInteractionMs > 6000) {
      this.yaw += dt * 0.04;
    }
    this.sunLatitude += (this.targetSunLatitude - this.sunLatitude) * Math.min(1, dt * 0.5);

    const gl = this.gl;
    // Un rayon par pixel coûte cher : jamais plus d'un point par pixel d'écran.
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    const width = Math.round(this.canvas.clientWidth * dpr);
    const height = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    const p = this.program;
    gl.useProgram(p);
    gl.bindVertexArray(this.quad);
    const time = (now - this.startMs) / 1000;
    // Le soleil fait le tour de la planète : jour et nuit défilent lentement.
    const sunLon = time * 0.05;
    const sun = [Math.cos(this.sunLatitude) * Math.sin(sunLon), Math.sin(this.sunLatitude), Math.cos(this.sunLatitude) * Math.cos(sunLon)];
    gl.uniform2f(gl.getUniformLocation(p, 'uResolution'), width, height);
    gl.uniformMatrix3fv(gl.getUniformLocation(p, 'uRotation'), false, rotation(this.yaw, this.pitch));
    gl.uniform1f(gl.getUniformLocation(p, 'uDistance'), this.distance);
    gl.uniform2f(gl.getUniformLocation(p, 'uGrid'), this.world.gridWidth, this.world.gridHeight);
    gl.uniform3f(gl.getUniformLocation(p, 'uSun'), sun[0], sun[1], sun[2]);
    gl.uniform2f(gl.getUniformLocation(p, 'uSelected'), this.selected[0], this.selected[1]);
    gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time);
    const bind = (unit: number, target: number, texture: WebGLTexture, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, texture);
      gl.uniform1i(gl.getUniformLocation(p, name), unit);
    };
    bind(0, gl.TEXTURE_2D_ARRAY, this.colors, 'uColors');
    bind(1, gl.TEXTURE_2D, this.cellTexture, 'uCells');
    bind(2, gl.TEXTURE_2D, this.weatherTexture!, 'uWeather');
    bind(3, gl.TEXTURE_2D, this.overlayTexture!, 'uOverlay');
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };
}
