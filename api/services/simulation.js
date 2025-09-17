const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const database = require('./database');

class SimulationService {
  constructor() {
    this.simulationProcess = null;
    this.isRunning = false;
    this.cppExecutablePath = path.join(__dirname, '../../cpp/build/serina_simulation');
    this.configPath = path.join(__dirname, '../../cpp/config.json');
    this.outputBuffer = [];
    this.maxBufferSize = 1000;
  }

  async initialize() {
    try {
      console.log('🔬 Initializing Simulation Service...');
      
      // Vérifier que l'exécutable C++ existe
      await this.validateCppExecutable();
      
      // Créer le fichier de configuration par défaut si nécessaire
      await this.ensureConfigFile();
      
      console.log('✅ Simulation Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Simulation Service:', error);
      throw error;
    }
  }

  async validateCppExecutable() {
    try {
      await fs.access(this.cppExecutablePath);
      console.log('✅ C++ executable found:', this.cppExecutablePath);
    } catch (error) {
      console.warn('⚠️ C++ executable not found, creating mock implementation');
      this.cppExecutablePath = null; // Use mock mode
    }
  }

  async ensureConfigFile() {
    try {
      await fs.access(this.configPath);
      console.log('✅ Config file found:', this.configPath);
    } catch (error) {
      // Créer un fichier de configuration par défaut
      const defaultConfig = {
        simulation: {
          population_size: 150,
          environment_size: { width: 1920, height: 1080 },
          time_step: 0.016667, // 60 FPS
          max_generations: 1000,
          mutation_rate: 0.1,
          crossover_rate: 0.7
        },
        environment: {
          food_sources: 50,
          temperature: 20.0,
          humidity: 0.6,
          oxygen_level: 0.21,
          radiation_level: 0.0
        },
        genetics: {
          trait_count: 12,
          gene_pool_diversity: 0.8,
          inheritance_variance: 0.15,
          phenotype_expression_strength: 0.9
        },
        performance: {
          enable_multithreading: true,
          thread_count: 4,
          enable_simd: true,
          memory_pool_size: "64MB"
        }
      };

      await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Created default config file:', this.configPath);
    }
  }

  async startSimulation(config = null) {
    if (this.isRunning) {
      throw new Error('Simulation is already running');
    }

    try {
      console.log('🚀 Starting simulation...');

      // Mettre à jour la configuration si fournie
      if (config) {
        await this.updateConfig(config);
      }

      if (this.cppExecutablePath) {
        await this.startCppSimulation();
      } else {
        await this.startMockSimulation();
      }

      this.isRunning = true;
      console.log('✅ Simulation started successfully');

      return {
        success: true,
        message: 'Simulation started',
        mode: this.cppExecutablePath ? 'cpp' : 'mock'
      };

    } catch (error) {
      console.error('❌ Failed to start simulation:', error);
      throw error;
    }
  }

  async startCppSimulation() {
    return new Promise((resolve, reject) => {
      const args = ['--config', this.configPath, '--realtime'];
      
      this.simulationProcess = spawn(this.cppExecutablePath, args, {
        cwd: path.dirname(this.cppExecutablePath),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.simulationProcess.stdout.on('data', (data) => {
        this.handleSimulationOutput(data.toString());
      });

      this.simulationProcess.stderr.on('data', (data) => {
        console.error('Simulation stderr:', data.toString());
      });

      this.simulationProcess.on('error', (error) => {
        console.error('Simulation process error:', error);
        this.isRunning = false;
        reject(error);
      });

      this.simulationProcess.on('exit', (code, signal) => {
        console.log(`Simulation process exited with code ${code}, signal ${signal}`);
        this.isRunning = false;
      });

      // Attendre un peu pour vérifier que le processus démarre correctement
      setTimeout(() => {
        if (this.simulationProcess && !this.simulationProcess.killed) {
          resolve();
        } else {
          reject(new Error('Simulation process failed to start'));
        }
      }, 1000);
    });
  }

  async startMockSimulation() {
    console.log('🎭 Starting mock simulation (C++ executable not available)');
    
    // Simulation en mode mock avec des données générées
    this.mockSimulationInterval = setInterval(() => {
      this.generateMockData();
    }, 1000); // Générer des données toutes les secondes

    return Promise.resolve();
  }

  generateMockData() {
    const mockData = {
      timestamp: Date.now(),
      generation: Math.floor(Date.now() / 10000) % 1000,
      population_count: 150 + Math.floor(Math.random() * 20 - 10),
      species_count: 5 + Math.floor(Math.random() * 3),
      average_fitness: 0.5 + Math.random() * 0.3,
      environment: {
        temperature: 20 + Math.random() * 10,
        humidity: 0.6 + Math.random() * 0.2,
        food_availability: 0.7 + Math.random() * 0.3
      },
      events: []
    };

    // Générer des événements aléatoires
    if (Math.random() < 0.3) {
      mockData.events.push({
        type: 'reproduction',
        individual_id: Math.floor(Math.random() * 1000),
        offspring_count: Math.floor(Math.random() * 5) + 1
      });
    }

    if (Math.random() < 0.1) {
      mockData.events.push({
        type: 'mutation',
        individual_id: Math.floor(Math.random() * 1000),
        trait_affected: ['size', 'speed', 'intelligence', 'endurance'][Math.floor(Math.random() * 4)]
      });
    }

    this.handleSimulationOutput(JSON.stringify(mockData));
  }

  handleSimulationOutput(output) {
    try {
      // Ajouter au buffer
      this.outputBuffer.push({
        timestamp: Date.now(),
        data: output.trim()
      });

      // Limiter la taille du buffer
      if (this.outputBuffer.length > this.maxBufferSize) {
        this.outputBuffer = this.outputBuffer.slice(-this.maxBufferSize);
      }

      // Essayer de parser comme JSON (données de simulation)
      try {
        const data = JSON.parse(output);
        this.processSimulationData(data);
      } catch (parseError) {
        // Si ce n'est pas du JSON, c'est probablement un message de log
        console.log('Simulation log:', output);
      }

    } catch (error) {
      console.error('Error handling simulation output:', error);
    }
  }

  async processSimulationData(data) {
    try {
      // Sauvegarder les données dans la base de données
      if (data.generation !== undefined) {
        await database.updateSimulation(1, {
          current_generation: data.generation,
          population_count: data.population_count,
          species_count: data.species_count,
          last_update: new Date()
        });
      }

      // Traiter les événements
      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          await this.processSimulationEvent(event, data);
        }
      }

      // Émettre les données via les événements (pour WebSocket)
      if (this.onDataReceived) {
        this.onDataReceived(data);
      }

    } catch (error) {
      console.error('Error processing simulation data:', error);
    }
  }

