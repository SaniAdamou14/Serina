import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { AverageTraits, TRAIT_BOUNDS } from '../types'
import { computeLineageHues, creatureColor } from '../utils/lineageColor'

/**
 * Comparaison côte à côte de lignées épinglées depuis la légende de
 * WorldMap.tsx (Chantier E4) : un tableau des 12 traits réels moyens
 * (mêmes bornes que TraitBar/SpeciesDetailPanel, une seule source de
 * vérité) plutôt que 12 barres séparées par espèce -- c'est justement la
 * comparaison ligne par ligne qui manquait au niveau 2 d'inspection.
 */
export function SpeciesComparisonPanel() {
  const { simulationData } = useSimulation()
  const { pinnedSpecies, togglePinnedSpecies, setCompareOpen } = useSelection()

  const lineages = simulationData?.status.lineages
  const speciationEvents = simulationData?.lineages.speciationEvents
  const lineageHues = useMemo(
    () => computeLineageHues(speciationEvents ?? [], (lineages ?? []).map((l) => l.speciesName)),
    [speciationEvents, lineages]
  )

  const entries = pinnedSpecies
    .map((name) => (lineages ?? []).find((l) => l.speciesName === name))
    .filter((l): l is NonNullable<typeof l> => !!l)

  const traitKeys = Object.keys(TRAIT_BOUNDS) as (keyof AverageTraits)[]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCompareOpen(false)}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold">Comparaison d'espèces</h3>
            <p className="text-xs text-slate-400">Profils génétiques moyens réels, côte à côte</p>
          </div>
          <button className="text-slate-400 hover:text-slate-200" onClick={() => setCompareOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        {entries.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">
            Aucune des espèces épinglées n'existe plus (éteintes depuis la dernière mise à jour).
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-medium pb-2 pr-3 w-40">Trait</th>
                  {entries.map((l) => (
                    <th key={l.speciesName} className="text-left pb-2 px-2 min-w-[9rem]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ background: creatureColor(lineageHues.get(l.speciesName) ?? 0, 0, '#334155') }}
                        />
                        <span className="italic font-semibold text-slate-200 truncate">{l.speciesName}</span>
                        <button
                          className="text-slate-500 hover:text-red-400 ml-auto"
                          title="Retirer de la comparaison"
                          onClick={() => togglePinnedSpecies(l.speciesName)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-slate-500 font-normal">{l.population} individu(s)</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {traitKeys.map((key) => {
                  const bounds = TRAIT_BOUNDS[key]
                  return (
                    <tr key={key} className="border-t border-slate-800">
                      <td className="text-slate-400 py-1.5 pr-3">{bounds.label}</td>
                      {entries.map((l) => {
                        const value = l.averageTraits[key]
                        const fraction = Math.max(0, Math.min(1, (value - bounds.min) / (bounds.max - bounds.min)))
                        return (
                          <td key={l.speciesName} className="py-1.5 px-2">
                            <div className="flex items-center gap-2">
                              <span className="w-8 text-right shrink-0">{value.toFixed(2)}</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${fraction * 100}%` }} />
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
