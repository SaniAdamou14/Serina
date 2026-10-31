/**
 * Atlas des créatures, dessiné une fois au démarrage : vues de profil, tête vers la droite,
 * avec un contour épais, comme les animaux de RimWorld. Le rendu les retourne selon le sens
 * de la marche et alterne deux images pour les pattes.
 *
 * Les parties grises prennent la teinte de la lignée ; les parties colorées (bec, pattes,
 * yeux) gardent leur couleur. Variantes : ornementation et motif, projections réelles du
 * génome (IndividualSnapshot dans WorldSimulation.hpp).
 */
const CELL_PX = 192;
const ORNAMENTS = 4;
const PATTERNS = 3;
const GROUPS = 4;
const WALK_FRAMES = 2;

export const ATLAS_COLUMNS = ORNAMENTS * PATTERNS;
export const ATLAS_ROWS = GROUPS * WALK_FRAMES + 1;
const LAST_ROW = (ATLAS_ROWS - 1) * ATLAS_COLUMNS;
/** Anneau de sélection et ombre au sol, sur la dernière ligne. */
export const RING_FRAME = LAST_ROW;
export const SHADOW_FRAME = LAST_ROW + 1;

/** Première image de marche ; la seconde est juste en dessous (voir le vertex shader). */
export function creatureFrame(biologicalType: number, ornamentTier: number, patternTier: number): number {
  // Groupes sans silhouette dédiée : même repli que CreatureIcon.tsx.
  const group = biologicalType >= 0 && biologicalType < GROUPS ? biologicalType : 2;
  const ornament = Math.max(0, Math.min(ORNAMENTS - 1, ornamentTier));
  const pattern = Math.max(0, Math.min(PATTERNS - 1, Math.floor(patternTier / 2)));
  return group * WALK_FRAMES * ATLAS_COLUMNS + ornament * PATTERNS + pattern;
}

type Ctx = CanvasRenderingContext2D;

const OUTLINE = 'rgb(22,20,18)';
const OUTLINE_WIDTH = 0.045;

function gray(v: number): string {
  return `rgb(${v},${v},${v})`;
}

function shaded(ctx: Ctx, x: number, y: number, r: number, light: number, dark: number): CanvasGradient {
  // Lumière venant du haut, comme le soleil du terrain.
  const gradient = ctx.createLinearGradient(x, y - r, x, y + r);
  gradient.addColorStop(0, gray(light));
  gradient.addColorStop(1, gray(dark));
  return gradient;
}

function stroke(ctx: Ctx, width = OUTLINE_WIDTH, color = OUTLINE) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, angle = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
}

function line(ctx: Ctx, points: [number, number][]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
}

function eye(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgb(12,10,8)';
  ellipse(ctx, x, y, r, r);
  ctx.fill();
  ctx.fillStyle = 'rgb(240,235,225)';
  ellipse(ctx, x + r * 0.3, y - r * 0.35, r * 0.3, r * 0.3);
  ctx.fill();
}

