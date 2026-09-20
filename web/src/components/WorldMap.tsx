import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Map as MapIcon, Thermometer, Sprout, Crosshair, Swords, Snowflake, Users, Zap, Clock, MapPin, ClipboardList } from 'lucide-react';
import { useSimulation } from '@services/SimulationContext';
import { RegionInfo, IndividualInfo } from '../types';
import { computeLineageHues, creatureColor } from '../utils/lineageColor';
import { BIOME_PATTERN_IDS, jitterColor } from '../utils/mapTexture';
import { BiomeTextureDefs } from './BiomeTextureDefs';
import { CreatureIcon } from './CreatureIcon';
import { SpeciesDetailPanel } from './SpeciesDetailPanel';

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

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fraction de la largeur du monde visible au zoom maximal (le plus proche)
 * et minimal (le plus loin) -- borne la caméra pour qu'elle ne puisse
 * jamais dériver dans un état absurde, contrairement à un empilement de
 * transformations CSS translate+scale où le pan se fait recalculer par
 * chaque changement de zoom (la cause réelle du comportement "n'importe
 * quoi" signalé). Le viewBox SVG est la seule source de vérité de la
 * caméra ; aucune transformation CSS n'est appliquée par-dessus. */
const MIN_VIEW_FRACTION = 0.06;
const MAX_VIEW_FRACTION = 1.3;
const INITIAL_VIEW_FRACTION = 0.6;
const DETAIL_ZOOM_THRESHOLD = 1.2; // en "zoom equivalent" (worldWidth / viewBox.w)

function clampViewBox(vb: ViewBox, worldWidth: number, worldHeight: number): ViewBox {
  const minW = worldWidth * MIN_VIEW_FRACTION;
  const maxW = worldWidth * MAX_VIEW_FRACTION;
  const w = Math.min(maxW, Math.max(minW, vb.w));
  const h = w * (vb.h / vb.w || 1);

  // Le centre du viewBox ne peut jamais s'éloigner de plus d'une marge du
  // monde réel -- empêche la caméra de dériver à l'infini en dehors de la
  // carte plutôt que de la laisser "partir dans tous les sens".
  const margin = Math.min(worldWidth, worldHeight) * 0.2;
  const cx = Math.min(worldWidth + margin, Math.max(-margin, vb.x + vb.w / 2));
  const cy = Math.min(worldHeight + margin, Math.max(-margin, vb.y + vb.h / 2));

  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * Carte plein écran façon RimWorld : le viewBox SVG est la seule source de
 * vérité de la caméra (pan + zoom), jamais une transformation CSS -- un
 * clic-molette ou un glisser ne peut donc jamais désynchroniser l'un de
 * l'autre. Chaque panneau d'information flotte par-dessus en overlay
 * compact, jamais toute une colonne qui cache la carte (voir
 * SimulationDashboard pour la barre latérale, désormais ancrée à côté de
 * la carte plutôt que superposée).
 */
export function WorldMap() {
  const { simulationData } = useSimulation();
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(null);
  const [selectedIndividual, setSelectedIndividual] = useState<IndividualInfo | null>(null);
  const [detailSpecies, setDetailSpecies] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox | null>(null);
  const dragState = useRef<{ startX: number; startY: number; vbX: number; vbY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastWorldSize = useRef<{ w: number; h: number } | null>(null);
  // Position précédente et cap réel par individu, pour orienter sa
  // silhouette dans le sens de son vrai déplacement entre deux instantanés
  // plutôt que de la laisser fixe ou orientée au hasard. Mise à jour
  // pendant le rendu (jamais via setState : c'est un simple cache dérivé,
  // pas un état qui doit déclencher un nouveau rendu).
  const previousPositions = useRef<Map<number, { x: number; y: number }>>(new Map());
  const headings = useRef<Map<number, number>>(new Map());

  const regionsData = simulationData?.regions;
  const worldWidth = regionsData ? regionsData.gridWidth * regionsData.cellSize : 0;
  const worldHeight = regionsData ? regionsData.gridHeight * regionsData.cellSize : 0;

  // (Ré)initialise la caméra centrée dès que la taille réelle du monde est
  // connue, ou change (nouvelle simulation avec une autre grille).
  useEffect(() => {
    if (worldWidth <= 0 || worldHeight <= 0) return;
    const changed = !lastWorldSize.current || lastWorldSize.current.w !== worldWidth || lastWorldSize.current.h !== worldHeight;
    if (!changed) return;
    lastWorldSize.current = { w: worldWidth, h: worldHeight };
    const w = worldWidth * INITIAL_VIEW_FRACTION;
    const h = worldHeight * INITIAL_VIEW_FRACTION;
    setViewBox({ x: (worldWidth - w) / 2, y: (worldHeight - h) / 2, w, h });
  }, [worldWidth, worldHeight]);

  const lineages = simulationData?.status.lineages;
  const speciationEvents = simulationData?.lineages.speciationEvents;
  const lineageHues = useMemo(() => {
    const names = (lineages ?? []).map((l) => l.speciesName);
    return computeLineageHues(speciationEvents ?? [], names);
  }, [lineages, speciationEvents]);

  const zoomByFactor = (factor: number, anchorXFrac = 0.5, anchorYFrac = 0.5) => {
    setViewBox((current) => {
      if (!current) return current;
      const worldX = current.x + anchorXFrac * current.w;
      const worldY = current.y + anchorYFrac * current.h;
      const minW = worldWidth * MIN_VIEW_FRACTION;
      const maxW = worldWidth * MAX_VIEW_FRACTION;
      const newW = Math.min(maxW, Math.max(minW, current.w * factor));
      const applied = newW / current.w;
      const newH = current.h * applied;
      return clampViewBox(
        { x: worldX - anchorXFrac * newW, y: worldY - anchorYFrac * newH, w: newW, h: newH },
        worldWidth,
        worldHeight
      );
    });
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const anchorXFrac = (e.clientX - rect.left) / rect.width;
    const anchorYFrac = (e.clientY - rect.top) / rect.height;
    zoomByFactor(e.deltaY > 0 ? 1.12 : 1 / 1.12, anchorXFrac, anchorYFrac);
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!viewBox) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, vbX: viewBox.x, vbY: viewBox.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragState.current || !viewBox || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dxWorld = ((e.clientX - dragState.current.startX) / rect.width) * viewBox.w;
    const dyWorld = ((e.clientY - dragState.current.startY) / rect.height) * viewBox.h;
    setViewBox(
      clampViewBox(
        { ...viewBox, x: dragState.current.vbX - dxWorld, y: dragState.current.vbY - dyWorld },
        worldWidth,
        worldHeight
      )
    );
  };

  const stopDragging = () => {
    dragState.current = null;
    setIsDragging(false);
  };

  const resetView = () => {
    if (worldWidth <= 0 || worldHeight <= 0) return;
    const w = worldWidth * INITIAL_VIEW_FRACTION;
    const h = worldHeight * INITIAL_VIEW_FRACTION;
    setViewBox({ x: (worldWidth - w) / 2, y: (worldHeight - h) / 2, w, h });
  };

  if (!simulationData || !viewBox) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
        En attente d'une simulation active...
      </div>
    );
  }

  const { regions, gridWidth, gridHeight, cellSize } = simulationData.regions;
  const individuals = simulationData.individuals.individuals;
  const distinctBiomes = Array.from(new Set(regions.map((r) => r.environmentName))).filter(Boolean);
  const currentZoom = worldWidth / viewBox.w;
  const detailed = currentZoom >= DETAIL_ZOOM_THRESHOLD;

  const biomeColorAt = (x: number, y: number): string => {
    const gx = Math.max(0, Math.min(gridWidth - 1, Math.floor(x / cellSize)));
    const gy = Math.max(0, Math.min(gridHeight - 1, Math.floor(y / cellSize)));
    const region = regions.find((r) => r.gridX === gx && r.gridY === gy);
    return region ? BIOME_COLORS[region.environmentName] ?? FALLBACK_BIOME_COLOR : FALLBACK_BIOME_COLOR;
  };

  const computeHeading = (individual: IndividualInfo): number => {
    const prev = previousPositions.current.get(individual.id);
    previousPositions.current.set(individual.id, { x: individual.x, y: individual.y });
    if (prev) {
      const dx = individual.x - prev.x;
      const dy = individual.y - prev.y;
      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
        headings.current.set(individual.id, (Math.atan2(dy, dx) * 180) / Math.PI);
      }
    }
    return headings.current.get(individual.id) ?? 0;
  };

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} style={{ width: '100%', height: '100%' }}>
          <BiomeTextureDefs cellSize={cellSize} />

          {regions.map((region) => {
            const baseColor = BIOME_COLORS[region.environmentName] ?? FALLBACK_BIOME_COLOR;
            const patternId = BIOME_PATTERN_IDS[region.environmentName];
            return (
              <g
                key={`${region.gridX}-${region.gridY}`}
                onClick={() => {
                  setSelectedRegion(region);
                  setSelectedIndividual(null);
                }}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${region.environmentName} (${region.gridX}, ${region.gridY}) — ${region.population} individu(s)`}</title>
                {/* Teinte de base légèrement variée par case (jamais un
                    aplat parfaitement uniforme, comme un vrai terrain) puis
                    motif de texture propre au biome par-dessus. */}
                <rect
                  x={region.gridX * cellSize}
                  y={region.gridY * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={jitterColor(baseColor, region.gridX, region.gridY)}
                  stroke="#00000022"
                  strokeWidth={cellSize * 0.008}
                />
                {patternId && (
                  <rect
                    x={region.gridX * cellSize}
                    y={region.gridY * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={`url(#${patternId})`}
                  />
                )}
              </g>
            );
          })}

          {individuals.map((individual) => {
            const hue = lineageHues.get(individual.species) ?? 0;
            const color = creatureColor(hue, individual.camouflage, biomeColorAt(individual.x, individual.y));
            return (
              <CreatureIcon
                key={individual.id}
                individual={individual}
                color={color}
                detailed={detailed}
                headingDegrees={computeHeading(individual)}
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
          <div className="font-semibold text-sm flex items-center gap-1.5"><MapIcon className="w-4 h-4" /> Monde de Serina</div>
          <div className="text-slate-400">
            {gridWidth}×{gridHeight} régions — {individuals.length} individus en direct
          </div>
        </div>
        <div className="bg-slate-900/85 backdrop-blur-sm rounded-lg px-2 py-1.5 flex items-center gap-1.5 pointer-events-auto shadow-lg">
          <button className="text-slate-200 hover:bg-slate-700 rounded px-2 py-1 text-sm" onClick={() => zoomByFactor(1 / 1.25)}>−</button>
          <span className="text-slate-300 text-xs w-12 text-center">{Math.round(currentZoom * 100)}%</span>
          <button className="text-slate-200 hover:bg-slate-700 rounded px-2 py-1 text-sm" onClick={() => zoomByFactor(1.25)}>+</button>
          <button className="text-slate-200 hover:bg-slate-700 rounded px-2 py-1 text-xs ml-1" onClick={resetView}>Recentrer</button>
        </div>
      </div>

      {!detailed && (
        <div className="absolute top-16 left-3 bg-amber-900/85 backdrop-blur-sm text-amber-200 rounded-lg px-3 py-1.5 text-xs pointer-events-none shadow-lg">
          Zoomez pour voir les silhouettes détaillées.
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
            <button
              key={lineage.speciesName}
              className="flex items-center gap-1 hover:bg-slate-700/60 rounded px-1 -mx-1"
              onClick={() => setDetailSpecies(lineage.speciesName)}
              title="Voir la fiche complète de l'espèce"
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: creatureColor(lineageHues.get(lineage.speciesName) ?? 0, 0, FALLBACK_BIOME_COLOR) }}
              />
              <span className="text-slate-300">{lineage.speciesName} ({lineage.population})</span>
            </button>
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
            <div className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" /> Température : {selectedRegion.temperature.toFixed(1)}°C</div>
            <div className="flex items-center gap-1"><Sprout className="w-3.5 h-3.5" /> Producteurs primaires : {(selectedRegion.primaryProducers * 100).toFixed(0)}%</div>
            <div className="flex items-center gap-1"><Crosshair className="w-3.5 h-3.5" /> Prédation : {(selectedRegion.predationPressure * 100).toFixed(0)}%</div>
            <div className="flex items-center gap-1"><Swords className="w-3.5 h-3.5" /> Compétition : {(selectedRegion.competitionIntensity * 100).toFixed(0)}%</div>
            <div className="flex items-center gap-1"><Snowflake className="w-3.5 h-3.5" /> Stress climatique : {(selectedRegion.climaticStress * 100).toFixed(0)}%</div>
            <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Individus ici : {selectedRegion.population}</div>
          </div>
        </div>
      )}

      {selectedIndividual && (
        <div className="absolute bottom-3 right-3 w-72 max-h-[60%] overflow-y-auto bg-amber-950/90 backdrop-blur-sm rounded-lg border border-amber-800 p-3 text-sm shadow-lg">
          <h4 className="font-semibold text-amber-200">{selectedIndividual.species} — individu #{selectedIndividual.id}</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-amber-300 text-xs">
            <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Énergie : {selectedIndividual.energy.toFixed(1)}</div>
            <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Âge : {selectedIndividual.age.toFixed(1)}</div>
            <div className="col-span-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Position : ({selectedIndividual.x.toFixed(1)}, {selectedIndividual.y.toFixed(1)})</div>
          </div>
          <button
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs bg-amber-800 hover:bg-amber-700 text-amber-100 rounded px-2 py-1.5"
            onClick={() => setDetailSpecies(selectedIndividual.species)}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Voir la fiche complète de l'espèce
          </button>
        </div>
      )}

      {!selectedRegion && !selectedIndividual && (
        <div className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400 pointer-events-none shadow-lg">
          Cliquez une région ou un individu pour l'inspecter. Molette : zoom. Glisser : déplacer.
        </div>
      )}

      {detailSpecies && <SpeciesDetailPanel speciesName={detailSpecies} onClose={() => setDetailSpecies(null)} />}
    </div>
  );
}
