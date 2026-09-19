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
const MAX_ZOOM = 5;
/** Sous ce niveau de zoom, une silhouette détaillée fait quelques pixels et
 * son détail est invisible -- on rend un simple point coloré à la place
 * plutôt que de payer le coût de rendu pour rien. */
const DETAIL_ZOOM_THRESHOLD = 1.5;

export function WorldMap() {
  const { simulationData } = useSimulation();
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(null);
  const [selectedIndividual, setSelectedIndividual] = useState<IndividualInfo | null>(null);
  const [zoom, setZoom] = useState(1);
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
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
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
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">🗺️ Carte du Monde de Serina</h3>
          <p className="text-sm text-gray-600">
            {gridWidth}×{gridHeight} régions réelles — {individuals.length} individus vivants observés en direct
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className="button-secondary px-2 py-1" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))}>−</button>
          <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button className="button-secondary px-2 py-1" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}>+</button>
          <button className="button-secondary px-2 py-1" onClick={resetView}>Recentrer</button>
        </div>
      </div>

      <div
        className="relative overflow-hidden border border-gray-300 rounded-lg bg-slate-900"
        style={{ height: 480, cursor: isDragging ? 'grabbing' : 'grab' }}
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

      {/* Légende des biomes réellement présents sur cette carte */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {distinctBiomes.map((name) => (
          <div key={name} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: BIOME_COLORS[name] ?? FALLBACK_BIOME_COLOR }} />
            <span className="text-gray-600">{name}</span>
          </div>
        ))}
      </div>

      {/* Légende des espèces (teinte de lignée réelle, sans mélange de camouflage) */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {(lineages ?? []).map((lineage) => (
          <div key={lineage.speciesName} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: creatureColor(lineageHues.get(lineage.speciesName) ?? 0, 0, FALLBACK_BIOME_COLOR) }}
            />
            <span className="text-gray-600">{lineage.speciesName} ({lineage.population})</span>
          </div>
        ))}
      </div>

      {!detailed && (
        <p className="mt-2 text-xs text-amber-600">
          Zoomez (≥ {Math.round(DETAIL_ZOOM_THRESHOLD * 100)}%) pour voir les silhouettes détaillées de chaque individu.
        </p>
      )}

      {/* Panneau d'inspection : région sélectionnée */}
      {selectedRegion && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
          <h4 className="font-semibold text-blue-800">
            {selectedRegion.environmentName || 'Biome inconnu'} — case ({selectedRegion.gridX}, {selectedRegion.gridY})
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-blue-700">
            <div>🌡️ Température : {selectedRegion.temperature.toFixed(1)}°C</div>
            <div>🌱 Producteurs primaires : {(selectedRegion.primaryProducers * 100).toFixed(0)}%</div>
            <div>🦁 Pression de prédation : {(selectedRegion.predationPressure * 100).toFixed(0)}%</div>
            <div>⚔️ Compétition : {(selectedRegion.competitionIntensity * 100).toFixed(0)}%</div>
            <div>❄️ Stress climatique : {(selectedRegion.climaticStress * 100).toFixed(0)}%</div>
            <div>👥 Individus ici : {selectedRegion.population}</div>
          </div>
        </div>
      )}

      {/* Panneau d'inspection : individu sélectionné */}
      {selectedIndividual && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm">
          <h4 className="font-semibold text-amber-800">{selectedIndividual.species} — individu #{selectedIndividual.id}</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-amber-700">
            <div>⚡ Énergie : {selectedIndividual.energy.toFixed(1)}</div>
            <div>🕒 Âge : {selectedIndividual.age.toFixed(1)}</div>
            <div className="col-span-2">📍 Position : ({selectedIndividual.x.toFixed(1)}, {selectedIndividual.y.toFixed(1)})</div>
          </div>
        </div>
      )}

      {!selectedRegion && !selectedIndividual && (
        <p className="mt-4 text-xs text-gray-500">
          Cliquez sur une région pour voir son climat réel, ou sur un individu pour l'inspecter. Molette pour zoomer, glisser pour déplacer la carte.
        </p>
      )}
    </div>
  );
}
