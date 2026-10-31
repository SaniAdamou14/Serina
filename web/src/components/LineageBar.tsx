import { useMemo } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'

const MAX_TILES = 12

/**
 * Bandeau en haut au centre, à la place de la barre de colons de RimWorld : les
 * lignées les plus nombreuses, avec un accès direct à leur fiche.
 */
export function LineageBar() {
  const { simulationData } = useSimulation()
  const { showSpeciesDetail } = useSelection()
  const lineages = simulationData?.status.lineages

  const sorted = useMemo(() => [...(lineages ?? [])].sort((a, b) => b.population - a.population), [lineages])
  if (sorted.length === 0) return null

  const hidden = sorted.length - MAX_TILES

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex gap-0.5 max-w-[calc(100vw-420px)] overflow-hidden">
      {sorted.slice(0, MAX_TILES).map((lineage) => (
        <button
          key={lineage.speciesName}
          className="game-panel px-2 py-1 text-left w-24 shrink-0 hover:border-primary-400"
          onClick={() => showSpeciesDetail(lineage.speciesName)}
          title={`${lineage.speciesName} : ${lineage.population} individu(s)`}
        >
          <div className="text-[11px] leading-tight truncate">{lineage.speciesName}</div>
          <div className="text-[11px] leading-tight text-slate-400">{lineage.population.toLocaleString()}</div>
        </button>
      ))}
      {hidden > 0 && (
        <div className="game-panel px-2 flex items-center text-xs text-slate-400" title={`${hidden} autres espèces, voir l'onglet Espèces`}>
          +{hidden}
        </div>
      )}
    </div>
  )
}
