import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { AverageTraits, formatTrait, LineageStatus, TRAIT_BOUNDS } from '../types'
import { GameColumn, GameTable } from './GameTable'

const TRAIT_KEYS = Object.keys(TRAIT_BOUNDS) as (keyof AverageTraits)[]

/** En-têtes courts : le nom complet s'affiche au survol. */
const SHORT_LABELS: Record<keyof AverageTraits, string> = {
  size: 'Taille',
  speed: 'Vitesse',
  energyEfficiency: 'Rendem.',
  reproductionRate: 'Repro.',
  aggression: 'Agress.',
  intelligence: 'Intell.',
  longevity: 'Longév.',
  resistance: 'Résist.',
  visionRange: 'Vision',
  hearingAcuity: 'Ouïe',
  camouflage: 'Camou.',
  socialBehavior: 'Social',
  insulation: 'Isol.',
  diet: 'Régime'
}

function normalized(key: keyof AverageTraits, value: number | undefined): number {
  const { min, max } = TRAIT_BOUNDS[key]
  return Math.max(0, Math.min(1, ((value ?? min) - min) / (max - min)))
}

/** Onglet Génétique : chaque espèce et ses traits moyens, plus la case est sable plus le trait est haut. */
export function GeneticAnalysis() {
  const { simulationData } = useSimulation()
  const { showSpeciesDetail } = useSelection()
  if (!simulationData) return null

  const columns: GameColumn<LineageStatus>[] = [
    {
      key: 'name',
      label: 'Espèce',
      value: (l) => l.speciesName,
      render: (l) => <span className="italic font-semibold">{l.speciesName}</span>
    },
    ...TRAIT_KEYS.map((key): GameColumn<LineageStatus> => ({
      key,
      label: SHORT_LABELS[key],
      title: `${TRAIT_BOUNDS[key].label}, de ${TRAIT_BOUNDS[key].min} à ${TRAIT_BOUNDS[key].max}`,
      align: 'right',
      value: (l) => l.averageTraits[key],
      render: (l) => {
        const level = normalized(key, l.averageTraits[key])
        return (
          <span
            className="block px-1 -mx-1"
            style={{ background: `rgb(197 165 87 / ${(level * 0.55).toFixed(2)})` }}
            title={`${TRAIT_BOUNDS[key].label} : ${formatTrait(l.averageTraits[key])}`}
          >
            {formatTrait(l.averageTraits[key])}
          </span>
        )
      }
    }))
  ]

  return (
    <div className="overflow-x-auto">
      <GameTable
        columns={columns}
        rows={simulationData.status.lineages}
        rowKey={(l) => l.speciesName}
        onRowClick={(l) => showSpeciesDetail(l.speciesName)}
        defaultSort={{ key: 'name', descending: false }}
        emptyMessage="Aucune espèce vivante."
      />
    </div>
  )
}
