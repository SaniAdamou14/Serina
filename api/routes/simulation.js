const express = re// GET /api/simulation - Get all simulations
router.get('/', async (req, res) => {
  try {
    const simulations = await database.getSimulations();
    
    // Add runtime information (simplified without evolution service for now)
    const simulationsWithStatus = simulations.map(sim => ({
      ...sim,
      isRunning: false, // TODO: Connect to evolution engine
      evolutionStats: null // TODO: Connect to evolution engine
    }));ss');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../services/database');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// GET /api/simulation - Get all simulations
router.get('/', async (req, res) => {
  try {
    const simulations = await database.getSimulations();
    
    // Add runtime information
    const simulationsWithStatus = simulations.map(sim => ({
      ...sim,
      isRunning: req.services.evolution.getCurrentSimulation() === sim.id && req.services.evolution.isRunning(),
      evolutionStats: req.services.evolution.getCurrentSimulation() === sim.id ? 
        req.services.evolution.getStats() : null
    }));
    
    res.json({
      success: true,
      data: simulationsWithStatus,
      count: simulationsWithStatus.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch simulations',
      message: error.message
    });
  }
});

// GET /api/simulation/:id - Get specific simulation
router.get('/:id', 
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      
      const [simulation, species, environment, recentEvents, performance] = await Promise.all([
        database.getSimulation(simulationId),
        database.getSpecies(simulationId),
        database.getEnvironmentConditions(simulationId),
        database.getEvolutionEvents(simulationId, 20),
        database.getPerformanceMetrics(simulationId, 20)
      ]);
      
      if (!simulation) {
        return res.status(404).json({
          error: 'Simulation not found',
          simulationId
        });
      }
      
      const simulationData = {
        simulation: {
          ...simulation,
          isRunning: req.services.evolution.getCurrentSimulation() === simulationId && req.services.evolution.isRunning(),
          evolutionStats: req.services.evolution.getCurrentSimulation() === simulationId ? 
            req.services.evolution.getStats() : null
        },
        species,
        environment,
        recentEvents,
        performance
      };
      
      res.json({
        success: true,
        data: simulationData
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch simulation',
        message: error.message
      });
    }
  }
);

// POST /api/simulation - Create new simulation
router.post('/',
  body('name').isLength({ min: 1, max: 255 }).withMessage('Name is required and must be 1-255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('world_width').optional().isInt({ min: 100, max: 10000 }).withMessage('World width must be 100-10000'),
  body('world_height').optional().isInt({ min: 100, max: 10000 }).withMessage('World height must be 100-10000'),
  body('max_population').optional().isInt({ min: 10, max: 100000 }).withMessage('Max population must be 10-100000'),
  body('mutation_rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Mutation rate must be 0-1'),
  body('crossover_rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Crossover rate must be 0-1'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = await database.createSimulation(req.body);
      
      // Create initial environment
      await database.updateEnvironmentConditions(simulationId, 0, {
        temperature: 23.5,
        humidity: 0.65,
        precipitation: 0.3,
        resource_abundance: 0.8,
        predation_pressure: 0.4,
        disease_load: 0.1,
        seasonal_modifier: 0.7,
        day_night_cycle: 0.3,
        season: 'Spring'
      });
      
      // Get the created simulation
      const simulation = await database.getSimulation(simulationId);
      
      res.status(201).json({
        success: true,
        message: 'Simulation created successfully',
        data: simulation
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create simulation',
        message: error.message
      });
    }
  }
);

// PUT /api/simulation/:id - Update simulation
router.put('/:id',
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  body('current_generation').optional().isInt({ min: 0 }).withMessage('Generation must be non-negative'),
  body('total_population').optional().isInt({ min: 0 }).withMessage('Population must be non-negative'),
  body('is_active').optional().isBoolean().withMessage('Active status must be boolean'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      
      // Check if simulation exists
      const simulation = await database.getSimulation(simulationId);
      if (!simulation) {
        return res.status(404).json({
          error: 'Simulation not found',
          simulationId
        });
      }
      
      await database.updateSimulation(simulationId, req.body);
      
      // Get updated simulation
      const updatedSimulation = await database.getSimulation(simulationId);
      
      res.json({
        success: true,
        message: 'Simulation updated successfully',
        data: updatedSimulation
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update simulation',
        message: error.message
      });
    }
  }
);

// DELETE /api/simulation/:id - Delete simulation
router.delete('/:id',
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      
      // Check if simulation exists
      const simulation = await database.getSimulation(simulationId);
      if (!simulation) {
        return res.status(404).json({
          error: 'Simulation not found',
          simulationId
        });
      }
      
      // Stop evolution if this simulation is running
      if (req.services.evolution.getCurrentSimulation() === simulationId && req.services.evolution.isRunning()) {
        await req.services.evolution.stopEvolution();
      }
      
      // Delete simulation (cascade will handle related data)
      await database.query('DELETE FROM simulations WHERE id = ?', [simulationId]);
      
      res.json({
        success: true,
        message: 'Simulation deleted successfully',
        simulationId
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to delete simulation',
        message: error.message
      });
    }
  }
);

