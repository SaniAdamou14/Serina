const express = require('express');
const router = express.Router();
const database = require('../services/database');

// GET /api/individuals - Get individuals with filtering
router.get('/', async (req, res) => {
  try {
    const { simulationId, speciesId, isAlive, limit = 100 } = req.query;
    
    let sql = 'SELECT * FROM individuals WHERE 1=1';
    const params = [];
    
    if (simulationId) {
      sql += ' AND species_id IN (SELECT id FROM species WHERE simulation_id = ?)';
      params.push(simulationId);
    }
    
    if (speciesId) {
      sql += ' AND species_id = ?';
      params.push(speciesId);
    }
    
    if (isAlive !== undefined) {
      sql += ' AND is_alive = ?';
      params.push(isAlive === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const individuals = await database.query(sql, params);
    
    // Parse JSON fields
    const processedIndividuals = individuals.map(individual => ({
      ...individual,
      genome: JSON.parse(individual.genome || '{}'),
      phenotype: JSON.parse(individual.phenotype || '{}'),
      position: {
        x: individual.position_x,
        y: individual.position_y
      }
    }));
    
    res.json({
      success: true,
      data: processedIndividuals
    });
  } catch (error) {
    console.error('Error fetching individuals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch individuals',
      details: error.message
    });
  }
});

// POST /api/individuals - Create new individual
router.post('/', async (req, res) => {
  try {
    const individualData = req.body;
    
    if (!individualData.speciesId) {
      return res.status(400).json({
        success: false,
        error: 'Species ID is required'
      });
    }
    
    const individualId = await database.saveIndividual(individualData);
    
    res.status(201).json({
      success: true,
      data: {
        id: individualId,
        message: 'Individual created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating individual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create individual',
      details: error.message
    });
  }
});

// GET /api/individuals/:id - Get specific individual
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = 'SELECT * FROM individuals WHERE id = ?';
    const individuals = await database.query(sql, [id]);
    
    if (individuals.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Individual not found'
      });
    }
    
    const individual = individuals[0];
    
    // Parse JSON fields and format response
    const processedIndividual = {
      ...individual,
      genome: JSON.parse(individual.genome || '{}'),
      phenotype: JSON.parse(individual.phenotype || '{}'),
      position: {
        x: individual.position_x,
        y: individual.position_y
      }
    };
    
    res.json({
      success: true,
      data: processedIndividual
    });
  } catch (error) {
    console.error('Error fetching individual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch individual',
      details: error.message
    });
  }
});

// PUT /api/individuals/:id - Update individual
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    await database.updateIndividual(id, updateData);
    
    res.json({
      success: true,
      message: 'Individual updated successfully'
    });
  } catch (error) {
    console.error('Error updating individual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update individual',
      details: error.message
    });
  }
});

// DELETE /api/individuals/:id - Delete individual (mark as dead)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { causeOfDeath = 'Manual deletion' } = req.body;
    
    await database.updateIndividual(id, {
      isAlive: false,
      deathTime: new Date().toISOString(),
      causeOfDeath
    });
    
    res.json({
      success: true,
      message: 'Individual marked as deceased'
    });
  } catch (error) {
    console.error('Error deleting individual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete individual',
      details: error.message
    });
  }
});

// GET /api/individuals/:id/lineage - Get individual's lineage/family tree
router.get('/:id/lineage', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the individual first
    const individualSql = 'SELECT * FROM individuals WHERE id = ?';
    const individuals = await database.query(individualSql, [id]);
    
    if (individuals.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Individual not found'
      });
    }
    
    const individual = individuals[0];
    
    // Get parents (if lineage tracking is implemented)
    const parentsSql = `
      SELECT * FROM individuals 
      WHERE species_id = ? AND generation = ? 
      ORDER BY created_at
      LIMIT 10
    `;
    const parents = await database.query(parentsSql, [
      individual.species_id, 
      individual.generation - 1
    ]);
    
    // Get offspring
    const offspringSql = `
      SELECT * FROM individuals 
      WHERE species_id = ? AND generation = ?
      ORDER BY created_at
      LIMIT 20
    `;
    const offspring = await database.query(offspringSql, [
      individual.species_id, 
      individual.generation + 1
    ]);
    
    res.json({
      success: true,
      data: {
        individual: {
          ...individual,
          genome: JSON.parse(individual.genome || '{}'),
          phenotype: JSON.parse(individual.phenotype || '{}')
        },
        parents: parents.map(p => ({
          ...p,
          genome: JSON.parse(p.genome || '{}'),
          phenotype: JSON.parse(p.phenotype || '{}')
        })),
        offspring: offspring.map(o => ({
          ...o,
          genome: JSON.parse(o.genome || '{}'),
          phenotype: JSON.parse(o.phenotype || '{}')
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching lineage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lineage',
      details: error.message
    });
  }
});

// POST /api/individuals/batch - Create multiple individuals
router.post('/batch', async (req, res) => {
  try {
    const { individuals } = req.body;
    
    if (!Array.isArray(individuals)) {
      return res.status(400).json({
        success: false,
        error: 'Individuals must be an array'
      });
    }
    
    const createdIds = [];
    
    for (const individual of individuals) {
      const id = await database.saveIndividual(individual);
      createdIds.push(id);
    }
    
    res.status(201).json({
      success: true,
      data: {
        createdCount: createdIds.length,
        ids: createdIds
      }
    });
  } catch (error) {
    console.error('Error creating individuals batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create individuals batch',
      details: error.message
    });
  }
});

// GET /api/individuals/species/:speciesId/stats - Get statistics for species individuals
router.get('/species/:speciesId/stats', async (req, res) => {
  try {
    const { speciesId } = req.params;
    
    const statsSql = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN is_alive = 1 THEN 1 END) as alive_count,
        COUNT(CASE WHEN is_alive = 0 THEN 1 END) as dead_count,
        AVG(age) as average_age,
        AVG(energy) as average_energy,
        MIN(generation) as min_generation,
        MAX(generation) as max_generation,
        AVG(generation) as average_generation
      FROM individuals 
      WHERE species_id = ?
    `;
    
    const stats = await database.query(statsSql, [speciesId]);
    
    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching individual stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch individual statistics',
      details: error.message
    });
  }
});

module.exports = router;