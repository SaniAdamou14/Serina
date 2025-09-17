import { useSimulation } from '@services/SimulationContext';
import { useState, useEffect, useRef } from 'react';
import { TerrainType, ClimateZone } from '../types';

interface MapPosition {
  x: number;
  y: number;
}

interface MapStats {
  totalLandMass: number;
  oceanCoverage: number;
  forestCoverage: number;
  biodiversityIndex: number;
  averageTemperature: number;
  populationDensity: number;
}

export function WorldMap() {
  const { simulationData } = useSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedRegion, setSelectedRegion] = useState<MapPosition | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'terrain' | 'climate' | 'species' | 'resources'>('terrain');
  const [mapStats, setMapStats] = useState<MapStats | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  // Couleurs du terrain inspirées de Serina
  const terrainColors = {
    [TerrainType.LAND]: '#8FBC8F',      // Vert forêt
    [TerrainType.WATER]: '#4682B4',     // Bleu océan
    [TerrainType.MOUNTAIN]: '#696969',  // Gris montagne
    [TerrainType.FOREST]: '#228B22',    // Vert forêt dense
    [TerrainType.DESERT]: '#F4A460',    // Sable
    [TerrainType.WETLAND]: '#20B2AA',   // Bleu-vert marais
    [TerrainType.GRASSLAND]: '#9ACD32', // Vert prairie
    [TerrainType.TUNDRA]: '#E6E6FA',    // Lavande toundra
    [TerrainType.CAVES]: '#2F4F4F',     // Gris sombre
    [TerrainType.VOLCANIC]: '#B22222'   // Rouge volcanique
  };

  const climateColors = {
    [ClimateZone.TROPICAL]: '#FF6347',      // Rouge tropical
    [ClimateZone.TEMPERATE]: '#32CD32',     // Vert tempéré
    [ClimateZone.ARCTIC]: '#F0F8FF',        // Blanc arctique
    [ClimateZone.DESERT]: '#FFD700',        // Or désert
    [ClimateZone.OCEANIC]: '#1E90FF',       // Bleu océanique
    [ClimateZone.MONTANE]: '#8B7D6B',       // Brun montagnard
    [ClimateZone.SUBTROPICAL]: '#FF69B4',   // Rose subtropical
    [ClimateZone.BOREAL]: '#006400',        // Vert sombre boréal
    [ClimateZone.MEDITERRANEAN]: '#9370DB'  // Violet méditerranéen
  };

  useEffect(() => {
    if (simulationData?.worldState) {
      calculateMapStats();
    }
    drawMap();
  }, [simulationData, zoomLevel, viewMode]);

  const calculateMapStats = () => {
    if (!simulationData?.worldState) return;

    const { worldState } = simulationData;
    const { terrainMap, worldSize } = worldState;
    
    if (!terrainMap || !terrainMap.length) return;

    const totalCells = worldSize.width * worldSize.height;
    let landCells = 0;
    let oceanCells = 0;
    let forestCells = 0;

    terrainMap.forEach(row => {
      row.forEach(terrain => {
        if (terrain === TerrainType.WATER) oceanCells++;
        else if (terrain === TerrainType.FOREST) {
          forestCells++;
          landCells++;
        } else {
          landCells++;
        }
      });
    });

    const totalPopulation = simulationData.species.reduce((sum, s) => sum + s.populationCount, 0);
    
    setMapStats({
      totalLandMass: (landCells / totalCells) * 100,
      oceanCoverage: (oceanCells / totalCells) * 100,
      forestCoverage: (forestCells / totalCells) * 100,
      biodiversityIndex: simulationData.species.length * (simulationData.evolutionStats.geneticDiversity || 0.5),
      averageTemperature: worldState.environment.temperature,
      populationDensity: totalPopulation / landCells
    });
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationData?.worldState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { worldState } = simulationData;
    const { terrainMap, climateMap, worldSize } = worldState;

    // Redimensionner le canvas
    canvas.width = 800;
    canvas.height = 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!terrainMap || !terrainMap.length) {
      // Générer une carte procédurale de Serina si pas de données
      drawSerinaMap(ctx, canvas.width, canvas.height);
      return;
    }

    // Dessiner la carte réelle
    const cellWidth = canvas.width / worldSize.width;
    const cellHeight = canvas.height / worldSize.height;

    for (let y = 0; y < worldSize.height; y++) {
      for (let x = 0; x < worldSize.width; x++) {
        const terrain = terrainMap[y]?.[x] || TerrainType.LAND;
        const climate = climateMap?.[y]?.[x] || ClimateZone.TEMPERATE;
        
        // Mélanger les couleurs terrain et climat
        const terrainColor = terrainColors[terrain];
        const climateColor = climateColors[climate];
        
        ctx.fillStyle = blendColors(terrainColor, climateColor, 0.7);
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }

    // Dessiner les espèces
    drawSpeciesDistribution(ctx, canvas.width, canvas.height);
  };

  const drawSerinaMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Fond océanique
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, width, height);

    // Continent principal de Serina (forme approximative)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    
    // Continent en forme de croissant (inspiré des cartes de Serina)
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const radius = Math.min(width, height) * 0.3;
    
    ctx.ellipse(centerX, centerY, radius * 1.5, radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Îles secondaires
    drawIsland(ctx, width * 0.2, height * 0.3, 40);
    drawIsland(ctx, width * 0.8, height * 0.7, 30);
    drawIsland(ctx, width * 0.15, height * 0.75, 25);

    // Chaînes de montagnes
    ctx.fillStyle = '#6b7280';
    for (let i = 0; i < 5; i++) {
      const x = centerX + (Math.random() - 0.5) * radius;
      const y = centerY + (Math.random() - 0.5) * radius * 0.6;
      drawMountainRange(ctx, x, y, 20 + Math.random() * 15);
    }

    // Forêts
    ctx.fillStyle = '#059669';
    for (let i = 0; i < 8; i++) {
      const x = centerX + (Math.random() - 0.5) * radius * 1.2;
      const y = centerY + (Math.random() - 0.5) * radius * 0.6;
      drawForest(ctx, x, y, 15 + Math.random() * 10);
    }

    // Rivières
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    drawRiver(ctx, centerX - radius * 0.5, centerY - radius * 0.3, centerX + radius * 0.5, centerY + radius * 0.3);
    drawRiver(ctx, centerX, centerY - radius * 0.4, centerX - radius * 0.3, centerY + radius * 0.5);
  };

  const drawIsland = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawMountainRange = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x - size, y + size/2);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size, y + size/2);
    ctx.closePath();
    ctx.fill();
  };

  const drawForest = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawRiver = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Courbe sinueuse
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 50;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 50;
    
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();
  };

  const drawSpeciesDistribution = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!simulationData?.species) return;

    simulationData.species.forEach((species, index) => {
      // Couleur unique pour chaque espèce
      const hue = (index * 137.5) % 360; // Séquence dorée pour espacement optimal
      ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.6)`;
      
      // Distribution basée sur la niche écologique
      const nicheAreas = getSpeciesAreas(species.ecologicalNiche, width, height);
      
      nicheAreas.forEach(area => {
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.size * (species.populationCount / 1000), 0, Math.PI * 2);
        ctx.fill();
        
        // Nom de l'espèce
        if (area.size > 10) {
          ctx.fillStyle = 'white';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(species.name.split(' ')[0], area.x, area.y + 3);
        }
      });
    });
  };

  const getSpeciesAreas = (niche: string, width: number, height: number) => {
    const areas = [];
    const baseX = width * 0.5;
    const baseY = height * 0.5;
    
    // Distribution selon la niche écologique
    if (niche.includes('aquatic') || niche.includes('water')) {
      // Zones aquatiques - rivières et côtes
      areas.push({ x: baseX * 0.3, y: baseY * 0.8, size: 15 });
      areas.push({ x: baseX * 1.7, y: baseY * 1.2, size: 12 });
    } else if (niche.includes('forest') || niche.includes('tree')) {
      // Zones forestières
      areas.push({ x: baseX * 0.7, y: baseY * 0.6, size: 20 });
      areas.push({ x: baseX * 1.3, y: baseY * 1.4, size: 18 });
    } else if (niche.includes('grassland') || niche.includes('open')) {
      // Prairies ouvertes
      areas.push({ x: baseX * 1.1, y: baseY * 0.8, size: 25 });
      areas.push({ x: baseX * 0.9, y: baseY * 1.2, size: 22 });
    } else {
      // Distribution générale
      areas.push({ x: baseX, y: baseY, size: 16 });
    }
    
    return areas;
  };

  const blendColors = (color1: string, color2: string, ratio: number) => {
    // Conversion simplifiée - idéalement utiliser une vraie fonction de mélange de couleurs
    return color1; // Pour l'instant, retourner la couleur principale
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setSelectedRegion({ x, y });
  };

  const getRegionInfo = (position: MapPosition) => {
    if (!simulationData?.worldState) return null;

    const { worldSize } = simulationData.worldState;
    const cellX = Math.floor((position.x / 800) * worldSize.width);
    const cellY = Math.floor((position.y / 600) * worldSize.height);

    return {
      terrain: simulationData.worldState.terrainMap?.[cellY]?.[cellX] || TerrainType.LAND,
      climate: simulationData.worldState.climateMap?.[cellY]?.[cellX] || ClimateZone.TEMPERATE,
      resources: simulationData.worldState.resourceMap?.[cellY]?.[cellX] || 0.5,
      coordinates: { x: cellX, y: cellY }
    };
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">🗺️ Carte Interactive de Serina</h3>
        <div className="flex items-center space-x-2">
          {/* Mode de visualisation */}
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="terrain">Terrain</option>
            <option value="climate">Climat</option>
            <option value="species">Espèces</option>
            <option value="resources">Ressources</option>
          </select>
          
          {/* Contrôles de zoom */}
          <button 
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
          >
            🔍-
          </button>
          <span className="text-sm">{(zoomLevel * 100).toFixed(0)}%</span>
          <button 
            onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
            className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
          >
            🔍+
          </button>
          
          {/* Bouton légende */}
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="px-2 py-1 bg-gray-500 text-white rounded text-sm"
          >
            📋
          </button>
        </div>
      </div>

      {/* Statistiques de la carte */}
      {mapStats && (
        <div className="grid grid-cols-6 gap-2 mb-4 text-xs">
          <div className="bg-blue-50 p-2 rounded text-center">
            <div className="font-semibold text-blue-600">{mapStats.totalLandMass.toFixed(1)}%</div>
            <div className="text-blue-500">Terre émergée</div>
          </div>
          <div className="bg-cyan-50 p-2 rounded text-center">
            <div className="font-semibold text-cyan-600">{mapStats.oceanCoverage.toFixed(1)}%</div>
            <div className="text-cyan-500">Océans</div>
          </div>
          <div className="bg-green-50 p-2 rounded text-center">
            <div className="font-semibold text-green-600">{mapStats.forestCoverage.toFixed(1)}%</div>
            <div className="text-green-500">Forêts</div>
          </div>
          <div className="bg-purple-50 p-2 rounded text-center">
            <div className="font-semibold text-purple-600">{mapStats.biodiversityIndex.toFixed(2)}</div>
            <div className="text-purple-500">Biodiversité</div>
          </div>
          <div className="bg-red-50 p-2 rounded text-center">
            <div className="font-semibold text-red-600">{mapStats.averageTemperature.toFixed(1)}°C</div>
            <div className="text-red-500">Température</div>
          </div>
          <div className="bg-orange-50 p-2 rounded text-center">
            <div className="font-semibold text-orange-600">{mapStats.populationDensity.toFixed(1)}</div>
            <div className="text-orange-500">Densité/km²</div>
          </div>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="border border-gray-300 rounded-lg cursor-crosshair w-full h-auto"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
        />
        
        {selectedRegion && (
          <div className="absolute top-2 right-2 bg-white p-3 rounded-lg shadow-lg border">
            <h4 className="font-semibold text-sm mb-2">📍 Région sélectionnée</h4>
            {(() => {
              const info = getRegionInfo(selectedRegion);
              return info ? (
                <div className="text-xs space-y-1">
                  <div><strong>Terrain:</strong> {info.terrain}</div>
                  <div><strong>Climat:</strong> {info.climate}</div>
                  <div><strong>Ressources:</strong> {(info.resources * 100).toFixed(0)}%</div>
                  <div><strong>Coordonnées:</strong> ({info.coordinates.x}, {info.coordinates.y})</div>
                </div>
              ) : (
                <div className="text-xs">Informations non disponibles</div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        {showLegend && (
          <>
            <div>
              <h4 className="font-semibold mb-2">🌍 Légende des terrains</h4>
              <div className="space-y-1">
                {Object.entries(terrainColors).slice(0, 5).map(([terrain, color]) => (
                  <div key={terrain} className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
                    <span>{terrain.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">🌡️ Zones climatiques</h4>
              <div className="space-y-1">
                {Object.entries(climateColors).slice(0, 5).map(([climate, color]) => (
                  <div key={climate} className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
                    <span>{climate.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* Analyse écologique */}
        <div className="col-span-2">
          <h4 className="font-semibold mb-2">📊 Analyse Écologique</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium">Espèces actives</div>
              <div>{simulationData?.species?.length || 0}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium">Population totale</div>
              <div>{simulationData?.species?.reduce((sum, s) => sum + s.populationCount, 0).toLocaleString() || '0'}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium">Génération</div>
              <div>{simulationData?.generation || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">🌟 À propos de Serina</h4>
        <p className="text-sm text-blue-700">
          Serina est un monde unique où seules quelques espèces terrestres ont été introduites : 
          canaris, poissons tropicaux, grillons, fourmis de feu et escargots géants. 
          Cette carte interactive montre l'évolution et la distribution de leurs descendants 
          après des millions d'années d'évolution sur cette planète vierge.
        </p>
      </div>
    </div>
  );
}