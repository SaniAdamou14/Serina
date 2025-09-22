/**
 * Service API pour communiquer avec le backend Serina
 * Gère les appels REST et WebSocket de manière unifiée
 */

import { 
  ApiResponse, 
  SimulationStatus, 
  SpeciesData, 
  Individual, 
  EnvironmentData,
  PerformanceMetrics,
  SimulationCommand
} from '../types'

export class ApiService {
  private baseUrl: string
  private wsUrl: string
  
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
    this.wsUrl = baseUrl.replace('http', 'ws')
  }

  // === Simulation Control ===
  
  /**
   * Démarre une nouvelle simulation
   */
  async startSimulation(options: {
    simulationId?: string
    worldWidth?: number
    worldHeight?: number
  } = {}): Promise<ApiResponse<{ simulationId: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/serina/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to start simulation:', error)
      throw error
    }
  }

  /**
   * Arrête une simulation
   */
  async stopSimulation(simulationId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/serina/stop/${simulationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to stop simulation:', error)
      throw error
    }
  }

  /**
   * Obtient le statut d'une simulation
   */
  async getSimulationStatus(simulationId: string): Promise<ApiResponse<SimulationStatus>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/serina/status/${simulationId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get simulation status:', error)
      throw error
    }
  }

  /**
   * Liste toutes les simulations actives
   */
  async listSimulations(): Promise<ApiResponse<SimulationStatus[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/serina/list`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to list simulations:', error)
      throw error
    }
  }

  // === Species Management ===
  
  /**
   * Obtient les données des espèces pour une simulation
   */
  async getSpecies(simulationId: string): Promise<ApiResponse<SpeciesData[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/species/${simulationId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get species:', error)
      throw error
    }
  }

  /**
   * Obtient les individus d'une espèce
   */
  async getIndividuals(simulationId: string, speciesId?: string): Promise<ApiResponse<Individual[]>> {
    try {
      const url = speciesId 
        ? `${this.baseUrl}/api/individuals/${simulationId}?speciesId=${speciesId}`
        : `${this.baseUrl}/api/individuals/${simulationId}`
        
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get individuals:', error)
      throw error
    }
  }

  // === Environment Data ===
  
  /**
   * Obtient les données de l'environnement
   */
  async getEnvironment(simulationId: string): Promise<ApiResponse<EnvironmentData>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/environment/${simulationId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get environment:', error)
      throw error
    }
  }

  // === Analytics ===
  
  /**
   * Obtient les métriques de performance
   */
  async getPerformanceMetrics(simulationId: string): Promise<ApiResponse<PerformanceMetrics>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/performance/${simulationId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      throw error
    }
  }

  /**
   * Obtient les statistiques d'évolution des espèces
   */
  async getEvolutionStats(simulationId: string, speciesId?: string): Promise<ApiResponse<any>> {
    try {
      const url = speciesId 
        ? `${this.baseUrl}/api/species-analytics/${simulationId}/evolution?speciesId=${speciesId}`
        : `${this.baseUrl}/api/species-analytics/${simulationId}/evolution`
        
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get evolution stats:', error)
      throw error
    }
  }

  // === Health Check ===
  
  /**
   * Vérifie la santé du serveur
   */
  async healthCheck(): Promise<{
    status: string
    timestamp: string
    services: Record<string, boolean>
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Health check failed:', error)
      throw error
    }
  }

  // === Real-time Data (WebSocket) ===
  
  /**
   * Crée une connexion WebSocket pour les données en temps réel
   */
  createWebSocketConnection(onMessage: (data: any) => void, onError?: (error: Event) => void): WebSocket {
    const ws = new WebSocket(`${this.wsUrl}`)
    
    ws.onopen = () => {
      console.log('✅ WebSocket connection established')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      if (onError) {
        onError(error)
      }
    }
    
    ws.onclose = () => {
      console.log('🔌 WebSocket connection closed')
    }
    
    return ws
  }

  /**
   * Envoie une commande via WebSocket
   */
  sendWebSocketCommand(ws: WebSocket, command: SimulationCommand, parameters?: any) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'command',
        command,
        parameters,
        timestamp: Date.now()
      }
      ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not open, cannot send command:', command)
    }
  }
}

// Export d'une instance singleton
export const apiService = new ApiService()