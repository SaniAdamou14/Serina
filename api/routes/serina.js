/**
 * Routes pour la simulation Serina authentique
 */

const express = require('express');
const router = express.Router();

// Le moteur de simulation sera injecté lors de l'initialisation de server.js
let simulationEngine = null;

function setSimulationEngine(engine) {
  simulationEngine = engine;
}

/**
 * @swagger
 * /api/serina/start:
 *   post:
 *     summary: Démarre une simulation Serina authentique
 *     tags: [Serina]
 *     responses:
 *       200:
 *         description: Simulation démarrée avec succès
 *       500:
 *         description: Erreur lors du démarrage
 */
router.post('/start', async (req, res) => {
  try {
    if (!simulationEngine) {
      return res.status(500).json({ error: 'Simulation engine not initialized' });
    }
    if (!simulationEngine.isAvailable()) {
      return res.status(503).json({
        error: 'Serina C++ engine not built',
        details: 'Run "cmake --build build" (see README) then restart the API server.'
      });
    }

    const result = await simulationEngine.startSimulation({
      simulationId: req.body.simulationId,
      name: req.body.name,
      worldSize: req.body.worldSize,
      initialSpecies: req.body.initialSpecies,
      seed: req.body.seed,
      ticksPerSecond: req.body.ticksPerSecond
    });

    if (result.success) {
      console.log(`🌍 Serina simulation started: ${result.simulationId}`);
    }

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      simulationId: result.simulationId,
      message: result.success
        ? 'Simulation Serina démarrée'
        : 'Échec du démarrage de simulation',
      data: result.data || null,
      error: result.error || null
    });
  } catch (error) {
    console.error('❌ Error starting Serina simulation:', error);
    res.status(500).json({
      error: 'Failed to start Serina simulation',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/serina/pause/{simulationId}:
 *   post:
 *     summary: Met en pause une simulation Serina (l'état est conservé)
 *     tags: [Serina]
 */
router.post('/pause/:simulationId', async (req, res) => {
  if (!simulationEngine) {
    return res.status(500).json({ error: 'Simulation engine not initialized' });
  }
  const result = simulationEngine.pauseSimulation(req.params.simulationId);
  res.status(result.success ? 200 : 404).json(result);
});

/**
 * @swagger
 * /api/serina/resume/{simulationId}:
 *   post:
 *     summary: Reprend une simulation Serina mise en pause
 *     tags: [Serina]
 */
router.post('/resume/:simulationId', async (req, res) => {
  if (!simulationEngine) {
    return res.status(500).json({ error: 'Simulation engine not initialized' });
  }
  const result = simulationEngine.resumeSimulation(req.params.simulationId);
  res.status(result.success ? 200 : 404).json(result);
});

/**
 * @swagger
 * /api/serina/speed/{simulationId}:
 *   post:
 *     summary: Change le rythme réel d'avancement (ticks/seconde) d'une simulation
 *     tags: [Serina]
 */
router.post('/speed/:simulationId', async (req, res) => {
  if (!simulationEngine) {
    return res.status(500).json({ error: 'Simulation engine not initialized' });
  }
  const result = simulationEngine.setSpeed(req.params.simulationId, req.body.ticksPerSecond);
  res.status(result.success ? 200 : 404).json(result);
});

/**
 * @swagger
 * /api/serina/stop/{simulationId}:
 *   post:
 *     summary: Arrête une simulation Serina
 *     tags: [Serina]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Simulation arrêtée
 *       404:
 *         description: Simulation non trouvée
 */
router.post('/stop/:simulationId', async (req, res) => {
  try {
    if (!simulationEngine) {
      return res.status(500).json({ 
        error: 'Simulation engine not initialized' 
      });
    }

    const { simulationId } = req.params;
    const result = await simulationEngine.stopSimulation(simulationId);
    
    console.log(`🛑 Serina simulation stopped: ${simulationId}`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error stopping Serina simulation:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ 
        error: 'Simulation not found',
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to stop simulation',
        details: error.message 
      });
    }
  }
});

/**
 * @swagger
 * /api/serina/status/{simulationId}:
 *   get:
 *     summary: Obtient le statut d'une simulation Serina
 *     tags: [Serina]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statut de la simulation
 *       404:
 *         description: Simulation non trouvée
 */
router.get('/status/:simulationId', async (req, res) => {
  try {
    if (!simulationEngine) {
      return res.status(500).json({ 
        error: 'Simulation engine not initialized' 
      });
    }

    const { simulationId } = req.params;
    const data = simulationEngine.getSimulationData(simulationId);
    
    res.json(data);
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ 
        error: 'Simulation not found',
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get simulation status',
        details: error.message 
      });
    }
  }
});

/**
 * @swagger
 * /api/serina/list:
 *   get:
 *     summary: Liste toutes les simulations Serina actives
 *     tags: [Serina]
 *     responses:
 *       200:
 *         description: Liste des simulations
 */
router.get('/list', async (req, res) => {
  try {
    if (!simulationEngine) {
      return res.status(500).json({ 
        error: 'Simulation engine not initialized' 
      });
    }

    const result = simulationEngine.listSimulations();
    
    res.json({
      success: result.success,
      simulations: result.simulations || [],
      count: result.simulations ? result.simulations.length : 0
    });
  } catch (error) {
    console.error('❌ Error listing simulations:', error);
    res.status(500).json({ 
      error: 'Failed to list simulations',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/serina/data/{simulationId}:
 *   get:
 *     summary: Obtient les dernières données d'une simulation
 *     tags: [Serina]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Données de simulation
 */
router.get('/data/:simulationId', async (req, res) => {
  try {
    if (!simulationEngine) {
      return res.status(500).json({ 
        error: 'Simulation engine not initialized' 
      });
    }

    const { simulationId } = req.params;
    const simulationData = simulationEngine.getSimulationData(simulationId);
    
    if (!simulationData.latestData) {
      return res.status(200).json({ 
        success: false,
        message: 'No data available yet',
        data: null
      });
    }
    
    res.json({
      success: true,
      data: simulationData.latestData
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ 
        error: 'Simulation not found',
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get simulation data',
        details: error.message 
      });
    }
  }
});

/**
 * @swagger
 * /api/serina/check-executable:
 *   get:
 *     summary: Vérifie si l'exécutable C++ Serina est disponible
 *     tags: [Serina]
 *     responses:
 *       200:
 *         description: Statut de l'exécutable
 */
router.get('/check-executable', async (req, res) => {
  try {
    if (!simulationEngine) {
      return res.status(500).json({ 
        error: 'Simulation engine not initialized' 
      });
    }

    const executablePath = simulationEngine.findSerinaExecutable();
    
    res.json({
      available: !!executablePath,
      path: executablePath,
      message: executablePath 
        ? 'Exécutable C++ Serina trouvé et prêt'
        : 'Exécutable C++ Serina non trouvé - utilisez cmake pour compiler'
    });
  } catch (error) {
    console.error('❌ Error checking executable:', error);
    res.status(500).json({ 
      error: 'Failed to check executable',
      details: error.message 
    });
  }
});

module.exports = { router, setSimulationEngine };