function drawBird(ctx: Ctx, ornament: number, pattern: number, walk: number) {
  const LEG = 'rgb(176,120,66)';
  const swing = walk === 0 ? 0.08 : -0.08;

  // Patte arrière, puis queue
  line(ctx, [[-0.05, 0.42], [-0.08 - swing, 0.66], [-0.02 - swing, 0.84]]);
  stroke(ctx, 0.07);
  line(ctx, [[-0.05, 0.42], [-0.08 - swing, 0.66], [-0.02 - swing, 0.84]]);
  stroke(ctx, 0.035, LEG);

  ctx.beginPath();
  ctx.moveTo(-0.42, 0.02);
  ctx.quadraticCurveTo(-0.72, 0.05, -0.97, 0.3);
  ctx.lineTo(-0.82, 0.36);
  ctx.quadraticCurveTo(-0.6, 0.26, -0.36, 0.26);
  ctx.closePath();
  ctx.fillStyle = gray(120);
  ctx.fill();
  stroke(ctx);

  // Corps : dos sombre, ventre clair
  ctx.beginPath();
  ctx.moveTo(-0.5, 0.12);
  ctx.bezierCurveTo(-0.45, -0.3, 0.1, -0.42, 0.42, -0.2);
  ctx.bezierCurveTo(0.56, 0.1, 0.34, 0.5, -0.05, 0.5);
  ctx.bezierCurveTo(-0.3, 0.5, -0.46, 0.34, -0.5, 0.12);
  ctx.closePath();
  ctx.fillStyle = shaded(ctx, 0, 0.05, 0.46, 205, 250);
  ctx.fill();
  stroke(ctx);

  // Tête
  ellipse(ctx, 0.48, -0.32, 0.25, 0.24);
  ctx.fillStyle = shaded(ctx, 0.48, -0.32, 0.25, 215, 245);
  ctx.fill();
  stroke(ctx);

  // Bec, qui garde sa couleur
  ctx.beginPath();
  ctx.moveTo(0.69, -0.39);
  ctx.lineTo(0.96, -0.29);
  ctx.lineTo(0.69, -0.23);
  ctx.closePath();
  ctx.fillStyle = 'rgb(226,152,48)';
  ctx.fill();
  stroke(ctx, 0.035);
  eye(ctx, 0.55, -0.37, 0.05);

  // Aile et ses plumes
  ctx.beginPath();
  ctx.moveTo(0.22, -0.1);
  ctx.bezierCurveTo(-0.05, -0.18, -0.42, -0.02, -0.66, 0.2);
  ctx.bezierCurveTo(-0.34, 0.3, 0.1, 0.26, 0.22, -0.1);
  ctx.closePath();
  ctx.fillStyle = shaded(ctx, -0.2, 0.05, 0.28, 150, 105);
  ctx.fill();
  stroke(ctx);
  for (let i = 0; i < 2 + pattern * 2; i++) {
    const t = (i + 1) / (3 + pattern * 2);
    line(ctx, [[0.1 - t * 0.6, -0.02 + t * 0.08], [-0.12 - t * 0.5, 0.14 + t * 0.06]]);
    stroke(ctx, 0.018, 'rgba(25,22,20,0.65)');
  }

  // Crête
  for (let i = 0; i < ornament; i++) {
    ctx.beginPath();
    ctx.moveTo(0.42 - i * 0.09, -0.52);
    ctx.lineTo(0.34 - i * 0.12, -0.74 + i * 0.03);
    ctx.lineTo(0.3 - i * 0.09, -0.48);
    ctx.closePath();
    ctx.fillStyle = gray(165);
    ctx.fill();
    stroke(ctx, 0.03);
  }

  // Patte avant
  line(ctx, [[0.08, 0.46], [0.1 + swing, 0.68], [0.2 + swing, 0.84]]);
  stroke(ctx, 0.07);
  line(ctx, [[0.08, 0.46], [0.1 + swing, 0.68], [0.2 + swing, 0.84]]);
  stroke(ctx, 0.035, LEG);
}

function drawFish(ctx: Ctx, ornament: number, pattern: number, walk: number) {
  const flap = walk === 0 ? 0.1 : -0.1;

  // Queue, qui bat
  ctx.beginPath();
  ctx.moveTo(-0.52, 0.03);
  ctx.quadraticCurveTo(-0.76, -0.1 + flap, -0.98, -0.38 + flap);
  ctx.quadraticCurveTo(-0.86, 0.04 + flap, -0.98, 0.44 + flap);
  ctx.quadraticCurveTo(-0.76, 0.16 + flap, -0.52, 0.03);
  ctx.closePath();
  ctx.fillStyle = gray(130);
  ctx.fill();
  stroke(ctx);

  // Dorsale, plus haute selon l'ornementation
  ctx.beginPath();
  ctx.moveTo(0.26, -0.3);
  ctx.quadraticCurveTo(-0.05, -0.52 - ornament * 0.07, -0.38, -0.16);
  ctx.lineTo(0.2, -0.2);
  ctx.closePath();
  ctx.fillStyle = gray(125);
  ctx.fill();
  stroke(ctx);

  // Ventrale
  ctx.beginPath();
  ctx.moveTo(0.12, 0.3);
  ctx.quadraticCurveTo(-0.02, 0.5, -0.24, 0.42);
  ctx.lineTo(-0.2, 0.22);
  ctx.closePath();
  ctx.fillStyle = gray(135);
  ctx.fill();
  stroke(ctx);

  // Corps fuselé, dos sombre et ventre clair
  ctx.beginPath();
  ctx.moveTo(0.92, 0.02);
  ctx.bezierCurveTo(0.6, -0.42, -0.25, -0.38, -0.58, 0.03);
  ctx.bezierCurveTo(-0.25, 0.4, 0.6, 0.42, 0.92, 0.02);
  ctx.closePath();
  ctx.fillStyle = shaded(ctx, 0.1, 0.02, 0.34, 150, 255);
  ctx.fill();
  stroke(ctx);

  // Bandes
  for (let i = 0; i < pattern * 2; i++) {
    const x = 0.28 - i * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, -0.27);
    ctx.quadraticCurveTo(x - 0.05, 0, x, 0.27);
    stroke(ctx, 0.04, 'rgba(25,22,20,0.45)');
  }

  // Ouïe, nageoire pectorale, œil
  ctx.beginPath();
  ctx.moveTo(0.48, -0.17);
  ctx.quadraticCurveTo(0.38, 0.03, 0.48, 0.2);
  stroke(ctx, 0.022, 'rgba(25,22,20,0.7)');
  ctx.beginPath();
  ctx.moveTo(0.34, 0.08);
  ctx.quadraticCurveTo(0.14, 0.2 + flap, 0.06, 0.28 + flap);
  ctx.quadraticCurveTo(0.2, 0.3, 0.38, 0.17);
  ctx.closePath();
  ctx.fillStyle = gray(145);
  ctx.fill();
  stroke(ctx, 0.03);
  eye(ctx, 0.64, -0.06, 0.055);
}

