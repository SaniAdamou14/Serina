/**
 * Moteur de simulation Serina : pont unique vers l'exécutable C++ réel
 * (serina_cli). C'est désormais le seul moteur de simulation du backend —
 * il n'y a plus de moteur JS de repli qui invente des données. Si
 * l'exécutable C++ n'est pas construit ou échoue, les appelants reçoivent
 * une erreur claire plutôt qu'un jeu de données fictif.
 *
 * Chaque simulation vit sous l'identifiant numérique de sa ligne dans la
 * table `simulations` (voir database.js) : c'est le même identifiant qui
 * nomme le fichier d'état persistant du CLI, qui sert de clé de
 * regroupement WebSocket ("simulation-<id>") et de clé étrangère pour
 * l'historique en base.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const database = require('./database');

const STEPS_PER_TICK = 1;
const POLL_INTERVAL_MS = 3000;
const STATE_DIR = path.join(__dirname, '..', '..', '.serina-state');

class SimulationEngine extends EventEmitter {
  constructor() {
    super();
    this.simulations = new Map();
    this.cliExecutablePath = null;
  }

  async initialize() {
    this.cliExecutablePath = this.findSerinaExecutable();
    if (!this.cliExecutablePath) {
      console.warn('⚠️ serina_cli executable not found. Build the C++ project first:');
      console.warn('   cmake -S . -B build -DBUILD_TESTS=ON && cmake --build build');
      console.warn('   The simulation engine will report an error until it is available.');
    } else {
      console.log('✅ Serina CLI executable found:', this.cliExecutablePath);
    }

    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
  }

  isAvailable() {
    return !!this.cliExecutablePath;
  }

  findSerinaExecutable() {
    const possiblePaths = [
      path.join(__dirname, '../../build/bin/serina_cli.exe'),
      path.join(__dirname, '../../build/bin/Release/serina_cli.exe'),
      path.join(__dirname, '../../build/bin/Debug/serina_cli.exe'),
      path.join(__dirname, '../../build/src/Release/serina_cli.exe'),
      path.join(__dirname, '../../build/src/Debug/serina_cli.exe'),
      path.join(__dirname, '../../build/src/serina_cli.exe'),
      path.join(__dirname, '../../bin/serina_cli.exe'),
      path.join(__dirname, '../../serina_cli.exe'),
      // Unix / macOS build outputs
      path.join(__dirname, '../../build/bin/serina_cli'),
      path.join(__dirname, '../../build/src/serina_cli'),
      path.join(__dirname, '../../bin/serina_cli'),
      path.join(__dirname, '../../serina_cli'),
    ];

    for (const execPath of possiblePaths) {
      if (fs.existsSync(execPath)) {
        return execPath;
      }
    }
    return null;
  }

  stateFilePath(simulationId) {
    return path.join(STATE_DIR, `${simulationId}.json`);
  }

  /**
   * Exécute une commande serina_cli et retourne son JSON. Chaque appel est
   * un nouveau processus indépendant ; l'état réel persiste entre les
   * appels via --state-file (voir Phase 2 du moteur C++).
   */
  executeCliCommand(simulationId, command, args = []) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error(
        'Serina C++ engine not built. Run "cmake --build build" (see README) before starting a simulation.'
      ));
    }

    const stateFile = this.stateFilePath(simulationId);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.cliExecutablePath, ['--state-file', stateFile, command, ...args], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errOutput = '';
      proc.stdout.on('data', (chunk) => { output += chunk.toString(); });
      proc.stderr.on('data', (chunk) => { errOutput += chunk.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`serina_cli ${command} exited with code ${code}: ${errOutput || output}`.trim()));
          return;
        }
        try {
          resolve(JSON.parse(output.trim()));
        } catch (parseError) {
          reject(new Error(`serina_cli ${command} did not return valid JSON (${parseError.message}): ${output}`));
        }
      });

      proc.on('error', (err) => reject(new Error(`Failed to spawn serina_cli: ${err.message}`)));
    });
  }

  /**
   * Démarre une nouvelle simulation : crée son enregistrement en base
   * (source de l'identifiant), initialise l'état C++, puis lance le
   * polling périodique qui fait réellement avancer la simulation.
   */
  async startSimulation(options = {}) {
    let simulationId = options.simulationId;

    if (!simulationId && database.isConnected()) {
      simulationId = await database.createSimulation({
        name: options.name || 'Serina Simulation',
        worldSize: options.worldSize,
        initialSpecies: options.initialSpecies
      });
    } else if (!simulationId) {
      // Pas de base disponible : identifiant local, pas d'historique persistant.
      simulationId = `local-${Date.now()}`;
    }

    if (this.simulations.has(simulationId)) {
      return { success: false, error: `Simulation ${simulationId} already running` };
    }

    const initResult = await this.executeCliCommand(simulationId, 'init');
    if (initResult.status !== 'success') {
      throw new Error(initResult.error || 'serina_cli init failed');
    }

    const instance = {
      id: simulationId,
      startTime: new Date(),
      isRunning: true,
      interval: null,
      lastData: null
    };
    this.simulations.set(simulationId, instance);

    if (database.isConnected()) {
      await database.updateSimulation(simulationId, { status: 'running' }).catch(() => {});
    }

    instance.interval = setInterval(() => {
      this.tick(simulationId).catch((err) => {
        console.error(`Simulation ${simulationId} tick failed:`, err.message);
      });
    }, POLL_INTERVAL_MS);

    // Premier tick immédiat pour peupler lastData sans attendre l'intervalle.
    await this.tick(simulationId);

    this.emit('started', { simulationId });
    return { success: true, simulationId, data: initResult };
  }

  /**
   * Avance la simulation de STEPS_PER_TICK générations réelles et rapporte
   * l'état réel qui en résulte (pas de données inventées).
   */
  async tick(simulationId) {
    const instance = this.simulations.get(simulationId);
    if (!instance || !instance.isRunning) return null;

    await this.executeCliCommand(simulationId, 'run', [String(STEPS_PER_TICK)]);
    const [status, world, genetics] = await Promise.all([
      this.executeCliCommand(simulationId, 'status'),
      this.executeCliCommand(simulationId, 'world'),
      this.executeCliCommand(simulationId, 'genetics')
    ]);

    const data = { timestamp: Date.now(), status, world, genetics };
    instance.lastData = data;

    this.persistSnapshot(simulationId, status).catch((err) => {
      console.warn(`Failed to persist snapshot for simulation ${simulationId}:`, err.message);
    });

    this.emit('data', { simulationId, data });
    return data;
  }

  /**
   * Écrit l'état réel courant en base pour permettre les graphiques de
   * tendance / historique (routes /api/simulations/:id/history, /trends).
   * Ne persiste rien si la base n'est pas connectée ou si le statut CLI
   * n'est pas exploitable.
   */
  async persistSnapshot(simulationId, statusResult) {
    if (!database.isConnected() || !statusResult || statusResult.status !== 'success') return;

    const { ecosystem, species } = statusResult;
    const averageFitness = species && species.length
      ? species.reduce((sum, sp) => sum + (sp.fitness || 0), 0) / species.length
      : 0;

    await database.updateSimulation(simulationId, {
      generation: ecosystem.generation,
      population_count: ecosystem.total_population,
      species_count: ecosystem.total_species
    });

    await database.saveEvolutionSnapshot(simulationId, ecosystem.generation, {
      populationCount: ecosystem.total_population,
      speciesCount: ecosystem.total_species,
      averageFitness,
      geneticDiversity: ecosystem.biodiversity_index,
      mutationsCount: 0,
      reproductionsCount: 0,
      environment: {}
    });

    if (Array.isArray(species)) {
      for (const sp of species) {
        await database.saveSpecies(simulationId, {
          name: sp.name,
          populationCount: sp.population,
          generationSpan: ecosystem.generation,
          extinctionRisk: sp.extinctionRisk,
          ecologicalNiche: 'generalist',
          averageTrait: {},
          fitnessAverage: sp.fitness
        });
      }
    }
  }

  pauseSimulation(simulationId) {
    const instance = this.simulations.get(simulationId);
    if (!instance) return { success: false, error: `Simulation ${simulationId} not found` };

    instance.isRunning = false;
    if (instance.interval) clearInterval(instance.interval);
    instance.interval = null;

    if (database.isConnected()) {
      database.updateSimulation(simulationId, { status: 'paused' }).catch(() => {});
    }

    this.emit('paused', { simulationId });
    return { success: true };
  }

  resumeSimulation(simulationId) {
    const instance = this.simulations.get(simulationId);
    if (!instance) return { success: false, error: `Simulation ${simulationId} not found` };
    if (instance.isRunning) return { success: true };

    instance.isRunning = true;
    instance.interval = setInterval(() => {
      this.tick(simulationId).catch((err) => {
        console.error(`Simulation ${simulationId} tick failed:`, err.message);
      });
    }, POLL_INTERVAL_MS);

    if (database.isConnected()) {
      database.updateSimulation(simulationId, { status: 'running' }).catch(() => {});
    }

    this.emit('resumed', { simulationId });
    return { success: true };
  }

  async stopSimulation(simulationId) {
    const instance = this.simulations.get(simulationId);
    if (!instance) {
      return { success: false, error: `Simulation ${simulationId} not found` };
    }

    if (instance.interval) clearInterval(instance.interval);
    this.simulations.delete(simulationId);

    if (database.isConnected()) {
      await database.updateSimulation(simulationId, { status: 'stopped' }).catch(() => {});
    }

    this.emit('stopped', { simulationId });
    return { success: true };
  }

  getSimulationData(simulationId) {
    const instance = this.simulations.get(simulationId);
    if (!instance) {
      return { success: false, error: `Simulation ${simulationId} not found`, latestData: null };
    }

    return {
      success: true,
      id: simulationId,
      isRunning: instance.isRunning,
      startTime: instance.startTime,
      latestData: instance.lastData
    };
  }

  listSimulations() {
    return {
      success: true,
      simulations: Array.from(this.simulations.values()).map((s) => ({
        id: s.id,
        isRunning: s.isRunning,
        startTime: s.startTime,
        hasData: !!s.lastData
      }))
    };
  }

  async cleanup() {
    for (const id of Array.from(this.simulations.keys())) {
      await this.stopSimulation(id);
    }
  }
}

module.exports = SimulationEngine;
