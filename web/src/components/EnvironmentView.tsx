import { useSimulation } from '@services/SimulationContext'
import { Globe2, Calendar, PawPrint, Users } from 'lucide-react'

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
          <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
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
    { label: 'Température moyenne', value: `${avg((r) => r.temperature).toFixed(1)}°C`, color: 'text-red-400' },
    { label: 'Producteurs primaires', value: `${(avg((r) => r.primaryProducers) * 100).toFixed(0)}%`, color: 'text-emerald-400' }
  ]

  const pressureMetrics = [
    { label: 'Prédation', value: avg((r) => r.predationPressure), color: 'text-red-400' },
    { label: 'Compétition', value: avg((r) => r.competitionIntensity), color: 'text-genetic-400' },
    { label: 'Stress climatique', value: avg((r) => r.climaticStress), color: 'text-amber-400' }
  ]

  return (
    <div className="card">
      <div className="border-b border-slate-700 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-100">
          Environnement — {distinctBiomes} biome{distinctBiomes > 1 ? 's' : ''} sur {regions.length} régions
        </h3>
        <p className="text-sm text-slate-400">Moyennes sur toute la carte réelle (grille procédurale de biomes)</p>
      </div>

      {/* Climate Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {climateMetrics.map((metric) => (
          <div key={metric.label} className="text-center p-3 bg-slate-800/60 rounded-lg">
            <div className={`text-lg font-bold ${metric.color}`}>{metric.value}</div>
            <div className="text-xs text-slate-400">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Environmental Pressures */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-medium text-slate-300">Pressions Environnementales (moyenne)</h4>
        {pressureMetrics.map((pressure) => {
          const percentage = pressure.value * 100
          return (
            <div key={pressure.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{pressure.label}</span>
                <span className="font-medium text-slate-200">{percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r from-slate-600 to-current ${pressure.color}`}
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
            <div className="text-sm font-medium text-ecosystem-200 mb-2">Biomes présents</div>
            <div className="space-y-1 text-xs">
              {Array.from(new Set(regions.map((r) => r.environmentName))).map((name) => (
                <div key={name} className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5" /> {name}</div>
              ))}
            </div>
          </div>
          <div className="ecosystem-stat">
            <div className="text-sm font-medium text-ecosystem-200 mb-2">État de la simulation</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Génération : {status.generation}</div>
              <div className="flex items-center gap-1.5"><PawPrint className="w-3.5 h-3.5" /> Espèces présentes : {status.speciesCount}</div>
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Population totale : {status.population}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
