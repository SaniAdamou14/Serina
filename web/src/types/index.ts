// Types reflecting the REAL shape of data produced by the backend
// (api/services/simulationEngine.js), which itself mirrors the real JSON
// serina_cli emits (see src/serina_cli.cpp and
// include/Serina/SerinaSimulator.hpp). There is no per-trait genome exposed
// by this pipeline — only aggregate fitness and genetic diversity per
// species. Do not add fields here that the backend does not actually send;
// that mismatch is exactly what made this file useless before.

// === /api/serina/status/:id -> latestData.status ===

export interface SpeciesStatus {
  name: string
  population: number
  fitness: number
  geneticDiversity: number
  extinctionRisk: number
  adaptations: string[]
  innovations: string[]
}

export interface EcosystemStatus {
  generation: number
  total_species: number
  total_population: number
  biodiversity_index: number
  ecosystem_stability: number
  total_speciations: number
  total_extinctions: number
}

export interface StatusResult {
  status: 'success' | 'error'
  action: 'status'
  ecosystem: EcosystemStatus
  species: SpeciesStatus[]
  timestamp: number
  error?: string
}

// === /api/serina/status/:id -> latestData.world ===

export interface WorldClimate {
  temperature: number
  humidity: number
  precipitation: number
  windSpeed: number
  sunlightIntensity: number
}

export interface WorldResources {
  primaryProducers: number
  smallPrey: number
  waterQuality: number
  shelter: number
}

export interface WorldPressures {
  predationPressure: number
  competitionIntensity: number
  resourceScarcity: number
  climaticStress: number
}

export interface WorldInfo {
  primaryEnvironment: string
  description: string
  climate: WorldClimate
  resources: WorldResources
  pressures: WorldPressures
  carryingCapacity: number
}

export interface WorldResult {
  status: 'success' | 'error'
  action: 'world_data'
  world: WorldInfo
  generation: number
  timestamp: number
  error?: string
}

// === /api/serina/status/:id -> latestData.genetics ===

export interface GeneticsSpecies {
  name: string
  geneticDiversity: number
  averageFitness: number
  generationsSinceLastInnovation: number
}

export interface GeneticsResult {
  status: 'success' | 'error'
  action: 'genetics'
  genetic_diversity: {
    overall_diversity: number
    average_fitness: number
    species_count: number
  }
  species: GeneticsSpecies[]
  timestamp: number
  error?: string
}

/** Emitted at every real simulation tick (see SimulationEngine.tick()). */
export interface SimulationTick {
  timestamp: number
  status: StatusResult
  world: WorldResult
  genetics: GeneticsResult
}

// === Simulation lifecycle (api/routes/serina.js) ===

export type SimulationId = string | number

export interface SimulationSummary {
  id: SimulationId
  isRunning: boolean
  startTime: string
  hasData: boolean
}

export interface SimulationDataResponse {
  success: boolean
  id?: SimulationId
  isRunning?: boolean
  startTime?: string
  latestData: SimulationTick | null
  error?: string
}

// === Persisted history / analytics (api/routes/simulations.js, DB-backed) ===

export interface SimulationRecord {
  id: number
  name: string
  config: Record<string, unknown> | string | null
  generation: number
  population_count: number
  species_count: number
  status: 'created' | 'running' | 'paused' | 'stopped'
  created_at: string
  updated_at: string
}

export interface EvolutionHistoryEntry {
  id: number
  simulation_id: number
  generation: number
  population_count: number
  species_count: number
  average_fitness: number
  genetic_diversity: number
  created_at: string
}

// === WebSocket commands (api/services/websocket.js) ===

export enum SimulationCommand {
  START = 'START',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  STOP = 'STOP'
}

export interface CommandMessage {
  command: SimulationCommand
  simulationId?: SimulationId
  parameters?: Record<string, unknown>
}

// === Generic API envelope ===

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface HealthCheckResponse {
  status: 'healthy'
  timestamp: string
  services: {
    database: boolean
    simulationEngine: boolean
    websocket: boolean
  }
}
