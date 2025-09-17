const express = require('express');
const router = express.Router();
const database = require('../services/database');

// GET /api/simulations - Get all simulations
router.get('/', async (req, res) => {
  try {
    const simulations = await database.getAllSimulations();
    res.json({
      success: true,
      data: simulations
    });
  } catch (error) {
    console.error('Error fetching simulations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simulations',
      details: error.message
    });
  }
});

// POST /api/simulations - Create new simulation
router.post('/', async (req, res) => {
  try {
    const { name, config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration is required'
      });
    }

    const simulationId = await database.createSimulation({
      name: name || 'New Simulation',
      ...config
    });

    res.status(201).json({
      success: true,
      data: {
        id: simulationId,
        name: name || 'New Simulation',
        status: 'created'
      }
    });
  } catch (error) {
    console.error('Error creating simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create simulation',
      details: error.message
    });
  }
});

// GET /api/simulations/:id - Get specific simulation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const simulation = await database.getSimulation(id);
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    // Parse config if it's a string
    if (typeof simulation.config === 'string') {
      simulation.config = JSON.parse(simulation.config);
    }

    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simulation',
      details: error.message
    });
  }
});

// PUT /api/simulations/:id - Update simulation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    await database.updateSimulation(id, updateData);
    
    res.json({
      success: true,
      message: 'Simulation updated successfully'
    });
  } catch (error) {
    console.error('Error updating simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update simulation',
      details: error.message
    });
  }
});

// GET /api/simulations/:id/species - Get species for simulation
router.get('/:id/species', async (req, res) => {
  try {
    const { id } = req.params;
    const species = await database.getSpeciesBySimulation(id);
    
    res.json({
      success: true,
      data: species
    });
  } catch (error) {
    console.error('Error fetching species:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch species',
      details: error.message
    });
  }
});

// POST /api/simulations/:id/species - Save species data
router.post('/:id/species', async (req, res) => {
  try {
    const { id } = req.params;
    const speciesData = req.body;
    
    if (!Array.isArray(speciesData)) {
      return res.status(400).json({
        success: false,
        error: 'Species data must be an array'
      });
    }

    // Save each species
    for (const species of speciesData) {
      await database.saveSpecies(id, species);
    }
    
    res.json({
      success: true,
      message: `Saved ${speciesData.length} species`
    });
  } catch (error) {
    console.error('Error saving species:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save species',
      details: error.message
    });
  }
});

// GET /api/simulations/:id/history - Get evolution history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const history = await database.getEvolutionHistory(id, parseInt(limit));
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching evolution history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evolution history',
      details: error.message
    });
  }
});

// POST /api/simulations/:id/history - Save evolution snapshot
router.post('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { generation, data } = req.body;
    
    if (typeof generation !== 'number' || !data) {
      return res.status(400).json({
        success: false,
        error: 'Generation number and data are required'
      });
    }

    await database.saveEvolutionSnapshot(id, generation, data);
    
    res.json({
      success: true,
      message: 'Evolution snapshot saved'
    });
  } catch (error) {
    console.error('Error saving evolution snapshot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save evolution snapshot',
      details: error.message
    });
  }
});

// GET /api/simulations/:id/stats - Get simulation statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await database.getSimulationStats(id);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching simulation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simulation statistics',
      details: error.message
    });
  }
});

// GET /api/simulations/:id/trends - Get population trends
router.get('/:id/trends', async (req, res) => {
  try {
    const { id } = req.params;
    const { generations = 50 } = req.query;
    
    const trends = await database.getPopulationTrends(id, parseInt(generations));
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching population trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch population trends',
      details: error.message
    });
  }
});

// POST /api/simulations/:id/performance - Log performance metrics
router.post('/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const metrics = req.body;
    
    await database.logPerformanceMetrics(id, metrics);
    
    res.json({
      success: true,
      message: 'Performance metrics logged'
    });
  } catch (error) {
    console.error('Error logging performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log performance metrics',
      details: error.message
    });
  }
});

// GET /api/simulations/:id/performance - Get recent performance metrics
router.get('/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes = 5 } = req.query;
    
    const metrics = await database.getRecentPerformanceMetrics(id, parseInt(minutes));
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics',
      details: error.message
    });
  }
});

module.exports = router;