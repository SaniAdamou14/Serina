import { useMemo } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { AverageTraits, BIOLOGICAL_TYPE_NAMES, IndividualInfo, TRAIT_BOUNDS } from '../types'
import { computeLineageHues, creatureColor } from '../utils/lineageColor'
import { CreatureIcon } from './CreatureIcon'

interface SpeciesDetailPanelProps {
  speciesName: string
  onClose: () => void
}

/** Moyenne réelle des canaux visuels (voir IndividualSnapshot côté C++) sur
 * tous les individus actuellement vivants de cette espèce -- le portrait
 * de la fiche montre donc ce que l'espèce est VRAIMENT en ce moment, pas
 * un idéal figé. Les paliers entiers (ornementation, motifs) sont
 * arrondis plutôt que moyennés en flottant, pour rester des paliers
 * discrets cohérents avec ce que CreatureIcon sait dessiner. */
function averageVisual(individuals: IndividualInfo[]): Omit<IndividualInfo, 'id' | 'species' | 'x' | 'y' | 'energy' | 'age'> | null {
  if (individuals.length === 0) return null
  const n = individuals.length
  const sum = individuals.reduce(
    (acc, ind) => ({
      biologicalType: ind.biologicalType,
      sizeScale: acc.sizeScale + ind.sizeScale,
      elongation: acc.elongation + ind.elongation,
      camouflage: acc.camouflage + ind.camouflage,
      ornamentTier: acc.ornamentTier + ind.ornamentTier,
      sensoryProminence: acc.sensoryProminence + ind.sensoryProminence,
      patternTier: acc.patternTier + ind.patternTier
    }),
    { biologicalType: individuals[0].biologicalType, sizeScale: 0, elongation: 0, camouflage: 0, ornamentTier: 0, sensoryProminence: 0, patternTier: 0 }
  )
  return {
    biologicalType: sum.biologicalType,
    sizeScale: sum.sizeScale / n,
    elongation: sum.elongation / n,
    camouflage: sum.camouflage / n,
    ornamentTier: Math.round(sum.ornamentTier / n),
    sensoryProminence: sum.sensoryProminence / n,
    patternTier: Math.round(sum.patternTier / n)
  }
}

function TraitBar({ traitKey, value }: { traitKey: keyof AverageTraits; value: number }) {
  const bounds = TRAIT_BOUNDS[traitKey]
  const fraction = Math.max(0, Math.min(1, (value - bounds.min) / (bounds.max - bounds.min)))
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
        <span>{bounds.label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5">
        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  )
}

/**
 * Fenêtre de détail séparée (niveau 2 de l'inspection, voir WorldMap.tsx
 * pour le niveau 1 compact) : portrait généré à partir des vrais traits
 * moyens actuels de l'espèce, ses 12 traits réels en barres, son
 * historique de lignée réel, la complexité de son cerveau NEAT.
 */
export function SpeciesDetailPanel({ speciesName, onClose }: SpeciesDetailPanelProps) {
  const { simulationData } = useSimulation()

  const lineage = simulationData?.status.lineages.find((l) => l.speciesName === speciesName)
  const speciationEvents = simulationData?.lineages.speciationEvents
  const allLineages = simulationData?.status.lineages
  const individuals = simulationData?.individuals.individuals.filter((i) => i.species === speciesName) ?? []

  const lineageHues = useMemo(
    () => computeLineageHues(speciationEvents ?? [], (allLineages ?? []).map((l) => l.speciesName)),
    [speciationEvents, allLineages]
  )

  if (!lineage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-slate-900 rounded-lg p-6 text-slate-300 text-sm" onClick={(e) => e.stopPropagation()}>
          Cette espèce n'existe plus (éteinte depuis la dernière mise à jour).
          <div className="mt-3 text-right">
            <button className="button-secondary px-3 py-1 text-sm" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    )
  }

  const visual = averageVisual(individuals)
  const hue = lineageHues.get(speciesName) ?? 0
  const portraitColor = creatureColor(hue, visual?.camouflage ?? 0, '#334155')
  const splitEvent = (speciationEvents ?? []).find((e) => e.newSpecies === speciesName)
  const traitKeys = Object.keys(TRAIT_BOUNDS) as (keyof AverageTraits)[]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold italic">{speciesName}</h3>
            <p className="text-xs text-slate-400">
              {BIOLOGICAL_TYPE_NAMES[lineage.biologicalType] ?? 'Type inconnu'} — {lineage.population} individu(s) vivant(s)
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-200 text-lg leading-none" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 grid grid-cols-3 gap-4">
          {/* Portrait */}
          <div className="col-span-1 flex flex-col items-center justify-center bg-slate-800/50 rounded-lg p-4">
            {visual ? (
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-28 h-28">
                <CreatureIcon
                  individual={{ id: 0, species: speciesName, x: 0, y: 0, energy: 0, age: 0, ...visual }}
                  color={portraitColor}
                  detailed
                />
              </svg>
            ) : (
              <div className="text-xs text-slate-500 text-center">Aucun individu vivant pour générer un portrait</div>
            )}
            <div className="mt-3 text-xs text-slate-400 text-center">
              Portrait généré à partir des traits réels moyens des {individuals.length} individu(s) actuel(s)
            </div>
          </div>

          {/* Stats principales */}
          <div className="col-span-2 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-xs text-slate-400">Fitness moyenne</div>
                <div className="font-semibold">{(lineage.averageFitness * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-xs text-slate-400">Diversité génétique</div>
                <div className="font-semibold">{lineage.geneticDiversity.toFixed(3)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-xs text-slate-400">Régions occupées</div>
                <div className="font-semibold">{lineage.regionsOccupied}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-xs text-slate-400">Cerveau NEAT</div>
                <div className="font-semibold">{lineage.hasBrain ? `${lineage.brainComplexity} nœuds/connexions` : '—'}</div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-xs text-slate-400 mb-1">Origine</div>
              {splitEvent ? (
                <p className="text-xs text-slate-300">
                  Issue d'une scission réelle de <span className="italic">{splitEvent.parentSpecies}</span> à la génération {splitEvent.generation}
                  {' '}(distance génétique mesurée : {splitEvent.geneticDistanceAtSplit.toFixed(3)}).
                </p>
              ) : (
                <p className="text-xs text-slate-300">Lignée fondatrice, introduite au début de la simulation.</p>
              )}
            </div>
          </div>
        </div>

        {/* Les 12 traits réels */}
        <div className="p-4 border-t border-slate-700">
          <h4 className="text-sm font-semibold mb-2">Profil génétique complet (moyenne réelle sur la population vivante)</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {traitKeys.map((key) => (
              <TraitBar key={key} traitKey={key} value={lineage.averageTraits[key]} />
            ))}
          </div>
        </div>

        {/* Adaptations et innovations */}
        <div className="p-4 border-t border-slate-700 grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">🌱 Adaptations acquises</h4>
            {lineage.adaptations.length > 0 ? (
              <ul className="space-y-1">
                {lineage.adaptations.map((a) => (
                  <li key={a} className="text-xs bg-green-950 text-green-300 rounded px-2 py-1">{a}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Aucune adaptation distincte détectée pour l'instant</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">🚀 Innovations évolutives</h4>
            {lineage.innovations.length > 0 ? (
              <ul className="space-y-1">
                {lineage.innovations.map((i) => (
                  <li key={i} className="text-xs bg-purple-950 text-purple-300 rounded px-2 py-1">{i}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Aucune innovation développée pour l'instant</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
