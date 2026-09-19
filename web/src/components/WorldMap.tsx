import { useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import { useSimulation } from '@services/SimulationContext';
import { RegionInfo, IndividualInfo } from '../types';
import { computeLineageHues, creatureColor } from '../utils/lineageColor';
import { CreatureIcon } from './CreatureIcon';

/** Couleurs réelles par biome (nom exact renvoyé par le backend, voir
 * EnvironmentalAdaptation.hpp) -- pas une palette générique par index, pour
 * qu'un même biome garde toujours la même couleur d'une génération à l'autre. */
const BIOME_COLORS: Record<string, string> = {
  'Prairie de Serina': '#a3c95b',
  'Forêts de Serina': '#2f6b3a',
  'Lacs et rivières': '#5aa9d6',
  'Océans de Serina': '#1c5d8c',
  'Marécages et zones humides': '#6b8e5a',
  'Chaînes montagneuses': '#8a7f70',
  'Déserts de Serina': '#d9b76e',
  'Régions arctiques de Serina': '#dce9f2',
  'Forêts tropicales de Serina': '#178a3e'
};
const FALLBACK_BIOME_COLOR = '#9ca3af';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
const DEFAULT_ZOOM = 1.6;
/** Sous ce niveau de zoom, une silhouette détaillée fait quelques pixels et
 * son détail est illisible -- on rend un simple point coloré à la place
 * plutôt que de payer le coût de rendu pour rien. La carte occupant
 * maintenant tout l'écran, le zoom par défaut dépasse déjà ce seuil. */
const DETAIL_ZOOM_THRESHOLD = 1.2;

/**
 * Carte plein écran façon RimWorld : occupe tout l'espace disponible de son
 * conteneur (voir SimulationDashboard, qui lui donne tout le viewport moins
 * une fine barre supérieure/inférieure), avec les panneaux d'information en
 * survol flottant par-dessus plutôt que de pousser la carte dans une petite
 * boîte encadrée.
 */
export function WorldMap() {
  const { simulationData } = useSimulation();
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(null);
  const [selectedIndividual, setSelectedIndividual] = useState<IndividualInfo | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const lineages = simulationData?.status.lineages;
  const speciationEvents = simulationData?.lineages.speciationEvents;

  const lineageHues = useMemo(() => {
    const names = (lineages ?? []).map((l) => l.speciesName);
    return computeLineageHues(speciationEvents ?? [], names);
  }, [lineages, speciationEvents]);

  if (!simulationData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
        En attente d'une simulation active...
      </div>
    );
  }

  const { regions, gridWidth, gridHeight, cellSize } = simulationData.regions;
  const individuals = simulationData.individuals.individuals;
  const worldWidth = gridWidth * cellSize;
  const worldHeight = gridHeight * cellSize;
  const distinctBiomes = Array.from(new Set(regions.map((r) => r.environmentName))).filter(Boolean);
  const detailed = zoom >= DETAIL_ZOOM_THRESHOLD;

  const biomeColorAt = (x: number, y: number): string => {
    const gx = Math.max(0, Math.min(gridWidth - 1, Math.floor(x / cellSize)));
    const gy = Math.max(0, Math.min(gridHeight - 1, Math.floor(y / cellSize)));
    const region = regions.find((r) => r.gridX === gx && r.gridY === gy);
    return region ? BIOME_COLORS[region.environmentName] ?? FALLBACK_BIOME_COLOR : FALLBACK_BIOME_COLOR;
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  };

  const stopDragging = () => {
    dragState.current = null;
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <svg
          viewBox={`0 0 ${worldWidth} ${worldHeight}`}
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragState.current ? 'none' : 'transform 0.05s linear'
          }}
        >
          {regions.map((region) => (
            <rect
              key={`${region.gridX}-${region.gridY}`}
              x={region.gridX * cellSize}
              y={region.gridY * cellSize}
              width={cellSize}
              height={cellSize}
              fill={BIOME_COLORS[region.environmentName] ?? FALLBACK_BIOME_COLOR}
              stroke="#00000033"
              strokeWidth={cellSize * 0.02}
              onClick={() => {
                setSelectedRegion(region);
                setSelectedIndividual(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${region.environmentName} (${region.gridX}, ${region.gridY}) — ${region.population} individu(s)`}</title>
            </rect>
          ))}

          {individuals.map((individual) => {
            const hue = lineageHues.get(individual.species) ?? 0;
            const color = creatureColor(hue, individual.camouflage, biomeColorAt(individual.x, individual.y));
            return (
              <CreatureIcon
                key={individual.id}
                individual={individual}
                color={color}
                detailed={detailed}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndividual(individual);
                  setSelectedRegion(null);
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Barre d'info flottante en haut */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-3 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-sm text-slate-200 rounded-lg px-3 py-2 text-xs pointer-events-auto shadow-lg">
          <div className="font-semibold text-sm">🗺️ Monde de Serina</div>
          <div className="text-slate-400">
            {gridWidth}×{gridHeight} régions — {individuals.length} individus en direct
          </div>
        </div>
        <div className="bg-slate-900/85 backdrop-blur-sm rounded-lg px-2 py-1.5 flex items-center gap-1.5 pointer-events-auto shadow-lg">
          <button className="text-slate-200 hover:bg-slate-700 rounded px-2 py-1 text-sm" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))}>−</button>
          <span className="text-slate-300 text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button className="text-slate-200 hover:bg-slate-700 rounded px-2 py-1 text-sm" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}>+</button>
          <button className="text-slate-200 hover:bg-slate-700 rounded px-2 py-1 text-xs ml-1" onClick={resetView}>Recentrer</button>
        </div>
      </div>

      {!detailed && (
        <div className="absolute top-16 left-3 bg-amber-900/85 backdrop-blur-sm text-amber-200 rounded-lg px-3 py-1.5 text-xs pointer-events-none shadow-lg">
          Zoomez (≥ {Math.round(DETAIL_ZOOM_THRESHOLD * 100)}%) pour voir les silhouettes détaillées.
        </div>
      )}

      {/* Légendes flottantes en bas à gauche */}
      <div className="absolute bottom-3 left-3 max-w-sm bg-slate-900/85 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-lg space-y-2">
        <div className="flex flex-wrap gap-2">
          {distinctBiomes.map((name) => (
            <div key={name} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: BIOME_COLORS[name] ?? FALLBACK_BIOME_COLOR }} />
              <span className="text-slate-300">{name}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-2">
          {(lineages ?? []).map((lineage) => (
            <div key={lineage.speciesName} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: creatureColor(lineageHues.get(lineage.speciesName) ?? 0, 0, FALLBACK_BIOME_COLOR) }}
              />
              <span className="text-slate-300">{lineage.speciesName} ({lineage.population})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau d'inspection flottant en bas à droite : région ou individu sélectionné */}
      {selectedRegion && (
        <div className="absolute bottom-3 right-3 w-72 max-h-[60%] overflow-y-auto bg-blue-950/90 backdrop-blur-sm rounded-lg border border-blue-800 p-3 text-sm shadow-lg">
          <h4 className="font-semibold text-blue-200">
            {selectedRegion.environmentName || 'Biome inconnu'} — case ({selectedRegion.gridX}, {selectedRegion.gridY})
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-blue-300 text-xs">
            <div>🌡️ Température : {selectedRegion.temperature.toFixed(1)}°C</div>
            <div>🌱 Producteurs primaires : {(selectedRegion.primaryProducers * 100).toFixed(0)}%</div>
            <div>🦁 Prédation : {(selectedRegion.predationPressure * 100).toFixed(0)}%</div>
            <div>⚔️ Compétition : {(selectedRegion.competitionIntensity * 100).toFixed(0)}%</div>
            <div>❄️ Stress climatique : {(selectedRegion.climaticStress * 100).toFixed(0)}%</div>
            <div>👥 Individus ici : {selectedRegion.population}</div>
          </div>
        </div>
      )}

      {selectedIndividual && (
        <div className="absolute bottom-3 right-3 w-72 max-h-[60%] overflow-y-auto bg-amber-950/90 backdrop-blur-sm rounded-lg border border-amber-800 p-3 text-sm shadow-lg">
          <h4 className="font-semibold text-amber-200">{selectedIndividual.species} — individu #{selectedIndividual.id}</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-amber-300 text-xs">
            <div>⚡ Énergie : {selectedIndividual.energy.toFixed(1)}</div>
            <div>🕒 Âge : {selectedIndividual.age.toFixed(1)}</div>
            <div className="col-span-2">📍 Position : ({selectedIndividual.x.toFixed(1)}, {selectedIndividual.y.toFixed(1)})</div>
          </div>
        </div>
      )}

      {!selectedRegion && !selectedIndividual && (
        <div className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400 pointer-events-none shadow-lg">
          Cliquez une région ou un individu pour l'inspecter. Molette : zoom. Glisser : déplacer.
        </div>
      )}
    </div>
  );
}
