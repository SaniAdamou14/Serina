import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { centerCamera, clampCamera, fitCamera, ViewBox, WorldSize, zoomCamera, zoomLevel } from '../utils/mapCamera';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { ChevronUp, ChevronDown, Pin, PinOff, Columns3 } from 'lucide-react';
import { useSimulation } from '@services/SimulationContext';
import { useSelection } from '@services/SelectionContext';
import { RegionInfo } from '../types';
import { MapCreature, MapRenderer } from '../map/mapRenderer';
import { computeLineageHues, creatureColor, hexToRgb } from '../utils/lineageColor';
import { OverlayMode, OVERLAY_LABELS, sequentialColor, ramp } from '../utils/overlayColor';
import { Minimap } from './Minimap';

/** Une métrique réelle par région (RegionInfo) pour chaque overlay -- pas
 * de biome ici, géré séparément (rendu de base toujours visible). */
const OVERLAY_METRICS: Record<Exclude<OverlayMode, 'biome'>, (r: RegionInfo) => number> = {
  temperature: (r) => r.temperature,
  fertility: (r) => r.primaryProducers,
  predation: (r) => r.predationPressure,
  competition: (r) => r.competitionIntensity,
  climaticStress: (r) => r.climaticStress
};

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

/** Couche de sol de chaque biome dans le rendu (voir map/mapRenderer.ts). */
const BIOME_LAYERS: Record<string, number> = {
  'Prairie de Serina': 0,
  'Forêts de Serina': 1,
  'Forêts tropicales de Serina': 2,
  'Marécages et zones humides': 3,
  'Chaînes montagneuses': 4,
  'Déserts de Serina': 5,
  'Régions arctiques de Serina': 6,
  'Lacs et rivières': 7,
  'Océans de Serina': 8
};
const OVERLAY_ALPHA = 173;


const PAN_STEP_FRACTION = 0.15;

