import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SimulationData, SimulationCommand, CommandMessage } from '../types'
import { io, Socket } from 'socket.io-client'

interface SimulationContextType {
  simulationData: SimulationData | null
  isConnected: boolean
  isRunning: boolean
  connectionError: string | null
  sendCommand: (command: SimulationCommand, parameters?: any) => void
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

  const connect = () => {
    try {
      // Connect to the Socket.IO server for real simulation data
      const newSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling']
      })
      
      newSocket.on('connect', () => {
        console.log('Serina Dashboard: Connected to simulation Socket.IO server')
        setIsConnected(true)
        setConnectionError(null)
        setSocket(newSocket)
        
        // Request initial simulation data
        newSocket.emit('simulation-command', { 
          type: 'command', 
          command: 'GET_STATUS' 
        })
      })
      
      newSocket.on('message', (data) => {
        try {
          if (data.type === 'simulation_data') {
            setSimulationData(data.data)
          } else if (data.type === 'status_update') {
            setIsRunning(data.running)
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
        console.log('Socket.IO connection disconnected')
        setIsConnected(false)
        setSocket(null)
      })

      console.log('Serina Dashboard: Connecting to simulation via Socket.IO')
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
    } else {
      // Fallback for when not connected
      console.log('Serina Command (offline):', message)
      
      switch (command) {
        case SimulationCommand.START:
          setIsRunning(true)
          break
        case SimulationCommand.PAUSE:
          setIsRunning(false)
          break
        case SimulationCommand.RESET:
          // Reset simulation data
          connect()
          break
        default:
          console.log('Command not implemented in demo mode:', command)
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
    sendCommand,
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