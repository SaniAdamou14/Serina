const mysql = require('mysql2/promise');

async function initializeDatabaseFromAPI() {
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
    await connection.query('CREATE DATABASE IF NOT EXISTS serina_evolution');
    await connection.query('USE serina_evolution');
    
    console.log('📊 Creating schema exactly as API expects...');
    
    // Utilisons exactement le même schéma que l'API dans ensureSchema()
    const ddl = [
      `CREATE TABLE IF NOT EXISTS simulations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        config JSON NULL,
        generation INT DEFAULT 0,
        population_count INT DEFAULT 0,
        species_count INT DEFAULT 0,
        status VARCHAR(32) DEFAULT 'created',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS species (
        id INT AUTO_INCREMENT PRIMARY KEY,
        simulation_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        population_count INT DEFAULT 0,
        generation_span INT DEFAULT 0,
        extinction_risk FLOAT DEFAULT 0,
        ecological_niche VARCHAR(128) DEFAULT 'generalist',
        traits JSON NULL,
        fitness_average FLOAT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (simulation_id),
        CONSTRAINT fk_species_sim FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS individuals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        species_id INT NOT NULL,
        name VARCHAR(255) NULL,
        age INT DEFAULT 0,
        energy FLOAT DEFAULT 0,
        position_x FLOAT DEFAULT 0,
        position_y FLOAT DEFAULT 0,
        generation INT DEFAULT 0,
        traits JSON NULL,
        genome JSON NULL,
        phenotype JSON NULL,
        is_alive TINYINT(1) DEFAULT 1,
        birth_time DATETIME NULL,
        death_time DATETIME NULL,
        cause_of_death VARCHAR(255) NULL,
        parent1_id INT NULL,
        parent2_id INT NULL,
        fitness_score FLOAT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (species_id),
        CONSTRAINT fk_individuals_species FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS evolution_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        simulation_id INT NOT NULL,
        generation INT NOT NULL,
        population_count INT DEFAULT 0,
        species_count INT DEFAULT 0,
        average_fitness FLOAT DEFAULT 0,
        genetic_diversity FLOAT DEFAULT 0,
        mutations_count INT DEFAULT 0,
        reproductions_count INT DEFAULT 0,
        environment_data JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (simulation_id),
        CONSTRAINT fk_eh_sim FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS performance_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        simulation_id INT NOT NULL,
        cpu_usage FLOAT DEFAULT 0,
        memory_usage FLOAT DEFAULT 0,
        fps FLOAT DEFAULT 0,
        generations_per_second FLOAT DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (simulation_id),
        CONSTRAINT fk_pl_sim FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS environment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        simulation_id INT NOT NULL,
        temperature FLOAT DEFAULT 20,
        humidity FLOAT DEFAULT 0.6,
        oxygen_level FLOAT DEFAULT 0.21,
        radiation_level FLOAT DEFAULT 0.0,
        food_availability FLOAT DEFAULT 0.7,
        water_availability FLOAT DEFAULT 0.8,
        predator_pressure FLOAT DEFAULT 0.3,
        competition_level FLOAT DEFAULT 0.5,
        seasonal_factor FLOAT DEFAULT 1.0,
        disaster_probability FLOAT DEFAULT 0.01,
        width INT DEFAULT 1920,
        height INT DEFAULT 1080,
        food_sources JSON NULL,
        water_sources JSON NULL,
        shelter_areas JSON NULL,
        danger_zones JSON NULL,
        change_history JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_env_sim (simulation_id),
        CONSTRAINT fk_env_sim FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS evolution_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        simulation_id INT NOT NULL,
        species_id INT NULL,
        event_type VARCHAR(64) NOT NULL,
        event_data JSON NULL,
        generation INT DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (simulation_id),
        INDEX (species_id),
        CONSTRAINT fk_ev_sim FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
        CONSTRAINT fk_ev_species FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS species_traits_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        species_id INT NOT NULL,
        simulation_id INT NOT NULL,
        generation INT NOT NULL,
        population_count INT DEFAULT 0,
        avg_size FLOAT DEFAULT 0,
        avg_speed FLOAT DEFAULT 0,
        avg_intelligence FLOAT DEFAULT 0,
        avg_endurance FLOAT DEFAULT 0,
        avg_aggression FLOAT DEFAULT 0,
        avg_sociability FLOAT DEFAULT 0,
        avg_fertility FLOAT DEFAULT 0,
        avg_longevity FLOAT DEFAULT 0,
        avg_adaptation FLOAT DEFAULT 0,
        avg_resistance FLOAT DEFAULT 0,
        fitness_average FLOAT DEFAULT 0,
        genetic_diversity FLOAT DEFAULT 0,
        mutation_rate FLOAT DEFAULT 0,
        extinction_risk FLOAT DEFAULT 0,
        traits_data JSON NULL,
        environmental_pressures JSON NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (species_id, generation),
        INDEX (simulation_id, generation),
        INDEX (generation),
        CONSTRAINT fk_sth_species FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
        CONSTRAINT fk_sth_sim FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];

    for (const stmt of ddl) {
      await connection.query(stmt);
    }

    console.log('🌱 Inserting initial data...');
    
    // Simulation par défaut
    await connection.query("INSERT INTO simulations (id, name, status) VALUES (1, 'Default Serina Simulation', 'created')");
    
    // Environnement par défaut
    await connection.query('INSERT INTO environment (simulation_id) VALUES (1)');
    
    // Espèce initiale
    await connection.query(`
      INSERT INTO species (simulation_id, name, population_count, fitness_average, traits) VALUES 
      (1, 'Serina_Default', 100, 0.5, '{"size": 1.0, "speed": 1.0, "intelligence": 1.0}')
    `);
    
    console.log('✅ Database initialization completed successfully!');
    console.log('📋 Created tables compatible with API:');
    console.log('  - simulations');
    console.log('  - species (with simulation_id)');
    console.log('  - individuals');
    console.log('  - evolution_history');
    console.log('  - performance_logs'); 
    console.log('  - environment');
    console.log('  - evolution_events');
    console.log('  - species_traits_history');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  } finally {
    if (connection) {
      console.log('🔌 Database connection closed');
      await connection.end();
    }
  }
}

initializeDatabaseFromAPI()
  .then(() => {
    console.log('🎉 Database setup complete and ready for API!');
  })
  .catch(error => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });