import { Thermometer, Sprout, Crosshair, Swords, Snowflake, Users, Zap, Clock, MapPin, ClipboardList, MousePointerClick } from 'lucide-react'
import { useSelection } from '@services/SelectionContext'

/**
 * Panneau d'inspection ancré à droite de la carte, façon RimWorld -- remplace
 * les popups flottantes qui vivaient autrefois dans WorldMap.tsx. Lit la
 * sélection depuis SelectionContext (levée hors de la carte) pour pouvoir,
 * à terme, rester visible même si la sélection a été faite ailleurs.
 */
export function InspectorPanel() {
  const { selectedRegion, selectedIndividual, showSpeciesDetail } = useSelection()

  if (selectedRegion) {
    return (
      <div className="text-sm">
        <h4 className="font-semibold text-blue-200">
          {selectedRegion.environmentName || 'Biome inconnu'} — case ({selectedRegion.gridX}, {selectedRegion.gridY})
        </h4>
        <div className="grid grid-cols-1 gap-y-2 mt-3 text-blue-300 text-xs">
          <div className="flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5 shrink-0" /> Température : {selectedRegion.temperature.toFixed(1)}°C</div>
          <div className="flex items-center gap-1.5"><Sprout className="w-3.5 h-3.5 shrink-0" /> Producteurs primaires : {(selectedRegion.primaryProducers * 100).toFixed(0)}%</div>
          <div className="flex items-center gap-1.5"><Crosshair className="w-3.5 h-3.5 shrink-0" /> Prédation : {(selectedRegion.predationPressure * 100).toFixed(0)}%</div>
          <div className="flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 shrink-0" /> Compétition : {(selectedRegion.competitionIntensity * 100).toFixed(0)}%</div>
          <div className="flex items-center gap-1.5"><Snowflake className="w-3.5 h-3.5 shrink-0" /> Stress climatique : {(selectedRegion.climaticStress * 100).toFixed(0)}%</div>
          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 shrink-0" /> Individus ici : {selectedRegion.population}</div>
        </div>
      </div>
    )
  }

  if (selectedIndividual) {
    return (
      <div className="text-sm">
        <h4 className="font-semibold text-amber-200">{selectedIndividual.species}</h4>
        <p className="text-xs text-amber-400/80">Individu #{selectedIndividual.id}</p>
        <div className="grid grid-cols-1 gap-y-2 mt-3 text-amber-300 text-xs">
          <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 shrink-0" /> Énergie : {selectedIndividual.energy.toFixed(1)}</div>
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0" /> Âge : {selectedIndividual.age.toFixed(1)}</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> Position : ({selectedIndividual.x.toFixed(1)}, {selectedIndividual.y.toFixed(1)})</div>
        </div>
        <button
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs bg-amber-800 hover:bg-amber-700 text-amber-100 rounded px-2 py-1.5"
          onClick={() => showSpeciesDetail(selectedIndividual.species)}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Voir la fiche complète de l'espèce
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-500 gap-2 px-2">
      <MousePointerClick className="w-6 h-6 text-slate-600" />
      <p>Cliquez une région ou un individu sur la carte pour l'inspecter.</p>
      <p className="text-slate-600">Molette : zoom. Glisser : déplacer.</p>
    </div>
  )
}
