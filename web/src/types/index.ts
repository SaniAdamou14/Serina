// Core genetic trait types
export enum TraitType {
  SIZE = 'SIZE',
  SPEED = 'SPEED', 
  STRENGTH = 'STRENGTH',
  INTELLIGENCE = 'INTELLIGENCE',
  LONGEVITY = 'LONGEVITY',
  RESISTANCE = 'RESISTANCE',
  METABOLISM = 'METABOLISM',
  SOCIABILITY = 'SOCIABILITY',
  ADAPTABILITY = 'ADAPTABILITY',
  VISION_RANGE = 'VISION_RANGE',
  CAMOUFLAGE = 'CAMOUFLAGE',
  REPRODUCTION_RATE = 'REPRODUCTION_RATE'
}

export interface GeneticTrait {
  type: TraitType
  value: number // 0.0 to 1.0
  dominance: number // 0.0 to 1.0
  mutationRate: number // 0.0 to 1.0
}

export interface Genome {
  traits: Record<TraitType, GeneticTrait>
  id: string
  generation: number
  parentIds: string[]
}

// Phenotype representation
export interface Phenotype {
  size: number
  speed: number
  strength: number
  intelligence: number
  longevity: number
  resistance: number
  metabolism: number
  sociability: number
  adaptability: number
  visionRange: number
  camouflage: number
  reproductionRate: number
  metabolicRate: number
  reproductionThreshold: number
  fitnessScore: number
}

// Individual organism
export interface Individual {
  id: string
  name: string
  genome: Genome
  phenotype: Phenotype
  age: number
  energy: number
  position: { x: number; y: number }
  generation: number
  parentIds: string[]
  offspring: string[]
  isAlive: boolean
  birthTime: number
  deathTime?: number
  causeOfDeath?: string
}

// Species and population
export interface Species {
  id: string
  name: string
  individuals: Individual[]
  averageTrait: Record<TraitType, number>
  populationCount: number
  generationSpan: number
  extinctionRisk: number
  ecologicalNiche: string
}

// Environmental types
export enum TerrainType {
  LAND = 'LAND',
  WATER = 'WATER',
  MOUNTAIN = 'MOUNTAIN',
  FOREST = 'FOREST',
  DESERT = 'DESERT',
  WETLAND = 'WETLAND',
  GRASSLAND = 'GRASSLAND',
  TUNDRA = 'TUNDRA',
  CAVES = 'CAVES',
  VOLCANIC = 'VOLCANIC'
}

export enum ClimateZone {
  TROPICAL = 'TROPICAL',
  TEMPERATE = 'TEMPERATE',
  ARCTIC = 'ARCTIC',
  DESERT = 'DESERT',
  OCEANIC = 'OCEANIC',
  MONTANE = 'MONTANE',
  SUBTROPICAL = 'SUBTROPICAL',
  BOREAL = 'BOREAL',
  MEDITERRANEAN = 'MEDITERRANEAN'
}

export interface EnvironmentalConditions {
  temperature: number
  humidity: number
  precipitation: number
  resourceAbundance: number
  predationPressure: number
  diseaseLoad: number
  seasonalModifier: number
  dayNightCycle: number // 0.0 to 1.0
}

// World state
export interface WorldState {
  generation: number
  totalPopulation: number
  species: Species[]
  environment: EnvironmentalConditions
  worldSize: { width: number; height: number }
  terrainMap: TerrainType[][]
  climateMap: ClimateZone[][]
  resourceMap: number[][]
  time: {
    elapsed: number
    generation: number
    dayNightCycle: number
    season: string
  }
}

// Simulation configuration
export interface SimulationConfig {
  worldWidth: number
  worldHeight: number
  initialPopulation: number
  maxPopulation: number
  mutationRate: number
  crossoverRate: number
  simulationSpeed: number
  enableVisualization: boolean
  autoSaveInterval: number
  enableSIMD: boolean
  enableOpenMP: boolean
  maxThreads: number
  resourceRegenerationRate: number
  environmentalPressure: number
}

// Real-time simulation data
export interface SimulationData {
  populationCount: number
  generation: number
  worldState: WorldState
  species: Species[]
  evolutionStats: {
    totalMutations: number
    totalReproductions: number
    averageFitness: number
    geneticDiversity: number
    speciesCount: number
    extinctionRate: number
  }
  performance: {
    generationsPerSecond: number
    memoryUsage: number
    cpuUsage: number
    frameRate: number
  }
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'SIMULATION_UPDATE' | 'SIMULATION_STATE' | 'ERROR' | 'COMMAND'
  data: any
  timestamp: number
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

// Chart and visualization data
export interface PopulationChartData {
  time: number[]
  population: number[]
  species: Record<string, number[]>
}

export interface GeneticDiversityData {
  generation: number[]
  diversity: number[]
  speciesCount: number[]
}

export interface FitnessDistributionData {
  bins: number[]
  frequency: number[]
  mean: number
  standardDeviation: number
}

// Component props interfaces
export interface DashboardProps {
  simulationData: SimulationData
  isConnected: boolean
  onCommand: (command: string, params?: any) => void
}

export interface VisualizationProps {
  worldState: WorldState
  width: number
  height: number
  showTrails?: boolean
  colorScheme?: 'species' | 'fitness' | 'age' | 'energy'
}

export interface ControlPanelProps {
  config: SimulationConfig
  isRunning: boolean
  onConfigChange: (config: Partial<SimulationConfig>) => void
  onPlayPause: () => void
  onReset: () => void
  onSave: () => void
  onLoad: () => void
}

// Simulation control commands
export enum SimulationCommand {
  START = 'START',
  PAUSE = 'PAUSE',
  RESET = 'RESET',
  STEP = 'STEP',
  SAVE = 'SAVE',
  LOAD = 'LOAD',
  SET_SPEED = 'SET_SPEED',
  SET_CONFIG = 'SET_CONFIG',
  ADD_SPECIES = 'ADD_SPECIES',
  REMOVE_SPECIES = 'REMOVE_SPECIES'
}

export interface CommandMessage {
  command: SimulationCommand
  parameters?: any
  timestamp: number
}