import { useEffect, useRef, useState } from 'react'
import { SimulationTick } from '../types'

export interface EcoEvent {
  id: string
  type: 'speciation' | 'extinction'
  message: string
  generation: number
}

const EVENT_LIFETIME_MS = 12000
/** Plafond de lettres empilées simultanément -- une vitesse de simulation
 * élevée peut produire des dizaines de spéciations en quelques secondes
 * (observé en direct : 26 espèces en 15s à 20x), et une pile illimitée
 * déborderait de l'écran. Le vrai historique complet reste consultable
 * dans l'onglet Historique/Évolution ; ceci n'est qu'une notification
 * éphémère, jamais la seule source de vérité. */
const MAX_STACKED_EVENTS = 6

/**
 * Détecte deux catégories d'événements réels, jamais un texte narratif
 * inventé (Chantier E5) :
 * - Spéciation : une entrée de simulationData.lineages.speciationEvents pas
 *   encore vue par ce hook (le tableau est cumulatif depuis le début de la
 *   simulation, donc seules les entrées NOUVELLES depuis le dernier rendu
 *   deviennent une notification).
 * - Extinction : une espèce présente dans status.lineages au tick précédent
 *   et absente du tick courant -- diff entre deux instantanés successifs,
 *   pas un signal calculé côté moteur.
 *
 * Le premier tick reçu sert uniquement à amorcer l'état "déjà vu" : ouvrir
 * ou reprendre une simulation qui a déjà des centaines d'événements
 * historiques ne doit pas les rejouer d'un coup.
 */
export function useEcologicalEvents(
  tick: SimulationTick | null | undefined,
  simulationId: string | number | null
): {
  events: EcoEvent[]
  dismiss: (id: string) => void
} {
  const [events, setEvents] = useState<EcoEvent[]>([])
  const seenSpeciationKeys = useRef<Set<string> | null>(null)
  const previousSpeciesNames = useRef<Set<string> | null>(null)
  const previousPopulations = useRef<Map<string, number>>(new Map())
  const observedSimulationId = useRef<string | number | null>(null)

  const dismiss = (id: string) => setEvents((current) => current.filter((e) => e.id !== id))

  // Changer de simulation (nouvelle, ou reprise d'une autre) doit repartir
  // de zéro : comparer les lignées de deux simulations différentes
  // produirait de fausses "extinctions" qui ne sont que des espèces propres
  // à l'ancienne simulation.
  useEffect(() => {
    if (simulationId !== observedSimulationId.current) {
      observedSimulationId.current = simulationId
      seenSpeciationKeys.current = null
      previousSpeciesNames.current = null
      previousPopulations.current = new Map()
      setEvents([])
    }
  }, [simulationId])

  useEffect(() => {
    if (!tick) return
    const speciationEvents = tick.lineages.speciationEvents
    const lineages = tick.status.lineages
    const generation = tick.status.generation
    const currentNames = new Set(lineages.map((l) => l.speciesName))

    const firstObservation = seenSpeciationKeys.current === null
    if (firstObservation) {
      seenSpeciationKeys.current = new Set(speciationEvents.map((e) => `${e.parentSpecies}>${e.newSpecies}@${e.generation}`))
      previousSpeciesNames.current = currentNames
      previousPopulations.current = new Map(lineages.map((l) => [l.speciesName, l.population]))
      return
    }

    const newEvents: EcoEvent[] = []

    for (const e of speciationEvents) {
      const key = `${e.parentSpecies}>${e.newSpecies}@${e.generation}`
      if (seenSpeciationKeys.current!.has(key)) continue
      seenSpeciationKeys.current!.add(key)
      newEvents.push({
        id: `speciation:${key}`,
        type: 'speciation',
        generation: e.generation,
        message: `« ${e.newSpecies} » a divergé de « ${e.parentSpecies} » (distance génétique : ${e.geneticDistanceAtSplit.toFixed(3)}).`
      })
    }

    for (const name of previousSpeciesNames.current!) {
      if (!currentNames.has(name)) {
        const lastPop = previousPopulations.current.get(name) ?? 0
        newEvents.push({
          id: `extinction:${name}@${generation}`,
          type: 'extinction',
          generation,
          message: `« ${name} » s'est éteinte (dernière population connue : ${lastPop} individu(s)).`
        })
      }
    }

    if (newEvents.length > 0) {
      setEvents((current) => [...current, ...newEvents].slice(-MAX_STACKED_EVENTS))
      for (const e of newEvents) {
        setTimeout(() => dismiss(e.id), EVENT_LIFETIME_MS)
      }
    }

    previousSpeciesNames.current = currentNames
    previousPopulations.current = new Map(lineages.map((l) => [l.speciesName, l.population]))
  }, [tick])

  return { events, dismiss }
}
