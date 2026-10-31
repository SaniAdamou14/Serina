import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ViewBox } from '../utils/mapCamera';

interface MinimapProps {
  /** Image du monde produite par le rendu de la carte : le vrai terrain, pas un schéma. */
  image: string | null;
  worldWidth: number;
  worldHeight: number;
  viewBox: ViewBox;
  /** Centre la caméra principale sur ce point du monde (coordonnées réelles, pas des fractions). */
  onNavigate: (worldX: number, worldY: number) => void;
}

const MINIMAP_WIDTH_PX = 176;

/** Minicarte : le rectangle affiché est la vue réelle de la caméra principale. */
export function Minimap({ image, worldWidth, worldHeight, viewBox, onNavigate }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (worldWidth <= 0 || worldHeight <= 0) return null;

  const heightPx = MINIMAP_WIDTH_PX * (worldHeight / worldWidth);

  const navigateFromEvent = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fracX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const fracY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onNavigate(fracX * worldWidth, fracY * worldHeight);
  };

  // En vue d'ensemble, la vue déborde du monde : le cadre s'arrête à ses limites.
  const x = Math.max(0, viewBox.x);
  const y = Math.max(0, viewBox.y);
  const width = Math.min(worldWidth, viewBox.x + viewBox.w) - x;
  const height = Math.min(worldHeight, viewBox.y + viewBox.h) - y;

  return (
    <div className="game-panel p-1 pointer-events-auto">
      <div
        ref={containerRef}
        data-testid="minimap"
        className="relative overflow-hidden bg-slate-950"
        style={{ width: MINIMAP_WIDTH_PX, height: heightPx, cursor: isDragging ? 'grabbing' : 'pointer' }}
        onMouseDown={(e) => {
          setIsDragging(true);
          navigateFromEvent(e);
        }}
        onMouseMove={(e) => {
          if (isDragging) navigateFromEvent(e);
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {image && <img src={image} alt="" draggable={false} className="absolute inset-0 w-full h-full select-none" />}
        <svg viewBox={`0 0 ${worldWidth} ${worldHeight}`} width="100%" height="100%" className="absolute inset-0">
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke="#e6d092"
            strokeWidth={Math.max(worldWidth, worldHeight) * 0.008}
          />
        </svg>
      </div>
    </div>
  );
}
