import { useSimulation } from '@services/SimulationContext'

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

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Population Dynamics</h3>
        <p className="text-sm text-gray-600">Real-time population tracking across species</p>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600">
            {simulationData.populationCount}
          </div>
          <div className="text-sm text-gray-600">Total Population</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-genetic-600">
            {simulationData.generation}
          </div>
          <div className="text-sm text-gray-600">Generation</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-ecosystem-600">
            {simulationData.species.length}
          </div>
          <div className="text-sm text-gray-600">Species</div>
        </div>
      </div>

      {/* Species Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Species Distribution</h4>
        {simulationData.species.map((species, index) => {
          const percentage = (species.populationCount / simulationData.populationCount) * 100
          const colorClasses = [
            'bg-blue-500',
            'bg-green-500', 
            'bg-purple-500',
            'bg-yellow-500',
            'bg-red-500'
          ]
          
          return (
            <div key={species.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{species.name}</span>
                <span className="text-gray-600">{species.populationCount} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${colorClasses[index % colorClasses.length]}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Evolution Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Evolution Metrics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Mutations</span>
            <span className="font-medium">{simulationData.evolutionStats.totalMutations.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reproductions</span>
            <span className="font-medium">{simulationData.evolutionStats.totalReproductions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Fitness</span>
            <span className="font-medium">{simulationData.evolutionStats.averageFitness.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Diversity</span>
            <span className="font-medium">{simulationData.evolutionStats.geneticDiversity.toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}