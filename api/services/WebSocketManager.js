import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export class WebSocketManager {
  constructor(io, services) {
    this.io = io;
    this.services = services;
    this.connections = new Map();
    this.rooms = new Map();
    this.updateInterval = null;
    this.updateFrequency = 1000; // ms
    this.isRunning = false;
    
    // Event handlers
    this.eventHandlers = {
      'simulation:subscribe': this.handleSimulationSubscribe.bind(this),
      'simulation:unsubscribe': this.handleSimulationUnsubscribe.bind(this),
      'simulation:start': this.handleSimulationStart.bind(this),
      'simulation:stop': this.handleSimulationStop.bind(this),
      'simulation:step': this.handleSimulationStep.bind(this),
      'simulation:config': this.handleSimulationConfig.bind(this),
      'evolution:start': this.handleEvolutionStart.bind(this),
      'evolution:stop': this.handleEvolutionStop.bind(this),
      'evolution:speed': this.handleEvolutionSpeed.bind(this),
      'data:request': this.handleDataRequest.bind(this)
    };
  }

  initialize() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
    
    this.startRealtimeUpdates();
    this.isRunning = true;
    
    logger.info('WebSocket manager initialized');
  }

  handleConnection(socket) {
    const clientId = socket.id;
    const clientInfo = {
      id: clientId,
      connectedAt: new Date(),
      subscriptions: new Set(),
      lastActivity: new Date()
    };
    
    this.connections.set(clientId, clientInfo);
    
    logger.info(`Client connected: ${clientId} (Total: ${this.connections.size})`);
    
    // Set up event handlers
    Object.keys(this.eventHandlers).forEach(event => {
      socket.on(event, (data) => {
        this.updateLastActivity(clientId);
        this.eventHandlers[event](socket, data);
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(clientId);
    });
    
    // Send initial connection confirmation
    socket.emit('connected', {
      clientId: clientId,
      timestamp: new Date().toISOString(),
      availableEvents: Object.keys(this.eventHandlers)
    });
    
    // Send current system status
    this.sendSystemStatus(socket);
  }

  handleDisconnection(clientId) {
    const clientInfo = this.connections.get(clientId);
    
    if (clientInfo) {
      // Unsubscribe from all rooms
      clientInfo.subscriptions.forEach(roomId => {
        this.unsubscribeFromRoom(clientId, roomId);
      });
      
      this.connections.delete(clientId);
      logger.info(`Client disconnected: ${clientId} (Total: ${this.connections.size})`);
    }
  }

  updateLastActivity(clientId) {
    const clientInfo = this.connections.get(clientId);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
  }

  // Event Handlers
  async handleSimulationSubscribe(socket, data) {
    const { simulationId } = data;
    const clientId = socket.id;
    
    if (!simulationId) {
      socket.emit('error', { message: 'Simulation ID required' });
      return;
    }
    
    try {
      // Verify simulation exists
      const simulation = await this.services.database.getSimulation(simulationId);
      if (!simulation) {
        socket.emit('error', { message: 'Simulation not found' });
        return;
      }
      
      // Subscribe to simulation room
      const roomId = `simulation:${simulationId}`;
      socket.join(roomId);
      
      const clientInfo = this.connections.get(clientId);
      if (clientInfo) {
        clientInfo.subscriptions.add(roomId);
      }
      
      this.subscribeToRoom(clientId, roomId);
      
      // Send current simulation data
      const simulationData = await this.getSimulationData(simulationId);
      socket.emit('simulation:data', simulationData);
      
      socket.emit('simulation:subscribed', { simulationId, roomId });
      logger.info(`Client ${clientId} subscribed to simulation ${simulationId}`);
      
    } catch (error) {
      logger.error('Simulation subscription failed:', error);
      socket.emit('error', { message: 'Subscription failed' });
    }
  }

  handleSimulationUnsubscribe(socket, data) {
    const { simulationId } = data;
    const clientId = socket.id;
    const roomId = `simulation:${simulationId}`;
    
    socket.leave(roomId);
    this.unsubscribeFromRoom(clientId, roomId);
    
    socket.emit('simulation:unsubscribed', { simulationId });
    logger.info(`Client ${clientId} unsubscribed from simulation ${simulationId}`);
  }

  async handleSimulationStart(socket, data) {
    const { simulationId } = data;
    
    try {
      const success = await this.services.evolution.startContinuousEvolution(simulationId);
      
      if (success) {
        // Broadcast to all subscribers
        this.io.to(`simulation:${simulationId}`).emit('simulation:started', {
          simulationId,
          timestamp: new Date().toISOString()
        });
        
        socket.emit('simulation:start:success', { simulationId });
      } else {
        socket.emit('simulation:start:failed', { simulationId, reason: 'Already running' });
      }
      
    } catch (error) {
      logger.error('Failed to start simulation:', error);
      socket.emit('simulation:start:failed', { simulationId, reason: error.message });
    }
  }

  async handleSimulationStop(socket, data) {
    const { simulationId } = data;
    
    try {
      const success = await this.services.evolution.stopEvolution();
      
      if (success) {
        this.io.to(`simulation:${simulationId}`).emit('simulation:stopped', {
          simulationId,
          timestamp: new Date().toISOString()
        });
        
        socket.emit('simulation:stop:success', { simulationId });
      } else {
        socket.emit('simulation:stop:failed', { simulationId, reason: 'Not running' });
      }
      
    } catch (error) {
      logger.error('Failed to stop simulation:', error);
      socket.emit('simulation:stop:failed', { simulationId, reason: error.message });
    }
  }

  async handleSimulationStep(socket, data) {
    const { simulationId } = data;
    
    try {
      if (this.services.evolution.isRunning()) {
        socket.emit('simulation:step:failed', { reason: 'Cannot step while running' });
        return;
      }
      
      await this.services.evolution.executeEvolutionStep();
      
      // Get updated data
      const simulationData = await this.getSimulationData(simulationId);
      
      this.io.to(`simulation:${simulationId}`).emit('simulation:stepped', {
        simulationId,
        data: simulationData,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('simulation:step:success', { simulationId });
      
    } catch (error) {
      logger.error('Failed to step simulation:', error);
      socket.emit('simulation:step:failed', { simulationId, reason: error.message });
    }
  }

  handleSimulationConfig(socket, data) {
    const { simulationId, config } = data;
    
    try {
      if (config.evolutionSpeed) {
        this.services.evolution.setEvolutionSpeed(config.evolutionSpeed);
      }
      if (config.mutationRate !== undefined) {
        this.services.evolution.setMutationRate(config.mutationRate);
      }
      if (config.crossoverRate !== undefined) {
        this.services.evolution.setCrossoverRate(config.crossoverRate);
      }
      
      this.io.to(`simulation:${simulationId}`).emit('simulation:config:updated', {
        simulationId,
        config,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('simulation:config:success', { simulationId, config });
      
    } catch (error) {
      logger.error('Failed to update simulation config:', error);
      socket.emit('simulation:config:failed', { simulationId, reason: error.message });
    }
  }

  async handleEvolutionStart(socket, data) {
    await this.handleSimulationStart(socket, data);
  }

  async handleEvolutionStop(socket, data) {
    await this.handleSimulationStop(socket, data);
  }

  handleEvolutionSpeed(socket, data) {
    const { speed } = data;
    
    try {
      this.services.evolution.setEvolutionSpeed(speed);
      
      this.io.emit('evolution:speed:updated', {
        speed,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('evolution:speed:success', { speed });
      
    } catch (error) {
      logger.error('Failed to update evolution speed:', error);
      socket.emit('evolution:speed:failed', { reason: error.message });
    }
  }

  async handleDataRequest(socket, data) {
    const { type, simulationId, params } = data;
    
    try {
      let responseData;
      
      switch (type) {
        case 'simulation':
          responseData = await this.getSimulationData(simulationId);
          break;
        case 'species':
          responseData = await this.services.database.getSpecies(simulationId);
          break;
        case 'evolution_events':
          responseData = await this.services.database.getEvolutionEvents(simulationId, params?.limit || 100);
          break;
        case 'performance':
          responseData = await this.services.database.getPerformanceMetrics(simulationId, params?.limit || 100);
          break;
        case 'environment':
          responseData = await this.services.database.getEnvironmentConditions(simulationId);
          break;
        default:
          socket.emit('data:error', { message: 'Unknown data type' });
          return;
      }
      
      socket.emit('data:response', {
        type,
        simulationId,
        data: responseData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Data request failed:', error);
      socket.emit('data:error', { type, simulationId, error: error.message });
    }
  }

  // Room Management
  subscribeToRoom(clientId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId).add(clientId);
  }

  unsubscribeFromRoom(clientId, roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientId);
      
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  // Real-time Updates
  startRealtimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      await this.broadcastUpdates();
    }, this.updateFrequency);
    
    logger.info('Real-time updates started');
  }

  stopRealtimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    logger.info('Real-time updates stopped');
  }

  async broadcastUpdates() {
    try {
      // Get all active simulation rooms
      const simulationRooms = Array.from(this.rooms.keys()).filter(room => 
        room.startsWith('simulation:')
      );
      
      for (const roomId of simulationRooms) {
        const simulationId = roomId.split(':')[1];
        
        // Get updated simulation data
        const simulationData = await this.getSimulationData(simulationId);
        
        // Broadcast to room
        this.io.to(roomId).emit('simulation:update', {
          simulationId,
          data: simulationData,
          timestamp: new Date().toISOString()
        });
      }
      
      // Broadcast system performance
      await this.broadcastSystemPerformance();
      
    } catch (error) {
      logger.error('Failed to broadcast updates:', error);
    }
  }

  async broadcastSystemPerformance() {
    const systemStats = {
      connections: this.connections.size,
      rooms: this.rooms.size,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      evolutionStats: this.services.evolution.getStats(),
      timestamp: new Date().toISOString()
    };
    
    this.io.emit('system:performance', systemStats);
  }

  async sendSystemStatus(socket) {
    try {
      const simulations = await this.services.database.getSimulations();
      const evolutionRunning = this.services.evolution.isRunning();
      const currentSimulation = this.services.evolution.getCurrentSimulation();
      
      const status = {
        simulations: simulations.length,
        activeSimulations: simulations.filter(s => s.is_active).length,
        evolutionRunning,
        currentSimulation,
        evolutionStats: this.services.evolution.getStats(),
        timestamp: new Date().toISOString()
      };
      
      socket.emit('system:status', status);
      
    } catch (error) {
      logger.error('Failed to send system status:', error);
    }
  }

  async getSimulationData(simulationId) {
    try {
      const [simulation, species, environment, recentEvents, performance] = await Promise.all([
        this.services.database.getSimulation(simulationId),
        this.services.database.getSpecies(simulationId),
        this.services.database.getEnvironmentConditions(simulationId),
        this.services.database.getEvolutionEvents(simulationId, 10),
        this.services.database.getPerformanceMetrics(simulationId, 10)
      ]);
      
      return {
        simulation,
        species,
        environment,
        recentEvents,
        performance,
        isRunning: this.services.evolution.isRunning(),
        evolutionStats: this.services.evolution.getStats()
      };
      
    } catch (error) {
      logger.error('Failed to get simulation data:', error);
      throw error;
    }
  }

  // Public Methods
  getConnectionCount() {
    return this.connections.size;
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getConnections() {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      connectedAt: conn.connectedAt,
      lastActivity: conn.lastActivity,
      subscriptions: Array.from(conn.subscriptions)
    }));
  }

  setUpdateFrequency(frequency) {
    this.updateFrequency = Math.max(100, frequency);
    
    if (this.updateInterval) {
      this.stopRealtimeUpdates();
      this.startRealtimeUpdates();
    }
  }

  // Broadcast custom events
  broadcastToSimulation(simulationId, event, data) {
    this.io.to(`simulation:${simulationId}`).emit(event, {
      simulationId,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Cleanup
  async shutdown() {
    this.stopRealtimeUpdates();
    
    // Notify all clients
    this.io.emit('system:shutdown', {
      message: 'Server shutting down',
      timestamp: new Date().toISOString()
    });
    
    // Close all connections
    this.io.close();
    
    this.isRunning = false;
    logger.info('WebSocket manager shut down');
  }
}