/** Couches de sol, dans le même ordre que la carte. */
const GROUND_TEXTURES = ['grass', 'forest', 'tropical', 'wetland', 'rock', 'sand', 'snow'];
const TEXTURE_SIZE = 512;
const MIN_DISTANCE = 1.35;
const MAX_DISTANCE = 5.0;
const MAX_PITCH = 1.35;
const FOV = 0.62;
/** Inclinaison de l'axe : le soleil passe au-dessus de cette latitude au cœur de l'été. */
const AXIAL_TILT = 0.41;

/** Biome du moteur (EnvironmentType) vers couche de sol ; -1 pour l'eau. */
const BIOME_LAYER: Record<number, number> = { 0: 0, 1: 1, 2: -1, 3: -1, 4: 3, 5: 4, 6: 5, 7: 6, 8: 2, 9: 4 };
export const BIOME_NAMES: Record<number, string> = {
  0: 'Prairie', 1: 'Forêt', 2: 'Lac', 3: 'Océan', 4: 'Marécage', 5: 'Montagne', 6: 'Désert', 7: 'Arctique', 8: 'Forêt tropicale', 9: 'Ruines'
};

/** La planète telle que le moteur l'envoie. */
export interface PlanetData {
  /** [x, y, z, biome, altitude en km, température en °C, pluie en mm/an] */
  tiles: number[][];
  triangles: number[][];
  /** Tuile où se trouve la carte actuelle */
  home: number;
}

const BACKGROUND_VERTEX = `#version 300 es
in vec2 aCorner;
void main() { gl_Position = vec4(aCorner, 0.999, 1.0); }
`;

// Espace et halo de l'atmosphère, derrière la planète.
const BACKGROUND_FRAGMENT = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uDistance;
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
void main() {
  vec2 ndc = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  ndc.x *= uResolution.x / uResolution.y;
  vec3 rd = normalize(vec3(ndc * ${FOV}, -1.0));
  vec3 ro = vec3(0.0, 0.0, uDistance);
  float closest = length(ro - rd * dot(ro, rd));
  float halo = exp(-max(closest - 1.0, 0.0) * 9.0) * step(1.0, closest);
  vec3 q = rd * 160.0;
  vec3 cell = floor(q);
  vec3 star = cell + 0.5 + (vec3(hash3(cell + 1.0), hash3(cell + 2.0), hash3(cell + 4.0)) - 0.5) * 0.6;
  float stars = step(0.985, hash3(cell)) * smoothstep(0.12, 0.0, length(q - star)) * (0.4 + 0.6 * hash3(cell + 3.0));
  outColor = vec4(vec3(0.012, 0.014, 0.022) + vec3(0.85, 0.9, 1.0) * stars + vec3(0.25, 0.5, 0.95) * halo * 0.55, 1.0);
}
`;

const TILE_VERTEX = `#version 300 es
in vec3 aPosition;  // repère de la planète, rayon 1
in vec4 aTile;      // tuile, couche de sol, bord (0 au centre, 1 aux coins), altitude
uniform mat3 uRotation;   // de la vue vers la planète
uniform float uDistance;
uniform float uAspect;
out vec3 vPlanet;
out vec4 vTile;
void main() {
  vec3 view = transpose(uRotation) * aPosition;
  float depth = uDistance - view.z;
  vec2 ndc = view.xy / (depth * ${FOV});
  ndc.x /= uAspect;
  gl_Position = vec4(ndc, (depth - 0.2) / 10.0 * 2.0 - 1.0, 1.0);
  vPlanet = aPosition;
  vTile = aTile;
}
`;

const TILE_FRAGMENT = `#version 300 es
precision highp float;
precision mediump sampler2DArray;
in vec3 vPlanet;
in vec4 vTile;
out vec4 outColor;
uniform sampler2DArray uColors;
uniform vec3 uSun;
uniform float uHover;
uniform float uSelected;
uniform float uHome;

vec3 ground(int layer, vec3 p) {
  vec3 w = pow(abs(p), vec3(4.0));
  w /= (w.x + w.y + w.z);
  vec3 q = p * 9.0;
  return texture(uColors, vec3(q.yz, float(layer))).rgb * w.x
       + texture(uColors, vec3(q.xz, float(layer))).rgb * w.y
       + texture(uColors, vec3(q.xy, float(layer))).rgb * w.z;
}

