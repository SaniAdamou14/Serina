import { useMemo } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { useSelection } from '@services/SelectionContext'
import { useGameLog } from '@services/GameLogContext'
import { useLineageHues } from '../hooks/useLineageHues'
import { creatureColor } from '../utils/lineageColor'

interface Branch {
  name: string
  start: number
  end: number
  alive: boolean
  population: number
  row: number
  parentRow: number | null
  distance: number | null
}

const ROW_HEIGHT = 24
const MARGIN = { top: 26, right: 190, bottom: 8, left: 12 }
const WIDTH = 930

/**
 * Onglet Évolution : l'arbre réel des espèces, le temps de gauche à droite. Chaque ligne
 * est une espèce, de son apparition à aujourd'hui ou à son extinction. Construit depuis
 * les spéciations mesurées par le moteur.
 */
export function SpeciesEvolutionTree() {
  const { simulationData } = useSimulation()
  const { showSpeciesDetail } = useSelection()
  const { chronicle } = useGameLog()
  const hues = useLineageHues()

  const lineages = simulationData?.status.lineages
  const events = simulationData?.lineages.speciationEvents
  const now = simulationData?.status.generation ?? 0

  const branches = useMemo<Branch[]>(() => {
    if (!lineages || !events) return []
    const populationOf = new Map(lineages.map((l) => [l.speciesName, l.population]))
    const childrenOf = new Map<string, typeof events>()
    const hasParent = new Set<string>()
    for (const e of events) {
      if (!childrenOf.has(e.parentSpecies)) childrenOf.set(e.parentSpecies, [])
      childrenOf.get(e.parentSpecies)!.push(e)
      hasParent.add(e.newSpecies)
    }

    const extinctionTick = new Map<string, number>()
    for (const c of chronicle) {
      if (c.type !== 'extinction') continue
      const name = c.message.match(/« (.+?) »/)?.[1]
      if (name) extinctionTick.set(name, c.generation)
    }

    const result: Branch[] = []
    const visit = (name: string, start: number, parentRow: number | null, distance: number | null) => {
      const row = result.length
      const alive = populationOf.has(name)
      const children = [...(childrenOf.get(name) ?? [])].sort((a, b) => a.generation - b.generation)
      const lastChild = children.length ? children[children.length - 1].generation : start
      result.push({
        name,
        start,
        end: alive ? now : extinctionTick.get(name) ?? Math.max(start, lastChild),
        alive,
        population: populationOf.get(name) ?? 0,
        row,
        parentRow,
        distance
      })
      for (const child of children) visit(child.newSpecies, child.generation, row, child.geneticDistanceAtSplit)
    }

    const known = new Set([...lineages.map((l) => l.speciesName), ...events.map((e) => e.parentSpecies)])
    for (const root of [...known].filter((n) => !hasParent.has(n)).sort()) visit(root, 0, null, null)
    return result
  }, [lineages, events, chronicle, now])

  if (!simulationData) return null

  const span = Math.max(1, now)
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const x = (tick: number) => MARGIN.left + (tick / span) * plotWidth
  const y = (row: number) => MARGIN.top + row * ROW_HEIGHT + ROW_HEIGHT / 2
  const height = MARGIN.top + branches.length * ROW_HEIGHT + MARGIN.bottom
  const alive = branches.filter((b) => b.alive).length

  return (
    <>
      <p className="text-xs text-slate-300">
        {alive} espèce(s) vivante(s), {branches.length - alive} éteinte(s), {events?.length ?? 0} spéciation(s) depuis le début.
        Le temps va de gauche à droite. Cliquez une espèce pour ouvrir sa fiche.
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full h-auto" role="img" aria-label="Arbre des espèces">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={x(span * f)} x2={x(span * f)} y1={MARGIN.top - 6} y2={height - MARGIN.bottom} stroke="#464743" strokeWidth={1} />
            <text x={x(span * f)} y={14} textAnchor={f === 0 ? 'start' : 'middle'} fontSize={11} fill="#bcbbb3">
              Tick {Math.round(span * f).toLocaleString()}
            </text>
          </g>
        ))}

        {branches.map((b) => {
          const color = b.alive ? creatureColor(hues.get(b.name) ?? 0, 0, '#2a2b29') : '#767570'
          return (
            <g key={b.name} className="cursor-pointer" onClick={() => showSpeciesDetail(b.name)}>
              <title>
                {`${b.name}\n${b.alive ? `${b.population.toLocaleString()} individu(s)` : 'Éteinte'}\nApparue au tick ${b.start.toLocaleString()}${b.distance !== null ? `, distance génétique ${b.distance.toFixed(3)}` : ''}`}
              </title>
              {b.parentRow !== null && (
                <line x1={x(b.start)} x2={x(b.start)} y1={y(b.parentRow)} y2={y(b.row)} stroke={color} strokeWidth={1.5} />
              )}
              <line
                x1={x(b.start)}
                x2={x(b.end)}
                y1={y(b.row)}
                y2={y(b.row)}
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={b.alive ? undefined : '5 4'}
              />
              <text x={x(b.end) + 8} y={y(b.row) + 4} fontSize={12} fontStyle="italic" fill={b.alive ? '#e6e5e0' : '#98978f'}>
                {b.name}
                <tspan fontStyle="normal" fill="#98978f"> {b.alive ? b.population.toLocaleString() : 'éteinte'}</tspan>
              </text>
              {/* Zone de clic plus large que le trait. */}
              <rect x={MARGIN.left} y={y(b.row) - ROW_HEIGHT / 2} width={WIDTH - MARGIN.left} height={ROW_HEIGHT} fill="transparent" />
            </g>
          )
        })}
      </svg>
    </>
  )
}
