import { useSimulation } from '@services/SimulationContext'

export function SpeciesPanel() {
  const { simulationData } = useSimulation()

  if (!simulationData) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getExtinctionRiskColor = (risk: number) => {
    if (risk >= 0.7) return 'text-red-600 bg-red-100'
    if (risk >= 0.4) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getExtinctionRiskLabel = (risk: number) => {
    if (risk >= 0.7) return 'High Risk'
    if (risk >= 0.4) return 'Moderate Risk'
    return 'Low Risk'
  }

  return (
    <div className="space-y-6">
      {/* Species Overview */}
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Species Management</h3>
          <p className="text-sm text-gray-600">Monitor and analyze individual species populations</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {simulationData.species.length}
            </div>
            <div className="text-sm text-gray-600">Active Species</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {simulationData.species.filter(s => s.extinctionRisk < 0.4).length}
            </div>
            <div className="text-sm text-gray-600">Stable</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {simulationData.species.filter(s => s.extinctionRisk >= 0.7).length}
            </div>
            <div className="text-sm text-gray-600">At Risk</div>
          </div>
        </div>

        {/* Species Cards */}
        <div className="space-y-4">
          {simulationData.species.map((species) => (
            <div key={species.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-genetic-400 flex items-center justify-center text-white font-bold">
                    {species.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{species.name}</h4>
                    <p className="text-sm text-gray-600">{species.ecologicalNiche}</p>
                  </div>
                </div>
                <div className={`status-indicator ${getExtinctionRiskColor(species.extinctionRisk)}`}>
                  {getExtinctionRiskLabel(species.extinctionRisk)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{species.populationCount}</div>
                  <div className="text-gray-600">Population</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{species.generationSpan}</div>
                  <div className="text-gray-600">Gen Span</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{(species.extinctionRisk * 100).toFixed(0)}%</div>
                  <div className="text-gray-600">Risk</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">
                    {((species.populationCount / simulationData.populationCount) * 100).toFixed(1)}%
                  </div>
                  <div className="text-gray-600">Share</div>
                </div>
              </div>

              {/* Population Trend */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Population Trend</span>
                  <span>Last 10 generations</span>
                </div>
                <div className="h-8 bg-gray-100 rounded flex items-end space-x-1 px-2">
                  {[...Array(10)].map((_, i) => {
                    const height = Math.random() * 70 + 20
                    const color = i === 9 ? 'bg-primary-500' : 'bg-gray-400'
                    return (
                      <div
                        key={i}
                        className={`w-2 ${color} rounded-t`}
                        style={{ height: `${height}%` }}
                      ></div>
                    )
                  })}
                </div>
              </div>

              {/* Trait Highlights */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">Dominant Traits</div>
                <div className="flex flex-wrap gap-2">
                  {['Intelligence', 'Adaptability', 'Vision Range'].map((trait) => (
                    <span key={trait} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-genetic-100 text-genetic-700">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Species Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button className="w-full button-secondary">
            ➕ Add New Species
          </button>
        </div>
      </div>

      {/* Species Analytics */}
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Species Analytics</h3>
          <p className="text-sm text-gray-600">Comparative analysis and ecological relationships</p>
        </div>

        {/* Ecological Niches */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Ecological Niches</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="ecosystem-stat">
              <div className="text-sm font-medium text-ecosystem-800 mb-2">Generalists</div>
              <div className="text-2xl font-bold">
                {simulationData.species.filter(s => s.ecologicalNiche === 'Generalist').length}
              </div>
              <div className="text-xs text-gray-600">Adaptable species</div>
            </div>
            <div className="ecosystem-stat">
              <div className="text-sm font-medium text-ecosystem-800 mb-2">Specialists</div>
              <div className="text-2xl font-bold">
                {simulationData.species.filter(s => s.ecologicalNiche === 'Specialist').length}
              </div>
              <div className="text-xs text-gray-600">Niche-focused species</div>
            </div>
          </div>
        </div>

        {/* Competition Matrix */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Interspecies Competition</h4>
          <div className="h-32 bg-ecosystem-50 rounded-lg flex items-center justify-center border-2 border-dashed border-ecosystem-300">
            <div className="text-center text-ecosystem-600">
              <div className="text-sm">🥊 Competition Matrix</div>
              <div className="text-xs">Predator-prey relationships visualization</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}