/** Distance en pixels à partir de laquelle un appui devient un glisser, pas un clic. */
const DRAG_THRESHOLD_PX = 4;

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
  const { selectedRegion, selectedIndividual, selectRegion, selectIndividual, showSpeciesDetail, pinnedSpecies, togglePinnedSpecies, setCompareOpen } = useSelection();
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('biome');
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [aspect, setAspect] = useState(0);
  const [viewBox, setViewBox] = useState<ViewBox | null>(null);
  const cursorReadoutRef = useRef<HTMLDivElement>(null);
  const [showIndividuals, setShowIndividuals] = useState(true);
  const dragState = useRef<{ startX: number; startY: number; view: ViewBox; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastWorld = useRef<WorldSize | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [worldImage, setWorldImage] = useState<string | null>(null);

  const regionsData = simulationData?.regions;
  const worldWidth = regionsData ? regionsData.gridWidth * regionsData.cellSize : 0;
  const worldHeight = regionsData ? regionsData.gridHeight * regionsData.cellSize : 0;

  const world = useMemo<WorldSize>(() => ({ width: worldWidth, height: worldHeight }), [worldWidth, worldHeight]);

  // Le format de la caméra suit toujours celui de l'écran.
  useEffect(() => {
    if (!container) return;
    const measure = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setAspect(rect.width / rect.height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  // Vue d'ensemble centrée dès qu'un monde est connu ; ensuite, un changement de
  // taille de fenêtre garde le zoom et reste dans le monde.
  useEffect(() => {
    if (worldWidth <= 0 || worldHeight <= 0 || aspect <= 0) return;
    const newWorld = !lastWorld.current || lastWorld.current.width !== worldWidth || lastWorld.current.height !== worldHeight;
    lastWorld.current = world;
    setViewBox((current) => (newWorld || !current ? fitCamera(world, aspect) : clampCamera(current, world, aspect)));
  }, [world, worldWidth, worldHeight, aspect]);

  useEffect(() => {
    if (!canvas) return;
    let created: MapRenderer | null = null;
    try {
      created = new MapRenderer(canvas, (e) => setRenderError(e.message), setWorldImage);
      renderer.current = created;
      created.start().catch((e: Error) => setRenderError(e.message));
      if (import.meta.env.DEV) (window as unknown as { __serinaMap?: MapRenderer }).__serinaMap = created;
    } catch (e) {
      setRenderError((e as Error).message);
    }
    return () => {
      created?.destroy();
      renderer.current = null;
    };
  }, [canvas]);

  // Le terrain ne change que si la carte change, pas à chaque tick.
  const regionCells = simulationData?.regions.regions;
  const terrainKey = regionCells?.map((r) => BIOME_LAYERS[r.environmentName] ?? 0).join('') ?? '';
  useEffect(() => {
    if (!renderer.current || !regionsData || !regionCells || regionCells.length === 0) return;
    const layers = new Uint8Array(regionsData.gridWidth * regionsData.gridHeight);
    for (const r of regionCells) layers[r.gridY * regionsData.gridWidth + r.gridX] = BIOME_LAYERS[r.environmentName] ?? 0;
    renderer.current.setWorld({ gridWidth: regionsData.gridWidth, gridHeight: regionsData.gridHeight, cellSize: regionsData.cellSize, layers });
    // regionCells change à chaque tick : terrainKey dit si le terrain a vraiment changé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, terrainKey, worldWidth, worldHeight]);

  useEffect(() => {
    if (viewBox) renderer.current?.setCamera(viewBox);
  }, [viewBox, canvas]);

  useEffect(() => {
    renderer.current?.setSelection(selectedRegion ? [selectedRegion.gridX, selectedRegion.gridY] : null, selectedIndividual?.id ?? null);
  }, [selectedRegion, selectedIndividual, canvas]);

  const lineages = simulationData?.status.lineages;
  const speciationEvents = simulationData?.lineages.speciationEvents;
  const lineageHues = useMemo(() => {
    const names = (lineages ?? []).map((l) => l.speciesName);
    return computeLineageHues(speciationEvents ?? [], names);
  }, [lineages, speciationEvents]);

  const individualList = simulationData?.individuals.individuals;
  useEffect(() => {
    if (!renderer.current || !individualList || !regionsData || !regionCells) return;
    const { gridWidth, gridHeight, cellSize } = regionsData;
    const biomeNames: string[] = new Array(gridWidth * gridHeight);
    for (const r of regionCells) biomeNames[r.gridY * gridWidth + r.gridX] = r.environmentName;

    // Le camouflage mélange la teinte de la lignée à la couleur du biome : mis en cache,
    // car la même combinaison revient des milliers de fois.
    const colors = new Map<string, [number, number, number]>();
    const creatures: MapCreature[] = individualList.map((ind) => {
      const gx = Math.max(0, Math.min(gridWidth - 1, Math.floor(ind.x / cellSize)));
      const gy = Math.max(0, Math.min(gridHeight - 1, Math.floor(ind.y / cellSize)));
      const biome = biomeNames[gy * gridWidth + gx];
      const hue = lineageHues.get(ind.species) ?? 0;
      const camouflage = Math.round(ind.camouflage * 20) / 20;
      const key = `${hue}|${camouflage}|${biome}`;
      let color = colors.get(key);
      if (!color) {
        const [r, g, b] = hexToRgb(creatureColor(hue, camouflage, BIOME_COLORS[biome] ?? FALLBACK_BIOME_COLOR));
        color = [r / 255, g / 255, b / 255];
        colors.set(key, color);
      }
      return {
        id: ind.id,
        x: ind.x,
        y: ind.y,
        biologicalType: ind.biologicalType,
        sizeScale: ind.sizeScale,
        elongation: ind.elongation,
        ornamentTier: ind.ornamentTier,
        patternTier: ind.patternTier,
        color
      };
    });
    renderer.current.setCreatures(showIndividuals ? creatures : []);
  }, [individualList, regionsData, regionCells, lineageHues, showIndividuals, canvas]);

  useEffect(() => {
    if (!renderer.current || !regionsData || !regionCells) return;
    const metric = overlayMode !== 'biome' ? OVERLAY_METRICS[overlayMode] : null;
    if (!metric) {
      renderer.current.setOverlay(null);
      return;
    }
    const values = regionCells.map(metric);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rgba = new Uint8Array(regionsData.gridWidth * regionsData.gridHeight * 4);
    regionCells.forEach((r, i) => {
      const [red, green, blue] = hexToRgb(sequentialColor(values[i], min, max, overlayMode as Exclude<OverlayMode, 'biome'>));
      const at = (r.gridY * regionsData.gridWidth + r.gridX) * 4;
      rgba[at] = red;
      rgba[at + 1] = green;
      rgba[at + 2] = blue;
      rgba[at + 3] = OVERLAY_ALPHA;
    });
    renderer.current.setOverlay(rgba);
    // Les valeurs par case ne changent pas d'un tick à l'autre, seul le mode ou la carte compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayMode, terrainKey, worldWidth, worldHeight, canvas]);

  const zoomByFactor = useCallback((factor: number, anchorXFrac = 0.5, anchorYFrac = 0.5) => {
    setViewBox((current) => (current ? zoomCamera(current, factor, anchorXFrac, anchorYFrac, world, aspect) : current));
  }, [world, aspect]);

  // Écouteur natif : React attache la molette en mode passif, où preventDefault est refusé.
  useEffect(() => {
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      zoomByFactor(e.deltaY > 0 ? 1.12 : 1 / 1.12, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [container, zoomByFactor]);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!viewBox) return;
    justDragged.current = false;
    dragState.current = { startX: e.clientX, startY: e.clientY, view: viewBox, moved: false };
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || !container) return;
    const dxPx = e.clientX - drag.startX;
    const dyPx = e.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setIsDragging(true);
    }
    const rect = container.getBoundingClientRect();
    setViewBox(
      clampCamera(
        { ...drag.view, x: drag.view.x - (dxPx / rect.width) * drag.view.w, y: drag.view.y - (dyPx / rect.height) * drag.view.h },
        world,
        aspect
      )
    );
  };

  const stopDragging = () => {
    if (dragState.current?.moved) justDragged.current = true;
    dragState.current = null;
    setIsDragging(false);
  };

  // Un glisser relâché sur la carte ne doit pas aussi sélectionner ce qui est dessous.
  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!justDragged.current) return;
    justDragged.current = false;
    e.stopPropagation();
  };

  const handleMouseMoveWorld = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!container || !viewBox) return;
    const rect = container.getBoundingClientRect();
    const worldX = viewBox.x + (e.clientX - rect.left) / rect.width * viewBox.w;
    const worldY = viewBox.y + (e.clientY - rect.top) / rect.height * viewBox.h;
    // Écrit directement dans le DOM : un setState ici redessinerait tout le
    // SVG (un élément par individu) à chaque mouvement de souris.
    if (cursorReadoutRef.current) {
      cursorReadoutRef.current.textContent = `x: ${Math.round(worldX)} y: ${Math.round(worldY)}`;
      cursorReadoutRef.current.style.display = 'block';
    }
  };

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!container || !viewBox || !regionsData || !regionCells || !individualList) return;
    const rect = container.getBoundingClientRect();
    const worldX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const worldY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;

    const id = renderer.current?.pickCreature(worldX, worldY);
    const individual = id != null ? individualList.find((i) => i.id === id) : undefined;
    if (individual) {
      selectIndividual(individual);
      return;
    }
    const gx = Math.floor(worldX / regionsData.cellSize);
    const gy = Math.floor(worldY / regionsData.cellSize);
    const region = regionCells.find((r) => r.gridX === gx && r.gridY === gy);
    if (region) selectRegion(region);
  };

  const handleDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!container || !viewBox) return;
    const rect = container.getBoundingClientRect();
    const worldX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const worldY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
    setViewBox((current) => (current ? centerCamera(current, worldX, worldY, world, aspect) : current));
  };

  const resetView = useCallback(() => {
    if (worldWidth <= 0 || worldHeight <= 0 || aspect <= 0) return;
    setViewBox(fitCamera(world, aspect));
  }, [world, worldWidth, worldHeight, aspect]);

  // Raccourcis clavier pour naviguer sur la carte (façon RimWorld/RTS)
  useEffect(() => {
    const pan = (dxFrac: number, dyFrac: number) =>
      setViewBox((v) => (v ? clampCamera({ ...v, x: v.x + v.w * dxFrac, y: v.y + v.w * dyFrac }, world, aspect) : v));

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;

      const actions: Record<string, () => void> = {
        ArrowLeft: () => pan(-PAN_STEP_FRACTION, 0),
        ArrowRight: () => pan(PAN_STEP_FRACTION, 0),
        ArrowUp: () => pan(0, -PAN_STEP_FRACTION),
        ArrowDown: () => pan(0, PAN_STEP_FRACTION),
        '+': () => zoomByFactor(1 / 1.25),
        '=': () => zoomByFactor(1 / 1.25),
        '-': () => zoomByFactor(1.25),
        _: () => zoomByFactor(1.25),
        '0': resetView,
        Home: resetView,
        i: () => setShowIndividuals((v) => !v),
        I: () => setShowIndividuals((v) => !v),
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [world, aspect, zoomByFactor, resetView]);

  const regionList = simulationData?.regions.regions;
  const biomeStats = useMemo(() => {
    const stats = new Map<string, { regions: number; individuals: number }>();
    for (const region of regionList ?? []) {
      const name = region.environmentName || 'Inconnu';
      const entry = stats.get(name) || { regions: 0, individuals: 0 };
      entry.regions += 1;
      entry.individuals += region.population || 0;
      stats.set(name, entry);
    }
    return stats;
  }, [regionList]);

  const navigateFromMinimap = (worldX: number, worldY: number) => {
    setViewBox((current) => (current ? centerCamera(current, worldX, worldY, world, aspect) : current));
  };

  if (!simulationData || !viewBox) {
    return (
      <div ref={setContainer} className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
        En attente d'une simulation active...
      </div>
    );
  }

  const { regions } = simulationData.regions;
  const distinctBiomes = Array.from(new Set(regions.map((r) => r.environmentName))).filter(Boolean);
  const currentZoom = zoomLevel(viewBox, world, aspect);

  const overlayMetric = overlayMode !== 'biome' ? OVERLAY_METRICS[overlayMode] : null;
  const overlayRange = overlayMetric
    ? regions.reduce(
        (acc, r) => {
          const v = overlayMetric(r);
          return { min: Math.min(acc.min, v), max: Math.max(acc.max, v) };
        },
        { min: Infinity, max: -Infinity }
      )
    : null;

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden">
      <div
        ref={setContainer}
        className="absolute inset-0"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveWorld(e); }}
        onMouseUp={stopDragging}
        onMouseLeave={() => { stopDragging(); if (cursorReadoutRef.current) cursorReadoutRef.current.style.display = 'none'; }}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        onClickCapture={handleClickCapture}
      >
        <canvas
          ref={setCanvas}
          data-viewbox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-[5]">
          <div className="game-panel p-4 text-sm max-w-md">
            <p className="font-semibold text-red-300">Impossible d'afficher la carte</p>
            <p className="text-xs text-slate-400 mt-1">{renderError}</p>
          </div>
        </div>
      )}

      {/* Outils de carte au-dessus du temps, en bas à droite. */}
      <div className="absolute right-2 bottom-[136px] w-60 flex flex-col gap-0.5 z-10">
        {overlayMetric && overlayRange && (
          <div className="game-panel px-2 py-1 text-xs">
            <div
              className="h-2 mb-1"
              style={{ background: `linear-gradient(to right, ${ramp(overlayMode as Exclude<OverlayMode, 'biome'>).light}, ${ramp(overlayMode as Exclude<OverlayMode, 'biome'>).dark})` }}
            />
            <div className="flex justify-between text-slate-400">
              <span>{overlayRange.min.toFixed(1)}</span>
              <span>{overlayRange.max.toFixed(1)}</span>
            </div>
          </div>
        )}
        <select
          value={overlayMode}
          onChange={(e) => setOverlayMode(e.target.value as OverlayMode)}
          className="input-field text-xs w-full"
          aria-label="Calque de la carte"
        >
          {(Object.keys(OVERLAY_LABELS) as OverlayMode[]).map((mode) => (
            <option key={mode} value={mode}>{OVERLAY_LABELS[mode]}</option>
          ))}
        </select>
        <div className="game-panel p-1 flex items-center gap-0.5">
          <button className="game-button px-2 text-sm" onClick={() => zoomByFactor(1.25)} title="Zoom arrière (-)">−</button>
          <span className="text-xs w-11 text-center">{Math.round(currentZoom * 100)} %</span>
          <button className="game-button px-2 text-sm" onClick={() => zoomByFactor(1 / 1.25)} title="Zoom avant (+)">+</button>
          <button className="game-button flex-1 text-xs py-0.5" onClick={resetView} title="Voir tout le monde (0)">Tout voir</button>
          <button className={`game-button px-1.5 text-xs py-0.5 ${showIndividuals ? 'game-button-active' : ''}`} onClick={() => setShowIndividuals((v) => !v)} title="Afficher ou masquer les individus (I)">
            Indiv.
          </button>
        </div>
      </div>

      <div
        ref={cursorReadoutRef}
        className="absolute bottom-11 left-1/2 -translate-x-1/2 game-panel text-slate-400 px-2 py-0.5 text-[11px] pointer-events-none"
        style={{ display: 'none' }}
      />

      {/* Légendes flottantes en bas à gauche -- hauteur bornée et repliable :
          la liste d'espèces grandit avec les spéciations réelles et finissait
          par couvrir une bonne partie de la carte (bug signalé), donc jamais
          plus qu'une bande défilante, quelle que soit la génération. */}
      <div className="absolute top-[74px] left-2 w-72 game-panel text-xs z-10">
        <button
          className="w-full flex items-center justify-between px-2 py-1 text-slate-200 hover:bg-slate-700"
          onClick={() => setLegendCollapsed((v) => !v)}
        >
          <span className="font-medium">Légende ({distinctBiomes.length} biomes, {(lineages ?? []).length} espèces)</span>
          {legendCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {!legendCollapsed && (
          <div className="px-2 pb-2 space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            <div className="flex flex-wrap gap-2">
              {distinctBiomes.map((name) => {
                const stats = biomeStats.get(name);
                return (
                  <div key={name} className="flex items-center gap-1" title={`${stats?.regions ?? 0} régions • ${stats?.individuals ?? 0} individus`}>
                    <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: BIOME_COLORS[name] ?? FALLBACK_BIOME_COLOR }} />
                    <span className="text-slate-300">{name}</span>
                    {stats && <span className="text-slate-500">({stats.regions}•{stats.individuals})</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-2">
              {(lineages ?? []).map((lineage) => {
                const isPinned = pinnedSpecies.includes(lineage.speciesName);
                return (
                  <div key={lineage.speciesName} className="flex items-center gap-0.5 hover:bg-slate-700/60 rounded px-1 -mx-1">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => showSpeciesDetail(lineage.speciesName)}
                      title="Voir la fiche complète de l'espèce"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ background: creatureColor(lineageHues.get(lineage.speciesName) ?? 0, 0, FALLBACK_BIOME_COLOR) }}
                      />
                      <span className="text-slate-300">{lineage.speciesName} ({lineage.population})</span>
                    </button>
                    <button
                      className={isPinned ? 'text-primary-400' : 'text-slate-600 hover:text-slate-300'}
                      onClick={() => togglePinnedSpecies(lineage.speciesName)}
                      title={isPinned ? 'Retirer de la comparaison' : 'Épingler pour comparer'}
                    >
                      {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {pinnedSpecies.length >= 2 && (
        <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <button
            className="button-primary px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-lg pointer-events-auto"
            onClick={() => setCompareOpen(true)}
          >
            <Columns3 className="w-3.5 h-3.5" /> Comparer ({pinnedSpecies.length})
          </button>
        </div>
      )}

      <div className="absolute top-2 right-2 pointer-events-none z-10">
        <Minimap
          image={worldImage}
          worldWidth={worldWidth}
          worldHeight={worldHeight}
          viewBox={viewBox}
          onNavigate={navigateFromMinimap}
        />
      </div>

    </div>
  );
}
