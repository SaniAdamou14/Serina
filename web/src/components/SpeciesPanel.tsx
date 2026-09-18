import { useSimulation } from '@services/SimulationContext'

function getExtinctionRiskColor(risk: number) {
  if (risk >= 0.7) return 'text-red-600 bg-red-100'
  if (risk >= 0.4) return 'text-yellow-600 bg-yellow-100'
  return 'text-green-600 bg-green-100'
}

function getExtinctionRiskLabel(risk: number) {
  if (risk >= 0.7) return 'Risque élevé'
  if (risk >= 0.4) return 'Risque modéré'
  return 'Risque faible'
}

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

  const { ecosystem, species } = simulationData.status

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Espèces de Serina</h3>
        <p className="text-sm text-gray-600">Surveillance des populations et des lignées évolutives</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600">{species.length}</div>
          <div className="text-sm text-gray-600">Lignées actives</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {species.filter((s) => s.extinctionRisk < 0.4).length}
          </div>
          <div className="text-sm text-gray-600">Prospères</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {species.filter((s) => s.extinctionRisk >= 0.7).length}
          </div>
          <div className="text-sm text-gray-600">En danger</div>
        </div>
      </div>

      {/* Species Cards */}
      <div className="space-y-4">
        {species.map((sp) => {
          const share = ecosystem.total_population > 0 ? (sp.population / ecosystem.total_population) * 100 : 0

          return (
            <div key={sp.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-genetic-400 flex items-center justify-center text-white font-bold">
                    {sp.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{sp.name}</h4>
                    <p className="text-sm text-gray-600">Fitness : {(sp.fitness * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <div className={`status-indicator ${getExtinctionRiskColor(sp.extinctionRisk)}`}>
                  {getExtinctionRiskLabel(sp.extinctionRisk)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{sp.population}</div>
                  <div className="text-gray-600">Population</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{(sp.geneticDiversity * 100).toFixed(0)}%</div>
                  <div className="text-gray-600">Diversité</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{(sp.extinctionRisk * 100).toFixed(0)}%</div>
                  <div className="text-gray-600">Risque</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{share.toFixed(1)}%</div>
                  <div className="text-gray-600">Part</div>
                </div>
              </div>

              {(sp.adaptations.length > 0 || sp.innovations.length > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                  {sp.adaptations.map((a) => (
                    <span key={a} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                      🌱 {a}
                    </span>
                  ))}
                  {sp.innovations.map((i) => (
                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-genetic-100 text-genetic-700">
                      🚀 {i}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
