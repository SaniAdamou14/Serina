const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
  const config = {
    host: 'localhost',
    user: 'root',
    password: '', // WAMP default
    multipleStatements: true
  };

  let connection;

  try {
    console.log('🔗 Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    
    console.log('🗄️ Creating database serina_evolution...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS serina_evolution');
    await connection.execute('USE serina_evolution');
    
    // Créer les tables
    console.log('📊 Creating tables...');
    
    // Table des espèces
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS species (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        generation INT NOT NULL DEFAULT 0,
        population_size INT NOT NULL DEFAULT 0,
        fitness_average DECIMAL(10,6) DEFAULT 0,
        genetic_diversity DECIMAL(10,6) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_generation (generation),
        INDEX idx_fitness (fitness_average)
      )
    `);
    
    // Table des génomes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS genomes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        species_id INT NOT NULL,
        generation INT NOT NULL,
        individual_id VARCHAR(50) NOT NULL,
        genome_data JSON NOT NULL,
        fitness_score DECIMAL(10,6) DEFAULT 0,
        phenotype_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
        INDEX idx_species_generation (species_id, generation),
        INDEX idx_fitness_score (fitness_score)
      )
    `);
    
    // Table de l'évolution historique
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS evolution_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        species_id INT NOT NULL,
        generation INT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        population_size INT NOT NULL,
        fitness_average DECIMAL(10,6) NOT NULL,
        fitness_max DECIMAL(10,6) NOT NULL,
        fitness_min DECIMAL(10,6) NOT NULL,
        genetic_diversity DECIMAL(10,6) NOT NULL,
        mutation_rate DECIMAL(8,6) NOT NULL,
        selection_pressure DECIMAL(8,6) NOT NULL,
        environment_data JSON,
        statistics JSON,
        FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
        INDEX idx_species_generation (species_id, generation),
        INDEX idx_timestamp (timestamp)
      )
    `);
    
    // Table des métriques de performance
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        frame_rate DECIMAL(8,2) DEFAULT 0,
        cpu_usage DECIMAL(5,2) DEFAULT 0,
        memory_usage DECIMAL(10,2) DEFAULT 0,
        network_latency DECIMAL(8,2) DEFAULT 0,
        evolution_rate DECIMAL(8,2) DEFAULT 0,
        database_operations INT DEFAULT 0,
        active_connections INT DEFAULT 0,
        simulation_load DECIMAL(5,2) DEFAULT 0,
        INDEX idx_timestamp (timestamp)
      )
    `);
    
    // Table des événements du système
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        event_type ENUM('evolution', 'mutation', 'selection', 'reproduction', 'extinction', 'system', 'error') NOT NULL,
        species_id INT,
        generation INT,
        description TEXT,
        data JSON,
        severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
        FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL,
        INDEX idx_timestamp (timestamp),
        INDEX idx_event_type (event_type),
        INDEX idx_severity (severity)
      )
    `);
    
    // Table de configuration
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS simulation_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_name VARCHAR(100) NOT NULL UNIQUE,
        config_data JSON NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active)
      )
    `);
    
    console.log('🌱 Inserting initial data...');
    
    // Insérer une configuration par défaut
    await connection.execute(`
      INSERT IGNORE INTO simulation_config (config_name, config_data, is_active) VALUES (
        'default',
        '{"populationSize": 100, "mutationRate": 0.1, "selectionPressure": 0.3, "maxGenerations": 1000, "environmentType": "stable"}',
        TRUE
      )
    `);
    
    // Insérer une espèce de base
    await connection.execute(`
      INSERT IGNORE INTO species (name, generation, population_size, fitness_average, genetic_diversity) VALUES 
      ('Serina_Default', 0, 100, 0.5, 0.8)
    `);
    
    console.log('✅ Database initialization completed successfully!');
    console.log('📋 Created tables:');
    console.log('  - species');
    console.log('  - genomes');
    console.log('  - evolution_history');
    console.log('  - performance_metrics');
    console.log('  - system_events');
    console.log('  - simulation_config');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Exécuter l'initialisation si le script est appelé directement
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };