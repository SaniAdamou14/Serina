const database = require('./database');
const EvolutionEngine = require('./evolution');

class WebSocketService {
  constructor() {
    this.io = null;
    this.clients = new Map();
    this.simulationChannels = new Map();
    this.evolutionEngine = null;
    this.unifiedSerinaService = null;
    this.isInitialized = false;
  }

  setUnifiedSerinaService(unifiedSerinaService) {
    this.unifiedSerinaService = unifiedSerinaService;
    console.log('✅ WebSocket service linked to UnifiedSerinaService');
  }

  initialize(socketServer) {
    this.io = socketServer;
    this.evolutionEngine = new EvolutionEngine();
    this.isInitialized = true;
    
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.handleClientConnection(socket);
    });

    // Setup evolution engine event listeners
    this.setupEvolutionListeners();
    
    console.log('✅ WebSocket service initialized');
  }

  handleClientConnection(socket) {
    // Store client info
    this.clients.set(socket.id, {
      socket,
      subscribedSimulations: new Set(),
      connectedAt: new Date()
    });

    // Handle simulation subscription
    socket.on('subscribe-simulation', (simulationId) => {
      this.subscribeToSimulation(socket, simulationId);
    });

    // Handle simulation unsubscription
    socket.on('unsubscribe-simulation', (simulationId) => {
      this.unsubscribeFromSimulation(socket, simulationId);
    });

    // Handle real-time simulation commands
    socket.on('simulation-command', async (data) => {
      await this.handleSimulationCommand(socket, data);
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      this.handleClientDisconnection(socket);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Serina Evolution Server',
      serverId: socket.id,
      timestamp: new Date().toISOString()
    });
  }

  subscribeToSimulation(socket, simulationId) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Add to client's subscriptions
    client.subscribedSimulations.add(simulationId);

    // Add to simulation channel
    if (!this.simulationChannels.has(simulationId)) {
      this.simulationChannels.set(simulationId, new Set());
    }
    this.simulationChannels.get(simulationId).add(socket.id);

    // Join socket room
    socket.join(`simulation-${simulationId}`);

    console.log(`📡 Client ${socket.id} subscribed to simulation ${simulationId}`);

    // Send current simulation state
    this.sendSimulationState(simulationId, socket.id);
  }

  unsubscribeFromSimulation(socket, simulationId) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Remove from client's subscriptions
    client.subscribedSimulations.delete(simulationId);

    // Remove from simulation channel
    const channel = this.simulationChannels.get(simulationId);
    if (channel) {
      channel.delete(socket.id);
      if (channel.size === 0) {
        this.simulationChannels.delete(simulationId);
      }
    }

    // Leave socket room
    socket.leave(`simulation-${simulationId}`);

    console.log(`📡 Client ${socket.id} unsubscribed from simulation ${simulationId}`);
  }

  handleClientDisconnection(socket) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Remove from all simulation channels
    for (const simulationId of client.subscribedSimulations) {
      const channel = this.simulationChannels.get(simulationId);
      if (channel) {
        channel.delete(socket.id);
        if (channel.size === 0) {
          this.simulationChannels.delete(simulationId);
        }
      }
    }

    // Remove client
    this.clients.delete(socket.id);
  }

  async handleSimulationCommand(socket, data) {
    try {
      const { command, simulationId, payload, parameters } = data;

      // Support both old format and new frontend format
      let actualCommand = command;
      let actualSimulationId = simulationId;

      // Map frontend commands to backend commands
      switch (command) {
        case 'START':
          actualCommand = 'start-simulation';
          break;
        case 'PAUSE':
          actualCommand = 'pause-simulation';
          break;
        case 'RESET':
          actualCommand = 'stop-simulation';
          break;
        case 'start-simulation':
        case 'pause-simulation':
        case 'stop-simulation':
        case 'update-config':
          actualCommand = command;
          break;
        default:
          console.log('Unknown simulation command:', command);
          socket.emit('command-error', {
            error: `Unknown command: ${command}`
          });
          return;
      }

      // If no simulationId provided, create or use active simulation
      if (!actualSimulationId) {
        // Create a new simulation if starting
        if (actualCommand === 'start-simulation') {
          actualSimulationId = 'serina-' + Date.now();
          await this.createNewSimulation(actualSimulationId, parameters);
        }
      }

      switch (actualCommand) {
        case 'start-simulation':
          await this.startSimulation(actualSimulationId, parameters);
          break;
        case 'pause-simulation':
          await this.pauseSimulation(actualSimulationId);
          break;
        case 'stop-simulation':
          await this.stopSimulation(actualSimulationId);
          break;
        case 'update-config':
          await this.updateSimulationConfig(actualSimulationId, payload || parameters);
          break;
      }
    } catch (error) {
      console.error('WebSocket command error:', error);
      socket.emit('command-error', {
        error: error.message
      });
    }
  }

  // Simulation Control Methods
  async createNewSimulation(simulationId, parameters = {}) {
    const defaultConfig = {
      worldSize: parameters.worldSize || 50,
      initialSpecies: parameters.initialSpecies || 5,
      steps: parameters.steps || 1000
    };

    // Use UnifiedSerinaService if available
    if (this.unifiedSerinaService) {
      try {
        const result = await this.unifiedSerinaService.startSimulation({
          simulationId,
          ...defaultConfig
        });
        return result;
      } catch (error) {
        console.error('Failed to create simulation via UnifiedSerinaService:', error);
      }
    }

    // Fallback to database only
    await database.createSimulation({
      id: simulationId,
      status: 'created',
      config: defaultConfig,
      created_at: new Date()
    });

    return { simulationId, config: defaultConfig };
  }

  async startSimulation(simulationId, parameters) {
    try {
      // If simulation doesn't exist, create it first
      let simulation;
      try {
        simulation = await database.getSimulation(simulationId);
      } catch (error) {
        // Simulation doesn't exist, create it
        await this.createNewSimulation(simulationId, parameters);
      }

      await database.updateSimulation(simulationId, {
        status: 'running'
      });

      this.broadcastToSimulation(simulationId, 'simulation-started', {
        simulationId,
        timestamp: new Date().toISOString()
      });

      console.log(`🚀 Simulation ${simulationId} started via WebSocket`);
    } catch (error) {
      console.error('Failed to start simulation:', error);
      throw error;
    }
  }

  async pauseSimulation(simulationId) {
    await database.updateSimulation(simulationId, {
      status: 'paused'
    });

    this.broadcastToSimulation(simulationId, 'simulation-paused', {
      simulationId,
      timestamp: new Date().toISOString()
    });
  }

  async stopSimulation(simulationId) {
    await database.updateSimulation(simulationId, {
      status: 'stopped'
    });

    this.broadcastToSimulation(simulationId, 'simulation-stopped', {
      simulationId,
      timestamp: new Date().toISOString()
    });
  }

  async updateSimulationConfig(simulationId, config) {
    const simulation = await database.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    const currentConfig = typeof simulation.config === 'string' 
      ? JSON.parse(simulation.config) 
      : simulation.config;

    const updatedConfig = { ...currentConfig, ...config };

    await database.query(
      'UPDATE simulations SET config = ? WHERE id = ?',
      [JSON.stringify(updatedConfig), simulationId]
    );

    this.broadcastToSimulation(simulationId, 'config-updated', {
      simulationId,
      config: updatedConfig,
      timestamp: new Date().toISOString()
    });
  }

  // Real-time Data Broadcasting
  async sendSimulationState(simulationId, clientId = null) {
    try {
      const simulation = await database.getSimulation(simulationId);
      const species = await database.getSpeciesBySimulation(simulationId);
      const stats = await database.getSimulationStats(simulationId);

      const state = {
        simulation,
        species,
        stats,
        timestamp: new Date().toISOString()
      };

      if (clientId) {
        // Send to specific client
        const client = this.clients.get(clientId);
        if (client) {
          client.socket.emit('simulation-state', state);
        }
      } else {
        // Broadcast to all subscribers
        this.broadcastToSimulation(simulationId, 'simulation-state', state);
      }
    } catch (error) {
      console.error('Error sending simulation state:', error);
    }
  }

  broadcastToSimulation(simulationId, event, data) {
    if (!this.isInitialized) return;

    this.io.to(`simulation-${simulationId}`).emit(event, data);
  }

  // Evolution Event Broadcasting
  broadcastEvolutionUpdate(simulationId, data) {
    this.broadcastToSimulation(simulationId, 'evolution-update', {
      simulationId,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  broadcastSpeciesUpdate(simulationId, speciesData) {
    this.broadcastToSimulation(simulationId, 'species-update', {
      simulationId,
      species: speciesData,
      timestamp: new Date().toISOString()
    });
  }

  broadcastPopulationUpdate(simulationId, populationData) {
    this.broadcastToSimulation(simulationId, 'population-update', {
      simulationId,
      population: populationData,
      timestamp: new Date().toISOString()
    });
  }

  broadcastMutationEvent(simulationId, mutationData) {
    this.broadcastToSimulation(simulationId, 'mutation-event', {
      simulationId,
      mutation: mutationData,
      timestamp: new Date().toISOString()
    });
  }

  broadcastEnvironmentChange(simulationId, environmentData) {
    this.broadcastToSimulation(simulationId, 'environment-change', {
      simulationId,
      environment: environmentData,
      timestamp: new Date().toISOString()
    });
  }

  // Performance Monitoring
  broadcastPerformanceMetrics(simulationId, metrics) {
    this.broadcastToSimulation(simulationId, 'performance-metrics', {
      simulationId,
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  // System-wide Broadcasting
  broadcastSystemUpdate(data) {
    if (!this.isInitialized) return;

    this.io.emit('system-update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Client Management
  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.socket.id,
      subscribedSimulations: Array.from(client.subscribedSimulations),
      connectedAt: client.connectedAt
    }));
  }

  getSimulationSubscribers(simulationId) {
    const channel = this.simulationChannels.get(simulationId);
    return channel ? Array.from(channel) : [];
  }

  // Cleanup
  cleanup() {
    if (this.evolutionEngine) {
      this.evolutionEngine.stop();
    }
    
    if (this.io) {
      this.io.close();
    }
    this.clients.clear();
    this.simulationChannels.clear();
    this.isInitialized = false;
    console.log('🧹 WebSocket service cleaned up');
  }

  setupEvolutionListeners() {
    if (!this.evolutionEngine) return;

    // Listen to evolution engine events and broadcast to clients
    this.evolutionEngine.on('update', (data) => {
      this.broadcastSystemUpdate({
        type: 'evolution-update',
        data: data
      });
    });

    this.evolutionEngine.on('reproduction', (data) => {
      this.broadcastSystemUpdate({
        type: 'reproduction-event',
        data: data
      });
    });

    this.evolutionEngine.on('deaths', (data) => {
      this.broadcastSystemUpdate({
        type: 'death-event',
        data: data
      });
    });

    this.evolutionEngine.on('started', () => {
      this.broadcastSystemUpdate({
        type: 'evolution-started',
        data: { timestamp: Date.now() }
      });
    });

    this.evolutionEngine.on('stopped', () => {
      this.broadcastSystemUpdate({
        type: 'evolution-stopped',
        data: { timestamp: Date.now() }
      });
    });

    this.evolutionEngine.on('reset', () => {
      this.broadcastSystemUpdate({
        type: 'evolution-reset',
        data: { timestamp: Date.now() }
      });
    });

    this.evolutionEngine.on('speedChanged', (speed) => {
      this.broadcastSystemUpdate({
        type: 'speed-changed',
        data: { speed, timestamp: Date.now() }
      });
    });
  }

  // Evolution Control Methods
  async startEvolution() {
    if (!this.evolutionEngine) {
      throw new Error('Evolution engine not initialized');
    }
    return await this.evolutionEngine.start();
  }

  async stopEvolution() {
    if (!this.evolutionEngine) {
      throw new Error('Evolution engine not initialized');
    }
    return this.evolutionEngine.stop();
  }

  async resetEvolution() {
    if (!this.evolutionEngine) {
      throw new Error('Evolution engine not initialized');
    }
    return await this.evolutionEngine.reset();
  }

  async getEvolutionData() {
    if (!this.evolutionEngine) {
      throw new Error('Evolution engine not initialized');
    }
    return await this.evolutionEngine.getSimulationData();
  }

  setEvolutionSpeed(speed) {
    if (!this.evolutionEngine) {
      throw new Error('Evolution engine not initialized');
    }
    return this.evolutionEngine.setSpeed(speed);
  }
}

module.exports = new WebSocketService();