import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiService } from './ApiService'
import { useSimulation } from './SimulationContext'
import { EcoEvent, useEcologicalEvents } from '../hooks/useEcologicalEvents'
import { HistorySample } from '../types'

export type { HistorySample }

interface GameLogContextType {
  /** Lettres affichées à l'écran : éphémères. */
  letters: EcoEvent[]
  dismissLetter: (id: string) => void
  /** Tout ce qui s'est passé depuis le début de la partie. */
  chronicle: EcoEvent[]
  history: HistorySample[]
}

const HISTORY_REFRESH_MS = 2500

const GameLogContext = createContext<GameLogContextType | undefined>(undefined)

/** Mémoire de la partie, tenue par le moteur : elle ne dépend ni de la page ni de la base. */
export function GameLogProvider({ children }: { children: ReactNode }) {
  const { simulationData, currentSimulationId } = useSimulation()
  const { events, dismiss, chronicle } = useEcologicalEvents(simulationData, currentSimulationId)
  const [history, setHistory] = useState<HistorySample[]>([])

  useEffect(() => {
    setHistory([])
    if (!currentSimulationId) return
    let cancelled = false

    const refresh = async () => {
      try {
        const response = await apiService.getGameHistory(currentSimulationId)
        if (!cancelled && response.status === 'success') setHistory(response.samples)
      } catch {
        // Serveur injoignable : l'alerte de connexion le signale déjà, la courbe reste en l'état.
      }
    }

    refresh()
    const interval = window.setInterval(refresh, HISTORY_REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [currentSimulationId])

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