// POST /api/simulation/:id/start - Start evolution for simulation
router.post('/:id/start',
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      
      // Check if simulation exists
      const simulation = await database.getSimulation(simulationId);
      if (!simulation) {
        return res.status(404).json({
          error: 'Simulation not found',
          simulationId
        });
      }
      
      // Start evolution
      const success = await req.services.evolution.startContinuousEvolution(simulationId);
      
      if (success) {
        // Broadcast to WebSocket clients
        req.services.websocket.broadcastToSimulation(simulationId, 'simulation:started', {
          message: 'Evolution started'
        });
        
        res.json({
          success: true,
          message: 'Evolution started successfully',
          simulationId
        });
      } else {
        res.status(409).json({
          error: 'Evolution already running',
          simulationId
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start evolution',
        message: error.message
      });
    }
  }
);

// POST /api/simulation/:id/stop - Stop evolution for simulation
router.post('/:id/stop',
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      
      // Stop evolution
      const success = await req.services.evolution.stopEvolution();
      
      if (success) {
        // Broadcast to WebSocket clients
        req.services.websocket.broadcastToSimulation(simulationId, 'simulation:stopped', {
          message: 'Evolution stopped'
        });
        
        res.json({
          success: true,
          message: 'Evolution stopped successfully',
          simulationId
        });
      } else {
        res.status(409).json({
          error: 'Evolution not running',
          simulationId
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to stop evolution',
        message: error.message
      });
    }
  }
);

// POST /api/simulation/:id/step - Execute single evolution step
router.post('/:id/step',
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      
      // Check if evolution is running
      if (req.services.evolution.isRunning()) {
        return res.status(409).json({
          error: 'Cannot step while evolution is running',
          simulationId
        });
      }
      
      // Execute evolution step
      await req.services.evolution.executeEvolutionStep();
      
      // Get updated simulation data
      const updatedSimulation = await database.getSimulation(simulationId);
      
      // Broadcast to WebSocket clients
      req.services.websocket.broadcastToSimulation(simulationId, 'simulation:stepped', {
        message: 'Evolution step completed',
        generation: updatedSimulation.current_generation
      });
      
      res.json({
        success: true,
        message: 'Evolution step completed',
        data: updatedSimulation
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to execute evolution step',
        message: error.message
      });
    }
  }
);

// PUT /api/simulation/:id/config - Update evolution configuration
router.put('/:id/config',
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  body('evolutionSpeed').optional().isInt({ min: 100, max: 10000 }).withMessage('Evolution speed must be 100-10000ms'),
  body('mutationRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Mutation rate must be 0-1'),
  body('crossoverRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Crossover rate must be 0-1'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      const { evolutionSpeed, mutationRate, crossoverRate } = req.body;
      
      // Update evolution engine configuration
      if (evolutionSpeed !== undefined) {
        req.services.evolution.setEvolutionSpeed(evolutionSpeed);
      }
      if (mutationRate !== undefined) {
        req.services.evolution.setMutationRate(mutationRate);
      }
      if (crossoverRate !== undefined) {
        req.services.evolution.setCrossoverRate(crossoverRate);
      }
      
      // Update database if needed
      if (mutationRate !== undefined || crossoverRate !== undefined) {
        await database.updateSimulation(simulationId, {
          mutation_rate: mutationRate,
          crossover_rate: crossoverRate
        });
      }
      
      // Broadcast to WebSocket clients
      req.services.websocket.broadcastToSimulation(simulationId, 'simulation:config:updated', {
        config: req.body
      });
      
      res.json({
        success: true,
        message: 'Configuration updated successfully',
        config: req.body
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update configuration',
        message: error.message
      });
    }
  }
);

// GET /api/simulation/:id/status - Get detailed simulation status
router.get('/:id/status',
  param('id').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const simulationId = parseInt(req.params.id);
      
      const simulation = await database.getSimulation(simulationId);
      if (!simulation) {
        return res.status(404).json({
          error: 'Simulation not found',
          simulationId
        });
      }
      
      const isRunning = req.services.evolution.getCurrentSimulation() === simulationId && req.services.evolution.isRunning();
      const evolutionStats = isRunning ? req.services.evolution.getStats() : null;
      
      const status = {
        simulation: {
          id: simulation.id,
          name: simulation.name,
          current_generation: simulation.current_generation,
          total_population: simulation.total_population,
          is_active: simulation.is_active,
          updated_at: simulation.updated_at
        },
        evolution: {
          isRunning,
          stats: evolutionStats
        },
        websocket: {
          connections: req.services.websocket.getConnectionCount(),
          rooms: req.services.websocket.getRoomCount()
        },
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime()
        }
      };
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get simulation status',
        message: error.message
      });
    }
  }
);

module.exports = router;
