const express = require('express');
const router = express.Router();
const SimulationService = require('../services/simulation');

// Singleton instance shared across routes if needed
let simService = null;
function ensureService() {
  if (!simService) {
    simService = new SimulationService();
  }
  return simService;
}

/**
 * @swagger
 * /api/simulation/start:
 *   post:
 *     summary: Start a new simulation engine (C++/Python/Mock)
 *     tags: [Simulation Control]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [auto, cpp, python, mock]
 *                 default: auto
 *                 description: Simulation engine to use
 *               simulationId:
 *                 type: string
 *                 description: Optional custom simulation ID (UUID generated if not provided)
 *               config:
 *                 type: object
 *                 description: Engine-specific configuration
 *     responses:
 *       200:
 *         description: Simulation started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 simulationId:
 *                   type: string
 *                 mode:
 *                   type: string
 */
router.post('/start', async (req, res) => {
  try {
    const service = ensureService();
    if (!service.isRunning) await service.initialize();
    const { mode, config, simulationId } = req.body || {};
    const result = await service.createSimulation({ ...(config || {}), mode }, simulationId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/simulation/stop:
 *   post:
 *     summary: Stop a running simulation engine
 *     tags: [Simulation Control]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               simulationId:
 *                 type: string
 *                 description: Simulation ID to stop (stops first running if not provided)
 *     responses:
 *       200:
 *         description: Simulation stopped successfully
 *       404:
 *         description: Simulation not found
 *       409:
 *         description: Simulation not running
 */
router.post('/stop', async (req, res) => {
  try {
    const service = ensureService();
    const { simulationId } = req.body || {};
    const result = await service.stopSimulation(simulationId);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ success: false, error: error.message });
    } else if (error.message.includes('not running')) {
      res.status(409).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/simulation/stop-all:
 *   post:
 *     summary: Stop all running simulations
 *     tags: [Simulation Control]
 *     responses:
 *       200:
 *         description: All simulations stopped
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post('/stop-all', async (req, res) => {
  try {
    const service = ensureService();
    const results = await service.stopAllSimulations();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/simulation/list:
 *   get:
 *     summary: List all running simulations
 *     tags: [Simulation Control]
 *     responses:
 *       200:
 *         description: List of running simulations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 simulations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       mode:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                       config:
 *                         type: object
 */
router.get('/list', async (req, res) => {
  try {
    const service = ensureService();
    const simulations = service.getRunningSimulations();
    res.json({ success: true, simulations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/simulation/status/{simulationId}:
 *   get:
 *     summary: Get specific simulation status
 *     tags: [Simulation Control]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Simulation ID
 *     responses:
 *       200:
 *         description: Simulation status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     mode:
 *                       type: string
 *                     isRunning:
 *                       type: boolean
 *                     startTime:
 *                       type: string
 *                     config:
 *                       type: object
 *       404:
 *         description: Simulation not found
 */
router.get('/status/:simulationId', async (req, res) => {
  try {
    const service = ensureService();
    const { simulationId } = req.params;
    const status = service.getSimulationStatus(simulationId);
    if (!status) {
      return res.status(404).json({ success: false, error: 'Simulation not found' });
    }
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/simulation/status:
 *   get:
 *     summary: Get overall simulation engine status
 *     tags: [Simulation Control]
 *     responses:
 *       200:
 *         description: Overall simulation status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: object
 *                   properties:
 *                     totalSimulations:
 *                       type: number
 *                     runningSimulations:
 *                       type: number
 *                     availableEngines:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/status', async (req, res) => {
  try {
    const service = ensureService();
    const running = service.getRunningSimulations();
    const status = {
      totalSimulations: running.length,
      runningSimulations: running.length,
      availableEngines: []
    };
    
    // Check which engines are available
    if (service.cppExecutablePath) status.availableEngines.push('cpp');
    if (service.pythonExecutable) status.availableEngines.push('python');
    status.availableEngines.push('mock');
    
    res.json({ success: true, status, simulations: running });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
