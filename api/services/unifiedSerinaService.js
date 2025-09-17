/**
 * Service unifié pour la simulation Serina
 * Remplace à la fois simulation.js et serinaService.js par une approche cohérente
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const database = require('./database');
const { v4: uuidv4 } = require('uuid');

class UnifiedSerinaService {
  constructor() {
    this.simulations = new Map();
    this.cliExecutablePath = path.join(__dirname, '../../build/bin/Release/serina_cli.exe');
    this.maxBufferSize = 1000;
    this.wsServer = null;
  }

  setWebSocketServer(wsServer) {
    this.wsServer = wsServer;
  }

  async initialize() {
    console.log('🌍 Initializing Unified Serina Service...');
    
    // Vérifier que l'exécutable CLI existe
    await this.validateCliExecutable();
    
    console.log('✅ Unified Serina Service initialized');
  }

  async validateCliExecutable() {
    try {
      await fs.access(this.cliExecutablePath);
      console.log('✅ Serina CLI executable found:', this.cliExecutablePath);
    } catch (error) {
      console.warn('⚠️ CLI executable not found, checking alternative paths...');
      this.cliExecutablePath = this.findSerinaExecutable();
      if (!this.cliExecutablePath) {
        throw new Error('Serina CLI executable not found in any expected location');
      }
    }
  }

  findSerinaExecutable() {
    const possiblePaths = [
      path.join(__dirname, '../../build/bin/Release/serina_cli.exe'),
      path.join(__dirname, '../../build/bin/Debug/serina_cli.exe'),
      path.join(__dirname, '../../build/bin/serina_cli.exe'),
      path.join(__dirname, '../../build/src/Release/serina_cli.exe'),
      path.join(__dirname, '../../build/src/Debug/serina_cli.exe'),
      path.join(__dirname, '../../build/src/serina_cli.exe'),
      path.join(__dirname, '../../bin/serina_cli.exe'),
      path.join(__dirname, '../../serina_cli.exe'),
    ];
    
    for (const execPath of possiblePaths) {
      try {
        require('fs').accessSync(execPath);
        console.log(`📍 Found Serina CLI executable at: ${execPath}`);
        return execPath;
      } catch (error) {
        // Continue searching
      }
    }
    
    return null;
  }

  /**
   * Démarre une simulation Serina authentique
   */
  async startSimulation(options = {}) {
    const simulationId = options.simulationId || `serina-${Date.now()}`;
    
    console.log(`🌍 Starting Serina simulation ${simulationId}`);
    
    const simulationInstance = {
      id: simulationId,
      isRunning: false,
      startTime: new Date(),
      outputBuffer: [],
      cliProcess: null,
      dataInterval: null,
      lastData: null
    };

    this.simulations.set(simulationId, simulationInstance);

    try {
      // Initialiser la simulation
      const initData = await this.executeCliCommand('init');
      
      if (initData.status === 'success') {
        simulationInstance.isRunning = true;
        
        // Démarrer la collecte de données périodique
        simulationInstance.dataInterval = setInterval(() => {
          this.collectSimulationData(simulationInstance);
        }, 2000); // Toutes les 2 secondes
        
        console.log(`✅ Simulation ${simulationId} started successfully`);
        return { success: true, simulationId, data: initData };
      } else {
        throw new Error(`Initialization failed: ${initData.error}`);
      }
    } catch (error) {
      console.error(`❌ Failed to start simulation ${simulationId}:`, error);
      this.simulations.delete(simulationId);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exécute une commande CLI et retourne le résultat JSON
   */
  async executeCliCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.cliExecutablePath, [command, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        // Log verbose output but don't treat as error
        const stderrOutput = data.toString();
        if (stderrOutput.includes('ERROR') || stderrOutput.includes('FATAL')) {
          error += stderrOutput;
        } else {
          // Just log verbose messages for debugging
          console.log(`[CLI Verbose]: ${stderrOutput.trim()}`);
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            // Find the JSON block at the end of the output
            // Look for the pattern that starts with { and includes "action": "initialize"
            const jsonPattern = /\{\s*"action":\s*"[^"]+",[\s\S]*?\}/;
            const jsonMatch = output.match(jsonPattern);
            
            if (jsonMatch) {
              try {
                const jsonData = JSON.parse(jsonMatch[0]);
                resolve(jsonData);
                return;
              } catch (parseError) {
                // Failed to parse, try fallback
              }
            }
            
            // Fallback: try to find any valid JSON object
            const allJsonMatches = output.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (allJsonMatches && allJsonMatches.length > 0) {
              for (let i = allJsonMatches.length - 1; i >= 0; i--) {
                try {
                  const jsonData = JSON.parse(allJsonMatches[i]);
                  resolve(jsonData);
                  return;
                } catch (e) {
                  continue;
                }
              }
            }
            
            reject(new Error(`No valid JSON found in CLI output: ${output}`));
          } catch (parseError) {
            reject(new Error(`Failed to parse CLI output: ${parseError.message}\nOutput: ${output}`));
          }
        } else {
          reject(new Error(`CLI command failed with code ${code}: ${error || 'Unknown error'}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to execute CLI command: ${err.message}`));
      });
    });
  }

  /**
   * Collecte les données de simulation périodiquement
   */
  async collectSimulationData(simulationInstance) {
    if (!simulationInstance.isRunning) return;

    try {
      const [statusData, worldData, geneticsData] = await Promise.all([
        this.executeCliCommand('status'),
        this.executeCliCommand('world'),
        this.executeCliCommand('genetics')
      ]);

      const combinedData = {
        timestamp: Date.now(),
        simulation: statusData,
        world: worldData,
        genetics: geneticsData
      };

      // Ajouter au buffer
      simulationInstance.outputBuffer.push(combinedData);
      if (simulationInstance.outputBuffer.length > this.maxBufferSize) {
        simulationInstance.outputBuffer.shift();
      }

      simulationInstance.lastData = combinedData;

      // Diffuser via WebSocket si disponible
      if (this.wsServer) {
        this.wsServer.broadcastToRoom(`simulation-${simulationInstance.id}`, {
          type: 'simulation_data',
          data: combinedData
        });
      }

    } catch (error) {
      console.error(`Error collecting data for simulation ${simulationInstance.id}:`, error);
    }
  }

  /**
   * Obtient les données d'une simulation
   */
  getSimulationData(simulationId) {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      return { error: 'Simulation not found' };
    }

    return {
      success: true,
      simulation: {
        id: simulationId,
        isRunning: simulation.isRunning,
        startTime: simulation.startTime,
        lastData: simulation.lastData,
        bufferSize: simulation.outputBuffer.length
      },
      data: simulation.lastData
    };
  }

  /**
   * Liste toutes les simulations actives
   */
  listSimulations() {
    const simulations = Array.from(this.simulations.entries()).map(([id, sim]) => ({
      id,
      isRunning: sim.isRunning,
      startTime: sim.startTime,
      hasData: !!sim.lastData
    }));

    return { success: true, simulations };
  }

  /**
   * Arrête une simulation
   */
  async stopSimulation(simulationId) {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      return { success: false, error: 'Simulation not found' };
    }

    simulation.isRunning = false;
    
    if (simulation.dataInterval) {
      clearInterval(simulation.dataInterval);
    }

    if (simulation.cliProcess) {
      simulation.cliProcess.kill();
    }

    this.simulations.delete(simulationId);
    
    console.log(`🛑 Simulation ${simulationId} stopped`);
    return { success: true };
  }

  /**
   * Cleanup method
   */
  async cleanup() {
    console.log('🧹 Cleaning up Unified Serina Service...');
    
    for (const [id, simulation] of this.simulations) {
      await this.stopSimulation(id);
    }
    
    console.log('✅ Cleanup completed');
  }
}

module.exports = UnifiedSerinaService;