  async processSimulationEvent(event, simulationData) {
    try {
      switch (event.type) {
        case 'reproduction':
          await this.handleReproductionEvent(event, simulationData);
          break;
        case 'mutation':
          await this.handleMutationEvent(event, simulationData);
          break;
        case 'death':
          await this.handleDeathEvent(event, simulationData);
          break;
        case 'environment_change':
          await this.handleEnvironmentChange(event, simulationData);
          break;
        default:
          console.log('Unknown event type:', event.type);
      }
    } catch (error) {
      console.error('Error processing simulation event:', error);
    }
  }

  async handleReproductionEvent(event, data) {
    // Enregistrer l'événement de reproduction
    await database.query(`
      INSERT INTO evolution_events (simulation_id, event_type, event_data, generation, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [1, 'reproduction', JSON.stringify(event), data.generation, new Date()]);
  }

  async handleMutationEvent(event, data) {
    // Enregistrer l'événement de mutation
    await database.query(`
      INSERT INTO evolution_events (simulation_id, event_type, event_data, generation, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [1, 'mutation', JSON.stringify(event), data.generation, new Date()]);
  }

  async handleDeathEvent(event, data) {
    // Marquer l'individu comme mort
    if (event.individual_id) {
      await database.query(`
        UPDATE individuals SET is_alive = FALSE, death_generation = ?, death_timestamp = ?
        WHERE id = ?
      `, [data.generation, new Date(), event.individual_id]);
    }
  }

  async handleEnvironmentChange(event, data) {
    // Enregistrer le changement environnemental
    await database.query(`
      INSERT INTO environment_history (simulation_id, temperature, humidity, food_availability, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [1, data.environment.temperature, data.environment.humidity, data.environment.food_availability, new Date()]);
  }

  async stopSimulation() {
    if (!this.isRunning) {
      throw new Error('No simulation is currently running');
    }

    try {
      console.log('🛑 Stopping simulation...');

      if (this.simulationProcess) {
        this.simulationProcess.kill('SIGTERM');
        this.simulationProcess = null;
      }

      if (this.mockSimulationInterval) {
        clearInterval(this.mockSimulationInterval);
        this.mockSimulationInterval = null;
      }

      this.isRunning = false;
      console.log('✅ Simulation stopped successfully');

      return {
        success: true,
        message: 'Simulation stopped'
      };

    } catch (error) {
      console.error('❌ Failed to stop simulation:', error);
      throw error;
    }
  }

  async pauseSimulation() {
    if (!this.isRunning) {
      throw new Error('No simulation is currently running');
    }

    try {
      if (this.simulationProcess) {
        this.simulationProcess.kill('SIGUSR1'); // Signal pour pause
      }

      console.log('⏸️ Simulation paused');
      return { success: true, message: 'Simulation paused' };

    } catch (error) {
      console.error('❌ Failed to pause simulation:', error);
      throw error;
    }
  }

  async resumeSimulation() {
    if (!this.isRunning) {
      throw new Error('No simulation is currently running');
    }

    try {
      if (this.simulationProcess) {
        this.simulationProcess.kill('SIGUSR2'); // Signal pour reprendre
      }

      console.log('▶️ Simulation resumed');
      return { success: true, message: 'Simulation resumed' };

    } catch (error) {
      console.error('❌ Failed to resume simulation:', error);
      throw error;
    }
  }

  async updateConfig(newConfig) {
    try {
      // Lire la configuration actuelle
      const currentConfigData = await fs.readFile(this.configPath, 'utf8');
      const currentConfig = JSON.parse(currentConfigData);

      // Fusionner avec la nouvelle configuration
      const updatedConfig = { ...currentConfig, ...newConfig };

      // Écrire la nouvelle configuration
      await fs.writeFile(this.configPath, JSON.stringify(updatedConfig, null, 2));

      console.log('✅ Configuration updated');
      return updatedConfig;

    } catch (error) {
      console.error('❌ Failed to update config:', error);
      throw error;
    }
  }

  async getConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('❌ Failed to read config:', error);
      throw error;
    }
  }

  getSimulationStatus() {
    return {
      isRunning: this.isRunning,
      mode: this.cppExecutablePath ? 'cpp' : 'mock',
      processId: this.simulationProcess ? this.simulationProcess.pid : null,
      outputBufferSize: this.outputBuffer.length
    };
  }

  getRecentOutput(count = 10) {
    return this.outputBuffer.slice(-count);
  }

  // Méthode pour définir un callback de données
  onDataReceived(callback) {
    this.onDataReceived = callback;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Simulation Service...');
    
    if (this.isRunning) {
      await this.stopSimulation();
    }

    this.outputBuffer = [];
    console.log('✅ Simulation Service cleanup complete');
  }
}

module.exports = SimulationService;