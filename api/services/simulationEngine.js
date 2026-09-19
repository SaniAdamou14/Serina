/**
 * Moteur de simulation Serina : pont vers serina_daemon, le vrai backend
 * live (Phase 9 -- voir docs/SERINA_DAEMON_PROTOCOL.md). Contrairement à
 * l'ancien pont (un process serina_cli relancé à chaque commande, état
 * rechargé depuis un fichier JSON), le daemon garde un UnifiedWorldSimulator
 * réel en mémoire et avance de lui-même en arrière-plan ; ce module ne fait
 * qu'ouvrir une connexion persistante et interroger l'état courant pour le
 * diffuser -- il ne fait plus avancer la simulation lui-même.
 *
 * Chaque simulation vit sous l'identifiant numérique de sa ligne dans la
 * table `simulations` (voir database.js) : c'est le même identifiant qui
 * sert de clé côté daemon, de clé de regroupement WebSocket
 * ("simulation-<id>") et de clé étrangère pour l'historique en base.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const database = require('./database');
const DaemonClient = require('./daemonClient');

const DAEMON_PORT = 7331;
const POLL_INTERVAL_MS = 500;
const DEFAULT_TICKS_PER_SECOND = 4;
const CONNECT_RETRIES = 20;
const CONNECT_RETRY_DELAY_MS = 250;

class SimulationEngine extends EventEmitter {
  constructor() {
    super();
    this.simulations = new Map();
    this.daemonExecutablePath = null;
    this.daemonProcess = null;
    this.client = null;
  }

  async initialize() {
    this.daemonExecutablePath = this.findSerinaExecutable();

    this.client = new DaemonClient('127.0.0.1', DAEMON_PORT);
    // Toujours posé avant toute tentative de connexion : une erreur après
    // une connexion déjà établie (daemon qui plante, coupure réseau) doit
    // être loguée, pas planter tout le process Node faute de listener.
    this.client.on('error', (err) => {
      console.error('serina_daemon connection error:', err.message);
    });

    const alreadyRunning = await this.client.connect().then(() => true).catch(() => false);

    if (!alreadyRunning) {
      if (!this.daemonExecutablePath) {
        console.warn('⚠️ serina_daemon executable not found. Build the C++ project first:');
        console.warn('   cmake -S . -B build -DBUILD_TESTS=ON && cmake --build build --target serina_daemon');
        console.warn('   The simulation engine will report an error until it is available.');
        this.client = null;
        return;
      }

      this.spawnDaemon();
      await this.connectWithRetry();
    }

    console.log(`✅ Connected to serina_daemon on 127.0.0.1:${DAEMON_PORT}${alreadyRunning ? ' (already running)' : ''}`);
  }

  isAvailable() {
    return !!this.client && this.client.connected;
  }

  /** Conservé pour compat avec routes/serina.js (`check-executable`). */
  findSerinaExecutable() {
    const possiblePaths = [
      path.join(__dirname, '../../build/bin/serina_daemon.exe'),
      path.join(__dirname, '../../build/bin/Release/serina_daemon.exe'),
      path.join(__dirname, '../../build/bin/Debug/serina_daemon.exe'),
      path.join(__dirname, '../../build/src/Release/serina_daemon.exe'),
      path.join(__dirname, '../../build/src/Debug/serina_daemon.exe'),
      path.join(__dirname, '../../build/src/serina_daemon.exe'),
      path.join(__dirname, '../../bin/serina_daemon.exe'),
      path.join(__dirname, '../../serina_daemon.exe'),
      // Unix / macOS build outputs
      path.join(__dirname, '../../build/bin/serina_daemon'),
      path.join(__dirname, '../../build/src/serina_daemon'),
      path.join(__dirname, '../../bin/serina_daemon'),
      path.join(__dirname, '../../serina_daemon'),
    ];

    for (const execPath of possiblePaths) {
      if (fs.existsSync(execPath)) {
        return execPath;
      }
    }
    return null;
  }

  spawnDaemon() {
    this.daemonProcess = spawn(this.daemonExecutablePath, ['--port', String(DAEMON_PORT)], {
      stdio: ['ignore', 'ignore', 'pipe']
    });
    this.daemonProcess.stderr.on('data', (chunk) => {
      console.log(`[serina_daemon] ${chunk.toString().trim()}`);
    });
    this.daemonProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`serina_daemon exited with code ${code}`);
      }
    });
  }

  async connectWithRetry() {
    for (let attempt = 0; attempt < CONNECT_RETRIES; attempt++) {
      try {
        await this.client.connect();
        return;
      } catch (err) {
        await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
      }
    }
    throw new Error('Could not connect to serina_daemon after spawning it');
  }

  /**
   * Démarre une nouvelle simulation : crée son enregistrement en base
   * (source de l'identifiant), crée le UnifiedWorldSimulator réel côté
   * daemon, le met en lecture ("play"), puis démarre le sondage périodique
   * qui diffuse son état réel -- le daemon avance la simulation seul,
   * indépendamment de ce sondage.
   */
  async startSimulation(options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Serina daemon not available. Run "cmake --build build --target serina_daemon" (see README).');
    }

    let simulationId = options.simulationId;

    if (!simulationId && database.isConnected()) {
      simulationId = await database.createSimulation({
        name: options.name || 'Serina Simulation',
        worldSize: options.worldSize,
        initialSpecies: options.initialSpecies
      });
    } else if (!simulationId) {
      simulationId = `local-${Date.now()}`;
    }
    simulationId = String(simulationId);

    if (this.simulations.has(simulationId)) {
      return { success: false, error: `Simulation ${simulationId} already running` };
    }

    const founderCount = options.initialSpecies || 40;
    const createResult = await this.client.send('create', simulationId, { founderCount });
    if (createResult.status !== 'success') {
      throw new Error(createResult.error || 'serina_daemon create failed');
    }

    await this.client.send('play', simulationId, { ticksPerSecond: DEFAULT_TICKS_PER_SECOND });

    const instance = {
      id: simulationId,
      startTime: new Date(),
      isRunning: true,
      pollInterval: null,
      lastData: null
    };
    this.simulations.set(simulationId, instance);

    if (database.isConnected()) {
      await database.updateSimulation(simulationId, { status: 'running' }).catch(() => {});
    }

    instance.pollInterval = setInterval(() => {
      this.pull(simulationId).catch((err) => {
        console.error(`Simulation ${simulationId} poll failed:`, err.message);
      });
    }, POLL_INTERVAL_MS);

    await this.pull(simulationId);

    this.emit('started', { simulationId });
    return { success: true, simulationId, data: createResult };
  }

  /**
   * Interroge l'état réel courant du daemon et le diffuse. Ne fait jamais
   * avancer la simulation elle-même -- c'est le fil planificateur du daemon
   * qui s'en charge en continu tant qu'elle est en lecture.
   */
  async pull(simulationId) {
    const instance = this.simulations.get(simulationId);
    if (!instance) return null;

    const [status, regions, individuals, lineages] = await Promise.all([
      this.client.send('status', simulationId),
      this.client.send('regions', simulationId),
      this.client.send('individuals', simulationId),
      this.client.send('lineages', simulationId)
    ]);

    const data = { timestamp: Date.now(), status, regions, individuals, lineages };
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
   */
  async persistSnapshot(simulationId, statusResult) {
    if (!database.isConnected() || !statusResult || statusResult.status !== 'success') return;

    const lineages = statusResult.lineages || [];
    const averageFitness = lineages.length
      ? lineages.reduce((sum, l) => sum + (l.averageFitness || 0), 0) / lineages.length
      : 0;
    const averageDiversity = lineages.length
      ? lineages.reduce((sum, l) => sum + (l.geneticDiversity || 0), 0) / lineages.length
      : 0;

    await database.updateSimulation(simulationId, {
      generation: statusResult.generation,
      population_count: statusResult.population,
      species_count: statusResult.speciesCount
    });

    await database.saveEvolutionSnapshot(simulationId, statusResult.generation, {
      populationCount: statusResult.population,
      speciesCount: statusResult.speciesCount,
      averageFitness,
      geneticDiversity: averageDiversity,
      mutationsCount: 0,
      reproductionsCount: 0,
      environment: {}
    });

    for (const lineage of lineages) {
      await database.saveSpecies(simulationId, {
        name: lineage.speciesName,
        populationCount: lineage.population,
        generationSpan: statusResult.generation,
        // UnifiedWorldSimulator does not model extinction risk yet (an
        // honest gap, not a placeholder value pretending to be real).
        extinctionRisk: 0,
        ecologicalNiche: 'generalist',
        averageTrait: {},
        fitnessAverage: lineage.averageFitness
      });
    }
  }

  pauseSimulation(simulationId) {
    const instance = this.simulations.get(simulationId);
    if (!instance) return { success: false, error: `Simulation ${simulationId} not found` };

    instance.isRunning = false;
    this.client.send('pause', simulationId).catch((err) => {
      console.error(`Failed to pause simulation ${simulationId}:`, err.message);
    });

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
    this.client.send('play', simulationId, { ticksPerSecond: DEFAULT_TICKS_PER_SECOND }).catch((err) => {
      console.error(`Failed to resume simulation ${simulationId}:`, err.message);
    });

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

    if (instance.pollInterval) clearInterval(instance.pollInterval);
    this.simulations.delete(simulationId);

    if (this.isAvailable()) {
      await this.client.send('destroy', simulationId).catch(() => {});
    }

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
    if (this.client) this.client.close();
    if (this.daemonProcess) this.daemonProcess.kill();
  }
}

module.exports = SimulationEngine;
