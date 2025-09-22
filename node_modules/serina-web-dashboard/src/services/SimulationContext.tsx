import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SimulationData, SimulationCommand, CommandMessage, SimulationStatus } from '../types'
import { io, Socket } from 'socket.io-client'
import { apiService } from './ApiService'

interface SimulationContextType {
  simulationData: SimulationData | null
  isConnected: boolean
  isRunning: boolean
  connectionError: string | null
  currentSimulationId: string | null
  availableSimulations: SimulationStatus[]
  sendCommand: (command: SimulationCommand, parameters?: any) => void
  startNewSimulation: (options?: any) => Promise<void>
  stopCurrentSimulation: () => Promise<void>
  connect: () => void
  disconnect: () => void
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined)

interface SimulationProviderProps {
  children: ReactNode
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentSimulationId, setCurrentSimulationId] = useState<string | null>(null)
  const [availableSimulations, setAvailableSimulations] = useState<SimulationStatus[]>([])

  // Vérifier la santé du serveur
  const checkServerHealth = async () => {
    try {
      const health = await apiService.healthCheck()
      console.log('✅ Server health check:', health)
      return health.status === 'healthy'
    } catch (error) {
      console.error('❌ Server health check failed:', error)
      setConnectionError('Serveur backend non disponible')
      return false
    }
  }

  // Démarrer une nouvelle simulation
  const startNewSimulation = async (options: any = {}) => {
    try {
      setConnectionError(null)
      const response = await apiService.startSimulation(options)
      
      if (response.success && response.data?.simulationId) {
        setCurrentSimulationId(response.data.simulationId)
        setIsRunning(true)
        console.log('✅ Simulation started:', response.data.simulationId)
        
        // Rafraîchir la liste des simulations
        await refreshSimulationList()
      } else {
        throw new Error(response.error || 'Failed to start simulation')
      }
    } catch (error) {
      console.error('❌ Failed to start simulation:', error)
      setConnectionError(`Erreur de démarrage: ${error}`)
      throw error
    }
  }

  // Arrêter la simulation courante
  const stopCurrentSimulation = async () => {
    if (!currentSimulationId) return

    try {
      await apiService.stopSimulation(currentSimulationId)
      setIsRunning(false)
      setCurrentSimulationId(null)
      console.log('🛑 Simulation stopped')
      
      // Rafraîchir la liste des simulations
      await refreshSimulationList()
    } catch (error) {
      console.error('❌ Failed to stop simulation:', error)
      setConnectionError(`Erreur d'arrêt: ${error}`)
      throw error
    }
  }

  // Rafraîchir la liste des simulations
  const refreshSimulationList = async () => {
    try {
      const response = await apiService.listSimulations()
      if (response.success && response.data) {
        setAvailableSimulations(response.data)
      }
    } catch (error) {
      console.error('❌ Failed to refresh simulation list:', error)
    }
  }

  const connect = async () => {
    try {
      // D'abord vérifier la santé du serveur
      const isServerHealthy = await checkServerHealth()
      if (!isServerHealthy) {
        return
      }

      // Rafraîchir la liste des simulations
      await refreshSimulationList()

      // Connect to the Socket.IO server for real simulation data
      const newSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling']
      })
      
      newSocket.on('connect', () => {
        console.log('✅ Serina Dashboard: Connected to simulation Socket.IO server')
        setIsConnected(true)
        setConnectionError(null)
        setSocket(newSocket)
        
        // S'abonner aux mises à jour si on a une simulation active
        if (currentSimulationId) {
          newSocket.emit('subscribe-simulation', currentSimulationId)
        }
      })
      
      newSocket.on('message', (data) => {
        try {
          if (data.type === 'simulation_data') {
            setSimulationData(data.data)
          } else if (data.type === 'status_update') {
            setIsRunning(data.running)
          } else if (data.type === 'error') {
            setConnectionError(data.message || 'Erreur de simulation')
          }
        } catch (error) {
          console.error('Error processing Socket.IO message:', error)
        }
      })
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error)
        setConnectionError('Erreur de connexion au serveur de simulation')
        setIsConnected(false)
      })
      
      newSocket.on('disconnect', () => {
        console.log('🔌 Socket.IO connection disconnected')
        setIsConnected(false)
        setSocket(null)
      })

      console.log('🔌 Serina Dashboard: Connecting to simulation via Socket.IO')
    } catch (error) {
      setConnectionError('Failed to connect to simulation server')
      setIsConnected(false)
      console.error('Connection error:', error)
    }
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
    setIsConnected(false)
    setIsRunning(false)
    setSimulationData(null)
    console.log('Serina Dashboard: Disconnected from simulation')
  }

  const sendCommand = (command: SimulationCommand, parameters?: any) => {
    const message: CommandMessage = {
      command,
      parameters,
      timestamp: Date.now()
    }

    if (socket && isConnected && socket.connected) {
      socket.emit('simulation-command', {
        type: 'command',
        ...message
      })
      console.log('✅ Command sent via WebSocket:', message)
    } else {
      console.warn('⚠️ WebSocket not connected, using API fallback')
      
      // Fallback API calls pour les commandes principales
      switch (command) {
        case SimulationCommand.START:
          startNewSimulation(parameters).catch(console.error)
          break
        case SimulationCommand.PAUSE:
        case SimulationCommand.STOP:
          if (currentSimulationId) {
            stopCurrentSimulation().catch(console.error)
          }
          break
        case SimulationCommand.RESET:
          if (currentSimulationId) {
            stopCurrentSimulation()
              .then(() => startNewSimulation(parameters))
              .catch(console.error)
          }
          break
        default:
          console.log('Command not implemented in API fallback:', command)
      }
    }
  }

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [])

  // Simulate real-time updates
  useEffect(() => {
    if (!isConnected || !isRunning) return

    const interval = setInterval(() => {
      setSimulationData(prev => {
        if (!prev) return prev

        return {
          ...prev,
          generation: prev.generation + 1,
          populationCount: Math.max(50, prev.populationCount + Math.floor(Math.random() * 10 - 4)),
          evolutionStats: {
            ...prev.evolutionStats,
            totalMutations: prev.evolutionStats.totalMutations + Math.floor(Math.random() * 5),
            totalReproductions: prev.evolutionStats.totalReproductions + Math.floor(Math.random() * 8),
            averageFitness: Math.max(0.1, Math.min(1.0, prev.evolutionStats.averageFitness + (Math.random() - 0.5) * 0.05))
          },
          performance: {
            ...prev.performance,
            frameRate: 58 + Math.random() * 4,
            memoryUsage: prev.performance.memoryUsage + (Math.random() - 0.5) * 2,
            cpuUsage: Math.max(10, Math.min(80, prev.performance.cpuUsage + (Math.random() - 0.5) * 5))
          }
        }
      })
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [isConnected, isRunning])

  const contextValue: SimulationContextType = {
    simulationData,
    isConnected,
    isRunning,
    connectionError,
    currentSimulationId,
    availableSimulations,
    sendCommand,
    startNewSimulation,
    stopCurrentSimulation,
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