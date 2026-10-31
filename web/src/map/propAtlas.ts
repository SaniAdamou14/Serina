/**
 * Atlas de la nature, dessiné une fois au démarrage : plantes vues de profil, os et ombre.
 * Les couleurs sont celles de l'image ; le rendu ne fait que les assombrir ou les jaunir
 * selon l'état réel de la case (setVegetation dans mapRenderer.ts).
 */
const CELL_PX = 256;

export const PROP_COLUMNS = 6;
export const PROP_ROWS = 2;

export const PropFrame = {
  TUFT: 0,
  BUSH: 1,
  BROADLEAF: 2,
  CONIFER: 3,
  PALM: 4,
  REED: 5,
  DRY_SHRUB: 6,
  CACTUS: 7,
  LICHEN: 8,
  BONES: 9,
  SHADOW: 10
} as const;

type Ctx = CanvasRenderingContext2D;

/** Générateur local : l'atlas reste identique d'un chargement à l'autre. */
function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function trunk(ctx: Ctx, topY: number, bottomWidth: number, topWidth: number) {
  const gradient = ctx.createLinearGradient(-bottomWidth, 0, bottomWidth, 0);
  gradient.addColorStop(0, '#6e5236');
  gradient.addColorStop(0.55, '#4f3a26');
  gradient.addColorStop(1, '#33261a');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-bottomWidth, 0.98);
  ctx.quadraticCurveTo(-topWidth, 0.5, -topWidth, topY);
  ctx.lineTo(topWidth, topY);
  ctx.quadraticCurveTo(topWidth, 0.5, bottomWidth, 0.98);
  ctx.closePath();
  ctx.fill();
}

/** Feuillage en amas : foncé dessous et à droite, clair vers le soleil, en haut à gauche. */
function foliage(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, palette: string[], seed: number, count = 150) {
  const rand = random(seed);
  for (let layer = 0; layer < palette.length; layer++) {
    const lift = layer / Math.max(palette.length - 1, 1);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = Math.sqrt(rand()) * (1 - lift * 0.45);
      const x = cx + Math.cos(angle) * distance * rx - lift * rx * 0.22;
      const y = cy + Math.sin(angle) * distance * ry - lift * ry * 0.28;
      const size = (0.028 + rand() * 0.04) * (rx + ry);
      blob(ctx, x, y, size, size * 0.85, palette[layer]);
    }
  }
}

function blade(ctx: Ctx, baseX: number, height: number, lean: number, width: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(baseX - width, 0.98);
  ctx.quadraticCurveTo(baseX - width + lean * 0.4, 0.98 - height * 0.6, baseX + lean, 0.98 - height);
  ctx.quadraticCurveTo(baseX + width + lean * 0.4, 0.98 - height * 0.6, baseX + width, 0.98);
  ctx.closePath();
  ctx.fill();
}

function drawTuft(ctx: Ctx) {
  const rand = random(11);
  const colors = ['#46592c', '#566b33', '#6a7f3d', '#82944c'];
  for (let i = 0; i < 46; i++) {
    const x = (rand() - 0.5) * 1.3;
    const height = (0.5 + rand() * 0.8) * (1 - Math.abs(x) * 0.8);
    blade(ctx, x, height, (rand() - 0.5) * 0.5, 0.025 + rand() * 0.02, colors[Math.floor((i / 46) * colors.length)]);
  }
}

function drawBush(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = '#3b2c1c';
  ctx.fillRect(-0.05, 0.6, 0.1, 0.38);
  ctx.restore();
  foliage(ctx, 0, 0.3, 0.82, 0.62, ['#26361f', '#35482a', '#4a5f33', '#65793f'], 21);
}

