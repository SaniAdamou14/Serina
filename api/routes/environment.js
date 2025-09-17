const express = require('express');
const { param, query, validationResult } = require('express-validator');
const database = require('../services/database');
const Environment = require('../models/Environment');

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

// GET /api/environment/:simulationId - Get environment for simulation
router.get('/:simulationId',
  param('simulationId').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const { simulationId } = req.params;
      
      const environment = await database.getEnvironmentBySimulation(simulationId);
      
      if (!environment) {
        return res.status(404).json({
          success: false,
          error: 'Environment not found for this simulation'
        });
      }

      const environmentModel = Environment.fromDatabase(environment);
      const environmentState = environmentModel.getEnvironmentState();
      const environmentStats = environmentModel.getEnvironmentStats();

      res.json({
        success: true,
        data: {
          environment: environmentState,
          stats: environmentStats
        }
      });

    } catch (error) {
      console.error('Error fetching environment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch environment',
        details: error.message
      });
    }
  }
);

// PUT /api/environment/:simulationId - Update environment
router.put('/:simulationId',
  param('simulationId').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const { simulationId } = req.params;
      const updates = req.body;
      
      // Get current environment
      const currentEnv = await database.getEnvironmentBySimulation(simulationId);
      if (!currentEnv) {
        return res.status(404).json({
          success: false,
          error: 'Environment not found for this simulation'
        });
      }

      // Create environment model and apply updates
      const environmentModel = Environment.fromDatabase(currentEnv);
      
      // Apply allowed updates
      const allowedUpdates = [
        'temperature', 'humidity', 'oxygen_level', 'radiation_level',
        'food_availability', 'water_availability', 'predator_pressure',
        'competition_level', 'disaster_probability'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          environmentModel[field] = updates[field];
        }
      });

      environmentModel.updated_at = new Date();

      // Save to database
      await database.updateEnvironment(simulationId, environmentModel.toDatabase());

      // Return updated environment
      const updatedState = environmentModel.getEnvironmentState();

      res.json({
        success: true,
        message: 'Environment updated successfully',
        data: updatedState
      });

    } catch (error) {
      console.error('Error updating environment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update environment',
        details: error.message
      });
    }
  }
);

// GET /api/environment/:simulationId/resources - Get spatial resources
router.get('/:simulationId/resources',
  param('simulationId').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const { simulationId } = req.params;
      
      const environment = await database.getEnvironmentBySimulation(simulationId);
      
      if (!environment) {
        return res.status(404).json({
          success: false,
          error: 'Environment not found for this simulation'
        });
      }

      const environmentModel = Environment.fromDatabase(environment);

      res.json({
        success: true,
        data: {
          food_sources: environmentModel.food_sources,
          water_sources: environmentModel.water_sources,
          shelter_areas: environmentModel.shelter_areas,
          danger_zones: environmentModel.danger_zones,
          carrying_capacity: environmentModel.getCarryingCapacity()
        }
      });

    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resources',
        details: error.message
      });
    }
  }
);

// POST /api/environment/:simulationId/events - Trigger environmental event
router.post('/:simulationId/events',
  param('simulationId').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const { simulationId } = req.params;
      const { eventType, intensity } = req.body;
      
      const environment = await database.getEnvironmentBySimulation(simulationId);
      
      if (!environment) {
        return res.status(404).json({
          success: false,
          error: 'Environment not found for this simulation'
        });
      }

      const environmentModel = Environment.fromDatabase(environment);
      
      // Force trigger a specific event
      if (eventType) {
        environmentModel.disaster_probability = 1.0; // Force event
        const event = environmentModel.triggerRandomEvent();
        
        // Save updated environment
        await database.updateEnvironment(simulationId, environmentModel.toDatabase());
        
        res.json({
          success: true,
          message: 'Environmental event triggered',
          data: {
            event: event,
            updated_environment: environmentModel.getEnvironmentState()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Event type is required'
        });
      }

    } catch (error) {
      console.error('Error triggering event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger event',
        details: error.message
      });
    }
  }
);

// GET /api/environment/:simulationId/history - Get environment change history
router.get('/:simulationId/history',
  param('simulationId').isInt().withMessage('Simulation ID must be an integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest,
  async (req, res) => {
    try {
      const { simulationId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      const environment = await database.getEnvironmentBySimulation(simulationId);
      
      if (!environment) {
        return res.status(404).json({
          success: false,
          error: 'Environment not found for this simulation'
        });
      }

      const environmentModel = Environment.fromDatabase(environment);
      const history = environmentModel.change_history.slice(-limit);

      res.json({
        success: true,
        data: {
          history: history,
          total_events: environmentModel.change_history.length,
          recent_stability: environmentModel.calculateStability(),
          current_harshness: environmentModel.calculateHarshness()
        }
      });

    } catch (error) {
      console.error('Error fetching environment history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch environment history',
        details: error.message
      });
    }
  }
);

// POST /api/environment/:simulationId/reset - Reset environment to default state
router.post('/:simulationId/reset',
  param('simulationId').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const { simulationId } = req.params;
      
      // Create new default environment
      const newEnvironment = Environment.createDefault(simulationId);
      
      // Save to database
      await database.updateEnvironment(simulationId, newEnvironment.toDatabase());

      res.json({
        success: true,
        message: 'Environment reset to default state',
        data: newEnvironment.getEnvironmentState()
      });

    } catch (error) {
      console.error('Error resetting environment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset environment',
        details: error.message
      });
    }
  }
);

// GET /api/environment/:simulationId/stats - Get detailed environment statistics
router.get('/:simulationId/stats',
  param('simulationId').isInt().withMessage('Simulation ID must be an integer'),
  validateRequest,
  async (req, res) => {
    try {
      const { simulationId } = req.params;
      
      const environment = await database.getEnvironmentBySimulation(simulationId);
      
      if (!environment) {
        return res.status(404).json({
          success: false,
          error: 'Environment not found for this simulation'
        });
      }

      const environmentModel = Environment.fromDatabase(environment);
      const stats = environmentModel.getEnvironmentStats();
      const state = environmentModel.getEnvironmentState();

      res.json({
        success: true,
        data: {
          statistics: stats,
          current_conditions: state.conditions,
          resources: state.resources,
          capacity: state.capacity,
          sustainability_score: stats.sustainability,
          biodiversity_support: stats.diversity,
          environmental_pressure: stats.harshness
        }
      });

    } catch (error) {
      console.error('Error fetching environment stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch environment statistics',
        details: error.message
      });
    }
  }
);

module.exports = router;