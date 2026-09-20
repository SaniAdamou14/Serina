import { useMemo } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { computeLineageHues, creatureColor } from '../utils/lineageColor'

export function PopulationChart() {
  const { simulationData } = useSimulation()
  const lineages = simulationData?.status.lineages
  const speciationEvents = simulationData?.lineages.speciationEvents

  // Même teinte stable par lignée que sur la carte (WorldMap.tsx) --
  // dérivée de la vraie topologie de spéciation, pas de l'index dans le
  // tableau, pour que la couleur d'une espèce reste cohérente entre les
  // deux vues et ne saute pas d'un sondage à l'autre.
  const lineageHues = useMemo(
    () => computeLineageHues(speciationEvents ?? [], (lineages ?? []).map((l) => l.speciesName)),
    [speciationEvents, lineages]
  )

  if (!simulationData || !lineages) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  const { status } = simulationData
  const averageDiversity = lineages.length
    ? lineages.reduce((sum, l) => sum + l.geneticDiversity, 0) / lineages.length
    : 0

  return (
    <div className="card">
      <div className="border-b border-slate-700 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-100">Dynamique de Population</h3>
        <p className="text-sm text-slate-400">État réel de l'écosystème, génération {status.generation}</p>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-400">{status.population}</div>
          <div className="text-sm text-slate-400">Population Totale</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-genetic-400">{status.generation}</div>
          <div className="text-sm text-slate-400">Génération</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-ecosystem-400">{status.speciesCount}</div>
          <div className="text-sm text-slate-400">Espèces</div>
        </div>
      </div>

      {/* Species Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Répartition par espèce</h4>
        {lineages.map((lineage) => {
          const percentage = status.population > 0 ? (lineage.population / status.population) * 100 : 0
          const color = creatureColor(lineageHues.get(lineage.speciesName) ?? 0, 0, '#1e293b')

          return (
            <div key={lineage.speciesName} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-300">{lineage.speciesName}</span>
                <span className="text-slate-400">{lineage.population} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${percentage}%`, background: color }}></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Evolution Stats */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Indicateurs Évolutifs</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Spéciations</span>
            <span className="font-medium text-slate-200">{status.speciationEventCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Diversité génétique moyenne</span>
            <span className="font-medium text-slate-200">{averageDiversity.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
