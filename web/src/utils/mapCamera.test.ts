import { describe, expect, it } from 'vitest';
import { centerCamera, clampCamera, fitCamera, zoomCamera, zoomLevel } from './mapCamera';

const world = { width: 120, height: 90 };
const wide = 1400 / 850;
const tall = 600 / 900;

describe('fitCamera', () => {
  it('shows the whole world, centered, on a wide screen', () => {
    const view = fitCamera(world, wide);
    expect(view.h).toBeCloseTo(90);
    expect(view.w).toBeCloseTo(90 * wide);
    expect(view.x + view.w / 2).toBeCloseTo(60);
    expect(view.y).toBeCloseTo(0);
  });

  it('shows the whole world, centered, on a tall screen', () => {
    const view = fitCamera(world, tall);
    expect(view.w).toBeCloseTo(120);
    expect(view.y + view.h / 2).toBeCloseTo(45);
    expect(view.x).toBeCloseTo(0);
  });

  it('always matches the screen format', () => {
    for (const aspect of [wide, tall, 1]) {
      const view = fitCamera(world, aspect);
      expect(view.w / view.h).toBeCloseTo(aspect);
    }
  });
});

describe('clampCamera', () => {
  it('cannot be moved away from the overview', () => {
    const fit = fitCamera(world, wide);
    const moved = clampCamera({ ...fit, x: fit.x + 500, y: fit.y - 500 }, world, wide);
    expect(moved.x).toBeCloseTo(fit.x);
    expect(moved.y).toBeCloseTo(fit.y);
  });

  it('keeps a zoomed view inside the world', () => {
    const zoomed = { x: 500, y: 500, w: 30, h: 30 / wide };
    const view = clampCamera(zoomed, world, wide);
    expect(view.x + view.w).toBeCloseTo(120);
    expect(view.y + view.h).toBeCloseTo(90);

    const other = clampCamera({ ...zoomed, x: -500, y: -500 }, world, wide);
    expect(other.x).toBe(0);
    expect(other.y).toBe(0);
  });

  it('limits zoom in both directions', () => {
    const fit = fitCamera(world, wide);
    expect(clampCamera({ ...fit, w: 100000 }, world, wide).w).toBeCloseTo(fit.w);
    expect(clampCamera({ ...fit, w: 0.001 }, world, wide).w).toBeCloseTo(120 * 0.06);
  });
});

describe('zoomCamera', () => {
  it('keeps the world point under the cursor in place', () => {
    const start = { x: 30, y: 20, w: 40, h: 40 / wide };
    const worldX = start.x + 0.25 * start.w;
    const worldY = start.y + 0.75 * start.h;

    const view = zoomCamera(start, 0.8, 0.25, 0.75, world, wide);

    expect(view.x + 0.25 * view.w).toBeCloseTo(worldX);
    expect(view.y + 0.75 * view.h).toBeCloseTo(worldY);
  });

  it('returns to the centered overview when zooming all the way out', () => {
    let view = { x: 80, y: 60, w: 20, h: 20 / wide };
    for (let i = 0; i < 40; i++) view = zoomCamera(view, 1.25, 0.9, 0.9, world, wide);
    const fit = fitCamera(world, wide);
    expect(view.x).toBeCloseTo(fit.x);
    expect(view.y).toBeCloseTo(fit.y);
    expect(zoomLevel(view, world, wide)).toBeCloseTo(1);
  });
});

describe('centerCamera', () => {
  it('centers on a point when there is room', () => {
    const view = centerCamera({ x: 0, y: 0, w: 20, h: 20 / wide }, 60, 45, world, wide);
    expect(view.x + view.w / 2).toBeCloseTo(60);
    expect(view.y + view.h / 2).toBeCloseTo(45);
  });

  it('stops at the edge of the world', () => {
    const view = centerCamera({ x: 0, y: 0, w: 20, h: 20 / wide }, 0, 0, world, wide);
    expect(view.x).toBe(0);
    expect(view.y).toBe(0);
  });
});
