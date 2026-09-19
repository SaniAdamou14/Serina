// Types reflecting the REAL shape of data produced by the backend
// (api/services/simulationEngine.js -> serina_daemon, see
// docs/SERINA_DAEMON_PROTOCOL.md and include/Serina/DaemonProtocol.hpp).
// Phase 9 replaced the old aggregate-only pipeline (SerinaEcosystemSimulator
// via serina_cli) with the unified engine (UnifiedWorldSimulator via
// serina_daemon): real individuals with real positions, a real per-cell
// region grid, and a real per-species NEAT brain, all exposed here. Do not
// add fields the backend does not actually send.

// Serina::Taxonomy::BiologicalType (include/Serina/EcosystemTaxonomy.hpp) enum
// ordinals, in declaration order. Only BIRD/FISH/ARTHROPOD/MOLLUSC are
// actually used by the five founders today; the rest exist in the enum but
// no founder or (so far) descendant lineage has been observed with them.
export const BIOLOGICAL_TYPE_NAMES = [
  'BIRD',
  'FISH',
  'ARTHROPOD',
  'MOLLUSC',
  'CNIDARIAN',
  'ANNELID',
  'PLANT',
  'CRUSTACEAN'
] as const

// === status command -> latestData.status ===

export interface LineageStatus {
  speciesName: string
  /** Serina::Taxonomy::BiologicalType enum ordinal, see BIOLOGICAL_TYPE_NAMES */
  biologicalType: number
  population: number
  averageFitness: number
  /** Real average pairwise genome distance (AdvancedGenome::geneticDistance), not a random draw. */
  geneticDiversity: number
  regionsOccupied: number
  adaptations: string[]
  innovations: string[]
  hasBrain: boolean
  /** Node + connection count of this lineage's real NEAT brain. */
  brainComplexity: number
}

export interface StatusResult {
  status: 'success' | 'error'
  generation: number
  population: number
  running: boolean
  speciesCount: number
  lineages: LineageStatus[]
  /** A count -- see the `lineages` command for the full event history. */
  speciationEventCount: number
  error?: string
}

// === regions command -> latestData.regions ===

export interface RegionInfo {
  gridX: number
  gridY: number
  /** Serina::Ecosystem::EnvironmentType enum ordinal */
  environmentType: number
  environmentName: string
  temperature: number
  primaryProducers: number
  predationPressure: number
  competitionIntensity: number
  climaticStress: number
  /** Real count of living organisms currently in this cell. */
  population: number
}

export interface RegionsResult {
  status: 'success' | 'error'
  gridWidth: number
  gridHeight: number
  /** Continuous world units per grid cell -- multiply by gridWidth/gridHeight for the world's real size in the same units individuals' x/y use. */
  cellSize: number
  regions: RegionInfo[]
  error?: string
}

// === individuals command -> latestData.individuals ===

export interface IndividualInfo {
  id: number
  species: string
  x: number
  y: number
  energy: number
  age: number
  /** Serina::Taxonomy::BiologicalType enum ordinal, see BIOLOGICAL_TYPE_NAMES */
  biologicalType: number
  /** A real, normalized ([0,1] or an integer tier) projection of this individual's
   * actual genome onto a small set of legible rendering channels -- computed once,
   * server-side (see IndividualSnapshot in WorldSimulation.hpp), not invented by
   * the frontend. Deliberately excludes traits with no honest visual analog
   * (ENERGY_EFFICIENCY, REPRODUCTION_RATE, LONGEVITY, RESISTANCE, INTELLIGENCE). */
  sizeScale: number
  elongation: number
  camouflage: number
  ornamentTier: number
  sensoryProminence: number
  patternTier: number
}

export interface IndividualsResult {
  status: 'success' | 'error'
  individuals: IndividualInfo[]
  error?: string
}

// === lineages command -> latestData.lineages ===

export interface SpeciationEventInfo {
  parentSpecies: string
  newSpecies: string
  generation: number
  geneticDistanceAtSplit: number
}

export interface LineagesResult {
  status: 'success' | 'error'
  lineages: LineageStatus[]
  speciationEvents: SpeciationEventInfo[]
  error?: string
}

/** Emitted at every real poll of the daemon (see SimulationEngine.pull()). */
export interface SimulationTick {
  timestamp: number
  status: StatusResult
  regions: RegionsResult
  individuals: IndividualsResult
  lineages: LineagesResult
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
