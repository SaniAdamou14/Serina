import { useSimulation } from '@services/SimulationContext'

const SPECIES_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500', 'bg-indigo-500']

export function PopulationChart() {
  const { simulationData } = useSimulation()

  if (!simulationData) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const { status } = simulationData
  const lineages = status.lineages
  const averageDiversity = lineages.length
    ? lineages.reduce((sum, l) => sum + l.geneticDiversity, 0) / lineages.length
    : 0

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Dynamique de Population</h3>
        <p className="text-sm text-gray-600">État réel de l'écosystème, génération {status.generation}</p>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600">{status.population}</div>
          <div className="text-sm text-gray-600">Population Totale</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-genetic-600">{status.generation}</div>
          <div className="text-sm text-gray-600">Génération</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-ecosystem-600">{status.speciesCount}</div>
          <div className="text-sm text-gray-600">Espèces</div>
        </div>
      </div>

      {/* Species Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Répartition par espèce</h4>
        {lineages.map((lineage, index) => {
          const percentage = status.population > 0 ? (lineage.population / status.population) * 100 : 0

          return (
            <div key={lineage.speciesName} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{lineage.speciesName}</span>
                <span className="text-gray-600">{lineage.population} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${SPECIES_COLORS[index % SPECIES_COLORS.length]}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Evolution Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Indicateurs Évolutifs</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Spéciations</span>
            <span className="font-medium">{status.speciationEventCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Diversité génétique moyenne</span>
            <span className="font-medium">{averageDiversity.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
