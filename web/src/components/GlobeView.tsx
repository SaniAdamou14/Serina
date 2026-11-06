import { useEffect, useRef, useState } from 'react';
import type { MapWorld } from '../map/mapRenderer';
import { GlobeCell, GlobeRenderer } from '../map/globeRenderer';

interface GlobeViewProps {
  world: MapWorld | null;
  cells: GlobeCell[];
  overlay: Uint8Array | null;
  selected: [number, number] | null;
  season: number | undefined;
  /** Clic : choisir une case sans quitter la planète. */
  onSelect: (gx: number, gy: number) => void;
  /** Double-clic : descendre sur la carte de cette case. */
  onOpen: (gx: number, gy: number) => void;
  describe: (gx: number, gy: number) => string;
}

/** Glisser pour tourner, molette pour zoomer, clic pour choisir, double-clic pour descendre. */
export function GlobeView({ world, cells, overlay, selected, season, onSelect, onOpen, describe }: GlobeViewProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const renderer = useRef<GlobeRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const readout = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvas) return;
    let created: GlobeRenderer | null = null;
    try {
      created = new GlobeRenderer(canvas, (e) => setError(e.message));
      renderer.current = created;
      created.start().catch((e: Error) => setError(e.message));
      if (import.meta.env.DEV) (window as unknown as { __serinaGlobe?: GlobeRenderer }).__serinaGlobe = created;
    } catch (e) {
      setError((e as Error).message);
    }
    return () => {
      created?.destroy();
      renderer.current = null;
    };
  }, [canvas]);

  useEffect(() => {
    if (world) renderer.current?.setWorld(world);
  }, [world, canvas]);
  useEffect(() => {
    renderer.current?.setCells(cells);
  }, [cells, canvas]);
  useEffect(() => {
    renderer.current?.setOverlay(overlay);
  }, [overlay, canvas]);
  useEffect(() => {
    renderer.current?.setSelection(selected);
  }, [selected, canvas]);
  useEffect(() => {
    if (season !== undefined) renderer.current?.setSeason(season);
  }, [season, canvas]);

  // Écouteur natif : React attache la molette en mode passif, où preventDefault est refusé.
  useEffect(() => {
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      renderer.current?.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvas]);

  return (
    <div className="absolute inset-0 z-[4] bg-black">
      <canvas
        ref={setCanvas}
        data-globe
        className="absolute inset-0 w-full h-full block"
        style={{ cursor: drag.current ? 'grabbing' : 'grab' }}
        onMouseDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; }}
        onMouseMove={(e) => {
          const d = drag.current;
          if (d) {
            if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 2) d.moved = true;
            renderer.current?.rotateBy(e.clientX - d.x, e.clientY - d.y);
            d.x = e.clientX;
            d.y = e.clientY;
          }
          const cell = renderer.current?.pickCell(e.clientX, e.clientY);
          if (readout.current) {
            readout.current.style.display = cell ? 'block' : 'none';
            if (cell) readout.current.textContent = describe(cell[0], cell[1]);
          }
        }}
        onMouseUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (d && !d.moved) {
            const cell = renderer.current?.pickCell(e.clientX, e.clientY);
            if (cell) onSelect(cell[0], cell[1]);
          }
        }}
        onMouseLeave={() => {
          drag.current = null;
          if (readout.current) readout.current.style.display = 'none';
        }}
        onDoubleClick={(e) => {
          const cell = renderer.current?.pickCell(e.clientX, e.clientY);
          if (cell) onOpen(cell[0], cell[1]);
        }}
      />
      <div
        ref={readout}
        className="absolute bottom-11 left-1/2 -translate-x-1/2 game-panel text-slate-300 px-2 py-0.5 text-[11px] pointer-events-none"
        style={{ display: 'none' }}
      />
      <div className="absolute top-2 left-1/2 -translate-x-1/2 game-panel px-3 py-1 text-xs text-slate-300 pointer-events-none">
        Planète : glisser pour tourner, double-clic sur une case pour y descendre (P pour revenir)
      </div>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="game-panel p-4 text-sm max-w-md">
            <p className="font-semibold text-red-300">Impossible d'afficher la planète</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
