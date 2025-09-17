import mysql from 'mysql2/promise';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export class DatabaseService {
  constructor(config) {
    this.config = {
      host: config.host || '127.0.0.1',
      port: config.port || 3306,
      user: config.user || 'root',
      password: config.password || '',
      database: config.database || 'serina_evolution',
      connectionLimit: config.connectionLimit || 10,
      acquireTimeout: config.acquireTimeout || 60000,
      timeout: config.timeout || 60000,
      reconnect: true,
      charset: 'utf8mb4'
    };
    
    this.pool = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.pool = mysql.createPool(this.config);
      
      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      this.isInitialized = true;
      logger.info('Database service initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async checkConnection() {
    try {
      if (!this.pool) return false;
      
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      return true;
    } catch (error) {
      logger.error('Database connection check failed:', error);
      return false;
    }
  }

  async query(sql, params = []) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database service not initialized');
      }

      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('Database query failed:', { sql, params, error: error.message });
      throw error;
    }
  }

  async transaction(queries) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const { sql, params } of queries) {
        const [rows] = await connection.execute(sql, params);
        results.push(rows);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      logger.error('Transaction failed:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Simulation operations
  async getSimulations() {
    const sql = `
      SELECT s.*, 
             COUNT(DISTINCT sp.id) as species_count,
             AVG(sp.avg_fitness) as overall_fitness
      FROM simulations s
      LEFT JOIN species sp ON s.id = sp.simulation_id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `;
    return await this.query(sql);
  }

  async getSimulation(id) {
    const sql = `
      SELECT s.*, 
             COUNT(DISTINCT sp.id) as species_count,
             AVG(sp.avg_fitness) as overall_fitness,
             SUM(sp.population_count) as total_population
      FROM simulations s
      LEFT JOIN species sp ON s.id = sp.simulation_id
      WHERE s.id = ?
      GROUP BY s.id
    `;
    const results = await this.query(sql, [id]);
    return results[0] || null;
  }

  async createSimulation(data) {
    const sql = `
      INSERT INTO simulations (name, description, world_width, world_height, max_population, mutation_rate, crossover_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.name,
      data.description || '',
      data.world_width || 1920,
      data.world_height || 1080,
      data.max_population || 10000,
      data.mutation_rate || 0.05,
      data.crossover_rate || 0.7
    ];
    
    const result = await this.query(sql, params);
    return result.insertId;
  }

  async updateSimulation(id, data) {
    const fields = [];
    const values = [];
    
    if (data.current_generation !== undefined) {
      fields.push('current_generation = ?');
      values.push(data.current_generation);
    }
    if (data.total_population !== undefined) {
      fields.push('total_population = ?');
      values.push(data.total_population);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    
    const sql = `
      UPDATE simulations 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    return await this.query(sql, values);
  }

  // Species operations
  async getSpecies(simulationId) {
    const sql = `
      SELECT s.*, 
             st.trait_size, st.trait_speed, st.trait_strength, st.trait_intelligence,
             st.trait_longevity, st.trait_resistance, st.trait_metabolism, st.trait_sociability,
             st.trait_adaptability, st.trait_vision_range, st.trait_camouflage, st.trait_reproduction_rate,
             st.generation as traits_generation
      FROM species s
      LEFT JOIN species_traits st ON s.id = st.species_id 
        AND st.generation = (SELECT MAX(generation) FROM species_traits WHERE species_id = s.id)
      WHERE s.simulation_id = ?
      ORDER BY s.population_count DESC
    `;
    return await this.query(sql, [simulationId]);
  }

  async getSpeciesById(id) {
    const sql = `
      SELECT s.*, 
             st.trait_size, st.trait_speed, st.trait_strength, st.trait_intelligence,
             st.trait_longevity, st.trait_resistance, st.trait_metabolism, st.trait_sociability,
             st.trait_adaptability, st.trait_vision_range, st.trait_camouflage, st.trait_reproduction_rate,
             st.generation as traits_generation
      FROM species s
      LEFT JOIN species_traits st ON s.id = st.species_id 
        AND st.generation = (SELECT MAX(generation) FROM species_traits WHERE species_id = s.id)
      WHERE s.id = ?
    `;
    const results = await this.query(sql, [id]);
    return results[0] || null;
  }

  async createSpecies(data) {
    const sql = `
      INSERT INTO species (simulation_id, species_name, ecological_niche, population_count, generation_span, extinction_risk, avg_fitness)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.simulation_id,
      data.species_name,
      data.ecological_niche || 'Generalist',
      data.population_count || 0,
      data.generation_span || 1,
      data.extinction_risk || 0.0,
      data.avg_fitness || 0.5
    ];
    
    const result = await this.query(sql, params);
    return result.insertId;
  }

  async updateSpecies(id, data) {
    const fields = [];
    const values = [];
    
    Object.keys(data).forEach(key => {
      if (key !== 'id' && data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });
    
    if (fields.length === 0) return;
    
    values.push(id);
    
    const sql = `
      UPDATE species 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    return await this.query(sql, values);
  }

  async recordSpeciesTraits(speciesId, generation, traits) {
    const sql = `
      INSERT INTO species_traits (
        species_id, generation, trait_size, trait_speed, trait_strength, trait_intelligence,
        trait_longevity, trait_resistance, trait_metabolism, trait_sociability,
        trait_adaptability, trait_vision_range, trait_camouflage, trait_reproduction_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      speciesId, generation,
      traits.size || 0.5, traits.speed || 0.5, traits.strength || 0.5, traits.intelligence || 0.5,
      traits.longevity || 0.5, traits.resistance || 0.5, traits.metabolism || 0.5, traits.sociability || 0.5,
      traits.adaptability || 0.5, traits.vision_range || 0.5, traits.camouflage || 0.5, traits.reproduction_rate || 0.5
    ];
    
    return await this.query(sql, params);
  }

  // Individual operations
  async getIndividuals(speciesId, limit = 100) {
    const sql = `
      SELECT i.*, g.trait_size, g.trait_speed, g.trait_intelligence, g.trait_adaptability
      FROM individuals i
      LEFT JOIN genomes g ON i.id = g.individual_id
      WHERE i.species_id = ? AND i.is_alive = TRUE
      ORDER BY i.fitness_score DESC
      LIMIT ?
    `;
    return await this.query(sql, [speciesId, limit]);
  }

  async createIndividual(data) {
    const individualSql = `
      INSERT INTO individuals (
        species_id, individual_name, genome_id, parent1_id, parent2_id,
        generation, age, energy, position_x, position_y, birth_time, fitness_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const individualParams = [
      data.species_id,
      data.individual_name,
      data.genome_id,
      data.parent1_id || null,
      data.parent2_id || null,
      data.generation || 0,
      data.age || 0,
      data.energy || 100.0,
      data.position_x || 0.0,
      data.position_y || 0.0,
      data.birth_time || Date.now(),
      data.fitness_score || 0.5
    ];
    
    const individualResult = await this.query(individualSql, individualParams);
    const individualId = individualResult.insertId;
    
    // Create genome
    if (data.genome) {
      const genomeSql = `
        INSERT INTO genomes (
          individual_id, trait_size, trait_speed, trait_strength, trait_intelligence,
          trait_longevity, trait_resistance, trait_metabolism, trait_sociability,
          trait_adaptability, trait_vision_range, trait_camouflage, trait_reproduction_rate,
          mutation_count, dominance_factor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const genomeParams = [
        individualId,
        data.genome.size || 0.5, data.genome.speed || 0.5, data.genome.strength || 0.5, data.genome.intelligence || 0.5,
        data.genome.longevity || 0.5, data.genome.resistance || 0.5, data.genome.metabolism || 0.5, data.genome.sociability || 0.5,
        data.genome.adaptability || 0.5, data.genome.vision_range || 0.5, data.genome.camouflage || 0.5, data.genome.reproduction_rate || 0.5,
        data.genome.mutation_count || 0, data.genome.dominance_factor || 0.5
      ];
      
      await this.query(genomeSql, genomeParams);
    }
    
    return individualId;
  }

  // Evolution events
  async recordEvolutionEvent(data) {
    const sql = `
      INSERT INTO evolution_events (simulation_id, species_id, individual_id, event_type, generation, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.simulation_id,
      data.species_id || null,
      data.individual_id || null,
      data.event_type,
      data.generation,
      data.description || '',
      JSON.stringify(data.metadata || {})
    ];
    
    return await this.query(sql, params);
  }

  async getEvolutionEvents(simulationId, limit = 100) {
    const sql = `
      SELECT e.*, s.species_name
      FROM evolution_events e
      LEFT JOIN species s ON e.species_id = s.id
      WHERE e.simulation_id = ?
      ORDER BY e.recorded_at DESC
      LIMIT ?
    `;
    return await this.query(sql, [simulationId, limit]);
  }

  // Environment operations
  async getEnvironmentConditions(simulationId, generation = null) {
    let sql = `
      SELECT * FROM environment_conditions
      WHERE simulation_id = ?
    `;
    const params = [simulationId];
    
    if (generation !== null) {
      sql += ` AND generation = ?`;
      params.push(generation);
    }
    
    sql += ` ORDER BY generation DESC LIMIT 1`;
    
    const results = await this.query(sql, params);
    return results[0] || null;
  }

  async updateEnvironmentConditions(simulationId, generation, data) {
    const sql = `
      INSERT INTO environment_conditions (
        simulation_id, generation, temperature, humidity, precipitation,
        resource_abundance, predation_pressure, disease_load,
        seasonal_modifier, day_night_cycle, season
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        temperature = VALUES(temperature),
        humidity = VALUES(humidity),
        precipitation = VALUES(precipitation),
        resource_abundance = VALUES(resource_abundance),
        predation_pressure = VALUES(predation_pressure),
        disease_load = VALUES(disease_load),
        seasonal_modifier = VALUES(seasonal_modifier),
        day_night_cycle = VALUES(day_night_cycle),
        season = VALUES(season)
    `;
    
    const params = [
      simulationId, generation,
      data.temperature || 20.0,
      data.humidity || 0.5,
      data.precipitation || 0.5,
      data.resource_abundance || 0.8,
      data.predation_pressure || 0.3,
      data.disease_load || 0.1,
      data.seasonal_modifier || 0.5,
      data.day_night_cycle || 0.5,
      data.season || 'Spring'
    ];
    
    return await this.query(sql, params);
  }

  // Performance metrics
  async recordPerformanceMetrics(data) {
    const sql = `
      INSERT INTO performance_metrics (
        simulation_id, generation, generations_per_second, memory_usage,
        cpu_usage, frame_rate, active_individuals, mutations_per_generation,
        reproductions_per_generation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.simulation_id, data.generation,
      data.generations_per_second || 0.0,
      data.memory_usage || 0.0,
      data.cpu_usage || 0.0,
      data.frame_rate || 0.0,
      data.active_individuals || 0,
      data.mutations_per_generation || 0,
      data.reproductions_per_generation || 0
    ];
    
    return await this.query(sql, params);
  }

  async getPerformanceMetrics(simulationId, limit = 100) {
    const sql = `
      SELECT * FROM performance_metrics
      WHERE simulation_id = ?
      ORDER BY recorded_at DESC
      LIMIT ?
    `;
    return await this.query(sql, [simulationId, limit]);
  }

  // Spatial resources
  async getSpatialResources(simulationId) {
    const sql = `
      SELECT * FROM spatial_resources
      WHERE simulation_id = ?
      ORDER BY resource_type, abundance DESC
    `;
    return await this.query(sql, [simulationId]);
  }

  async updateSpatialResource(simulationId, x, y, data) {
    const sql = `
      INSERT INTO spatial_resources (
        simulation_id, x_coordinate, y_coordinate, resource_type,
        abundance, regeneration_rate, terrain_type, climate_zone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        abundance = VALUES(abundance),
        regeneration_rate = VALUES(regeneration_rate),
        terrain_type = VALUES(terrain_type),
        climate_zone = VALUES(climate_zone)
    `;
    
    const params = [
      simulationId, x, y,
      data.resource_type,
      data.abundance || 1.0,
      data.regeneration_rate || 0.1,
      data.terrain_type || 'LAND',
      data.climate_zone || 'TEMPERATE'
    ];
    
    return await this.query(sql, params);
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isInitialized = false;
      logger.info('Database connection pool closed');
    }
  }
}