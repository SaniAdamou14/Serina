/**
 * Caméra de la carte : un rectangle du monde, toujours au format de l'écran. Sinon
 * le navigateur ajoute des bandes et le curseur ne correspond plus au monde, ce qui
 * faisait glisser la carte sous la souris.
 */
export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorldSize {
  width: number;
  height: number;
}

/** Zoom maximal : largeur visible la plus petite, en fraction de la largeur du monde. */
const MIN_VIEW_FRACTION = 0.06;

/** Largeur de vue qui montre tout le monde : le plus grand dézoom autorisé. */
function fitWidth(world: WorldSize, aspect: number): number {
  return Math.max(world.width, world.height * aspect);
}

function clampAxis(position: number, size: number, worldSize: number): number {
  // Vue plus grande que le monde sur cet axe : toujours centrée, jamais déplaçable.
  if (size >= worldSize) return (worldSize - size) / 2;
  return Math.min(worldSize - size, Math.max(0, position));
}

export function clampCamera(view: ViewBox, world: WorldSize, aspect: number): ViewBox {
  const w = Math.min(fitWidth(world, aspect), Math.max(world.width * MIN_VIEW_FRACTION, view.w));
  const h = w / aspect;
  return { x: clampAxis(view.x, w, world.width), y: clampAxis(view.y, h, world.height), w, h };
}

/** Vue d'ensemble : tout le monde visible, centré. */
export function fitCamera(world: WorldSize, aspect: number): ViewBox {
  return clampCamera({ x: 0, y: 0, w: fitWidth(world, aspect), h: 0 }, world, aspect);
}

/** Zoome en gardant fixe le point du monde situé sous l'ancre (fractions de l'écran). */
export function zoomCamera(view: ViewBox, factor: number, anchorX: number, anchorY: number, world: WorldSize, aspect: number): ViewBox {
  const worldX = view.x + anchorX * view.w;
  const worldY = view.y + anchorY * view.h;
  const w = view.w * factor;
  const h = w / aspect;
  return clampCamera({ x: worldX - anchorX * w, y: worldY - anchorY * h, w, h }, world, aspect);
}

/** Centre la vue sur un point du monde, sans changer le zoom. */
export function centerCamera(view: ViewBox, worldX: number, worldY: number, world: WorldSize, aspect: number): ViewBox {
  return clampCamera({ ...view, x: worldX - view.w / 2, y: worldY - view.h / 2 }, world, aspect);
}

/** Niveau de zoom affiché : 100 % correspond à la vue d'ensemble. */
export function zoomLevel(view: ViewBox, world: WorldSize, aspect: number): number {
  return fitWidth(world, aspect) / view.w;
}
