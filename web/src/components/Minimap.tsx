import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { RegionInfo } from '../types';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FALLBACK_BIOME_COLOR = '#9ca3af';

interface MinimapProps {
  regions: RegionInfo[];
  cellSize: number;
  worldWidth: number;
  worldHeight: number;
  viewBox: ViewBox;
  biomeColors: Record<string, string>;
  /** Centre la caméra principale sur ce point du monde (coordonnées réelles, pas des fractions). */
  onNavigate: (worldX: number, worldY: number) => void;
}

const MINIMAP_WIDTH_PX = 176;

/**
 * Minicarte façon RimWorld : réutilise les mêmes régions/couleurs de biome
 * que WorldMap (jamais une seconde source de vérité), rendues en aplat
 * simple -- pas de texture/jitter ici, invisible à cette échelle et coûteux
 * pour rien. Le rectangle affiché est le viewBox RÉEL de la caméra
 * principale (même unités monde), jamais une approximation recalculée.
 */
export function Minimap({ regions, cellSize, worldWidth, worldHeight, viewBox, biomeColors, onNavigate }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (worldWidth <= 0 || worldHeight <= 0) return null;

  const aspect = worldHeight / worldWidth;
  const heightPx = MINIMAP_WIDTH_PX * aspect;

  const navigateFromEvent = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fracX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const fracY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onNavigate(fracX * worldWidth, fracY * worldHeight);
  };

  return (
    <div className="bg-slate-900/85 backdrop-blur-sm rounded-lg p-1.5 shadow-lg pointer-events-auto">
      <div
        ref={containerRef}
        data-testid="minimap"
        className="relative overflow-hidden rounded"
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
        <svg viewBox={`0 0 ${worldWidth} ${worldHeight}`} width="100%" height="100%">
          {regions.map((region) => (
            <rect
              key={`${region.gridX}-${region.gridY}`}
              x={region.gridX * cellSize}
              y={region.gridY * cellSize}
              width={cellSize}
              height={cellSize}
              fill={biomeColors[region.environmentName] ?? FALLBACK_BIOME_COLOR}
            />
          ))}
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.w}
            height={viewBox.h}
            fill="#38bdf822"
            stroke="#38bdf8"
            strokeWidth={Math.max(worldWidth, worldHeight) * 0.006}
          />
        </svg>
      </div>
    </div>
  );
}
