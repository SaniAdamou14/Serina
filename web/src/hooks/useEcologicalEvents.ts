import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExtinctionEventInfo, InterventionInfo, SimulationTick, SpeciationEventInfo } from '../types'

/** Libellé, icône et teinte d'un type d'événement, partagés par les lettres et les chroniques. */
export const EVENT_LABELS: Record<EcoEvent['type'], string> = {
  speciation: 'Spéciation',
  extinction: 'Extinction',
  intervention: 'Intervention'
}

export interface EcoEvent {
  id: string
  type: 'speciation' | 'extinction' | 'intervention'
  message: string
  generation: number
}

const LETTER_LIFETIME_MS = 12000
/** Plafond de lettres à l'écran : le détail reste dans les Chroniques. */
const MAX_LETTERS = 4

function speciationEntry(e: SpeciationEventInfo): EcoEvent {
  return {
    id: `speciation:${e.parentSpecies}>${e.newSpecies}@${e.generation}`,
    type: 'speciation',
    generation: e.generation,
    message: `« ${e.newSpecies} » a divergé de « ${e.parentSpecies} » (distance génétique : ${e.geneticDistanceAtSplit.toFixed(3)}).`
  }
}

const ACTION_LABELS: Record<string, string> = {
  storm: 'Orage provoqué',
  fire: 'Feu allumé',
  meteor: 'Météorite',
  climate: 'Climat poussé',
  introduce: 'Introduction'
}

function interventionEntry(e: InterventionInfo, index: number): EcoEvent {
  const where = e.gridX >= 0 ? ` (case ${e.gridX}, ${e.gridY})` : ''
  return {
    id: `intervention:${index}@${e.generation}`,
    type: 'intervention',
    generation: e.generation,
    message: `${ACTION_LABELS[e.kind] ?? e.kind}${where} : ${e.outcome}`
  }
}

function extinctionEntry(e: ExtinctionEventInfo): EcoEvent {
  return {
    id: `extinction:${e.species}@${e.generation}`,
    type: 'extinction',
    generation: e.generation,
    message: `« ${e.species} » s'est éteinte (dernière population connue : ${e.lastPopulation} individu(s)).`
  }
}

/**
 * Les chroniques viennent du moteur, qui garde la mémoire de la partie : elles survivent
 * à un rechargement de la page et aux sauvegardes. Seuls les événements nouveaux depuis
 * l'ouverture deviennent des lettres : ouvrir une partie ne rejoue pas tout son passé.
 */
export function useEcologicalEvents(tick: SimulationTick | null | undefined, simulationId: string | number | null) {
  const [letters, setLetters] = useState<EcoEvent[]>([])
  const seen = useRef<Set<string> | null>(null)

  const speciations = tick?.lineages.speciationEvents
  const extinctions = tick?.lineages.extinctionEvents
  const interventions = tick?.lineages.interventions
  const chronicle = useMemo<EcoEvent[]>(
    () => [
      ...(speciations ?? []).map(speciationEntry),
      ...(extinctions ?? []).map(extinctionEntry),
      ...(interventions ?? []).map(interventionEntry)
    ],
    [speciations, extinctions, interventions]
  )

  const dismiss = useCallback((id: string) => setLetters((current) => current.filter((e) => e.id !== id)), [])

  useEffect(() => {
    seen.current = null
    setLetters([])
  }, [simulationId])

  useEffect(() => {
    if (!tick) return
    if (seen.current === null) {
      seen.current = new Set(chronicle.map((e) => e.id))
      return
    }
    const fresh = chronicle.filter((e) => !seen.current?.has(e.id))
    if (fresh.length === 0) return
    for (const e of fresh) {
      seen.current.add(e.id)
      window.setTimeout(() => dismiss(e.id), LETTER_LIFETIME_MS)
    }
    setLetters((current) => [...current, ...fresh].slice(-MAX_LETTERS))
  }, [tick, chronicle, dismiss])

  return { events: letters, dismiss, chronicle }
}
