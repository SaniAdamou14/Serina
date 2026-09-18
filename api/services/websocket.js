const database = require('./database');

class WebSocketService {
  constructor() {
    this.io = null;
    this.clients = new Map();
    this.simulationChannels = new Map();
    this.simulationEngine = null;
    this.isInitialized = false;
  }

  setSimulationEngine(simulationEngine) {
    this.simulationEngine = simulationEngine;

    // Diffuse chaque tick réel du moteur (voir simulationEngine.js) aux
    // clients abonnés à cette simulation.
    simulationEngine.on('data', ({ simulationId, data }) => {
      this.broadcastToSimulation(simulationId, 'simulation-data', data);
    });
    simulationEngine.on('started', ({ simulationId }) => {
      this.broadcastToSimulation(simulationId, 'simulation-started', { simulationId, timestamp: new Date().toISOString() });
    });
    simulationEngine.on('paused', ({ simulationId }) => {
      this.broadcastToSimulation(simulationId, 'simulation-paused', { simulationId, timestamp: new Date().toISOString() });
    });
    simulationEngine.on('resumed', ({ simulationId }) => {
      this.broadcastToSimulation(simulationId, 'simulation-started', { simulationId, timestamp: new Date().toISOString() });
    });
    simulationEngine.on('stopped', ({ simulationId }) => {
      this.broadcastToSimulation(simulationId, 'simulation-stopped', { simulationId, timestamp: new Date().toISOString() });
    });

    console.log('✅ WebSocket service linked to SimulationEngine');
  }

  initialize(socketServer) {
    this.io = socketServer;
    this.isInitialized = true;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.handleClientConnection(socket);
    });

    console.log('✅ WebSocket service initialized');
  }

  handleClientConnection(socket) {
    this.clients.set(socket.id, {
      socket,
      subscribedSimulations: new Set(),
      connectedAt: new Date()
    });

    socket.on('subscribe-simulation', (simulationId) => {
      this.subscribeToSimulation(socket, simulationId);
    });

    socket.on('unsubscribe-simulation', (simulationId) => {
      this.unsubscribeFromSimulation(socket, simulationId);
    });

    socket.on('simulation-command', async (data) => {
      await this.handleSimulationCommand(socket, data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      this.handleClientDisconnection(socket);
    });

    socket.emit('connected', {
      message: 'Connected to Serina Evolution Server',
      serverId: socket.id,
      timestamp: new Date().toISOString()
    });
  }

  subscribeToSimulation(socket, simulationId) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    client.subscribedSimulations.add(simulationId);

    if (!this.simulationChannels.has(simulationId)) {
      this.simulationChannels.set(simulationId, new Set());
    }
    this.simulationChannels.get(simulationId).add(socket.id);

    socket.join(`simulation-${simulationId}`);

    console.log(`📡 Client ${socket.id} subscribed to simulation ${simulationId}`);

    this.sendSimulationState(simulationId, socket.id);
  }

  unsubscribeFromSimulation(socket, simulationId) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    client.subscribedSimulations.delete(simulationId);

    const channel = this.simulationChannels.get(simulationId);
    if (channel) {
      channel.delete(socket.id);
      if (channel.size === 0) {
        this.simulationChannels.delete(simulationId);
      }
    }

    socket.leave(`simulation-${simulationId}`);

    console.log(`📡 Client ${socket.id} unsubscribed from simulation ${simulationId}`);
  }

  handleClientDisconnection(socket) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    for (const simulationId of client.subscribedSimulations) {
      const channel = this.simulationChannels.get(simulationId);
      if (channel) {
        channel.delete(socket.id);
        if (channel.size === 0) {
          this.simulationChannels.delete(simulationId);
        }
      }
    }

    this.clients.delete(socket.id);
  }

  async handleSimulationCommand(socket, data) {
    if (!this.simulationEngine) {
      socket.emit('command-error', { error: 'Simulation engine not initialized' });
      return;
    }

    try {
      const { command, simulationId, parameters } = data;

      switch (command) {
        case 'START':
        case 'start-simulation': {
          const result = await this.simulationEngine.startSimulation({ simulationId, ...parameters });
          if (!result.success) socket.emit('command-error', { error: result.error });
          break;
        }
        case 'PAUSE':
        case 'pause-simulation': {
          const result = this.simulationEngine.pauseSimulation(simulationId);
          if (!result.success) socket.emit('command-error', { error: result.error });
          break;
        }
        case 'RESUME':
        case 'resume-simulation': {
          const result = this.simulationEngine.resumeSimulation(simulationId);
          if (!result.success) socket.emit('command-error', { error: result.error });
          break;
        }
        case 'RESET':
        case 'STOP':
        case 'stop-simulation': {
          const result = await this.simulationEngine.stopSimulation(simulationId);
          if (!result.success) socket.emit('command-error', { error: result.error });
          break;
        }
        default:
          console.log('Unknown simulation command:', command);
          socket.emit('command-error', { error: `Unknown command: ${command}` });
      }
    } catch (error) {
      console.error('WebSocket command error:', error);
      socket.emit('command-error', { error: error.message });
    }
  }

  async sendSimulationState(simulationId, clientId = null) {
    try {
      let state;
      if (this.simulationEngine) {
        state = this.simulationEngine.getSimulationData(simulationId);
      } else {
        state = { success: false, error: 'Simulation engine not initialized' };
      }
      state.timestamp = new Date().toISOString();

      if (clientId) {
        const client = this.clients.get(clientId);
        if (client) client.socket.emit('simulation-state', state);
      } else {
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

  broadcastSystemUpdate(data) {
    if (!this.isInitialized) return;
    this.io.emit('system-update', { ...data, timestamp: new Date().toISOString() });
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.socket.id,
      subscribedSimulations: Array.from(client.subscribedSimulations),
      connectedAt: client.connectedAt
    }));
  }

  getSimulationSubscribers(simulationId) {
    const channel = this.simulationChannels.get(simulationId);
    return channel ? Array.from(channel) : [];
  }

  cleanup() {
    if (this.io) {
      this.io.close();
    }
    this.clients.clear();
    this.simulationChannels.clear();
    this.isInitialized = false;
    console.log('🧹 WebSocket service cleaned up');
  }
}

module.exports = new WebSocketService();
