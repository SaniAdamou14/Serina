import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { apiService } from './ApiService'
import { SimulationTick, SimulationCommand, SimulationId, SimulationSummary, ResumableSimulation } from '../types'

interface SimulationContextType {
  simulationData: SimulationTick | null
  isConnected: boolean
  isRunning: boolean
  connectionError: string | null
  currentSimulationId: SimulationId | null
  availableSimulations: SimulationSummary[]
  resumableSimulations: ResumableSimulation[]
  sendCommand: (command: SimulationCommand) => void
  startNewSimulation: (options?: { founderCount?: number; seed?: number; ticksPerSecond?: number }) => Promise<void>
  stopCurrentSimulation: () => Promise<void>
  setSpeed: (ticksPerSecond: number) => Promise<void>
  stepSimulation: (count?: number) => Promise<void>
  saveSnapshot: () => Promise<void>
  restoreSimulation: (simulationId: SimulationId) => Promise<void>
  connect: () => void
  disconnect: () => void
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined)

interface SimulationProviderProps {
  children: ReactNode
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const [simulationData, setSimulationData] = useState<SimulationTick | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [currentSimulationId, setCurrentSimulationId] = useState<SimulationId | null>(null)
  const [availableSimulations, setAvailableSimulations] = useState<SimulationSummary[]>([])
  const [resumableSimulations, setResumableSimulations] = useState<ResumableSimulation[]>([])
  const socketRef = useRef<Socket | null>(null)

  const refreshSimulationList = useCallback(async () => {
    try {
      const response = await apiService.listActiveSimulations()
      if (response.success) {
        setAvailableSimulations(response.simulations)
      }
    } catch (error) {
      console.error('Failed to refresh simulation list:', error)
    }
  }, [])

  const refreshResumableSimulations = useCallback(async () => {
    try {
      const response = await apiService.listResumableSimulations()
      if (response.success && response.data) {
        setResumableSimulations(response.data)
      }
    } catch (error) {
      // Échoue proprement si la base n'est pas connectée -- pas d'erreur
      // bloquante affichée, la liste reste juste vide.
      console.error('Failed to refresh resumable simulations:', error)
    }
  }, [])