function drawArthropod(ctx: Ctx, ornament: number, pattern: number, walk: number) {
  const LEG = 'rgb(58,42,30)';
  const legs = (offsets: number[], width: number, color: string) => {
    [0.4, 0.14, -0.14].forEach((x, i) => {
      const s = offsets[i];
      // La patte arrière, repliée en Z, évoque le grillon.
      const knee: [number, number] = i === 2 ? [x - 0.22 + s, 0.0] : [x + 0.02 + s, 0.42];
      const foot: [number, number] = i === 2 ? [x - 0.42 + s, 0.72] : [x + 0.12 + s, 0.76];
      line(ctx, [[x, 0.18], knee, foot]);
      stroke(ctx, width, color);
    });
  };
  const near = walk === 0 ? [0.06, -0.06, 0.06] : [-0.06, 0.06, -0.06];
  const far = walk === 0 ? [-0.06, 0.06, -0.06] : [0.06, -0.06, 0.06];

  // Pattes du côté opposé
  legs(far, 0.05, LEG);

  // Abdomen segmenté
  ellipse(ctx, -0.4, 0.13, 0.45, 0.27, 0.08);
  ctx.fillStyle = shaded(ctx, -0.4, 0.13, 0.27, 175, 110);
  ctx.fill();
  stroke(ctx);
  for (let i = 0; i < 2 + pattern * 2; i++) {
    const x = -0.14 - i * 0.12;
    ctx.beginPath();
    ctx.moveTo(x, -0.1);
    ctx.quadraticCurveTo(x - 0.05, 0.14, x, 0.36);
    stroke(ctx, 0.02, 'rgba(20,18,16,0.6)');
  }

  // Thorax et tête
  ellipse(ctx, 0.18, 0.04, 0.27, 0.2);
  ctx.fillStyle = shaded(ctx, 0.18, 0.04, 0.2, 190, 115);
  ctx.fill();
  stroke(ctx);
  ellipse(ctx, 0.56, -0.02, 0.2, 0.18);
  ctx.fillStyle = shaded(ctx, 0.56, -0.02, 0.18, 195, 120);
  ctx.fill();
  stroke(ctx);

  // Antennes
  for (const [dx, dy] of [[0.3, -0.48], [0.4, -0.3]]) {
    ctx.beginPath();
    ctx.moveTo(0.66, -0.14);
    ctx.quadraticCurveTo(0.72 + dx * 0.3, -0.34, 0.66 + dx, -0.14 + dy);
    stroke(ctx, 0.025, LEG);
  }

  // Mandibules
  for (let i = 0; i < ornament; i++) {
    line(ctx, [[0.72, 0.05 + i * 0.02], [0.88 + i * 0.02, 0.09 + i * 0.03]]);
    stroke(ctx, 0.032, LEG);
  }

  eye(ctx, 0.63, -0.06, 0.05);

  // Pattes du côté proche
  legs(near, 0.055, LEG);
}

