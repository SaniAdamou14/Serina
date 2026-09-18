import { useSimulation } from '@services/SimulationContext'

interface EnvironmentViewProps {
  showDetails?: boolean
}

export function EnvironmentView({ showDetails = false }: EnvironmentViewProps) {
  const { simulationData } = useSimulation()

  if (!simulationData) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const { world } = simulationData.world
  const { climate, resources, pressures } = world

  const climateMetrics = [
    { label: 'Température', value: `${climate.temperature.toFixed(1)}°C`, color: 'text-red-600' },
    { label: 'Humidité', value: `${(climate.humidity * 100).toFixed(0)}%`, color: 'text-blue-600' },
    { label: 'Précipitations', value: `${climate.precipitation.toFixed(0)}mm/an`, color: 'text-cyan-600' },
    { label: 'Ensoleillement', value: `${(climate.sunlightIntensity * 100).toFixed(0)}%`, color: 'text-yellow-600' }
  ]

  const pressureMetrics = [
    { label: 'Prédation', value: pressures.predationPressure, color: 'text-red-500' },
    { label: 'Compétition', value: pressures.competitionIntensity, color: 'text-purple-500' },
    { label: 'Rareté des ressources', value: pressures.resourceScarcity, color: 'text-orange-500' },
    { label: 'Stress climatique', value: pressures.climaticStress, color: 'text-amber-500' }
  ]

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Environnement — {world.primaryEnvironment}</h3>
        <p className="text-sm text-gray-600">{world.description || 'Environnement principal où les espèces d\'origine ont été introduites'}</p>
      </div>

      {/* Climate Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {climateMetrics.map((metric) => (
          <div key={metric.label} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={`text-lg font-bold ${metric.color}`}>{metric.value}</div>
            <div className="text-xs text-gray-600">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Environmental Pressures */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-medium text-gray-700">Pressions Environnementales</h4>
        {pressureMetrics.map((pressure) => {
          const percentage = pressure.value * 100
          return (
            <div key={pressure.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{pressure.label}</span>
                <span className="font-medium">{percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r from-gray-300 to-current ${pressure.color}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4">
          <div className="ecosystem-stat">
            <div className="text-sm font-medium text-ecosystem-800 mb-2">Ressources disponibles</div>
            <div className="space-y-1 text-xs">
              <div>🌱 Producteurs primaires : {(resources.primaryProducers * 100).toFixed(0)}%</div>
              <div>🦗 Petites proies : {(resources.smallPrey * 100).toFixed(0)}%</div>
              <div>💧 Qualité de l'eau : {(resources.waterQuality * 100).toFixed(0)}%</div>
              <div>🏠 Abris : {(resources.shelter * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div className="ecosystem-stat">
            <div className="text-sm font-medium text-ecosystem-800 mb-2">Capacité de charge</div>
            <div className="space-y-1 text-xs">
              <div>👥 Capacité totale : {world.carryingCapacity.toLocaleString()}</div>
              <div>📅 Génération : {simulationData.status.ecosystem.generation}</div>
              <div>🐾 Espèces présentes : {simulationData.status.ecosystem.total_species}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
