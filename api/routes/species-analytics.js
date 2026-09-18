const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const database = require('../services/database');

/**
 * @swagger
 * components:
 *   schemas:
 *     SpeciesTraitsHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         species_id:
 *           type: integer
 *         simulation_id:
 *           type: integer
 *         generation:
 *           type: integer
 *         population_count:
 *           type: integer
 *         avg_size:
 *           type: number
 *         avg_speed:
 *           type: number
 *         avg_intelligence:
 *           type: number
 *         avg_endurance:
 *           type: number
 *         avg_aggression:
 *           type: number
 *         avg_sociability:
 *           type: number
 *         avg_fertility:
 *           type: number
 *         avg_longevity:
 *           type: number
 *         avg_adaptation:
 *           type: number
 *         avg_resistance:
 *           type: number
 *         fitness_average:
 *           type: number
 *         genetic_diversity:
 *           type: number
 *         mutation_rate:
 *           type: number
 *         extinction_risk:
 *           type: number
 *         traits_data:
 *           type: object
 *         environmental_pressures:
 *           type: object
 *         recorded_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/species/{speciesId}/traits-history:
 *   get:
 *     summary: Get traits evolution history for a species
 *     tags: [Species Analytics]
 *     parameters:
 *       - in: path
 *         name: speciesId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Species ID
 *       - in: query
 *         name: generations
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of generations to retrieve
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *         description: Starting generation
 *     responses:
 *       200:
 *         description: Species traits history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SpeciesTraitsHistory'
 *       404:
 *         description: Species not found
 */
router.get('/:speciesId/traits-history', [
  param('speciesId').isInt({ min: 1 }).withMessage('Species ID must be a positive integer'),
  query('generations').optional().isInt({ min: 1, max: 1000 }).withMessage('Generations must be between 1 and 1000'),
  query('from').optional().isInt({ min: 0 }).withMessage('From generation must be >= 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { speciesId } = req.params;
    const { generations, from } = req.query;
    
    // Check if species exists
    const species = await database.getSpeciesById(speciesId);
    if (!species) {
      return res.status(404).json({ success: false, error: 'Species not found' });
    }

    const generationsParam = generations || from ? {
      limit: parseInt(generations) || 50,
      from: parseInt(from) || 0
    } : null;

    const history = await database.getSpeciesTraitsHistory(speciesId, generationsParam);
    
    res.json({
      success: true,
      data: history,
      species: {
        id: species.id,
        name: species.name,
        simulation_id: species.simulation_id
      }
    });
  } catch (error) {
    console.error('Error getting species traits history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/species/{speciesId}/traits-trend/{traitName}:
 *   get:
 *     summary: Get evolution trend for a specific trait
 *     tags: [Species Analytics]
 *     parameters:
 *       - in: path
 *         name: speciesId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Species ID
 *       - in: path
 *         name: traitName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [size, speed, intelligence, endurance, aggression, sociability, fertility, longevity, adaptation, resistance]
 *         description: Trait name to analyze
 *       - in: query
 *         name: generations
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 500
 *         description: Number of generations to analyze
 *     responses:
 *       200:
 *         description: Trait evolution trend
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 trait:
 *                   type: string
 *                 trend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       generation:
 *                         type: integer
 *                       trait_value:
 *                         type: number
 *                       fitness_average:
 *                         type: number
 *                       recorded_at:
 *                         type: string
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *                     average:
 *                       type: number
 *                     trend_direction:
 *                       type: string
 *       404:
 *         description: Species not found
 */
router.get('/:speciesId/traits-trend/:traitName', [
  param('speciesId').isInt({ min: 1 }).withMessage('Species ID must be a positive integer'),
  param('traitName').isIn(['size', 'speed', 'intelligence', 'endurance', 'aggression', 'sociability', 'fertility', 'longevity', 'adaptation', 'resistance']).withMessage('Invalid trait name'),
  query('generations').optional().isInt({ min: 1, max: 500 }).withMessage('Generations must be between 1 and 500')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { speciesId, traitName } = req.params;
    const { generations } = req.query;
    
    // Check if species exists
    const species = await database.getSpeciesById(speciesId);
    if (!species) {
      return res.status(404).json({ success: false, error: 'Species not found' });
    }

    const trend = await database.getTraitsEvolutionTrends(speciesId, traitName, parseInt(generations) || 50);
    
    // Calculate statistics
    const values = trend.map(t => t.trait_value).filter(v => v !== null && v !== undefined);
    const statistics = {
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      trend_direction: values.length > 1 ? (values[0] > values[values.length - 1] ? 'decreasing' : 'increasing') : 'stable'
    };
    
    res.json({
      success: true,
      trait: traitName,
      trend: trend.reverse(), // Show chronological order
      statistics,
      species: {
        id: species.id,
        name: species.name
      }
    });
  } catch (error) {
    console.error('Error getting trait evolution trend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/species/{speciesId}/traits-record:
 *   post:
 *     summary: Record new traits data for a species in a generation
 *     tags: [Species Analytics]
 *     parameters:
 *       - in: path
 *         name: speciesId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Species ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - generation
 *               - populationCount
 *               - avgTraits
 *             properties:
 *               generation:
 *                 type: integer
 *               populationCount:
 *                 type: integer
 *               avgTraits:
 *                 type: object
 *               fitnessAverage:
 *                 type: number
 *               geneticDiversity:
 *                 type: number
 *               mutationRate:
 *                 type: number
 *               extinctionRisk:
 *                 type: number
 *               environmentalPressures:
 *                 type: object
 *     responses:
 *       201:
 *         description: Traits data recorded successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Species not found
 */
router.post('/:speciesId/traits-record', [
  param('speciesId').isInt({ min: 1 }).withMessage('Species ID must be a positive integer'),
  body('generation').isInt({ min: 0 }).withMessage('Generation must be >= 0'),
  body('populationCount').isInt({ min: 0 }).withMessage('Population count must be >= 0'),
  body('avgTraits').isObject().withMessage('Average traits must be an object'),
  body('fitnessAverage').optional().isFloat({ min: 0 }).withMessage('Fitness average must be >= 0'),
  body('geneticDiversity').optional().isFloat({ min: 0, max: 1 }).withMessage('Genetic diversity must be between 0 and 1'),
  body('mutationRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Mutation rate must be between 0 and 1'),
  body('extinctionRisk').optional().isFloat({ min: 0, max: 1 }).withMessage('Extinction risk must be between 0 and 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { speciesId } = req.params;
    const traitsData = req.body;
    
    // Check if species exists
    const species = await database.getSpeciesById(speciesId);
    if (!species) {
      return res.status(404).json({ success: false, error: 'Species not found' });
    }

    const result = await database.saveSpeciesTraitsHistory(
      speciesId, 
      species.simulation_id, 
      traitsData.generation, 
      traitsData
    );
    
    res.status(201).json({
      success: true,
      message: 'Traits data recorded successfully',
      id: result.insertId,
      species_id: speciesId,
      generation: traitsData.generation
    });
  } catch (error) {
    console.error('Error recording species traits:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;