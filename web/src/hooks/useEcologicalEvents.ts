import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BIOLOGICAL_GROUP_LABELS,
  ExtinctionEventInfo,
  InterventionInfo,
  MomentInfo,
  SimulationTick,
  SpeciationEventInfo
} from '../types'

/** Libellé, icône et teinte d'un type d'événement, partagés par les lettres et les chroniques. */
export const EVENT_LABELS: Record<EcoEvent['type'], string> = {
  speciation: 'Spéciation',
  extinction: 'Extinction',
  decline: 'Déclin',
  intervention: 'Intervention'
}

export interface EcoEvent {
  id: string
  type: 'speciation' | 'extinction' | 'decline' | 'intervention'
  message: string
  generation: number
  /** Rang du moteur entre 0 et 1 : à partir de 0,5 une lettre, à partir de 0,8 un moment majeur. */
  importance: number
}

/** En dessous, un événement reste une ligne des Chroniques, sans lettre. */
export const LETTER_IMPORTANCE = 0.5
/** À partir de là, la lettre se distingue : la place des futures fresques. */
export const MAJOR_IMPORTANCE = 0.8

const LETTER_LIFETIME_MS = 12000
/** Plafond de lettres à l'écran : le détail reste dans les Chroniques. */
const MAX_LETTERS = 4

const CAUSE_LABELS: Record<string, string> = {
  starved: 'la faim',
  oldAge: 'la vieillesse',
  eaten: 'les prédateurs',
  burned: 'le feu',
  disaster: 'une catastrophe'
}

function speciationEntry(e: SpeciationEventInfo): EcoEvent {
  return {
    id: `speciation:${e.parentSpecies}>${e.newSpecies}@${e.generation}`,
    type: 'speciation',
    generation: e.generation,
    importance: 0.5,
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
    importance: 0.5,
    message: `${ACTION_LABELS[e.kind] ?? e.kind}${where} : ${e.outcome}`
  }
}

function extinctionEntry(e: ExtinctionEventInfo): EcoEvent {
  return {
    id: `extinction:${e.species}@${e.generation}`,
    type: 'extinction',
    generation: e.generation,
    importance: 0.7,
    message: `« ${e.species} » s'est éteinte (dernière population connue : ${e.lastPopulation} individu(s)).`
  }
}

/**
 * Le texte ne dit que ce que le moteur a mesuré : date, lieu, effectifs, cause. Sans cause
 * mesurée, il n'en donne pas.
 */
export function momentEntry(m: MomentInfo, index: number, speciations: SpeciationEventInfo[] = []): EcoEvent {
  const where = m.gridX >= 0 ? ` (case ${m.gridX}, ${m.gridY})` : ''
  const cause = CAUSE_LABELS[m.cause]
  const base = { id: `moment:${index}:${m.kind}@${m.generation}`, generation: m.generation, importance: m.importance }
  switch (m.kind) {
    case 'last_survivor':
      return {
        ...base,
        type: 'decline',
        message: `Dernier survivant de « ${m.species} »${where} : ils étaient ${m.before}, il est seul.${cause ? ` Les autres sont morts surtout de ${cause}.` : ''}`
      }
    case 'extinction':
      return {
        ...base,
        type: 'extinction',
        message: `« ${m.species} » s'est éteinte${where}, ${m.before} individu(s) au tick précédent.${cause ? ` Derniers morts : ${cause}.` : ''}`
      }
    case 'group_extinct': {
      const group = BIOLOGICAL_GROUP_LABELS[m.biologicalType]?.toLowerCase() ?? 'membre de ce groupe'
      return { ...base, type: 'extinction', message: `Plus aucun ${group} ne vit ici : « ${m.species} » était la dernière espèce du groupe.` }
    }
    case 'mass_extinction':
      return { ...base, type: 'extinction', message: `Extinction de masse : ${m.after} espèces sur ${m.before} ont disparu en moins d'un an.` }
    case 'new_species': {
      const split = speciations.find((e) => e.newSpecies === m.species && e.generation === m.generation)
      const distance = split ? `, distance génétique ${split.geneticDistanceAtSplit.toFixed(3)}` : ''
      return {
        ...base,
        type: 'speciation',
        message: `« ${m.species} » a divergé de « ${m.relatedSpecies} »${where}, avec ${m.after} individus${distance}.`
      }
    }
    case 'collapse':
      return {
        ...base,
        type: 'decline',
        message: `« ${m.species} » s'effondre : de ${m.before} à ${m.after} individus en moins d'un an${cause ? `, surtout par ${cause}` : ''}.`
      }
    default:
      return { ...base, type: 'decline', message: `${m.kind} : « ${m.species} ».` }
  }
}

/**
 * La chronique d'une partie : les moments du moteur, plus les spéciations et extinctions qu'une
 * sauvegarde d'avant les moments connaissait déjà, plus les actions du joueur.
 */
export function buildChronicle(
  speciations: SpeciationEventInfo[],
  extinctions: ExtinctionEventInfo[],
  interventions: InterventionInfo[],
  moments: MomentInfo[]
): EcoEvent[] {
  const told = new Set(
    moments.filter((m) => m.kind === 'new_species' || m.kind === 'extinction').map((m) => `${m.kind}:${m.species}@${m.generation}`)
  )
  return [
    ...moments.map((m, i) => momentEntry(m, i, speciations)),
    ...speciations.filter((e) => !told.has(`new_species:${e.newSpecies}@${e.generation}`)).map(speciationEntry),
    // Une extinction sans moment et sans dernier effectif est une espèce qui n'a jamais vécu ici.
    ...extinctions.filter((e) => !told.has(`extinction:${e.species}@${e.generation}`) && (moments.length === 0 || e.lastPopulation > 0)).map(extinctionEntry),
    ...interventions.map(interventionEntry)
  ]
}

/**
 * Les chroniques viennent du moteur, qui garde la mémoire de la partie : elles survivent
 * à un rechargement de la page et aux sauvegardes. Seuls les événements nouveaux depuis
 * l'ouverture, et assez importants, deviennent des lettres : ouvrir une partie ne rejoue
 * pas tout son passé.
 */
export function useEcologicalEvents(tick: SimulationTick | null | undefined, simulationId: string | number | null) {
  const [letters, setLetters] = useState<EcoEvent[]>([])
  const seen = useRef<Set<string> | null>(null)

  const speciations = tick?.lineages.speciationEvents
  const extinctions = tick?.lineages.extinctionEvents
  const interventions = tick?.lineages.interventions
  const moments = tick?.lineages.moments
  const chronicle = useMemo<EcoEvent[]>(
    () => buildChronicle(speciations ?? [], extinctions ?? [], interventions ?? [], moments ?? []),
    [speciations, extinctions, interventions, moments]
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
    for (const e of fresh) seen.current.add(e.id)
    const worthy = fresh.filter((e) => e.importance >= LETTER_IMPORTANCE)
    if (worthy.length === 0) return
    for (const e of worthy) window.setTimeout(() => dismiss(e.id), LETTER_LIFETIME_MS)
    // Les plus importantes restent quand il y en a trop d'un coup, les plus récentes à égalité.
    setLetters((current) =>
      [...current, ...worthy]
        .map((e, order) => ({ e, order }))
        .sort((a, b) => b.e.importance - a.e.importance || b.order - a.order)
        .slice(0, MAX_LETTERS)
        .sort((a, b) => a.order - b.order)
        .map(({ e }) => e)
    )
  }, [tick, chronicle, dismiss])

  return { events: letters, dismiss, chronicle }
}
