import { useMemo } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { BIOLOGICAL_GROUP_LABELS, LineageStatus } from '../types'
import { useLineageHues } from '../hooks/useLineageHues'
import { creatureColor } from '../utils/lineageColor'
import { averageVisual } from '../utils/speciesVisual'
import { CreaturePortrait } from './CreaturePortrait'
import { GameColumn, GameTable } from './GameTable'

/** Seuils sur des effectifs observés : un fait, pas une prédiction d'extinction. */
const CRITICAL_POPULATION = 5
const LOW_POPULATION = 15

function populationState(population: number): { label: string; className: string } {
  if (population <= CRITICAL_POPULATION) return { label: 'Critique', className: 'text-red-300' }
  if (population <= LOW_POPULATION) return { label: 'Faible', className: 'text-amber-300' }
  return { label: 'Stable', className: 'text-slate-300' }
}

/** Onglet Espèces : toutes les lignées vivantes, dans un tableau triable. */
export function SpeciesPanel() {
  const { simulationData } = useSimulation()
  const { showSpeciesDetail } = useSelection()
  const hues = useLineageHues()

  const individuals = simulationData?.individuals.individuals
  const visuals = useMemo(() => {
    const members = new Map<string, NonNullable<typeof individuals>>()
    for (const ind of individuals ?? []) {
      const list = members.get(ind.species)
      if (list) list.push(ind)
      else members.set(ind.species, [ind])
    }
    return new Map([...members].map(([name, list]) => [name, averageVisual(list)]))
  }, [individuals])

  if (!simulationData) return null
  const { status } = simulationData
  const total = status.population || 1

  const columns: GameColumn<LineageStatus>[] = [
    {
      key: 'name',
      label: 'Espèce',
      value: (l) => l.speciesName,
      render: (l) => {
        const visual = visuals.get(l.speciesName)
        return (
          <span className="inline-flex items-center gap-2">
            {visual && (
              <CreaturePortrait
                biologicalType={l.biologicalType}
                ornamentTier={visual.ornamentTier}
                patternTier={visual.patternTier}
                color={creatureColor(hues.get(l.speciesName) ?? 0, 0, '#373835')}
                size={26}
              />
            )}
            <span className="italic font-semibold">{l.speciesName}</span>
          </span>
        )
      }
    },
    { key: 'group', label: 'Groupe', value: (l) => BIOLOGICAL_GROUP_LABELS[l.biologicalType] ?? 'Inconnu' },
    { key: 'population', label: 'Population', align: 'right', value: (l) => l.population, render: (l) => l.population.toLocaleString() },
    {
      key: 'share',
      label: 'Part',
      title: 'Part de la population totale du monde',
      align: 'right',
      value: (l) => l.population / total,
      render: (l) => `${((l.population / total) * 100).toFixed(1)} %`
    },
    {
      key: 'regions',
      label: 'Cases',
      title: 'Nombre de cases de la carte où cette espèce est présente',
      align: 'right',
      value: (l) => l.regionsOccupied
    },
    {
      key: 'fitness',
      label: 'Forme',
      title: "Fitness moyenne : énergie, âge et potentiel de reproduction",
      align: 'right',
      value: (l) => l.averageFitness,
      render: (l) => `${(l.averageFitness * 100).toFixed(0)} %`
    },
    {
      key: 'diversity',
      label: 'Diversité',
      title: 'Distance génétique moyenne entre individus de cette espèce',
      align: 'right',
      value: (l) => l.geneticDiversity,
      render: (l) => l.geneticDiversity.toFixed(3)
    },
    {
      key: 'brain',
      label: 'Cerveau',
      title: 'Nombre de neurones et de connexions du réseau NEAT de la lignée',
      align: 'right',
      value: (l) => (l.hasBrain ? l.brainComplexity : 0),
      render: (l) => (l.hasBrain ? l.brainComplexity : '-')
    },
    {
      key: 'state',
      label: 'État',
      title: `Critique : ${CRITICAL_POPULATION} individus ou moins. Faible : ${LOW_POPULATION} ou moins.`,
      value: (l) => l.population,
      render: (l) => {
        const state = populationState(l.population)
        return <span className={state.className}>{state.label}</span>
      }
    }
  ]

  return (
    <GameTable
      columns={columns}
      rows={status.lineages}
      rowKey={(l) => l.speciesName}
      onRowClick={(l) => showSpeciesDetail(l.speciesName)}
      defaultSort={{ key: 'population', descending: true }}
      emptyMessage="Aucune espèce vivante."
    />
  )
}