function drawBroadleaf(ctx: Ctx) {
  trunk(ctx, -0.1, 0.13, 0.07);
  foliage(ctx, -0.28, -0.3, 0.52, 0.42, ['#20301c', '#2f4324', '#42592c'], 32, 90);
  foliage(ctx, 0.3, -0.26, 0.5, 0.4, ['#20301c', '#2f4324', '#42592c'], 33, 90);
  foliage(ctx, 0, -0.5, 0.74, 0.46, ['#20301c', '#2f4324', '#425a2d', '#5a7338', '#768c48'], 31, 170);
}

function drawConifer(ctx: Ctx) {
  trunk(ctx, 0.4, 0.08, 0.04);
  const rand = random(41);
  const shades = ['#16271c', '#1c3023', '#24392a', '#2d4431', '#3a5339'];
  // Du bas vers le haut, chaque rameau tombe un peu, plus clair côté soleil.
  for (let i = 0; i < 520; i++) {
    const t = Math.sqrt(rand());
    const height = 0.72 - (1 - t) * 1.66;
    const spread = 0.66 * t + 0.015;
    const side = rand() * 2 - 1;
    const x = side * spread;
    const y = height + rand() * 0.06;
    const lit = Math.max(0, Math.min(1, 0.45 - side * 0.5 + (rand() - 0.5) * 0.5));
    ctx.strokeStyle = shades[Math.floor(lit * (shades.length - 0.01))];
    ctx.lineWidth = 0.022 + rand() * 0.018;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x * 0.25, y - 0.1);
    ctx.quadraticCurveTo(x * 0.7, y - 0.07, x, y + 0.03);
    ctx.stroke();
  }
}

function drawPalm(ctx: Ctx) {
  ctx.strokeStyle = '#6a5136';
  ctx.lineWidth = 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.06, 0.98);
  ctx.quadraticCurveTo(-0.14, 0.2, 0.06, -0.42);
  ctx.stroke();
  const fronds = [-2.9, -2.45, -2.0, -1.55, -1.1, -0.65, -0.2];
  fronds.forEach((angle, i) => {
    const length = 0.82 + (i % 2) * 0.1;
    const tipX = 0.06 + Math.cos(angle) * length;
    const tipY = -0.42 + Math.sin(angle) * length * 0.55 + 0.34;
    const midX = 0.06 + Math.cos(angle) * length * 0.55;
    const midY = -0.42 + Math.sin(angle) * length * 0.6;
    ctx.fillStyle = i % 2 === 0 ? '#2d4f27' : '#456a33';
    ctx.beginPath();
    ctx.moveTo(0.06, -0.42);
    ctx.quadraticCurveTo(midX, midY - 0.14, tipX, tipY);
    ctx.quadraticCurveTo(midX, midY + 0.12, 0.06, -0.42);
    ctx.closePath();
    ctx.fill();
  });
}

function drawReed(ctx: Ctx) {
  const rand = random(51);
  for (let i = 0; i < 24; i++) {
    const x = (rand() - 0.5) * 1.1;
    const height = 1.1 + rand() * 0.8;
    const lean = (rand() - 0.5) * 0.3;
    blade(ctx, x, height, lean, 0.016, i % 3 === 0 ? '#7f9050' : '#5f7a3d');
    if (i % 3 === 0) blob(ctx, x + lean, 0.98 - height + 0.08, 0.035, 0.12, '#5a3d24');
  }
}

function drawDryShrub(ctx: Ctx) {
  const rand = random(61);
  ctx.strokeStyle = '#6d5a3c';
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const angle = -Math.PI * (0.12 + rand() * 0.76);
    const length = 0.5 + rand() * 0.75;
    const x = Math.cos(angle) * length;
    const y = 0.98 + Math.sin(angle) * length;
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.moveTo(0, 0.98);
    ctx.quadraticCurveTo(x * 0.4, y + 0.2, x, y);
    ctx.stroke();
    blob(ctx, x, y, 0.05, 0.035, i % 2 === 0 ? '#8e8a52' : '#a39a5e');
  }
}

