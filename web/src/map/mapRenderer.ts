import { ATLAS_COLUMNS, ATLAS_ROWS, buildCreatureAtlas, creatureFrame, furFrame, hasFur, RING_FRAME, SHADOW_FRAME } from './creatureAtlas';
import { buildPropAtlas, PROP_COLUMNS, PROP_ROWS, PropFrame } from './propAtlas';
import { CREATURE_FRAGMENT, CREATURE_VERTEX, TERRAIN_FRAGMENT, TERRAIN_VERTEX } from './shaders';
import type { ViewBox } from '../utils/mapCamera';

/** Couches de sol, dans l'ordre de leurs textures ; 7 et 8 sont l'eau, dessinée par le shader. */
const GROUND_TEXTURES = ['grass', 'forest', 'tropical', 'wetland', 'rock', 'sand', 'snow'];
const TEXTURE_SIZE = 512;

export interface MapWorld {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  /** Une couche par case, ligne par ligne. */
  layers: Uint8Array;
}

export interface MapCreature {
  id: number;
  x: number;
  y: number;
  biologicalType: number;
  sizeScale: number;
  elongation: number;
  ornamentTier: number;
  patternTier: number;
  insulation: number;
  color: [number, number, number];
}

/** Une case vue par le moteur : couche de sol et plantes restantes [0,1]. */
export interface MapVegetationCell {
  gridX: number;
  gridY: number;
  layer: number;
  plants: number;
}

export interface MapCorpse {
  id: number;
  x: number;
  y: number;
  biologicalType: number;
  sizeScale: number;
  age: number;
  eaten: boolean;
  color: [number, number, number];
}

/** [image, chances, demi-taille en unités, balancement] */
type PlantKind = [number, number, number, number];
/** Ce qui pousse dans chaque couche de sol : combien de plantes pour une case pleine, et lesquelles. */
const FLORA: Record<number, { slots: number; kinds: PlantKind[] }> = {
  0: { slots: 34, kinds: [[PropFrame.TUFT, 0.84, 0.75, 1], [PropFrame.BUSH, 0.12, 1.0, 0.4], [PropFrame.BROADLEAF, 0.04, 1.9, 0.25]] },
  1: { slots: 30, kinds: [[PropFrame.BROADLEAF, 0.3, 2.0, 0.25], [PropFrame.CONIFER, 0.2, 2.0, 0.2], [PropFrame.BUSH, 0.2, 0.9, 0.4], [PropFrame.TUFT, 0.3, 0.65, 1]] },
  2: { slots: 32, kinds: [[PropFrame.PALM, 0.22, 2.1, 0.45], [PropFrame.BROADLEAF, 0.2, 2.1, 0.25], [PropFrame.BUSH, 0.3, 1.0, 0.4], [PropFrame.TUFT, 0.28, 0.7, 1]] },
  3: { slots: 30, kinds: [[PropFrame.REED, 0.72, 1.0, 1], [PropFrame.TUFT, 0.2, 0.7, 1], [PropFrame.BUSH, 0.08, 1.0, 0.4]] },
  4: { slots: 12, kinds: [[PropFrame.DRY_SHRUB, 0.42, 0.75, 0.5], [PropFrame.CONIFER, 0.28, 1.6, 0.2], [PropFrame.TUFT, 0.3, 0.55, 1]] },
  5: { slots: 8, kinds: [[PropFrame.DRY_SHRUB, 0.68, 0.75, 0.5], [PropFrame.CACTUS, 0.32, 1.2, 0]] },
  6: { slots: 8, kinds: [[PropFrame.LICHEN, 0.62, 0.8, 0], [PropFrame.CONIFER, 0.38, 1.4, 0.15]] }
};
/** Couleur d'une plante affamée : la case broutée jaunit avant de se vider. */
const GRAZED_TINT: [number, number, number] = [0.86, 0.72, 0.42];
/** Part de la vie d'un cadavre après laquelle il ne reste que les os. */
const FLESH_LIFETIME_TICKS = 180;
/** Distance au bord d'une case d'eau, en part de case, en deçà de laquelle rien ne pousse. */
const SHORE_MARGIN = 0.42;

