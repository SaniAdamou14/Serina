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

  const { environment, time } = simulationData.worldState

  const environmentMetrics = [
    { label: 'Temperature', value: `${environment.temperature.toFixed(1)}°C`, color: 'text-red-600' },
    { label: 'Humidity', value: `${(environment.humidity * 100).toFixed(1)}%`, color: 'text-blue-600' },
    { label: 'Precipitation', value: `${(environment.precipitation * 100).toFixed(1)}%`, color: 'text-cyan-600' },
    { label: 'Resources', value: `${(environment.resourceAbundance * 100).toFixed(1)}%`, color: 'text-green-600' }
  ]

  const pressureMetrics = [
    { label: 'Predation', value: environment.predationPressure, color: 'text-red-500' },
    { label: 'Disease Load', value: environment.diseaseLoad, color: 'text-purple-500' },
    { label: 'Seasonal Effect', value: environment.seasonalModifier, color: 'text-orange-500' }
  ]

  const getDayNightIcon = () => {
    if (environment.dayNightCycle < 0.25) return '🌙'
    if (environment.dayNightCycle < 0.5) return '🌅'
    if (environment.dayNightCycle < 0.75) return '☀️'
    return '🌇'
  }

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Environmental Conditions</h3>
        <p className="text-sm text-gray-600">Current ecosystem state and environmental pressures</p>
      </div>

      {/* Time and Season */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getDayNightIcon()}</span>
            <div>
              <div className="text-sm font-medium text-gray-700">
                Day/Night Cycle: {(environment.dayNightCycle * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Season: {time.season}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700">
              Generation {time.generation}
            </div>
            <div className="text-xs text-gray-600">
              Elapsed: {Math.floor(time.elapsed / 1000)}s
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {environmentMetrics.map((metric) => (
          <div key={metric.label} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={`text-lg font-bold ${metric.color}`}>
              {metric.value}
            </div>
            <div className="text-xs text-gray-600">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Environmental Pressures */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-medium text-gray-700">Environmental Pressures</h4>
        {pressureMetrics.map((pressure) => {
          const percentage = pressure.value * 100
          return (
            <div key={pressure.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{pressure.label}</span>
                <span className="font-medium">{percentage.toFixed(1)}%</span>
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
        <>
          {/* Terrain Map Placeholder */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Terrain Distribution</h4>
            <div className="h-32 bg-gradient-to-br from-green-100 via-yellow-100 to-blue-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <div className="text-sm">🗺️ Interactive Terrain Map</div>
                <div className="text-xs">2D/3D visualization coming soon</div>
              </div>
            </div>
          </div>

          {/* Climate Zones */}
          <div className="grid grid-cols-2 gap-4">
            <div className="ecosystem-stat">
              <div className="text-sm font-medium text-ecosystem-800 mb-2">Climate Zones</div>
              <div className="space-y-1 text-xs">
                <div>🌴 Tropical: 25%</div>
                <div>🌲 Temperate: 40%</div>
                <div>🏔️ Mountain: 20%</div>
                <div>🏜️ Desert: 15%</div>
              </div>
            </div>
            <div className="ecosystem-stat">
              <div className="text-sm font-medium text-ecosystem-800 mb-2">Resource Nodes</div>
              <div className="space-y-1 text-xs">
                <div>🌱 Food Sources: 847</div>
                <div>💧 Water Bodies: 23</div>
                <div>🏠 Shelter Sites: 156</div>
                <div>🔄 Regeneration: Active</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}