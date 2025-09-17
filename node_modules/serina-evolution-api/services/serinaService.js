/**
 * Service pour interfacer avec la simulation C++ Serina authentique
 * Remplace les données mockées par des données réelles de votre écosystème
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SerinaSimulationService {
  constructor() {
    this.simulations = new Map();
    this.maxBufferSize = 1000;
    this.wsServer = null;
  }

  setWebSocketServer(wsServer) {
    this.wsServer = wsServer;
  }

  /**
   * Démarre une simulation Serina authentique en utilisant votre C++
   */
  async startSerinaSimulation(simulationId) {
    console.log(`🌍 Starting authentic Serina ecosystem simulation ${simulationId}`);
    
    const simulationInstance = {
      id: simulationId,
      isRunning: false,
      isRealSimulation: false,
      startTime: new Date(),
      outputBuffer: [],
      serinaProcess: null,
      offlineInterval: null,
      offlineData: null
    };

    this.simulations.set(simulationId, simulationInstance);

    // Rechercher l'exécutable Serina C++
    const serinaExecutablePath = this.findSerinaExecutable();
    
    if (!serinaExecutablePath) {
      console.warn('⚠️ Serina C++ executable not found, using offline mode');
      this.startOfflineMode(simulationInstance);
      return { success: true, mode: 'offline' };
    }
    
    // Lancer la vraie simulation C++
    try {
      simulationInstance.serinaProcess = this.spawnSerinaProcess(serinaExecutablePath, simulationInstance);
      simulationInstance.isRealSimulation = true;
      simulationInstance.isRunning = true;
      
      console.log(`✅ Serina C++ simulation launched successfully`);
      return { success: true, mode: 'cpp', executable: serinaExecutablePath };
    } catch (error) {
      console.error('❌ Failed to launch Serina C++ simulation:', error);
      this.startOfflineMode(simulationInstance);
      return { success: true, mode: 'offline', error: error.message };
    }
  }

  /**
   * Recherche l'exécutable Serina C++ compilé
   */
  findSerinaExecutable() {
    // Emplacements possibles pour l'exécutable Serina CLI compilé
    const possiblePaths = [
      path.join(__dirname, '../../build/bin/serina_cli.exe'),
      path.join(__dirname, '../../build/bin/Release/serina_cli.exe'),
      path.join(__dirname, '../../build/bin/Debug/serina_cli.exe'),
      path.join(__dirname, '../../build/src/serina_cli.exe'),
      path.join(__dirname, '../../build/src/Release/serina_cli.exe'),
      path.join(__dirname, '../../build/src/Debug/serina_cli.exe'),
      path.join(__dirname, '../../bin/serina_cli.exe'),
      path.join(__dirname, '../../serina_cli.exe'),
      // Unix versions
      path.join(__dirname, '../../build/bin/serina_cli'),
      path.join(__dirname, '../../build/src/serina_cli'),
      path.join(__dirname, '../../bin/serina_cli'),
      path.join(__dirname, '../../serina_cli')
    ];
    
    for (const execPath of possiblePaths) {
      if (fs.existsSync(execPath)) {
        console.log(`📍 Found Serina CLI executable at: ${execPath}`);
        return execPath;
      }
    }
    
    console.warn('🔍 Serina CLI executable not found in expected locations');
    console.warn('💡 To compile your C++ project, run:');
    console.warn('   mkdir build && cd build');
    console.warn('   cmake .. && cmake --build . --config Release');
    return null;
  }

  /**
   * Lance le processus C++ Serina avec les bons paramètres
   */
  spawnSerinaProcess(executablePath, simulationInstance) {
    // Initialize simulation first
    console.log('🔧 Initializing Serina simulation...');
    const initProcess = spawn(executablePath, ['init', '100', '5', '1000'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    initProcess.stdout.on('data', (data) => {
      try {
        const initResult = JSON.parse(data.toString().trim());
        if (initResult.status === 'success') {
          console.log('✅ Serina simulation initialized successfully');
          // Start simulation steps
          this.runSimulationSteps(executablePath, simulationInstance);
        } else {
          console.error('❌ Failed to initialize simulation:', initResult.error);
          this.startOfflineMode(simulationInstance);
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse initialization output:', error.message);
        this.startOfflineMode(simulationInstance);
      }
    });
    
    initProcess.on('error', (error) => {
      console.error('❌ Serina initialization error:', error);
      this.startOfflineMode(simulationInstance);
    });
  }

  /**
   * Run simulation steps and collect data
   */
  runSimulationSteps(executablePath, simulationInstance) {
    // Get initial status
    this.getSerinaData(executablePath, 'status', (data) => {
      this.handleSerinaOutput(data, simulationInstance);
    });

    // Set up periodic data collection
    simulationInstance.dataCollectionInterval = setInterval(() => {
      if (simulationInstance.isRunning) {
        // Collect different types of data periodically
        this.getSerinaData(executablePath, 'status', (data) => {
          this.handleSerinaOutput(data, simulationInstance);
        });
        
        this.getSerinaData(executablePath, 'world', (data) => {
          this.handleSerinaOutput(data, simulationInstance);
        });
        
        this.getSerinaData(executablePath, 'genetics', (data) => {
          this.handleSerinaOutput(data, simulationInstance);
        });
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Get data from Serina CLI
   */
  getSerinaData(executablePath, command, callback) {
    const process = spawn(executablePath, [command], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          callback(result);
        } catch (error) {
          console.warn('⚠️ Failed to parse Serina output:', error.message);
        }
      } else {
        console.warn(`⚠️ Serina command '${command}' failed with code ${code}`);
      }
    });
    
    process.on('error', (error) => {
      console.error(`❌ Error running Serina command '${command}':`, error);
    });
  }

  /**
   * Traite les données authentiques de Serina et les formate pour l'interface web
   */
  handleSerinaOutput(simulationData, simulationInstance) {
    const formattedData = this.formatSerinaData(simulationData);
    
    // Stocker dans le buffer de simulation
    simulationInstance.outputBuffer.push({
      timestamp: Date.now(),
      data: JSON.stringify(formattedData)
    });
    
    // Limiter la taille du buffer
    if (simulationInstance.outputBuffer.length > this.maxBufferSize) {
      simulationInstance.outputBuffer.shift();
    }
    
    // Émettre aux clients connectés
    this.emitDataToClients(simulationInstance.id, formattedData);
  }

  /**
   * Transforme les données C++ Serina vers le format de l'interface web
   */
  formatSerinaData(rawData) {
    return {
      timestamp: Date.now(),
      populationCount: rawData.totalPopulation || rawData.populationCount || 0,
      generation: rawData.generation || 0,
      worldState: {
        generation: rawData.generation || 0,
        totalPopulation: rawData.totalPopulation || rawData.populationCount || 0,
        species: this.formatSpeciesData(rawData.species || []),
        environment: this.formatEnvironmentData(rawData.environment || {}),
        worldSize: rawData.worldSize || { width: 2000, height: 1500 },
        terrainMap: rawData.terrainMap || [],
        climateMap: rawData.climateMap || [],
        resourceMap: rawData.resourceMap || [],
        time: this.formatTimeData(rawData.time || {})
      },
      species: this.formatSpeciesData(rawData.species || []),
      evolutionStats: this.formatEvolutionStats(rawData.evolutionStats || {}),
      performance: this.formatPerformanceData(rawData.performance || {}),
      events: rawData.events || []
    };
  }

  /**
   * Formate les données d'espèces de C++ vers l'interface web
   */
  formatSpeciesData(speciesArray) {
    if (!Array.isArray(speciesArray)) return [];
    
    return speciesArray.map(species => ({
      id: species.id || species.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
      name: species.name || 'Espèce inconnue',
      scientificName: species.scientificName || species.name || 'Species unknown',
      populationCount: species.populationCount || 0,
      generationSpan: species.generationSpan || 1,
      extinctionRisk: species.extinctionRisk || 0,
      ecologicalNiche: species.ecologicalNiche || 'Généraliste',
      averageTrait: this.formatTraitData(species.averageTrait || {}),
      individuals: species.individuals || []
    }));
  }

  /**
   * Map les traits C++ vers le format de l'interface web
   */
  formatTraitData(traits) {
    return {
      SIZE: traits.size || traits.SIZE || 0.5,
      SPEED: traits.speed || traits.SPEED || 0.5,
      STRENGTH: traits.strength || traits.STRENGTH || 0.5,
      INTELLIGENCE: traits.intelligence || traits.INTELLIGENCE || 0.5,
      LONGEVITY: traits.longevity || traits.LONGEVITY || 0.5,
      RESISTANCE: traits.resistance || traits.RESISTANCE || 0.5,
      METABOLISM: traits.metabolism || traits.energyEfficiency || traits.METABOLISM || 0.5,
      SOCIABILITY: traits.socialBehavior || traits.SOCIABILITY || 0.5,
      ADAPTABILITY: traits.adaptability || traits.ADAPTABILITY || 0.5,
      VISION_RANGE: traits.visionRange || traits.VISION_RANGE || 0.5,
      CAMOUFLAGE: traits.camouflage || traits.CAMOUFLAGE || 0.5,
      REPRODUCTION_RATE: traits.reproductionRate || traits.fertility || traits.REPRODUCTION_RATE || 0.5
    };
  }

  /**
   * Formate les données environnementales
   */
  formatEnvironmentData(environment) {
    return {
      temperature: environment.temperature || 20.0,
      humidity: environment.humidity || 0.6,
      precipitation: environment.precipitation || 0.5,
      resourceAbundance: environment.resourceAbundance || 0.7,
      predationPressure: environment.predationPressure || 0.3,
      diseaseLoad: environment.diseaseLoad || 0.1,
      seasonalModifier: environment.seasonalModifier || 0.5,
      dayNightCycle: environment.dayNightCycle || 0.5
    };
  }

  /**
   * Formate les données temporelles
   */
  formatTimeData(time) {
    return {
      elapsed: time.elapsed || time.currentTime || 0,
      generation: time.generation || 0,
      dayNightCycle: time.dayNightCycle || (time.getDayProgress ? time.getDayProgress() : 0.5),
      season: time.season || this.getSeasonName(time.currentSeason) || 'Printemps'
    };
  }

  /**
   * Formate les statistiques évolutionnaires
   */
  formatEvolutionStats(stats) {
    return {
      totalMutations: stats.totalMutations || 0,
      totalReproductions: stats.totalReproductions || 0,
      averageFitness: stats.averageFitness || 0.5,
      geneticDiversity: stats.geneticDiversity || 0.5,
      speciesCount: stats.speciesCount || 0,
      extinctionRate: stats.extinctionRate || 0
    };
  }

  /**
   * Formate les données de performance
   */
  formatPerformanceData(performance) {
    return {
      generationsPerSecond: performance.generationsPerSecond || 1.0,
      memoryUsage: performance.memoryUsage || 0,
      cpuUsage: performance.cpuUsage || 0,
      frameRate: performance.frameRate || 30.0
    };
  }

  /**
   * Obtient le nom de saison
   */
  getSeasonName(seasonIndex) {
    const seasons = ['Printemps', 'Été', 'Automne', 'Hiver'];
    return seasons[seasonIndex % 4] || 'Printemps';
  }

  /**
   * Mode hors ligne quand l'exécutable C++ n'est pas disponible
   */
  startOfflineMode(simulationInstance) {
    console.log(`📴 Starting Serina simulation in offline mode (no C++ executable)`);
    
    simulationInstance.isRunning = true;
    simulationInstance.offlineData = this.createMinimalSerinaData();
    
    simulationInstance.offlineInterval = setInterval(() => {
      this.updateOfflineData(simulationInstance);
    }, 3000); // Mise à jour toutes les 3 secondes
  }

  /**
   * Crée des données Serina minimales pour le mode hors ligne
   */
  createMinimalSerinaData() {
    return {
      generation: 1,
      totalPopulation: 2187,
      ecosystemAge: 0,
      species: [
        {
          id: 'canaria_serina',
          name: 'Canaris de Serina',
          scientificName: 'Serinus seriensis',
          populationCount: 456,
          ecologicalNiche: 'Insectivore aérien',
          generationSpan: 12,
          extinctionRisk: 0.05,
          averageTrait: {
            SIZE: 0.4, SPEED: 0.8, INTELLIGENCE: 0.7, SOCIABILITY: 0.6,
            VISION_RANGE: 0.9, REPRODUCTION_RATE: 0.6, RESISTANCE: 0.7,
            METABOLISM: 0.6, ADAPTABILITY: 0.75, CAMOUFLAGE: 0.3
          }
        },
        {
          id: 'grillons_prairies',
          name: 'Grillons des prairies',
          scientificName: 'Gryllus seriensis',
          populationCount: 1203,
          ecologicalNiche: 'Herbivore terrestre',
          generationSpan: 6,
          extinctionRisk: 0.02,
          averageTrait: {
            SIZE: 0.2, SPEED: 0.5, INTELLIGENCE: 0.3, SOCIABILITY: 0.4,
            CAMOUFLAGE: 0.7, REPRODUCTION_RATE: 0.8, RESISTANCE: 0.6,
            METABOLISM: 0.7, ADAPTABILITY: 0.6, VISION_RANGE: 0.4
          }
        },
        {
          id: 'fourmis_colonisatrices',
          name: 'Fourmis colonisatrices',
          scientificName: 'Solenopsis adaptans',
          populationCount: 528,
          ecologicalNiche: 'Omnivore social',
          generationSpan: 18,
          extinctionRisk: 0.01,
          averageTrait: {
            SIZE: 0.1, SPEED: 0.6, INTELLIGENCE: 0.8, SOCIABILITY: 0.9,
            STRENGTH: 0.7, REPRODUCTION_RATE: 0.9, RESISTANCE: 0.8,
            METABOLISM: 0.5, ADAPTABILITY: 0.85, VISION_RANGE: 0.5
          }
        }
      ],
      environment: {
        temperature: 18.5,
        humidity: 0.72,
        precipitation: 0.68,
        resourceAbundance: 0.75,
        predationPressure: 0.25,
        diseaseLoad: 0.08,
        seasonalModifier: 0.6,
        dayNightCycle: 0.4
      }
    };
  }

  /**
   * Met à jour les données hors ligne avec évolution lente
   */
  updateOfflineData(simulationInstance) {
    const data = simulationInstance.offlineData;
    
    // Simuler une évolution lente
    data.generation += 1;
    data.ecosystemAge += 0.1;
    
    // Mettre à jour les populations avec de petites variations
    data.species.forEach(species => {
      const change = (Math.random() - 0.5) * 0.05; // ±2.5%
      species.populationCount = Math.max(10, 
        Math.floor(species.populationCount * (1 + change)));
        
      // Petites mutations de traits
      Object.keys(species.averageTrait).forEach(trait => {
        const mutation = (Math.random() - 0.5) * 0.01; // ±0.5%
        species.averageTrait[trait] = Math.max(0, Math.min(1, 
          species.averageTrait[trait] + mutation));
      });
    });
    
    data.totalPopulation = data.species.reduce((sum, sp) => sum + sp.populationCount, 0);
    
    // Petits changements environnementaux
    data.environment.temperature += (Math.random() - 0.5) * 0.1;
    data.environment.humidity += (Math.random() - 0.5) * 0.005;
    data.environment.precipitation += (Math.random() - 0.5) * 0.01;
    
    // Formater et émettre
    const formattedData = this.formatSerinaData(data);
    this.handleSerinaOutput(formattedData, simulationInstance);
  }

  /**
   * Émet les données vers les clients WebSocket
   */
  emitDataToClients(simulationId, data) {
    if (this.wsServer) {
      this.wsServer.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'simulation_data',
            simulationId,
            data
          }));
        }
      });
    }
  }

  /**
   * Arrête une simulation
   */
  async stopSimulation(simulationId) {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      throw new Error(`Simulation ${simulationId} not found`);
    }

    console.log(`🛑 Stopping Serina simulation ${simulationId}...`);

    if (simulation.serinaProcess) {
      simulation.serinaProcess.kill();
    }
    
    if (simulation.offlineInterval) {
      clearInterval(simulation.offlineInterval);
    }
    
    if (simulation.dataCollectionInterval) {
      clearInterval(simulation.dataCollectionInterval);
    }

    simulation.isRunning = false;
    this.simulations.delete(simulationId);

    console.log(`✅ Serina simulation ${simulationId} stopped`);
    return { success: true, message: `Simulation ${simulationId} stopped` };
  }

  /**
   * Obtient les données d'une simulation
   */
  getSimulationData(simulationId) {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      throw new Error(`Simulation ${simulationId} not found`);
    }

    const latestData = simulation.outputBuffer.length > 0 
      ? JSON.parse(simulation.outputBuffer[simulation.outputBuffer.length - 1].data)
      : null;

    return {
      id: simulationId,
      isRunning: simulation.isRunning,
      isRealSimulation: simulation.isRealSimulation,
      startTime: simulation.startTime,
      bufferSize: simulation.outputBuffer.length,
      latestData
    };
  }

  /**
   * Liste toutes les simulations
   */
  getAllSimulations() {
    return Array.from(this.simulations.entries()).map(([id, sim]) => ({
      id,
      isRunning: sim.isRunning,
      isRealSimulation: sim.isRealSimulation,
      startTime: sim.startTime,
      bufferSize: sim.outputBuffer.length
    }));
  }
}

module.exports = { SerinaSimulationService };