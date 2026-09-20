import { useMemo } from 'react'
import { Sprout, Rocket } from 'lucide-react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { computeLineageHues, creatureColor } from '../utils/lineageColor'
import { averageVisual } from '../utils/speciesVisual'
import { CreatureIcon } from './CreatureIcon'

/** UnifiedWorldSimulator ne modélise pas encore un score de risque
 * d'extinction (voir CONTRIBUTING.md) -- ce seuil de population est un fait
 * directement observé, pas une prédiction calculée. */
const CRITICAL_POPULATION_THRESHOLD = 5

function getPopulationStatusColor(population: number) {
  if (population <= CRITICAL_POPULATION_THRESHOLD) return 'text-red-300 bg-red-950'
  if (population <= CRITICAL_POPULATION_THRESHOLD * 3) return 'text-amber-300 bg-amber-950'
  return 'text-emerald-300 bg-emerald-950'
}

function getPopulationStatusLabel(population: number) {
  if (population <= CRITICAL_POPULATION_THRESHOLD) return 'Population critique'
  if (population <= CRITICAL_POPULATION_THRESHOLD * 3) return 'Population faible'
  return 'Prospère'
}

export function SpeciesPanel() {
  const { simulationData } = useSimulation()
  const { showSpeciesDetail } = useSelection()

  const speciationEvents = simulationData?.lineages.speciationEvents
  const allLineages = simulationData?.status.lineages
  const lineageHues = useMemo(
    () => computeLineageHues(speciationEvents ?? [], (allLineages ?? []).map((l) => l.speciesName)),
    [speciationEvents, allLineages]
  )

  if (!simulationData) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { status } = simulationData
  const lineages = status.lineages

  return (
    <div className="card">
      <div className="border-b border-slate-700 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-100">Espèces de Serina</h3>
        <p className="text-sm text-slate-400">Surveillance des populations et des lignées évolutives — cliquez une carte pour la fiche complète</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-400">{lineages.length}</div>
          <div className="text-sm text-slate-400">Lignées actives</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {lineages.filter((l) => l.population > CRITICAL_POPULATION_THRESHOLD * 3).length}
          </div>
          <div className="text-sm text-slate-400">Prospères</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">
            {lineages.filter((l) => l.population <= CRITICAL_POPULATION_THRESHOLD).length}
          </div>
          <div className="text-sm text-slate-400">En danger</div>
        </div>
      </div>

      {/* Species Cards */}
      <div className="space-y-4">
        {lineages.map((lineage) => {
          const share = status.population > 0 ? (lineage.population / status.population) * 100 : 0
          const members = simulationData.individuals.individuals.filter((i) => i.species === lineage.speciesName)
          const visual = averageVisual(members)
          const hue = lineageHues.get(lineage.speciesName) ?? 0
          const portraitColor = creatureColor(hue, visual?.camouflage ?? 0, '#334155')

          return (
            <button
              key={lineage.speciesName}
              onClick={() => showSpeciesDetail(lineage.speciesName)}
              className="w-full text-left border border-slate-700 bg-slate-800/40 rounded-lg p-4 hover:border-primary-600 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                    {visual ? (
                      <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-9 h-9">
                        <CreatureIcon
                          individual={{ id: 0, species: lineage.speciesName, x: 0, y: 0, energy: 0, age: 0, ...visual }}
                          color={portraitColor}
                          detailed
                        />
                      </svg>
                    ) : (
                      <span className="text-white font-bold">{lineage.speciesName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100">{lineage.speciesName}</h4>
                    <p className="text-sm text-slate-400">Fitness : {(lineage.averageFitness * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <div className={`status-indicator ${getPopulationStatusColor(lineage.population)}`}>
                  {getPopulationStatusLabel(lineage.population)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-slate-100">{lineage.population}</div>
                  <div className="text-slate-400">Population</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-slate-100">{(lineage.geneticDiversity * 100).toFixed(0)}%</div>
                  <div className="text-slate-400">Diversité</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-slate-100">{lineage.hasBrain ? lineage.brainComplexity : '—'}</div>
                  <div className="text-slate-400">Cerveau NEAT</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-slate-100">{share.toFixed(1)}%</div>
                  <div className="text-slate-400">Part</div>
                </div>
              </div>

              {(lineage.adaptations.length > 0 || lineage.innovations.length > 0) && (
                <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap gap-2">
                  {lineage.adaptations.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-950 text-emerald-300">
                      <Sprout className="w-3 h-3" /> {a}
                    </span>
                  ))}
                  {lineage.innovations.map((i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-genetic-950 text-genetic-300">
                      <Rocket className="w-3 h-3" /> {i}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
