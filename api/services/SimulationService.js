import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export class SimulationService {
  constructor(databaseService) {
    this.db = databaseService;
    this.activeSimulations = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Load active simulations from database
      const simulations = await this.db.getSimulations();
      const activeSimulations = simulations.filter(s => s.is_active);
      
      activeSimulations.forEach(sim => {
        this.activeSimulations.set(sim.id, {
          id: sim.id,
          name: sim.name,
          status: 'loaded',
          lastUpdate: new Date(sim.updated_at)
        });
      });

      this.isInitialized = true;
      logger.info(`Simulation service initialized with ${activeSimulations.length} active simulations`);
      
      return true;
    } catch (error) {
      logger.error('Simulation service initialization failed:', error);
      throw error;
    }
  }

  async createSimulation(config) {
    try {
      const simulationId = await this.db.createSimulation(config);
      
      // Add to active simulations
      this.activeSimulations.set(simulationId, {
        id: simulationId,
        name: config.name,
        status: 'created',
        lastUpdate: new Date()
      });

      logger.info(`Created simulation ${simulationId}: ${config.name}`);
      return simulationId;
    } catch (error) {
      logger.error('Failed to create simulation:', error);
      throw error;
    }
  }

  async getSimulation(id) {
    try {
      return await this.db.getSimulation(id);
    } catch (error) {
      logger.error(`Failed to get simulation ${id}:`, error);
      throw error;
    }
  }

  async updateSimulation(id, data) {
    try {
      await this.db.updateSimulation(id, data);
      
      // Update in memory
      const simInfo = this.activeSimulations.get(id);
      if (simInfo) {
        simInfo.lastUpdate = new Date();
        if (data.is_active === false) {
          simInfo.status = 'inactive';
        }
      }

      return true;
    } catch (error) {
      logger.error(`Failed to update simulation ${id}:`, error);
      throw error;
    }
  }

  async deleteSimulation(id) {
    try {
      // Remove from active simulations
      this.activeSimulations.delete(id);
      
      // Database deletion is handled by the route
      logger.info(`Simulation ${id} removed from active simulations`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete simulation ${id}:`, error);
      throw error;
    }
  }

  getActiveSimulations() {
    return Array.from(this.activeSimulations.values());
  }

  isSimulationActive(id) {
    return this.activeSimulations.has(id);
  }

  getSimulationStatus(id) {
    const simInfo = this.activeSimulations.get(id);
    return simInfo ? simInfo.status : 'inactive';
  }

  isRunning() {
    return this.isInitialized;
  }
}