void main() {
  vec3 p = normalize(vPlanet);
  float tile = vTile.x;
  // floor et non int() : int(-0.5) vaut 0, et toute l'eau deviendrait de la prairie.
  int layer = int(floor(vTile.y + 0.5));
  float edge = vTile.z;
  float elevation = vTile.w;
  vec3 color;
  if (layer < 0) {
    // Plus c'est profond, plus c'est sombre ; les lacs sont plus clairs.
    float depth = clamp(-elevation / 4.0, 0.0, 1.0);
    color = layer == -2 ? vec3(0.12, 0.36, 0.44) : mix(vec3(0.08, 0.32, 0.42), vec3(0.02, 0.09, 0.22), depth);
  } else {
    color = ground(layer, p);
    // Le relief se lit à la teinte : les hauteurs foncent un peu.
    color *= 1.0 - 0.18 * clamp(elevation / 5.0, 0.0, 1.0);
  }
  float sunlight = dot(p, uSun);
  float day = smoothstep(-0.35, 0.3, sunlight);
  color *= (0.32 + 0.68 * day * (0.45 + 0.7 * max(sunlight, 0.0))) * mix(vec3(0.7, 0.78, 1.0), vec3(1.0), day);

  // Contour des tuiles, discret ; plus marqué pour la tuile survolée, choisie, ou celle de la carte.
  float border = smoothstep(0.86, 0.97, edge);
  color = mix(color, color * 0.55, border * 0.6);
  if (abs(tile - uHover) < 0.5) color = mix(color, vec3(1.0), 0.18 + 0.5 * border);
  if (abs(tile - uSelected) < 0.5) color = mix(color, vec3(0.9, 0.82, 0.57), 0.15 + 0.85 * border);
  if (abs(tile - uHome) < 0.5) color = mix(color, vec3(1.0, 0.75, 0.25), 0.25 + 0.75 * border);
  outColor = vec4(color, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string, attributes: string[]): WebGLProgram {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader de la planète invalide : ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  attributes.forEach((name, i) => gl.bindAttribLocation(program, i, name));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Programme de la planète invalide : ${gl.getProgramInfoLog(program)}`);
  return program;
}

/** Rotation de la vue vers la planète : lacet autour de l'axe des pôles, puis tangage. */
function rotation(yaw: number, pitch: number): number[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp];
}

function apply(m: number[], v: number[]): number[] {
  return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
}

function applyTransposed(m: number[], v: number[]): number[] {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

function normalize(v: number[]): number[] {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * La planète entière, façon RimWorld : chaque tuile du moteur est un hexagone (ou l'un des
 * douze pentagones), avec son biome, son relief et son climat. Glisser pour tourner,
 * molette pour zoomer.
 */
export class GlobeRenderer {
  private gl: WebGL2RenderingContext;
  private background!: WebGLProgram;
  private tileProgram!: WebGLProgram;
  private quad!: WebGLVertexArrayObject;
  private mesh: WebGLVertexArrayObject | null = null;
  private indexCount = 0;
  private colors!: WebGLTexture;
  private planet: PlanetData | null = null;
  private hover = -1;
  private selected = -1;
  private yaw = 0;
  private pitch = 0.3;
  private distance = 2.6;
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
    this.background = compile(gl, BACKGROUND_VERTEX, BACKGROUND_FRAGMENT, ['aCorner']);
    this.tileProgram = compile(gl, TILE_VERTEX, TILE_FRAGMENT, ['aPosition', 'aTile']);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.mesh = null;
    this.colors = await this.loadColors();
    if (this.planet) this.buildMesh(this.planet);
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

  setPlanet(planet: PlanetData) {
    this.planet = planet;
    if (this.ready) this.buildMesh(planet);
  }

  /** Chaque tuile en éventail : son centre, puis ses coins, centres des triangles qui l'entourent. */
  private buildMesh(planet: PlanetData) {
    const gl = this.gl;
    const around: number[][] = planet.tiles.map(() => []);
    const corners = planet.triangles.map((t) => {
      const [a, b, c] = t.map((i) => planet.tiles[i]);
      return normalize([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]);
    });
    planet.triangles.forEach((t, k) => t.forEach((i) => around[i].push(k)));

    const vertices: number[] = [];
    const indices: number[] = [];
    planet.tiles.forEach((tile, i) => {
      const center = [tile[0], tile[1], tile[2]];
      // Repère tangent pour ranger les coins autour du centre.
      const up = Math.abs(center[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = normalize([up[1] * center[2] - up[2] * center[1], up[2] * center[0] - up[0] * center[2], up[0] * center[1] - up[1] * center[0]]);
      const v = [center[1] * u[2] - center[2] * u[1], center[2] * u[0] - center[0] * u[2], center[0] * u[1] - center[1] * u[0]];
      const ring = around[i]
        .map((k) => corners[k])
        .sort((p, q) => Math.atan2(p[0] * v[0] + p[1] * v[1] + p[2] * v[2], p[0] * u[0] + p[1] * u[1] + p[2] * u[2]) -
          Math.atan2(q[0] * v[0] + q[1] * v[1] + q[2] * v[2], q[0] * u[0] + q[1] * u[1] + q[2] * u[2]));
      const biome = tile[3];
      const layer = BIOME_LAYER[biome] ?? 0;
      const shade = biome === 2 ? -2 : layer;
      const base = vertices.length / 7;
      vertices.push(center[0], center[1], center[2], i, shade, 0, tile[4]);
      for (const p of ring) vertices.push(p[0], p[1], p[2], i, shade, 1, tile[4]);
      for (let r = 0; r < ring.length; r++) indices.push(base, base + 1 + r, base + 1 + ((r + 1) % ring.length));
    });

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.mesh = vao;
    this.indexCount = indices.length;
  }

  setSelection(tile: number | null) {
    this.selected = tile ?? -1;
  }

  setHover(tile: number | null) {
    this.hover = tile ?? -1;
  }

  /** Saison de l'hémisphère nord, 0 printemps à 3 hiver : le soleil monte et descend. */
  setSeason(season: number) {
    this.targetSunLatitude = [0, AXIAL_TILT, 0, -AXIAL_TILT][((season % 4) + 4) % 4];
  }

  rotateBy(dxPixels: number, dyPixels: number) {
    const scale = (2.2 / Math.max(this.canvas.clientHeight, 1)) * (this.distance - 1);
    this.yaw -= dxPixels * scale;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dyPixels * scale));
    this.targetYaw = this.targetPitch = null;
    this.lastInteractionMs = performance.now();
  }

  zoomBy(factor: number) {
    this.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, 1 + (this.distance - 1) * factor));
    this.lastInteractionMs = performance.now();
  }

  /** Tourne la planète pour mettre une tuile face à la caméra. */
  focusTile(tile: number) {
    const t = this.planet?.tiles[tile];
    if (!t) return;
    this.targetYaw = Math.atan2(t[0], t[2]);
    this.targetPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, -Math.asin(Math.max(-1, Math.min(1, t[1])))));
    this.lastInteractionMs = performance.now();
  }

  /** Tuile sous un point de l'écran, ou null si on vise l'espace. */
  pickTile(clientX: number, clientY: number): number | null {
    const planet = this.planet;
    if (!planet) return null;
    const rect = this.canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const x = (((clientX - rect.left) / rect.width) * 2 - 1) * aspect * FOV;
    const y = (1 - ((clientY - rect.top) / rect.height) * 2) * FOV;
    const rd = normalize([x, y, -1]);
    const b = this.distance * rd[2];
    const disc = b * b - (this.distance * this.distance - 1);
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    const p = apply(rotation(this.yaw, this.pitch), [rd[0] * t, rd[1] * t, this.distance + rd[2] * t]);
    let best = -1;
    let bestDot = -2;
    planet.tiles.forEach((tile, i) => {
      const d = tile[0] * p[0] + tile[1] * p[1] + tile[2] * p[2];
      if (d > bestDot) {
        bestDot = d;
        best = i;
      }
    });
    return best;
  }

  /** Position à l'écran du centre d'une tuile, ou null si elle est de l'autre côté. */
  project(tile: number): { x: number; y: number } | null {
    const t = this.planet?.tiles[tile];
    if (!t) return null;
    const view = applyTransposed(rotation(this.yaw, this.pitch), [t[0], t[1], t[2]]);
    // Un point de la sphère n'est visible que s'il fait face à la caméra : z > 1 / distance.
    if (view[2] <= 1 / this.distance) return null;
    const depth = this.distance - view[2];
    const rect = this.canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    return {
      x: ((view[0] / (depth * FOV) / aspect + 1) / 2) * rect.width,
      y: ((1 - view[1] / (depth * FOV)) / 2) * rect.height
    };
  }

  private frame = (now: number) => {
    if (this.lost) return;
    this.frameHandle = requestAnimationFrame(this.frame);
    const dt = this.lastFrameMs > 0 ? Math.min(0.1, (now - this.lastFrameMs) / 1000) : 0;
    this.lastFrameMs = now;
    if (!this.ready) return;

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
    const width = Math.round(this.canvas.clientWidth);
    const height = Math.round(this.canvas.clientHeight);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.background);
    gl.bindVertexArray(this.quad);
    gl.uniform2f(gl.getUniformLocation(this.background, 'uResolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(this.background, 'uDistance'), this.distance);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (!this.mesh) return;
    const p = this.tileProgram;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(p);
    gl.bindVertexArray(this.mesh);
    const time = (now - this.startMs) / 1000;
    const sunLon = time * 0.05;
    gl.uniformMatrix3fv(gl.getUniformLocation(p, 'uRotation'), false, rotation(this.yaw, this.pitch));
    gl.uniform1f(gl.getUniformLocation(p, 'uDistance'), this.distance);
    gl.uniform1f(gl.getUniformLocation(p, 'uAspect'), width / Math.max(height, 1));
    gl.uniform3f(gl.getUniformLocation(p, 'uSun'), Math.cos(this.sunLatitude) * Math.sin(sunLon), Math.sin(this.sunLatitude), Math.cos(this.sunLatitude) * Math.cos(sunLon));
    gl.uniform1f(gl.getUniformLocation(p, 'uHover'), this.hover);
    gl.uniform1f(gl.getUniformLocation(p, 'uSelected'), this.selected);
    gl.uniform1f(gl.getUniformLocation(p, 'uHome'), this.planet?.home ?? -1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.colors);
    gl.uniform1i(gl.getUniformLocation(p, 'uColors'), 0);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  };
}
