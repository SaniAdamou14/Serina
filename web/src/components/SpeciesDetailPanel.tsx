import { useState } from 'react'
import type { ReactNode } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { AverageTraits, BIOLOGICAL_GROUP_LABELS, TRAIT_BOUNDS } from '../types'
import { useLineageHues } from '../hooks/useLineageHues'
import { creatureColor } from '../utils/lineageColor'
import { averageVisual } from '../utils/speciesVisual'
import { CreaturePortrait } from './CreaturePortrait'
import { GameWindow } from './GameWindow'
import { TraitBar } from './TraitBar'

type Tab = 'overview' | 'genome' | 'lineage'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'genome', label: 'Génome' },
  { id: 'lineage', label: 'Lignée' }
]

function Stat({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div className="flex justify-between gap-4 px-2 py-0.5 odd:bg-slate-950/25" title={title}>
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  )
}

function SpeciesLink({ name }: { name: string }) {
  const { showSpeciesDetail } = useSelection()
  return (
    <button className="italic text-primary-300 hover:underline" onClick={() => showSpeciesDetail(name)}>
      {name}
    </button>
  )
}

/** Fiche d'espèce façon RimWorld : une fenêtre déplaçable, avec des onglets. */
export function SpeciesDetailPanel({ speciesName, onClose }: { speciesName: string; onClose: () => void }) {
  const { simulationData } = useSimulation()
  const hues = useLineageHues()
  const [tab, setTab] = useState<Tab>('overview')

  const lineage = simulationData?.status.lineages.find((l) => l.speciesName === speciesName)
  const events = simulationData?.lineages.speciationEvents ?? []
  const individuals = simulationData?.individuals.individuals.filter((i) => i.species === speciesName) ?? []
  const origin = events.find((e) => e.newSpecies === speciesName)
  const descendants = events.filter((e) => e.parentSpecies === speciesName)

  if (!lineage) {
    return (
      <GameWindow title={speciesName} onClose={onClose} placement="center" width={420} height={150}>
        <p className="text-sm">
          Cette espèce s'est éteinte. Son histoire reste consultable dans l'onglet Chroniques.
        </p>
      </GameWindow>
    )
  }

  const visual = averageVisual(individuals)
  const color = creatureColor(hues.get(speciesName) ?? 0, 0, '#2a2b29')
  const traitKeys = Object.keys(TRAIT_BOUNDS) as (keyof AverageTraits)[]
  const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

  return (
    <GameWindow title={speciesName} onClose={onClose} placement="center" width={620} height={520}>
      <div className="flex gap-3">
        <div className="shrink-0 bg-slate-950/50 border border-slate-700 p-1">
          {visual && (
            <CreaturePortrait
              biologicalType={lineage.biologicalType}
              ornamentTier={visual.ornamentTier}
              patternTier={visual.patternTier}
              color={color}
              size={120}
            />
          )}
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <Stat label="Groupe" value={BIOLOGICAL_GROUP_LABELS[lineage.biologicalType] ?? 'Inconnu'} />
          <Stat label="Population" value={lineage.population.toLocaleString()} />
          <Stat label="Cases occupées" value={lineage.regionsOccupied} />
          <Stat label="Origine" value={origin ? `Scission au tick ${origin.generation.toLocaleString()}` : 'Lignée fondatrice'} />
        </div>
      </div>

      <div className="flex border-b border-slate-600" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 text-xs font-semibold border border-b-0 ${tab === t.id ? 'bg-slate-700 border-slate-500 text-primary-200' : 'border-transparent text-slate-300 hover:bg-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="text-xs">
          <Stat label="Forme moyenne" value={`${(lineage.averageFitness * 100).toFixed(0)} %`} title="Fitness : énergie, âge et potentiel de reproduction" />
          <Stat label="Énergie moyenne" value={average(individuals.map((i) => i.energy)).toFixed(1)} />
          <Stat label="Âge moyen" value={`${average(individuals.map((i) => i.age)).toFixed(0)} ticks`} />
          <Stat label="Diversité génétique" value={lineage.geneticDiversity.toFixed(3)} title="Distance génétique moyenne entre individus" />
          <Stat label="Cerveau" value={lineage.hasBrain ? `${lineage.brainComplexity} neurones et connexions` : '-'} />
          <h4 className="font-semibold mt-3 mb-1 px-2">Adaptations observées</h4>
          {lineage.adaptations.length > 0 ? (
            <ul className="px-2 space-y-0.5">{lineage.adaptations.map((a) => <li key={a}>{a}</li>)}</ul>
          ) : (
            <p className="px-2 text-slate-400">Aucune pour l'instant.</p>
          )}
          <h4 className="font-semibold mt-3 mb-1 px-2">Innovations</h4>
          {lineage.innovations.length > 0 ? (
            <ul className="px-2 space-y-0.5">{lineage.innovations.map((i) => <li key={i}>{i}</li>)}</ul>
          ) : (
            <p className="px-2 text-slate-400">Aucune pour l'instant.</p>
          )}
        </div>
      )}

      {tab === 'genome' && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-1">
          {traitKeys.map((key) => (
            <TraitBar key={key} traitKey={key} value={lineage.averageTraits[key]} />
          ))}
        </div>
      )}

      {tab === 'lineage' && (
        <div className="text-xs px-2 space-y-2">
          <p>
            {origin ? (
              <>
                Issue de <SpeciesLink name={origin.parentSpecies} /> au tick {origin.generation.toLocaleString()}, après un isolement
                géographique (distance génétique : {origin.geneticDistanceAtSplit.toFixed(3)}).
              </>
            ) : (
              "Lignée fondatrice, introduite au début de la simulation."
            )}
          </p>
          <div>
            <h4 className="font-semibold mb-1">Espèces descendantes</h4>
            {descendants.length > 0 ? (
              <ul className="space-y-0.5">
                {descendants.map((e) => (
                  <li key={e.newSpecies}>
                    <SpeciesLink name={e.newSpecies} />, tick {e.generation.toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">Aucune pour l'instant.</p>
            )}
          </div>
        </div>
      )}
    </GameWindow>
  )
}
