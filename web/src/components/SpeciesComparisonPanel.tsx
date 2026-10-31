import { X } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { AverageTraits, BIOLOGICAL_GROUP_LABELS, TRAIT_BOUNDS } from '../types'
import { useLineageHues } from '../hooks/useLineageHues'
import { creatureColor } from '../utils/lineageColor'
import { GameWindow } from './GameWindow'

const TRAIT_KEYS = Object.keys(TRAIT_BOUNDS) as (keyof AverageTraits)[]

/** Comparaison d'espèces épinglées : les traits moyens, ligne par ligne. */
export function SpeciesComparisonPanel() {
  const { simulationData } = useSimulation()
  const { pinnedSpecies, togglePinnedSpecies, setCompareOpen } = useSelection()
  const hues = useLineageHues()

  const lineages = simulationData?.status.lineages ?? []
  const entries = pinnedSpecies
    .map((name) => lineages.find((l) => l.speciesName === name))
    .filter((l): l is NonNullable<typeof l> => !!l)

  return (
    <GameWindow title="Comparaison d'espèces" onClose={() => setCompareOpen(false)} placement="center" width={880} height={560}>
      {entries.length === 0 ? (
        <p className="text-sm">Aucune des espèces épinglées n'est encore en vie.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-800">
              <tr>
                <th scope="col" className="text-left px-2 py-1 font-semibold border-b border-slate-600 w-44">Trait</th>
                {entries.map((l) => (
                  <th key={l.speciesName} scope="col" className="text-left px-2 py-1 font-semibold border-b border-slate-600 min-w-[9rem]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ background: creatureColor(hues.get(l.speciesName) ?? 0, 0, '#2a2b29') }}
                      />
                      <span className="italic truncate">{l.speciesName}</span>
                      <button
                        className="ml-auto opacity-60 hover:opacity-100"
                        title="Retirer de la comparaison"
                        aria-label={`Retirer ${l.speciesName} de la comparaison`}
                        onClick={() => togglePinnedSpecies(l.speciesName)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="px-2 py-1 text-slate-400">Groupe</td>
                {entries.map((l) => <td key={l.speciesName} className="px-2 py-1">{BIOLOGICAL_GROUP_LABELS[l.biologicalType] ?? 'Inconnu'}</td>)}
              </tr>
              <tr className="border-b border-slate-700 bg-slate-950/25">
                <td className="px-2 py-1 text-slate-400">Population</td>
                {entries.map((l) => <td key={l.speciesName} className="px-2 py-1 tabular-nums">{l.population.toLocaleString()}</td>)}
              </tr>
              {TRAIT_KEYS.map((key) => {
                const bounds = TRAIT_BOUNDS[key]
                return (
                  <tr key={key} className="border-b border-slate-700 odd:bg-slate-950/25">
                    <td className="px-2 py-1 text-slate-400" title={`De ${bounds.min} à ${bounds.max}`}>{bounds.label}</td>
                    {entries.map((l) => {
                      const value = l.averageTraits[key]
                      const fraction = Math.max(0, Math.min(1, (value - bounds.min) / (bounds.max - bounds.min)))
                      return (
                        <td key={l.speciesName} className="px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right shrink-0 tabular-nums">{value.toFixed(2)}</span>
                            <div className="flex-1 bg-slate-950 border border-slate-700 h-2">
                              <div className="bg-primary-500 h-full" style={{ width: `${fraction * 100}%` }} />
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
    </GameWindow>
  )
}