function drawMollusc(ctx: Ctx, ornament: number, pattern: number, walk: number) {
  const stretch = walk === 0 ? 0 : 0.05;
  const SKIN = 'rgb(150,126,92)';

  // Pied qui rampe, couleur chair
  ctx.beginPath();
  ctx.moveTo(-0.88 - stretch, 0.72);
  ctx.bezierCurveTo(-0.3, 0.32, 0.3, 0.32, 0.56, 0.12);
  ctx.bezierCurveTo(0.68, -0.1, 0.9, -0.1, 0.9 + stretch, 0.14);
  ctx.bezierCurveTo(0.92, 0.5, 0.74, 0.72, 0.4, 0.74);
  ctx.closePath();
  ctx.fillStyle = SKIN;
  ctx.fill();
  stroke(ctx);

  // Tentacules oculaires
  for (const [dx, dy] of [[0.1, -0.42], [0.28, -0.34]]) {
    ctx.beginPath();
    ctx.moveTo(0.78, -0.04);
    ctx.quadraticCurveTo(0.8 + dx * 0.5, -0.2, 0.78 + dx, -0.04 + dy);
    stroke(ctx, 0.07);
    ctx.beginPath();
    ctx.moveTo(0.78, -0.04);
    ctx.quadraticCurveTo(0.8 + dx * 0.5, -0.2, 0.78 + dx, -0.04 + dy);
    stroke(ctx, 0.034, SKIN);
    eye(ctx, 0.78 + dx, -0.04 + dy, 0.04);
  }

  // Coquille
  ellipse(ctx, -0.14, 0.08, 0.58, 0.52);
  ctx.fillStyle = shaded(ctx, -0.14, 0.08, 0.55, 245, 145);
  ctx.fill();
  stroke(ctx);

  // Bandes de la coquille
  for (let i = 0; i < pattern; i++) {
    ellipse(ctx, -0.14, 0.08, 0.5 - i * 0.14, 0.44 - i * 0.12);
    stroke(ctx, 0.05, 'rgba(25,22,20,0.28)');
  }

  // Spirale
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const a = t * Math.PI * 5.4 + 0.6;
    const r = 0.5 * (1 - t) ** 1.1;
    const x = -0.14 + Math.cos(a) * r;
    const y = 0.08 + Math.sin(a) * r * 0.9;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  stroke(ctx, 0.032, 'rgba(22,20,18,0.8)');

  // Excroissances
  for (let i = 0; i < ornament * 3; i++) {
    const a = -Math.PI * 0.95 + (i / Math.max(1, ornament * 3)) * Math.PI * 0.9;
    ellipse(ctx, -0.14 + Math.cos(a) * 0.58, 0.08 + Math.sin(a) * 0.52, 0.045, 0.045);
    ctx.fillStyle = gray(190);
    ctx.fill();
    stroke(ctx, 0.02);
  }
}

const DRAWERS = [drawBird, drawFish, drawArthropod, drawMollusc];

export function buildCreatureAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLUMNS * CELL_PX;
  canvas.height = ATLAS_ROWS * CELL_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');

  const inCell = (frame: number, draw: () => void) => {
    ctx.save();
    ctx.translate(((frame % ATLAS_COLUMNS) + 0.5) * CELL_PX, (Math.floor(frame / ATLAS_COLUMNS) + 0.5) * CELL_PX);
    ctx.scale(CELL_PX / 2.04, CELL_PX / 2.04);
    draw();
    ctx.restore();
  };

  for (let group = 0; group < GROUPS; group++) {
    for (let ornament = 0; ornament < ORNAMENTS; ornament++) {
      for (let pattern = 0; pattern < PATTERNS; pattern++) {
        const frame = creatureFrame(group, ornament, pattern * 2);
        for (let walk = 0; walk < WALK_FRAMES; walk++) {
          inCell(frame + walk * ATLAS_COLUMNS, () => DRAWERS[group](ctx, ornament, pattern, walk));
        }
      }
    }
  }

  inCell(RING_FRAME, () => {
    ellipse(ctx, 0, 0, 0.92, 0.92);
    stroke(ctx, 0.06, 'rgb(255,255,255)');
  });
  inCell(SHADOW_FRAME, () => {
    const gradient = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ellipse(ctx, 0, 0, 1, 1);
    ctx.fill();
  });
  return canvas;
}
