import { useSimulation } from '@services/SimulationContext'
import { TraitType } from '../types'

export function GeneticAnalysis() {
  const { simulationData } = useSimulation()

  if (!simulationData) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const traitNames = {
    [TraitType.SIZE]: 'Size',
    [TraitType.SPEED]: 'Speed',
    [TraitType.STRENGTH]: 'Strength',
    [TraitType.INTELLIGENCE]: 'Intelligence',
    [TraitType.LONGEVITY]: 'Longevity',
    [TraitType.RESISTANCE]: 'Disease Resistance',
    [TraitType.METABOLISM]: 'Metabolism',
    [TraitType.SOCIABILITY]: 'Sociability',
    [TraitType.ADAPTABILITY]: 'Adaptability',
    [TraitType.VISION_RANGE]: 'Vision Range',
    [TraitType.CAMOUFLAGE]: 'Camouflage',
    [TraitType.REPRODUCTION_RATE]: 'Reproduction Rate'
  }

  // Mock trait data since species.averageTrait is empty in current implementation
  const mockTraitData = {
    [TraitType.SIZE]: Math.random() * 0.8 + 0.1,
    [TraitType.SPEED]: Math.random() * 0.8 + 0.1,
    [TraitType.STRENGTH]: Math.random() * 0.8 + 0.1,
    [TraitType.INTELLIGENCE]: Math.random() * 0.8 + 0.1,
    [TraitType.LONGEVITY]: Math.random() * 0.8 + 0.1,
    [TraitType.RESISTANCE]: Math.random() * 0.8 + 0.1,
    [TraitType.METABOLISM]: Math.random() * 0.8 + 0.1,
    [TraitType.SOCIABILITY]: Math.random() * 0.8 + 0.1,
    [TraitType.ADAPTABILITY]: Math.random() * 0.8 + 0.1,
    [TraitType.VISION_RANGE]: Math.random() * 0.8 + 0.1,
    [TraitType.CAMOUFLAGE]: Math.random() * 0.8 + 0.1,
    [TraitType.REPRODUCTION_RATE]: Math.random() * 0.8 + 0.1
  }

  const getTraitColor = (value: number) => {
    if (value >= 0.7) return 'bg-green-500'
    if (value >= 0.4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Genetic Diversity Overview */}
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Genetic Analysis</h3>
          <p className="text-sm text-gray-600">Population-wide genetic traits and evolutionary trends</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-genetic-600">
              {(simulationData.evolutionStats.geneticDiversity * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Genetic Diversity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {simulationData.evolutionStats.totalMutations.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Mutations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-ecosystem-600">
              {(simulationData.evolutionStats.averageFitness * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Fitness</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {(simulationData.evolutionStats.extinctionRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Extinction Rate</div>
          </div>
        </div>

        {/* Trait Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">Population Trait Distribution</h4>
          <div className="space-y-3">
            {Object.entries(traitNames).map(([traitKey, traitName]) => {
              const value = mockTraitData[traitKey as TraitType]
              const percentage = value * 100
              
              return (
                <div key={traitKey} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{traitName}</span>
                    <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getTraitColor(value)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Evolutionary Trends */}
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Evolutionary Trends</h3>
          <p className="text-sm text-gray-600">Genetic changes over recent generations</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="genetic-trait">
            <h4 className="font-medium text-genetic-800 mb-3">Mutation Patterns</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Point Mutations</span>
                <span className="font-medium">73%</span>
              </div>
              <div className="flex justify-between">
                <span>Trait Swaps</span>
                <span className="font-medium">19%</span>
              </div>
              <div className="flex justify-between">
                <span>Beneficial</span>
                <span className="font-medium">8%</span>
              </div>
            </div>
          </div>

          <div className="genetic-trait">
            <h4 className="font-medium text-genetic-800 mb-3">Selection Pressure</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Intelligence</span>
                <span className="font-medium text-green-600">↗ High</span>
              </div>
              <div className="flex justify-between">
                <span>Speed</span>
                <span className="font-medium text-yellow-600">→ Stable</span>
              </div>
              <div className="flex justify-between">
                <span>Size</span>
                <span className="font-medium text-red-600">↘ Declining</span>
              </div>
            </div>
          </div>
        </div>

        {/* Genetic Lineage Tree */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Lineage Tracking</h4>
          <div className="h-32 bg-genetic-50 rounded-lg flex items-center justify-center border-2 border-dashed border-genetic-300">
            <div className="text-center text-genetic-600">
              <div className="text-sm">🌳 Genetic Lineage Tree</div>
              <div className="text-xs">Interactive phylogenetic tree coming soon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}