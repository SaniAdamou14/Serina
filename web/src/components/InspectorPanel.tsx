import { ClipboardList, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSelection } from '@services/SelectionContext'

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

/**
 * Inspecteur en bas à gauche, façon RimWorld : il n'existe que lorsqu'une région ou
 * un individu est sélectionné.
 */
export function InspectorPanel() {
  const { selectedRegion, selectedIndividual, showSpeciesDetail, clearSelection } = useSelection()
  if (!selectedRegion && !selectedIndividual) return null

  return (
    <aside className="game-panel absolute left-2 bottom-11 z-20 w-80 text-xs">
      <div className="flex items-center justify-between px-2 h-7 border-b border-slate-600 bg-slate-800">
        <h3 className="text-sm font-bold truncate">
          {selectedRegion ? selectedRegion.environmentName || 'Biome inconnu' : selectedIndividual?.species}
        </h3>
        <button className="opacity-70 hover:opacity-100" onClick={clearSelection} aria-label="Fermer l'inspecteur" title="Fermer (Échap)">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {selectedRegion && (
        <div className="p-2 space-y-0.5">
          <Row label="Case" value={`${selectedRegion.gridX}, ${selectedRegion.gridY}`} />
          <Row label="Individus ici" value={selectedRegion.population} />
          <Row label="Température" value={`${selectedRegion.temperature.toFixed(1)} °C`} />
          <Row label="Producteurs primaires" value={`${(selectedRegion.primaryProducers * 100).toFixed(0)} %`} />
          <Row label="Prédation" value={`${(selectedRegion.predationPressure * 100).toFixed(0)} %`} />
          <Row label="Compétition" value={`${(selectedRegion.competitionIntensity * 100).toFixed(0)} %`} />
          <Row label="Stress climatique" value={`${(selectedRegion.climaticStress * 100).toFixed(0)} %`} />
        </div>
      )}

      {selectedIndividual && (
        <div className="p-2 space-y-0.5">
          <Row label="Individu" value={`#${selectedIndividual.id}`} />
          <Row label="Énergie" value={selectedIndividual.energy.toFixed(1)} />
          <Row label="Âge" value={selectedIndividual.age.toFixed(0)} />
          <Row label="Position" value={`${selectedIndividual.x.toFixed(1)}, ${selectedIndividual.y.toFixed(1)}`} />
          <button
            className="game-button w-full mt-2 py-1 flex items-center justify-center gap-1"
            onClick={() => showSpeciesDetail(selectedIndividual.species)}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Fiche de l'espèce
          </button>
        </div>
      )}
    </aside>
  )
}
