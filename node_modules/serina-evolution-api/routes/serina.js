/**
 * Routes pour la simulation Serina authentique
 */

const express = require('express');
const router = express.Router();

// Le service sera injecté lors de l'initialisation
let serinaService = null;

// Injection du service
function setSerinaService(service) {
  serinaService = service;
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
    if (!serinaService) {
      return res.status(500).json({ 
        error: 'Serina service not initialized' 
      });
    }

    const simulationId = 'serina-' + Date.now();
    const result = await serinaService.startSerinaSimulation(simulationId);
    
    console.log(`🌍 Serina simulation started: ${simulationId} (mode: ${result.mode})`);
    
    res.json({
      success: true,
      simulationId,
      mode: result.mode,
      message: result.mode === 'cpp' 
        ? 'Simulation C++ Serina authentique démarrée'
        : 'Simulation Serina en mode hors ligne démarrée',
      executable: result.executable || null
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
    if (!serinaService) {
      return res.status(500).json({ 
        error: 'Serina service not initialized' 
      });
    }

    const { simulationId } = req.params;
    const result = await serinaService.stopSimulation(simulationId);
    
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
    if (!serinaService) {
      return res.status(500).json({ 
        error: 'Serina service not initialized' 
      });
    }

    const { simulationId } = req.params;
    const data = serinaService.getSimulationData(simulationId);
    
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
    if (!serinaService) {
      return res.status(500).json({ 
        error: 'Serina service not initialized' 
      });
    }

    const simulations = serinaService.getAllSimulations();
    
    res.json({
      simulations,
      count: simulations.length
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
    if (!serinaService) {
      return res.status(500).json({ 
        error: 'Serina service not initialized' 
      });
    }

    const { simulationId } = req.params;
    const simulationData = serinaService.getSimulationData(simulationId);
    
    if (!simulationData.latestData) {
      return res.status(204).json({ 
        message: 'No data available yet' 
      });
    }
    
    res.json(simulationData.latestData);
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
    if (!serinaService) {
      return res.status(500).json({ 
        error: 'Serina service not initialized' 
      });
    }

    const executablePath = serinaService.findSerinaExecutable();
    
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

module.exports = { router, setSerinaService };