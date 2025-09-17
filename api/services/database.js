const mysql = require('mysql2/promise');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'serina_evolution',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      });

      // Test connection
      const connection = await this.pool.getConnection();
      console.log('✅ Connected to MySQL database');
      connection.release();
      this.isConnected = true;
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('🔌 Database disconnected');
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Simulation Management
  async createSimulation(config) {
    const sql = `
      INSERT INTO simulations (name, config, status, created_at, updated_at)
      VALUES (?, ?, 'created', NOW(), NOW())
    `;
    const result = await this.query(sql, [
      config.name || 'Unnamed Simulation',
      JSON.stringify(config)
    ]);
    return result.insertId;
  }

  async updateSimulation(id, data) {
    const sql = `
      UPDATE simulations 
      SET generation = ?, population_count = ?, status = ?, updated_at = NOW()
      WHERE id = ?
    `;
    return await this.query(sql, [
      data.generation,
      data.populationCount,
      data.status,
      id
    ]);
  }

  async getSimulation(id) {
    const sql = 'SELECT * FROM simulations WHERE id = ?';
    const results = await this.query(sql, [id]);
    return results[0];
  }

  async getAllSimulations() {
    const sql = 'SELECT * FROM simulations ORDER BY created_at DESC';
    return await this.query(sql);
  }

  // Species Management
  async saveSpecies(simulationId, species) {
    const sql = `
      INSERT INTO species (simulation_id, name, population_count, generation_span, 
                          extinction_risk, ecological_niche, traits, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        population_count = VALUES(population_count),
        generation_span = VALUES(generation_span),
        extinction_risk = VALUES(extinction_risk),
        traits = VALUES(traits),
        updated_at = NOW()
    `;
    
    return await this.query(sql, [
      simulationId,
      species.name,
      species.populationCount,
      species.generationSpan,
      species.extinctionRisk,
      species.ecologicalNiche,
      JSON.stringify(species.averageTrait)
    ]);
  }

  async getSpeciesBySimulation(simulationId) {
    const sql = 'SELECT * FROM species WHERE simulation_id = ? ORDER BY population_count DESC';
    const results = await this.query(sql, [simulationId]);
    
    return results.map(row => ({
      ...row,
      traits: JSON.parse(row.traits || '{}')
    }));
  }

  // Individual Management
  async saveIndividual(individual) {
    const sql = `
      INSERT INTO individuals (species_id, name, age, energy, position_x, position_y,
                              generation, genome, phenotype, is_alive, birth_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    return await this.query(sql, [
      individual.speciesId,
      individual.name,
      individual.age,
      individual.energy,
      individual.position.x,
      individual.position.y,
      individual.generation,
      JSON.stringify(individual.genome),
      JSON.stringify(individual.phenotype),
      individual.isAlive,
      individual.birthTime
    ]);
  }

  async updateIndividual(id, data) {
    const sql = `
      UPDATE individuals 
      SET age = ?, energy = ?, position_x = ?, position_y = ?, 
          is_alive = ?, death_time = ?, cause_of_death = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    return await this.query(sql, [
      data.age,
      data.energy,
      data.position.x,
      data.position.y,
      data.isAlive,
      data.deathTime,
      data.causeOfDeath,
      id
    ]);
  }

  // Evolution History
  async saveEvolutionSnapshot(simulationId, generation, data) {
    const sql = `
      INSERT INTO evolution_history (simulation_id, generation, population_count,
                                   species_count, average_fitness, genetic_diversity,
                                   mutations_count, reproductions_count, environment_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    return await this.query(sql, [
      simulationId,
      generation,
      data.populationCount,
      data.speciesCount,
      data.averageFitness,
      data.geneticDiversity,
      data.mutationsCount,
      data.reproductionsCount,
      JSON.stringify(data.environment)
    ]);
  }

  async getEvolutionHistory(simulationId, limit = 100) {
    const sql = `
      SELECT * FROM evolution_history 
      WHERE simulation_id = ? 
      ORDER BY generation DESC 
      LIMIT ?
    `;
    
    const results = await this.query(sql, [simulationId, limit]);
    return results.map(row => ({
      ...row,
      environment_data: JSON.parse(row.environment_data || '{}')
    }));
  }

  // Analytics and Statistics
  async getSimulationStats(simulationId) {
    const sql = `
      SELECT 
        s.name, s.generation, s.population_count, s.status,
        COUNT(sp.id) as species_count,
        COUNT(i.id) as total_individuals,
        AVG(i.energy) as avg_energy,
        MAX(eh.generation) as max_generation
      FROM simulations s
      LEFT JOIN species sp ON s.id = sp.simulation_id
      LEFT JOIN individuals i ON sp.id = i.species_id AND i.is_alive = 1
      LEFT JOIN evolution_history eh ON s.id = eh.simulation_id
      WHERE s.id = ?
      GROUP BY s.id
    `;
    
    const results = await this.query(sql, [simulationId]);
    return results[0];
  }

  async getPopulationTrends(simulationId, generations = 50) {
    const sql = `
      SELECT generation, population_count, species_count, average_fitness, genetic_diversity
      FROM evolution_history
      WHERE simulation_id = ?
      ORDER BY generation DESC
      LIMIT ?
    `;
    
    return await this.query(sql, [simulationId, generations]);
  }

  // Real-time Performance Monitoring
  async logPerformanceMetrics(simulationId, metrics) {
    const sql = `
      INSERT INTO performance_logs (simulation_id, cpu_usage, memory_usage, 
                                  fps, generations_per_second, timestamp)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    return await this.query(sql, [
      simulationId,
      metrics.cpuUsage,
      metrics.memoryUsage,
      metrics.frameRate,
      metrics.generationsPerSecond
    ]);
  }

  async getRecentPerformanceMetrics(simulationId, minutes = 5) {
    const sql = `
      SELECT * FROM performance_logs
      WHERE simulation_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY timestamp DESC
    `;
    
    return await this.query(sql, [simulationId, minutes]);
  }

  // Cleanup and Maintenance
  async cleanupOldData(daysOld = 30) {
    const sqls = [
      'DELETE FROM performance_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      'DELETE FROM evolution_history WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      'DELETE FROM individuals WHERE death_time IS NOT NULL AND death_time < DATE_SUB(NOW(), INTERVAL ? DAY)'
    ];
    
    let deletedRows = 0;
    for (const sql of sqls) {
      const result = await this.query(sql, [daysOld]);
      deletedRows += result.affectedRows || 0;
    }
    
    console.log(`🧹 Cleaned up ${deletedRows} old records`);
    return deletedRows;
  }
}

module.exports = new DatabaseService();