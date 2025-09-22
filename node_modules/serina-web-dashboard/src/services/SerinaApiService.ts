/**
 * Service API pour communiquer avec le backend Serina
 * Gère les requêtes HTTP et la communication WebSocket
 */

import { 
  ApiResponse, 
  SimulationData, 
  SimulationConfig,
  Species 
} from '../types'

class SerinaApiService {
  private baseUrl: string
  private simulationId: string | null = null

  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl
  }

  /**
   * Démarre une nouvelle simulation Serina
   */
  async startSimulation(config?: Partial<SimulationConfig>): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/serina/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config || {})
      })

      const result: ApiResponse = await response.json()
      
      if (result.success && result.data?.simulationId) {
        this.simulationId = result.data.simulationId
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: `Erreur de connexion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Arrête la simulation en cours
   */
  async stopSimulation(simulationId?: string): Promise<ApiResponse> {
    const id = simulationId || this.simulationId
    if (!id) {
      return {
        success: false,
        error: 'Aucune simulation active',
        timestamp: Date.now()
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/serina/stop/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        this.simulationId = null
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: `Erreur de connexion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Récupère le statut de la simulation
   */
  async getSimulationStatus(simulationId?: string): Promise<ApiResponse> {
    const id = simulationId || this.simulationId
    if (!id) {
      return {
        success: false,
        error: 'Aucune simulation active',
        timestamp: Date.now()
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/serina/status/${id}`)
      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: `Erreur de connexion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Récupère les données de simulation
   */
  async getSimulationData(simulationId?: string): Promise<ApiResponse<SimulationData>> {
    const id = simulationId || this.simulationId
    if (!id) {
      return {
        success: false,
        error: 'Aucune simulation active',
        timestamp: Date.now()
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/serina/data/${id}`)
      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: `Erreur de connexion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Liste toutes les simulations
   */
  async listSimulations(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/serina/list`)
      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: `Erreur de connexion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Récupère les espèces d'une simulation
   */
  async getSpecies(simulationId?: string): Promise<ApiResponse<Species[]>> {
    const id = simulationId || this.simulationId
    if (!id) {
      return {
        success: false,
        error: 'Aucune simulation active',
        timestamp: Date.now()
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/species/${id}`)
      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: `Erreur de connexion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Test de santé du serveur
   */
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: `Serveur indisponible: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Récupère l'ID de simulation actuelle
   */
  getCurrentSimulationId(): string | null {
    return this.simulationId
  }

  /**
   * Définit l'ID de simulation actuelle
   */
  setSimulationId(id: string): void {
    this.simulationId = id
  }

  /**
   * Efface l'ID de simulation actuelle
   */
  clearSimulationId(): void {
    this.simulationId = null
  }
}

// Instance singleton
export const serinaApiService = new SerinaApiService()
export default serinaApiService