/** Hachage stable : une plante garde sa place et son espèce d'un instantané à l'autre. */
function hash(x: number, y: number, k: number, salt: number): number {
  let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(k + 1, 83492791) ^ Math.imul(salt + 1, 2654435761);
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const WORLD_IMAGE_WIDTH = 352;
const FLOATS_PER_INSTANCE = 12;
const MIN_HALF_SIZE_PX = 5;
/** Au-delà, et vues de loin, les créatures n'ont plus d'ombre : invisible, et coûteux. */
const SHADOW_MAX_COUNT = 3000;
const SHADOW_MIN_PIXELS_PER_UNIT = 14;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error('Création de shader impossible');
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader invalide : ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const program = gl.createProgram();
  if (!program) throw new Error('Création de programme impossible');
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(program, 0, 'aCorner');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Programme invalide : ${gl.getProgramInfoLog(program)}`);
  return program;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Texture introuvable : ${url}`));
    image.src = url;
  });
}

/**
 * Rendu WebGL2 de la carte : sol texturé avec biomes fondus, eau animée, et créatures
 * dessinées en une seule passe. Les positions sont interpolées entre deux instantanés
 * du moteur pour que le mouvement reste fluide. Ne dépend ni de React ni du réseau.
 */
export class MapRenderer {
  private gl: WebGL2RenderingContext;
  private terrainProgram!: WebGLProgram;
  private creatureProgram!: WebGLProgram;
  private quad!: WebGLVertexArrayObject;
  private creatureVao!: WebGLVertexArrayObject;
  private instanceBuffer!: WebGLBuffer;
  private colorArray!: WebGLTexture;
  private normalArray!: WebGLTexture;
  private atlas!: WebGLTexture;
  private propAtlas!: WebGLTexture;
  private propVao!: WebGLVertexArrayObject;
  private propBuffer!: WebGLBuffer;
  private corpseVao!: WebGLVertexArrayObject;
  private corpseBuffer!: WebGLBuffer;
  private boneVao!: WebGLVertexArrayObject;
  private boneBuffer!: WebGLBuffer;
  private cellTexture!: WebGLTexture;
  private overlayTexture!: WebGLTexture;

  private world: MapWorld | null = null;
  private overlay: Uint8Array | null = null;
  private view: ViewBox = { x: 0, y: 0, w: 1, h: 1 };
  private selectedCell: [number, number] = [-1, -1];
  private selectedId: number | null = null;

  private creatures: MapCreature[] = [];
  // Position de départ de l'interpolation et sens (+1 droite, -1 gauche), alignés sur `creatures` : ces tableaux
  // sont lus à chaque image, une table de hachage y coûterait trop cher.
  private fromX = new Float32Array(0);
  private fromY = new Float32Array(0);
  private facing = new Float32Array(0);
  private lastSnapshotMs = 0;
  private snapshotIntervalMs = 500;
  private instanceData = new Float32Array(0);

  private vegetation: MapVegetationCell[] = [];
  private vegetationKey = '';
  private propCount = 0;
  private fleshCount = 0;
  private boneCount = 0;

