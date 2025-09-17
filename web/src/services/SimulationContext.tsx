import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SimulationData, SimulationCommand, CommandMessage, TraitType } from '../types'
import { Socket } from 'socket.io-client'

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
      // For now, we'll simulate connection since the C++ backend isn't running
      // In production, this would connect to the actual WebSocket server
      setIsConnected(true)
      setConnectionError(null)
      
      // Simulate initial data
      const mockData: SimulationData = {
        populationCount: 150,
        generation: 42,
        worldState: {
          generation: 42,
          totalPopulation: 150,
          species: [],
          environment: {
            temperature: 23.5,
            humidity: 0.65,
            precipitation: 0.3,
            resourceAbundance: 0.8,
            predationPressure: 0.4,
            diseaseLoad: 0.1,
            seasonalModifier: 0.7,
            dayNightCycle: 0.3
          },
          worldSize: { width: 1920, height: 1080 },
          terrainMap: [],
          climateMap: [],
          resourceMap: [],
          time: {
            elapsed: 180000,
            generation: 42,
            dayNightCycle: 0.3,
            season: 'Spring'
          }
        },
        species: [
          {
            id: 'sp1',
            name: 'Serina Alpha',
            individuals: [],
            averageTrait: {
              SIZE: 0.6,
              SPEED: 0.7,
              STRENGTH: 0.5,
              INTELLIGENCE: 0.8,
              LONGEVITY: 0.6,
              RESISTANCE: 0.7,
              METABOLISM: 0.5,
              SOCIABILITY: 0.4,
              ADAPTABILITY: 0.6,
              VISION_RANGE: 0.7,
              CAMOUFLAGE: 0.3,
              REPRODUCTION_RATE: 0.6
            },
            populationCount: 87,
            generationSpan: 15,
            extinctionRisk: 0.1,
            ecologicalNiche: 'Generalist'
          },
          {
            id: 'sp2', 
            name: 'Serina Beta',
            individuals: [],
            averageTrait: {
              SIZE: 0.4,
              SPEED: 0.9,
              STRENGTH: 0.3,
              INTELLIGENCE: 0.6,
              LONGEVITY: 0.4,
              RESISTANCE: 0.5,
              METABOLISM: 0.8,
              SOCIABILITY: 0.7,
              ADAPTABILITY: 0.8,
              VISION_RANGE: 0.9,
              CAMOUFLAGE: 0.7,
              REPRODUCTION_RATE: 0.8
            },
            populationCount: 63,
            generationSpan: 8,
            extinctionRisk: 0.3,
            ecologicalNiche: 'Specialist'
          }
        ],
        evolutionStats: {
          totalMutations: 1247,
          totalReproductions: 3891,
          averageFitness: 0.73,
          geneticDiversity: 0.82,
          speciesCount: 2,
          extinctionRate: 0.05
        },
        performance: {
          generationsPerSecond: 2.3,
          memoryUsage: 45.2,
          cpuUsage: 23.8,
          frameRate: 60.0
        }
      }
      
      setSimulationData(mockData)
      setIsRunning(true)

      console.log('Serina Dashboard: Connected to simulation')
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

    if (socket && isConnected) {
      socket.emit('command', message)
    } else {
      // Simulate command handling for demo
      console.log('Serina Command:', message)
      
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