import { useSimulation } from '@services/SimulationContext'

interface EnvironmentViewProps {
  showDetails?: boolean
}

/**
 * Phase 9 a remplacé le seul environnement global qu'exposait l'ancien
 * moteur par une vraie grille de régions (voir docs/SERINA_DAEMON_PROTOCOL.md),
 * chacune avec son propre biome. Ce composant montre donc une moyenne sur
 * toutes les régions plutôt qu'un "environnement principal" -- une vraie
 * carte des régions (Phase 10, façon RimWorld) remplacera cette vue agrégée.
 */
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

  const { regions } = simulationData.regions
  const status = simulationData.status
  const count = regions.length || 1
  const avg = (pick: (r: (typeof regions)[number]) => number) =>
    regions.reduce((sum, r) => sum + pick(r), 0) / count
  const distinctBiomes = new Set(regions.map((r) => r.environmentName)).size

  const climateMetrics = [
    { label: 'Température moyenne', value: `${avg((r) => r.temperature).toFixed(1)}°C`, color: 'text-red-600' },
    { label: 'Producteurs primaires', value: `${(avg((r) => r.primaryProducers) * 100).toFixed(0)}%`, color: 'text-green-600' }
  ]

  const pressureMetrics = [
    { label: 'Prédation', value: avg((r) => r.predationPressure), color: 'text-red-500' },
    { label: 'Compétition', value: avg((r) => r.competitionIntensity), color: 'text-purple-500' },
    { label: 'Stress climatique', value: avg((r) => r.climaticStress), color: 'text-amber-500' }
  ]

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Environnement — {distinctBiomes} biome{distinctBiomes > 1 ? 's' : ''} sur {regions.length} régions
        </h3>
        <p className="text-sm text-gray-600">Moyennes sur toute la carte réelle (grille procédurale de biomes)</p>
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
        <h4 className="text-sm font-medium text-gray-700">Pressions Environnementales (moyenne)</h4>
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
            <div className="text-sm font-medium text-ecosystem-800 mb-2">Biomes présents</div>
            <div className="space-y-1 text-xs">
              {Array.from(new Set(regions.map((r) => r.environmentName))).map((name) => (
                <div key={name}>🌍 {name}</div>
              ))}
            </div>
          </div>
          <div className="ecosystem-stat">
            <div className="text-sm font-medium text-ecosystem-800 mb-2">État de la simulation</div>
            <div className="space-y-1 text-xs">
              <div>📅 Génération : {status.generation}</div>
              <div>🐾 Espèces présentes : {status.speciesCount}</div>
              <div>👥 Population totale : {status.population}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