  private frameHandle = 0;
  private startMs = performance.now();
  private lost = false;
  private frameTimes: number[] = [];
  private resourcesReady = false;
  private worldImageDirty = false;
  private lastFrameMs = 0;

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.resourcesReady = false;
    cancelAnimationFrame(this.frameHandle);
  };

  private onContextRestored = () => {
    this.lost = false;
    this.initResources()
      .then(() => {
        this.frameHandle = requestAnimationFrame(this.frame);
      })
      .catch((e) => this.onError?.(e));
  };

  constructor(
    private canvas: HTMLCanvasElement,
    private onError?: (error: Error) => void,
    private onWorldImage?: (dataUrl: string) => void
  ) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 indisponible sur ce navigateur');
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  async start() {
    await this.initResources();
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.frameHandle);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
  }

  private async initResources() {
    const gl = this.gl;
    this.terrainProgram = compile(gl, TERRAIN_VERTEX, TERRAIN_FRAGMENT);
    this.creatureProgram = compile(gl, CREATURE_VERTEX, CREATURE_FRAGMENT);

    const corners = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const cornerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);

    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const instancedVao = (buffer: WebGLBuffer) => {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const stride = FLOATS_PER_INSTANCE * 4;
      ['aPlacement', 'aColorFrame', 'aMotion'].forEach((name, i) => {
        const location = gl.getAttribLocation(this.creatureProgram, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 4, gl.FLOAT, false, stride, i * 16);
        gl.vertexAttribDivisor(location, 1);
      });
      gl.bindVertexArray(null);
      return vao;
    };
    this.instanceBuffer = gl.createBuffer()!;
    this.creatureVao = instancedVao(this.instanceBuffer);
    this.propBuffer = gl.createBuffer()!;
    this.propVao = instancedVao(this.propBuffer);
    this.corpseBuffer = gl.createBuffer()!;
    this.corpseVao = instancedVao(this.corpseBuffer);
    this.boneBuffer = gl.createBuffer()!;
    this.boneVao = instancedVao(this.boneBuffer);
    // Contexte WebGL neuf : les plantes doivent repartir dans leur nouveau tampon.
    this.vegetationKey = '';
    this.propCount = this.fleshCount = this.boneCount = 0;

    this.cellTexture = this.dataTexture(1, 1, new Uint8Array([0, 0, 0, 255]));
    this.overlayTexture = this.dataTexture(1, 1, new Uint8Array([0, 0, 0, 0]));

    this.colorArray = await this.loadLayerArray('color');
    this.normalArray = await this.loadLayerArray('normal');

    this.atlas = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, buildCreatureAtlas());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.propAtlas = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.propAtlas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, buildPropAtlas());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Monde reçu pendant le chargement, ou perdu avec le contexte WebGL.
    if (this.world) this.setWorld(this.world);
    if (this.vegetation.length > 0) this.setVegetation(this.vegetation);
    this.resourcesReady = true;
    this.worldImageDirty = true;
  }

  private dataTexture(width: number, height: number, data: Uint8Array, filter: number = this.gl.NEAREST): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private async loadLayerArray(kind: 'color' | 'normal'): Promise<WebGLTexture> {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 10, gl.RGBA8, TEXTURE_SIZE, TEXTURE_SIZE, GROUND_TEXTURES.length);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const base = import.meta.env.BASE_URL;

    await Promise.all(
      GROUND_TEXTURES.map(async (name, layer) => {
        let source: TexImageSource;
        try {
          source = await loadImage(`${base}textures/${name}_${kind}.jpg`);
        } catch {
          // Une image manquante ne doit jamais empêcher d'afficher la carte.
          ctx.fillStyle = kind === 'normal' ? 'rgb(128,128,255)' : 'rgb(120,120,100)';
          ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
          source = canvas;
        }
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, TEXTURE_SIZE, TEXTURE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, source);
      })
    );

    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
    if (anisotropy) gl.texParameterf(gl.TEXTURE_2D_ARRAY, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return texture;
  }

  setWorld(world: MapWorld) {
    this.world = world;
    const pixels = new Uint8Array(world.gridWidth * world.gridHeight * 4);
    world.layers.forEach((layer, i) => {
      pixels[i * 4] = layer;
      pixels[i * 4 + 3] = 255;
    });
    this.gl.deleteTexture(this.cellTexture);
    this.cellTexture = this.dataTexture(world.gridWidth, world.gridHeight, pixels);
    this.setOverlay(this.overlay);
    this.worldImageDirty = true;
  }

  /** Calque de données : RGBA par case, ou null pour l'effacer. */
  setOverlay(rgba: Uint8Array | null) {
    this.overlay = rgba;
    if (!this.world) return;
    this.gl.deleteTexture(this.overlayTexture);
    this.overlayTexture = rgba
      ? this.dataTexture(this.world.gridWidth, this.world.gridHeight, rgba, this.gl.LINEAR)
      : this.dataTexture(1, 1, new Uint8Array([0, 0, 0, 0]));
    this.worldImageDirty = true;
  }

  setCamera(view: ViewBox) {
    this.view = view;
  }

  setSelection(cell: [number, number] | null, individualId: number | null) {
    this.selectedCell = cell ?? [-1, -1];
    this.selectedId = individualId;
  }

  setCreatures(unsorted: MapCreature[]) {
    // Les créatures du bas passent devant celles du haut.
    const creatures = [...unsorted].sort((a, b) => a.y - b.y);
    const now = performance.now();
    const t = this.interpolation(now);

    // Repart de la position affichée à l'instant même : aucun saut si un instantané
    // arrive en avance ou en retard.
    const oldIndex = new Map<number, number>();
    this.creatures.forEach((c, i) => oldIndex.set(c.id, i));

    const n = creatures.length;
    const fromX = new Float32Array(n);
    const fromY = new Float32Array(n);
    const facing = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      const old = oldIndex.get(c.id);
      if (old === undefined) {
        fromX[i] = c.x;
        fromY[i] = c.y;
        facing[i] = c.id % 2 === 0 ? 1 : -1;
        continue;
      }
      const before = this.creatures[old];
      const x = this.fromX[old] + (before.x - this.fromX[old]) * t;
      const y = this.fromY[old] + (before.y - this.fromY[old]) * t;
      fromX[i] = x;
      fromY[i] = y;
      const dx = c.x - x;
      facing[i] = Math.abs(dx) > 1e-3 ? Math.sign(dx) : this.facing[old];
    }

    if (this.lastSnapshotMs > 0) {
      const gap = now - this.lastSnapshotMs;
      if (gap > 30 && gap < 5000) this.snapshotIntervalMs = this.snapshotIntervalMs * 0.7 + gap * 0.3;
    }
    this.lastSnapshotMs = now;
    this.fromX = fromX;
    this.fromY = fromY;
    this.facing = facing;
    this.creatures = creatures;

    const needed = (n + 1) * FLOATS_PER_INSTANCE;
    if (this.instanceData.length < needed) this.instanceData = new Float32Array(Math.ceil(needed * 1.5));
  }

  /**
   * Plantes dessinées d'après l'état réel des cases. Chaque case a des emplacements fixes :
   * le niveau du moteur dit combien sont occupés, donc une case broutée perd vraiment des plantes.
   */
  setVegetation(cells: MapVegetationCell[]) {
    this.vegetation = cells;
    const world = this.world;
    if (!world) return;
    // Par paliers de 2,5 % : pas de reconstruction à chaque tick.
    const key = cells.map((c) => `${c.layer}.${Math.round(c.plants * 40)}`).join(',');
    if (key === this.vegetationKey) return;
    this.vegetationKey = key;

    const layerAt = (x: number, y: number) =>
      x < 0 || y < 0 || x >= world.gridWidth || y >= world.gridHeight ? -1 : world.layers[y * world.gridWidth + x];

    const placed: { y: number; values: number[] }[] = [];
    for (const cell of cells) {
      const flora = FLORA[cell.layer];
      if (!flora) continue;
      const level = Math.max(0, Math.min(1, cell.plants));
      const visible = Math.round(flora.slots * level);
      const hunger = 1 - level;
      for (let k = 0; k < visible; k++) {
        const u = hash(cell.gridX, cell.gridY, k, 1);
        const v = hash(cell.gridX, cell.gridY, k, 2);
        // Pas de plante au bord d'une case d'eau : le rivage dessiné ondule autour de ce bord.
        if (u < SHORE_MARGIN && layerAt(cell.gridX - 1, cell.gridY) >= 7) continue;
        if (u > 1 - SHORE_MARGIN && layerAt(cell.gridX + 1, cell.gridY) >= 7) continue;
        if (v < SHORE_MARGIN && layerAt(cell.gridX, cell.gridY - 1) >= 7) continue;
        if (v > 1 - SHORE_MARGIN && layerAt(cell.gridX, cell.gridY + 1) >= 7) continue;

        let pick = hash(cell.gridX, cell.gridY, k, 3);
        let kind = flora.kinds[flora.kinds.length - 1];
        for (const candidate of flora.kinds) {
          if (pick < candidate[1]) {
            kind = candidate;
            break;
          }
          pick -= candidate[1];
        }
        const scale = 0.8 + hash(cell.gridX, cell.gridY, k, 4) * 0.45;
        const half = kind[2] * scale;
        const shade = 0.82 + hash(cell.gridX, cell.gridY, k, 5) * 0.28;
        const x = (cell.gridX + u) * world.cellSize;
        const footY = (cell.gridY + v) * world.cellSize;
        const y = footY - half;
        const flip = hash(cell.gridX, cell.gridY, k, 6) < 0.5 ? -1 : 1;
        placed.push({
          y: footY,
          values: [
            x, y, half * flip, half,
            shade * (1 + (GRAZED_TINT[0] - 1) * hunger * 0.2) + hunger * GRAZED_TINT[0] * 0.5,
            shade * (1 + (GRAZED_TINT[1] - 1) * hunger * 0.2) + hunger * GRAZED_TINT[1] * 0.25,
            shade * (1 - hunger * 0.45),
            kind[0],
            u * 37.0, 0, 0, kind[3]
          ]
        });
      }
    }
    placed.sort((a, b) => a.y - b.y);
    const data = new Float32Array(placed.length * FLOATS_PER_INSTANCE);
    placed.forEach((p, i) => data.set(p.values, i * FLOATS_PER_INSTANCE));
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.propBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    this.propCount = placed.length;
  }

  /** Les morts : la chair se fonce, puis il ne reste que les os ; une proie mangée n'en laisse que les os. */
  setCorpses(corpses: MapCorpse[]) {
    const gl = this.gl;
    const flesh: number[] = [];
    const bones: number[] = [];
    for (const c of corpses) {
      const half = 0.7 + c.sizeScale * 1.1;
      const flip = c.id % 2 === 0 ? 1 : -1;
      if (c.eaten || c.age > FLESH_LIFETIME_TICKS) {
        const fade = 0.85 - 0.25 * Math.min(1, c.age / 300);
        bones.push(c.x, c.y, half * 0.8 * flip, half * 0.8, fade, fade, fade * 0.95, PropFrame.BONES, 0, 0, 0, 0);
        continue;
      }
      const rot = c.age / FLESH_LIFETIME_TICKS;
      // Le corps se couche sur le dos et vire au brun sombre en pourrissant.
      const dark = 1 - rot * 0.55;
      const decayed = (channel: number, brown: number) => (channel * 0.8 * (1 - rot) + brown * rot) * dark;
      flesh.push(
        c.x, c.y, half * flip, -half * 0.72,
        decayed(c.color[0], 0.42), decayed(c.color[1], 0.31), decayed(c.color[2], 0.2),
        creatureFrame(c.biologicalType, 0, 0),
        0, 0, 0, 0
      );
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.corpseBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flesh), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.boneBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bones), gl.DYNAMIC_DRAW);
    this.fleshCount = flesh.length / FLOATS_PER_INSTANCE;
    this.boneCount = bones.length / FLOATS_PER_INSTANCE;
  }

  private interpolation(now: number): number {
    if (this.lastSnapshotMs === 0) return 1;
    return Math.min(1, (now - this.lastSnapshotMs) / this.snapshotIntervalMs);
  }

  /** Individu le plus proche d'un point du monde, à portée du clic. */
  pickCreature(worldX: number, worldY: number): number | null {
    const t = this.interpolation(performance.now());
    const pixelsPerUnit = this.canvas.clientWidth / this.view.w;
    let bestId: number | null = null;
    let bestDistance = Infinity;
    for (let n = 0; n < this.creatures.length; n++) {
      const c = this.creatures[n];
      const x = this.fromX[n] + (c.x - this.fromX[n]) * t;
      const y = this.fromY[n] + (c.y - this.fromY[n]) * t;
      const reach = Math.max(this.halfSize(c, pixelsPerUnit), 6 / pixelsPerUnit);
      const d = (x - worldX) * (x - worldX) + (y - worldY) * (y - worldY);
      if (d <= reach * reach && d < bestDistance) {
        bestDistance = d;
        bestId = c.id;
      }
    }
    return bestId;
  }

  private halfSize(c: MapCreature, pixelsPerUnit: number): number {
    return Math.max(0.7 + c.sizeScale * 1.1, MIN_HALF_SIZE_PX / pixelsPerUnit);
  }

  /** Temps moyen de préparation et d'affichage d'une image, en millisecondes. */
  averageFrameMs(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(this.canvas.clientWidth * dpr);
    const height = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  }

  private frame = (now: number) => {
    if (this.lost) return;
    this.frameHandle = requestAnimationFrame(this.frame);
    if (this.lastFrameMs > 0) {
      this.frameTimes.push(now - this.lastFrameMs);
      if (this.frameTimes.length > 120) this.frameTimes.shift();
    }
    this.lastFrameMs = now;
    this.resize();
    if (!this.world) {
      this.gl.clearColor(0.098, 0.102, 0.098, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      return;
    }
    if (this.worldImageDirty && this.resourcesReady) this.renderWorldImage();
    const time = (now - this.startMs) / 1000;
    this.drawTerrain(time);
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
    this.drawNature(time);
    this.drawCreatures(time, now);
    this.gl.disable(this.gl.DEPTH_TEST);
  };

  /** Dessine tout le monde hors écran, pour la minicarte : le vrai terrain, sans créatures. */
  private renderWorldImage() {
    this.worldImageDirty = false;
    const world = this.world;
    if (!world || !this.onWorldImage) return;
    const gl = this.gl;
    const width = WORLD_IMAGE_WIDTH;
    const height = Math.round((width * world.gridHeight) / world.gridWidth);

    const target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    gl.viewport(0, 0, width, height);

    const view = this.view;
    const selected = this.selectedCell;
    this.view = { x: 0, y: 0, w: world.gridWidth * world.cellSize, h: world.gridHeight * world.cellSize };
    this.selectedCell = [-1, -1];
    this.drawTerrain(0);
    this.view = view;
    this.selectedCell = selected;

    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(target);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // WebGL lit les lignes de bas en haut.
    const flipped = new ImageData(width, height);
    for (let row = 0; row < height; row++) {
      flipped.data.set(pixels.subarray((height - 1 - row) * width * 4, (height - row) * width * 4), row * width * 4);
    }
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    output.getContext('2d')?.putImageData(flipped, 0, 0);
    this.onWorldImage(output.toDataURL('image/jpeg', 0.85));
  }

  private drawTerrain(time: number) {
    const gl = this.gl;
    const p = this.terrainProgram;
    const world = this.world!;
    gl.disable(gl.BLEND);
    gl.useProgram(p);
    gl.bindVertexArray(this.quad);
    gl.uniform4f(gl.getUniformLocation(p, 'uView'), this.view.x, this.view.y, this.view.w, this.view.h);
    gl.uniform2f(gl.getUniformLocation(p, 'uGrid'), world.gridWidth, world.gridHeight);
    gl.uniform1f(gl.getUniformLocation(p, 'uCellSize'), world.cellSize);
    gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time);
    gl.uniform2f(gl.getUniformLocation(p, 'uSelectedCell'), this.selectedCell[0], this.selectedCell[1]);

    const bind = (unit: number, target: number, texture: WebGLTexture, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, texture);
      gl.uniform1i(gl.getUniformLocation(p, name), unit);
    };
    bind(0, gl.TEXTURE_2D_ARRAY, this.colorArray, 'uColors');
    bind(1, gl.TEXTURE_2D_ARRAY, this.normalArray, 'uNormals');
    bind(2, gl.TEXTURE_2D, this.cellTexture, 'uCells');
    bind(3, gl.TEXTURE_2D, this.overlayTexture, 'uOverlay');
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Morts et plantes, avant les créatures : ce qu'ils cachent reste caché grâce à la profondeur. */
  private drawNature(time: number) {
    const gl = this.gl;
    const p = this.creatureProgram;
    gl.useProgram(p);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(p, 'uAtlas'), 0);
    gl.uniform4f(gl.getUniformLocation(p, 'uView'), this.view.x, this.view.y, this.view.w, this.view.h);
    gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(p, 'uFur'), 0);
    gl.uniform1f(gl.getUniformLocation(p, 'uShadow'), 0);
    gl.uniform1f(gl.getUniformLocation(p, 'uProp'), 1);
    gl.disable(gl.DEPTH_TEST);

    const useProps = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.propAtlas);
      gl.uniform2f(gl.getUniformLocation(p, 'uAtlasGrid'), PROP_COLUMNS, PROP_ROWS);
      gl.uniform1f(gl.getUniformLocation(p, 'uShadowFrame'), PropFrame.SHADOW);
    };
    useProps();
    if (this.boneCount > 0) {
      gl.bindVertexArray(this.boneVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.boneCount);
    }
    if (this.fleshCount > 0) {
      gl.bindTexture(gl.TEXTURE_2D, this.atlas);
      gl.uniform2f(gl.getUniformLocation(p, 'uAtlasGrid'), ATLAS_COLUMNS, ATLAS_ROWS);
      gl.bindVertexArray(this.corpseVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.fleshCount);
      useProps();
    }

    if (this.propCount > 0) {
      gl.bindVertexArray(this.propVao);
      gl.uniform1f(gl.getUniformLocation(p, 'uShadow'), 1);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.propCount);
      gl.uniform1f(gl.getUniformLocation(p, 'uShadow'), 0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.propCount);
    }
    gl.uniform1f(gl.getUniformLocation(p, 'uProp'), 0);
    gl.bindVertexArray(null);
  }

  private drawCreatures(time: number, now: number) {
    const gl = this.gl;
    const data = this.instanceData;
    const t = this.interpolation(now);
    const pixelsPerUnit = this.canvas.clientWidth / this.view.w;
    let count = 0;
    let ringIndex = -1;

    const margin = 4;
    const minX = this.view.x - margin;
    const maxX = this.view.x + this.view.w + margin;
    const minY = this.view.y - margin;
    const maxY = this.view.y + this.view.h + margin;

    for (let n = 0; n < this.creatures.length; n++) {
      const c = this.creatures[n];
      const x = this.fromX[n] + (c.x - this.fromX[n]) * t;
      const y = this.fromY[n] + (c.y - this.fromY[n]) * t;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      const half = this.halfSize(c, pixelsPerUnit);
      const moving = t < 1 && (c.x !== this.fromX[n] || c.y !== this.fromY[n]) ? 1 : 0;
      const i = count * FLOATS_PER_INSTANCE;
      data[i] = x;
      data[i + 1] = y;
      data[i + 2] = half * (1 + (c.elongation - 0.5) * 0.4) * this.facing[n];
      const furry = hasFur(c.biologicalType);
      // Sans poils, l'isolation se voit à l'embonpoint : graisse d'un poisson, manteau d'un mollusque.
      data[i + 3] = half * (1 - (c.elongation - 0.5) * 0.25) * (furry ? 1 : 1 + c.insulation * 0.22);
      data[i + 4] = c.color[0];
      data[i + 5] = c.color[1];
      data[i + 6] = c.color[2];
      data[i + 7] = creatureFrame(c.biologicalType, c.ornamentTier, c.patternTier);
      data[i + 8] = c.id * 0.37;
      data[i + 9] = moving;
      data[i + 10] = furFrame(c.biologicalType);
      data[i + 11] = furry ? Math.min(1, Math.max(0, (c.insulation - 0.1) / 0.6)) : 0;
      if (c.id === this.selectedId) ringIndex = count;
      count++;
    }

    // Anneau de sélection, ajouté en dernière instance.
    if (ringIndex >= 0 && (count + 1) * FLOATS_PER_INSTANCE <= data.length) {
      const from = ringIndex * FLOATS_PER_INSTANCE;
      const i = count * FLOATS_PER_INSTANCE;
      const radius = Math.max(Math.abs(data[from + 2]), data[from + 3]) * 1.25;
      data[i] = data[from];
      data[i + 1] = data[from + 1];
      data[i + 2] = radius;
      data[i + 3] = radius;
      data[i + 4] = 0.9;
      data[i + 5] = 0.82;
      data[i + 6] = 0.57;
      data[i + 7] = RING_FRAME;
      data[i + 8] = 0;
      data[i + 9] = 0;
      data[i + 10] = 0;
      data[i + 11] = 0;
    }

    if (count === 0) return;

    const p = this.creatureProgram;
    gl.useProgram(p);
    gl.bindVertexArray(this.creatureVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const withRing = ringIndex >= 0 ? count + 1 : count;
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, withRing * FLOATS_PER_INSTANCE), gl.DYNAMIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // Les créatures passent derrière les plantes plus proches, sans se cacher entre elles.
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.uniform1i(gl.getUniformLocation(p, 'uAtlas'), 0);
    gl.uniform4f(gl.getUniformLocation(p, 'uView'), this.view.x, this.view.y, this.view.w, this.view.h);
    gl.uniform2f(gl.getUniformLocation(p, 'uAtlasGrid'), ATLAS_COLUMNS, ATLAS_ROWS);
    gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(p, 'uShadowFrame'), SHADOW_FRAME);

    // Les ombres d'abord, pour qu'elles restent sous toutes les créatures.
    gl.uniform1f(gl.getUniformLocation(p, 'uFur'), 0);
    if (count <= SHADOW_MAX_COUNT || pixelsPerUnit >= SHADOW_MIN_PIXELS_PER_UNIT) {
      gl.uniform1f(gl.getUniformLocation(p, 'uShadow'), 1);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.uniform1f(gl.getUniformLocation(p, 'uShadow'), 0);
    // Les poils sous le corps ; invisibles de loin, donc pas dessinés.
    if (pixelsPerUnit >= SHADOW_MIN_PIXELS_PER_UNIT) {
      gl.uniform1f(gl.getUniformLocation(p, 'uFur'), 1);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.uniform1f(gl.getUniformLocation(p, 'uFur'), 0);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, withRing);
    gl.depthMask(true);
    gl.bindVertexArray(null);
  }
}
