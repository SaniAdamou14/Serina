import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSimulation } from './SimulationContext'
import { EcoEvent, useEcologicalEvents } from '../hooks/useEcologicalEvents'

export interface HistorySample {
  tick: number
  population: number
  species: number
  energy: number
  diversity: number
  bySpecies: Record<string, number>
}

interface GameLogContextType {
  /** Lettres affichées à l'écran : éphémères. */
  letters: EcoEvent[]
  dismissLetter: (id: string) => void
  /** Tout ce qui s'est passé depuis l'ouverture de cette simulation. */
  chronicle: EcoEvent[]
  history: HistorySample[]
}

const MAX_SAMPLES = 800

const GameLogContext = createContext<GameLogContextType | undefined>(undefined)

/**
 * Mémoire de la partie, indépendante de la base de données : les graphiques et les
 * chroniques restent disponibles sans PostgreSQL, et ne dépendent pas d'une fenêtre ouverte.
 */
export function GameLogProvider({ children }: { children: ReactNode }) {
  const { simulationData, currentSimulationId } = useSimulation()
  const { events, dismiss, chronicle } = useEcologicalEvents(simulationData, currentSimulationId)
  const [history, setHistory] = useState<HistorySample[]>([])
  const lastTick = useRef(-1)

  useEffect(() => {
    lastTick.current = -1
    setHistory([])
  }, [currentSimulationId])

  useEffect(() => {
    if (!simulationData) return
    const { status, individuals } = simulationData
    if (status.generation === lastTick.current) return
    lastTick.current = status.generation

    const population = status.population || 1
    const sample: HistorySample = {
      tick: status.generation,
      population: status.population,
      species: status.speciesCount,
      energy: individuals.individuals.reduce((sum, i) => sum + i.energy, 0),
      diversity: status.lineages.reduce((sum, l) => sum + l.geneticDiversity * l.population, 0) / population,
      bySpecies: Object.fromEntries(status.lineages.map((l) => [l.speciesName, l.population]))
    }
    // Une sur deux au-delà du plafond : toute la partie reste visible, à mémoire bornée.
    setHistory((current) => {
      const next = [...current, sample]
      return next.length > MAX_SAMPLES ? next.filter((_, i) => i % 2 === 0) : next
    })
  }, [simulationData])

  const value = useMemo(
    () => ({ letters: events, dismissLetter: dismiss, chronicle, history }),
    [events, dismiss, chronicle, history]
  )
  return <GameLogContext.Provider value={value}>{children}</GameLogContext.Provider>
}

export function useGameLog() {
  const context = useContext(GameLogContext)
  if (!context) throw new Error('useGameLog doit être utilisé dans GameLogProvider')
  return context
}