function drawCactus(ctx: Ctx) {
  const limb = (x1: number, y1: number, x2: number, y2: number, width: number) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f5c37';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = '#5a8f55';
    ctx.lineWidth = width * 0.35;
    ctx.beginPath();
    ctx.moveTo(x1 - width * 0.22, y1);
    ctx.lineTo(x2 - width * 0.22, y2);
    ctx.stroke();
  };
  limb(0, 0.95, 0, -0.75, 0.26);
  limb(-0.42, 0.1, -0.42, -0.35, 0.16);
  limb(-0.42, 0.14, -0.02, 0.14, 0.14);
  limb(0.42, -0.1, 0.42, -0.5, 0.15);
  limb(0.42, -0.06, 0.02, -0.06, 0.13);
}

function drawLichen(ctx: Ctx) {
  const rand = random(71);
  for (let i = 0; i < 9; i++) {
    const x = (rand() - 0.5) * 1.5;
    const y = 0.62 + rand() * 0.3;
    foliage(ctx, x, y, 0.1 + rand() * 0.12, 0.05 + rand() * 0.05, ['#3f4633', '#5a6146', '#7a7d58'], 72 + i, 14);
  }
}

function drawBones(ctx: Ctx) {
  const bone = '#d9d1b8';
  const shade = '#8d8570';
  // Colonne.
  ctx.strokeStyle = shade;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.12;
  ctx.beginPath();
  ctx.moveTo(-0.62, 0.42);
  ctx.quadraticCurveTo(-0.05, 0.22, 0.42, 0.44);
  ctx.stroke();
  ctx.strokeStyle = bone;
  ctx.lineWidth = 0.075;
  ctx.stroke();
  // Côtes.
  for (let i = 0; i < 6; i++) {
    const x = -0.46 + i * 0.13;
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = shade;
    ctx.beginPath();
    ctx.moveTo(x, 0.33);
    ctx.quadraticCurveTo(x + 0.14, 0.02, x + 0.03, -0.1);
    ctx.stroke();
    ctx.lineWidth = 0.032;
    ctx.strokeStyle = bone;
    ctx.stroke();
  }
  // Crâne.
  blob(ctx, 0.62, 0.34, 0.24, 0.19, shade);
  blob(ctx, 0.61, 0.32, 0.21, 0.16, bone);
  blob(ctx, 0.66, 0.3, 0.05, 0.05, '#3a3226');
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.moveTo(0.76, 0.26);
  ctx.lineTo(0.98, 0.42);
  ctx.lineTo(0.74, 0.44);
  ctx.closePath();
  ctx.fill();
}

const DRAWERS: Record<number, (ctx: Ctx) => void> = {
  [PropFrame.TUFT]: drawTuft,
  [PropFrame.BUSH]: drawBush,
  [PropFrame.BROADLEAF]: drawBroadleaf,
  [PropFrame.CONIFER]: drawConifer,
  [PropFrame.PALM]: drawPalm,
  [PropFrame.REED]: drawReed,
  [PropFrame.DRY_SHRUB]: drawDryShrub,
  [PropFrame.CACTUS]: drawCactus,
  [PropFrame.LICHEN]: drawLichen,
  [PropFrame.BONES]: drawBones
};

export function buildPropAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PROP_COLUMNS * CELL_PX;
  canvas.height = PROP_ROWS * CELL_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');

  const inCell = (frame: number, draw: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect((frame % PROP_COLUMNS) * CELL_PX, Math.floor(frame / PROP_COLUMNS) * CELL_PX, CELL_PX, CELL_PX);
    ctx.clip();
    ctx.translate(((frame % PROP_COLUMNS) + 0.5) * CELL_PX, (Math.floor(frame / PROP_COLUMNS) + 0.5) * CELL_PX);
    ctx.scale(CELL_PX / 2.04, CELL_PX / 2.04);
    draw();
    ctx.restore();
  };

  Object.entries(DRAWERS).forEach(([frame, draw]) => inCell(Number(frame), () => draw(ctx)));
  inCell(PropFrame.SHADOW, () => {
    const gradient = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  return canvas;
}