  const connect = useCallback(() => {
    if (socketRef.current) return

    // Même origine que la page : en dev, le proxy Vite (vite.config.ts)
    // route /socket.io vers l'API réelle sur le port 3001.
    const socket = io({ transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Connected to Serina simulation server')
      setIsConnected(true)
      setConnectionError(null)
      refreshSimulationList()
      refreshResumableSimulations()

      if (currentSimulationId) {
        socket.emit('subscribe-simulation', currentSimulationId)
      }
    })

    socket.on('simulation-data', (tick: SimulationTick) => {
      setSimulationData(tick)
    })

    socket.on('simulation-state', (state: { isRunning?: boolean; latestData?: SimulationTick | null }) => {
      if (typeof state.isRunning === 'boolean') setIsRunning(state.isRunning)
      if (state.latestData) setSimulationData(state.latestData)
    })

    socket.on('simulation-started', () => setIsRunning(true))
    socket.on('simulation-paused', () => setIsRunning(false))
    socket.on('simulation-stopped', () => {
      setIsRunning(false)
      setSimulationData(null)
    })

    socket.on('command-error', ({ error }: { error: string }) => {
      setConnectionError(error)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
      setConnectionError('Impossible de joindre le serveur de simulation')
      setIsConnected(false)
    })

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Serina simulation server')
      setIsConnected(false)
    })
  }, [currentSimulationId, refreshSimulationList, refreshResumableSimulations])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
    setIsConnected(false)
    setIsRunning(false)
    setSimulationData(null)
  }, [])

  const startNewSimulation = useCallback(async (options?: { founderCount?: number; seed?: number; ticksPerSecond?: number }) => {
    try {
      setConnectionError(null)
      const response = await apiService.startSimulation({
        initialSpecies: options?.founderCount,
        seed: options?.seed,
        ticksPerSecond: options?.ticksPerSecond
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to start simulation')
      }

      setCurrentSimulationId(response.simulationId)
      setIsRunning(true)
      console.log('✅ Simulation started:', response.simulationId)

      socketRef.current?.emit('subscribe-simulation', response.simulationId)
      await refreshSimulationList()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to start simulation:', message)
      setConnectionError(`Erreur de démarrage : ${message}`)
      throw error
    }
  }, [refreshSimulationList])

  const stopCurrentSimulation = useCallback(async () => {
    if (!currentSimulationId) return

    try {
      // stopSimulation sauvegarde automatiquement un instantané complet
      // côté serveur avant de détruire la simulation (voir
      // simulationEngine.js#stopSimulation) -- elle redevient donc
      // reprenable, pas juste arrêtée pour de bon.
      await apiService.stopSimulation(currentSimulationId)
      socketRef.current?.emit('unsubscribe-simulation', currentSimulationId)
      setIsRunning(false)
      setCurrentSimulationId(null)
      setSimulationData(null)
      await refreshSimulationList()
      await refreshResumableSimulations()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to stop simulation:', message)
      setConnectionError(`Erreur d'arrêt : ${message}`)
      throw error
    }
  }, [currentSimulationId, refreshSimulationList, refreshResumableSimulations])

  const setSpeed = useCallback(async (ticksPerSecond: number) => {
    if (!currentSimulationId) return
    try {
      await apiService.setSpeed(currentSimulationId, ticksPerSecond)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to change simulation speed:', message)
      setConnectionError(`Erreur de changement de vitesse : ${message}`)
    }
  }, [currentSimulationId])

  const stepSimulation = useCallback(async (count = 1) => {
    if (!currentSimulationId) return
    try {
      await apiService.stepSimulation(currentSimulationId, count)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to step simulation:', message)
      setConnectionError(`Erreur d'avance manuelle : ${message}`)
    }
  }, [currentSimulationId])

  const saveSnapshot = useCallback(async () => {
    if (!currentSimulationId) return
    try {
      const response = await apiService.saveSnapshot(currentSimulationId)
      if (!response.success) throw new Error(response.error || 'Failed to save snapshot')
      await refreshResumableSimulations()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to save snapshot:', message)
      setConnectionError(`Erreur de sauvegarde : ${message}`)
      throw error
    }
  }, [currentSimulationId, refreshResumableSimulations])

  const restoreSimulation = useCallback(async (simulationId: SimulationId) => {
    try {
      setConnectionError(null)
      const response = await apiService.restoreSimulation(simulationId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to restore simulation')
      }

      setCurrentSimulationId(simulationId)
      setIsRunning(true)
      console.log('✅ Simulation restored:', simulationId)

      socketRef.current?.emit('subscribe-simulation', simulationId)
      await refreshSimulationList()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to restore simulation:', message)
      setConnectionError(`Erreur de reprise : ${message}`)
      throw error
    }
  }, [refreshSimulationList])

  const sendCommand = useCallback((command: SimulationCommand) => {
    const socket = socketRef.current

    if (socket && socket.connected && currentSimulationId) {
      socket.emit('simulation-command', { command, simulationId: currentSimulationId })
      return
    }

    // Repli REST si le WebSocket n'est pas disponible.
    if (!currentSimulationId) return
    switch (command) {
      case SimulationCommand.PAUSE:
        apiService.pauseSimulation(currentSimulationId).then(() => setIsRunning(false)).catch(console.error)
        break
      case SimulationCommand.RESUME:
        apiService.resumeSimulation(currentSimulationId).then(() => setIsRunning(true)).catch(console.error)
        break
      case SimulationCommand.STOP:
        stopCurrentSimulation().catch(console.error)
        break
    }
  }, [currentSimulationId, stopCurrentSimulation])

  useEffect(() => {
    connect()
    return () => disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contextValue: SimulationContextType = {
    simulationData,
    isConnected,
    isRunning,
    connectionError,
    currentSimulationId,
    availableSimulations,
    resumableSimulations,
    sendCommand,
    startNewSimulation,
    stopCurrentSimulation,
    setSpeed,
    stepSimulation,
    saveSnapshot,
    restoreSimulation,
    connect,
    disconnect
  }

  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider')
  }
  return context
}
