/**
 * Service HTTP unique pour communiquer avec le backend Serina (api/server.js).
 * En dev, les requêtes relatives passent par le proxy Vite (voir
 * vite.config.ts) vers l'API sur le port 3001 ; en production, il suffit de
 * servir le frontend derrière le même reverse proxy que l'API, ou de
 * définir VITE_API_URL au build.
 */

import {
  ApiResponse,
  SimulationId,
  SimulationSummary,
  SimulationDataResponse,
  SimulationRecord,
  EvolutionHistoryEntry,
  ResumableSimulation,
  HealthCheckResponse
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message = body?.error || body?.details || `HTTP ${response.status}: ${response.statusText}`
    throw new Error(message)
  }

  return body as T
}

class ApiService {
  // === Health ===

  healthCheck(): Promise<HealthCheckResponse> {
    return request<HealthCheckResponse>('/health')
  }

  // === Simulation lifecycle (moteur C++ réel, voir api/routes/serina.js) ===

  startSimulation(options: {
    simulationId?: SimulationId
    name?: string
    worldSize?: number
    initialSpecies?: number
    seed?: number
    ticksPerSecond?: number
  } = {}) {
    return request<{ success: boolean; simulationId: SimulationId; message: string; error: string | null }>(
      '/api/serina/start',
      { method: 'POST', body: JSON.stringify(options) }
    )
  }

  pauseSimulation(simulationId: SimulationId) {
    return request<{ success: boolean; error?: string }>(`/api/serina/pause/${simulationId}`, { method: 'POST' })
  }

  resumeSimulation(simulationId: SimulationId) {
    return request<{ success: boolean; error?: string }>(`/api/serina/resume/${simulationId}`, { method: 'POST' })
  }

  setSpeed(simulationId: SimulationId, ticksPerSecond: number) {
    return request<{ success: boolean; ticksPerSecond?: number; error?: string }>(
      `/api/serina/speed/${simulationId}`,
      { method: 'POST', body: JSON.stringify({ ticksPerSecond }) }
    )
  }

  stepSimulation(simulationId: SimulationId, count = 1) {
    return request<{ success: boolean; generation?: number; error?: string }>(
      `/api/serina/step/${simulationId}`,
      { method: 'POST', body: JSON.stringify({ count }) }
    )
  }

  stopSimulation(simulationId: SimulationId) {
    return request<{ success: boolean; error?: string }>(`/api/serina/stop/${simulationId}`, { method: 'POST' })
  }

  /** Point de sauvegarde manuel : sauvegarde un instantané complet sans
   * arrêter la simulation (distinct de l'arrêt, qui sauvegarde aussi
   * automatiquement avant de détruire). */
  saveSnapshot(simulationId: SimulationId) {
    return request<{ success: boolean; error?: string }>(`/api/serina/save/${simulationId}`, { method: 'POST' })
  }

  /** Reprend une simulation à partir de son dernier instantané sauvegardé
   * -- distinct de resumeSimulation() ci-dessus, qui ne fait que sortir
   * d'une pause sur une simulation déjà vivante. */
  restoreSimulation(simulationId: SimulationId) {
    return request<{ success: boolean; simulationId?: SimulationId; error?: string }>(
      `/api/serina/restore/${simulationId}`,
      { method: 'POST' }
    )
  }

  getSimulationData(simulationId: SimulationId): Promise<SimulationDataResponse> {
    return request<SimulationDataResponse>(`/api/serina/status/${simulationId}`)
  }

  listActiveSimulations() {
    return request<{ success: boolean; simulations: SimulationSummary[]; count: number }>('/api/serina/list')
  }

  checkEngineAvailable() {
    return request<{ available: boolean; path: string | null; message: string }>('/api/serina/check-executable')
  }

  // === Historique persisté (base de données, voir api/routes/simulations.js) ===
  // Ces routes échouent proprement (message clair) si la base n'est pas connectée.

  listSimulationRecords() {
    return request<ApiResponse<SimulationRecord[]>>('/api/simulations')
  }

  listResumableSimulations() {
    return request<ApiResponse<ResumableSimulation[]>>('/api/simulations/resumable')
  }

  getEvolutionHistory(simulationId: SimulationId, limit = 100) {
    return request<ApiResponse<EvolutionHistoryEntry[]>>(`/api/simulations/${simulationId}/history?limit=${limit}`)
  }

  getPopulationTrends(simulationId: SimulationId, generations = 50) {
    return request<ApiResponse<EvolutionHistoryEntry[]>>(`/api/simulations/${simulationId}/trends?generations=${generations}`)
  }
}

export const apiService = new ApiService()
