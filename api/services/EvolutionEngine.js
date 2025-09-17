import winston from 'winston';
import { performance } from 'perf_hooks';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export class EvolutionEngine {
  constructor(databaseService, simulationService) {
    this.db = databaseService;
    this.simulation = simulationService;
    this.isRunning = false;
    this.currentSimulationId = null;
    this.evolutionInterval = null;
    this.evolutionSpeed = 1000; // ms between generations
    this.maxGenerations = 10000;
    this.autoSave = true;
    
    // Evolution parameters
    this.mutationRate = 0.05;
    this.crossoverRate = 0.7;
    this.selectionPressure = 0.8;
    this.elitismRate = 0.1;
    
    // Environmental factors
    this.environmentalPressure = 0.3;
    this.seasonalCycles = true;
    this.resourceFluctuations = true;
    
    // Performance tracking
    this.generationCount = 0;
    this.startTime = null;
    this.lastGenerationTime = null;
    
    // Evolution statistics
    this.stats = {
      totalMutations: 0,
      totalReproductions: 0,
      totalDeaths: 0,
      totalBirths: 0,
      extinctions: 0,
      speciations: 0
    };
  }

  async initialize() {
    try {
      logger.info('Initializing Evolution Engine...');
      
      // Load evolution parameters from database if available
      await this.loadEvolutionConfig();
      
      logger.info('Evolution Engine initialized successfully');
      return true;
    } catch (error) {
      logger.error('Evolution Engine initialization failed:', error);
      throw error;
    }
  }

  async loadEvolutionConfig() {
    try {
      // Try to load evolution configuration from the most recent simulation
      const simulations = await this.db.getSimulations();
      if (simulations.length > 0) {
        const latestSim = simulations[0];
        this.mutationRate = latestSim.mutation_rate || 0.05;
        this.crossoverRate = latestSim.crossover_rate || 0.7;
        this.currentSimulationId = latestSim.id;
      }
    } catch (error) {
      logger.warn('Could not load evolution config, using defaults:', error.message);
    }
  }

  async startContinuousEvolution(simulationId = null) {
    if (this.isRunning) {
      logger.warn('Evolution already running');
      return false;
    }

    try {
      this.currentSimulationId = simulationId || this.currentSimulationId;
      
      if (!this.currentSimulationId) {
        // Create a new simulation if none exists
        this.currentSimulationId = await this.createDefaultSimulation();
      }

      // Initialize simulation state
      await this.initializeSimulationState();
      
      this.isRunning = true;
      this.startTime = Date.now();
      this.generationCount = 0;
      
      logger.info(`Starting continuous evolution for simulation ${this.currentSimulationId}`);
      
      // Start evolution loop
      this.evolutionInterval = setInterval(async () => {
        await this.executeEvolutionStep();
      }, this.evolutionSpeed);
      
      return true;
    } catch (error) {
      logger.error('Failed to start continuous evolution:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stopEvolution() {
    if (!this.isRunning) {
      return false;
    }

    this.isRunning = false;
    
    if (this.evolutionInterval) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = null;
    }

    logger.info(`Evolution stopped after ${this.generationCount} generations`);
    
    // Save final state
    if (this.autoSave) {
      await this.saveFinalState();
    }
    
    return true;
  }

  async executeEvolutionStep() {
    if (!this.isRunning) return;

    const stepStartTime = performance.now();
    
    try {
      // Get current simulation state
      const simulation = await this.db.getSimulation(this.currentSimulationId);
      if (!simulation || !simulation.is_active) {
        logger.warn('Simulation not active, stopping evolution');
        await this.stopEvolution();
        return;
      }

      const currentGeneration = simulation.current_generation || 0;
      const newGeneration = currentGeneration + 1;

      // Get current species
      const species = await this.db.getSpecies(this.currentSimulationId);
      
      if (species.length === 0) {
        logger.warn('No species found, creating initial population');
        await this.createInitialPopulation();
        return;
      }

      // Execute evolution for each species
      const evolutionResults = [];
      
      for (const speciesData of species) {
        const result = await this.evolveSpecies(speciesData, newGeneration);
        evolutionResults.push(result);
      }

      // Update environmental conditions
      await this.updateEnvironment(newGeneration);

      // Record evolution events
      await this.recordGenerationEvents(newGeneration, evolutionResults);

      // Update simulation generation
      await this.db.updateSimulation(this.currentSimulationId, {
        current_generation: newGeneration,
        total_population: evolutionResults.reduce((sum, r) => sum + r.population, 0)
      });

      // Track performance
      const stepTime = performance.now() - stepStartTime;
      await this.recordPerformanceMetrics(newGeneration, stepTime);

      this.generationCount++;
      this.lastGenerationTime = Date.now();

      // Check stopping conditions
      if (this.generationCount >= this.maxGenerations) {
        logger.info(`Reached maximum generations (${this.maxGenerations}), stopping evolution`);
        await this.stopEvolution();
      }

    } catch (error) {
      logger.error('Evolution step failed:', error);
      
      // Continue evolution unless critical error
      if (error.message.includes('database') || error.message.includes('connection')) {
        logger.error('Critical error, stopping evolution');
        await this.stopEvolution();
      }
    }
  }

  async evolveSpecies(speciesData, generation) {
    const speciesId = speciesData.id;
    const currentPopulation = speciesData.population_count;
    
    // Get individuals for this species
    const individuals = await this.db.getIndividuals(speciesId, 1000);
    
    // Calculate fitness for each individual
    const populationWithFitness = await this.calculatePopulationFitness(individuals, generation);
    
    // Apply selection pressure
    const survivors = this.selectSurvivors(populationWithFitness);
    
    // Perform reproduction
    const offspring = await this.reproduce(survivors, speciesId, generation);
    
    // Apply mutations
    const mutatedOffspring = await this.applyMutations(offspring);
    
    // Update species traits based on new population
    const newTraits = this.calculateAverageTraits([...survivors, ...mutatedOffspring]);
    await this.db.recordSpeciesTraits(speciesId, generation, newTraits);
    
    // Calculate new population metrics
    const newPopulation = survivors.length + mutatedOffspring.length;
    const avgFitness = this.calculateAverageFitness([...survivors, ...mutatedOffspring]);
    const extinctionRisk = this.calculateExtinctionRisk(newPopulation, avgFitness, newTraits);
    
    // Update species data
    await this.db.updateSpecies(speciesId, {
      population_count: newPopulation,
      avg_fitness: avgFitness,
      extinction_risk: extinctionRisk,
      generation_span: generation
    });

    // Record deaths and births
    const deaths = currentPopulation - survivors.length;
    const births = mutatedOffspring.length;
    
    this.stats.totalDeaths += deaths;
    this.stats.totalBirths += births;
    this.stats.totalReproductions += Math.floor(offspring.length / 2);

    return {
      speciesId,
      population: newPopulation,
      avgFitness,
      extinctionRisk,
      deaths,
      births,
      mutations: mutatedOffspring.filter(o => o.mutations > 0).length,
      traits: newTraits
    };
  }

  async calculatePopulationFitness(individuals, generation) {
    // Get environmental conditions for fitness calculation
    const environment = await this.db.getEnvironmentConditions(this.currentSimulationId, generation - 1);
    
    return individuals.map(individual => {
      const traits = {
        size: individual.trait_size || 0.5,
        speed: individual.trait_speed || 0.5,
        intelligence: individual.trait_intelligence || 0.5,
        adaptability: individual.trait_adaptability || 0.5
      };
      
      // Calculate fitness based on traits and environment
      let fitness = 0.5; // Base fitness
      
      // Environmental fitness factors
      if (environment) {
        // Temperature adaptation
        const tempOptimal = 0.6; // Optimal temperature preference
        const tempFactor = 1 - Math.abs((environment.temperature / 40.0) - tempOptimal);
        fitness += tempFactor * traits.adaptability * 0.2;
        
        // Resource competition
        const resourceFactor = environment.resource_abundance;
        fitness += resourceFactor * (traits.intelligence + traits.size) * 0.15;
        
        // Predation survival
        const predationSurvival = 1 - environment.predation_pressure;
        fitness += predationSurvival * (traits.speed + traits.size) * 0.15;
        
        // Disease resistance
        const diseaseResistance = 1 - environment.disease_load;
        fitness += diseaseResistance * 0.1;
      }
      
      // Age factor (younger individuals have slight advantage)
      const ageFactor = Math.max(0.5, 1 - (individual.age / 100));
      fitness *= ageFactor;
      
      // Energy factor
      const energyFactor = Math.min(1, individual.energy / 100);
      fitness *= energyFactor;
      
      // Normalize fitness between 0 and 1
      fitness = Math.max(0, Math.min(1, fitness));
      
      return {
        ...individual,
        fitness_score: fitness,
        traits
      };
    });
  }

  selectSurvivors(populationWithFitness) {
    // Sort by fitness
    const sorted = populationWithFitness.sort((a, b) => b.fitness_score - a.fitness_score);
    
    // Elite selection - keep top performers
    const eliteCount = Math.floor(sorted.length * this.elitismRate);
    const elite = sorted.slice(0, eliteCount);
    
    // Tournament selection for the rest
    const tournamentSize = 3;
    const targetSurvivors = Math.floor(sorted.length * this.selectionPressure);
    const nonElite = sorted.slice(eliteCount);
    const additionalSurvivors = [];
    
    while (additionalSurvivors.length < (targetSurvivors - eliteCount) && nonElite.length > 0) {
      // Tournament selection
      const tournament = [];
      for (let i = 0; i < Math.min(tournamentSize, nonElite.length); i++) {
        const randomIndex = Math.floor(Math.random() * nonElite.length);
        tournament.push(nonElite[randomIndex]);
      }
      
      // Select best from tournament
      const winner = tournament.reduce((best, current) => 
        current.fitness_score > best.fitness_score ? current : best
      );
      
      additionalSurvivors.push(winner);
      
      // Remove winner from nonElite pool
      const winnerIndex = nonElite.indexOf(winner);
      if (winnerIndex > -1) {
        nonElite.splice(winnerIndex, 1);
      }
    }
    
    return [...elite, ...additionalSurvivors];
  }

  async reproduce(survivors, speciesId, generation) {
    const offspring = [];
    const targetOffspring = Math.floor(survivors.length * 1.5); // Aim for population growth
    
    while (offspring.length < targetOffspring) {
      // Select two parents
      const parent1 = this.selectParent(survivors);
      const parent2 = this.selectParent(survivors);
      
      if (parent1.id === parent2.id) continue; // Avoid self-reproduction
      
      // Crossover
      if (Math.random() < this.crossoverRate) {
        const child = await this.crossover(parent1, parent2, speciesId, generation);
        offspring.push(child);
      }
    }
    
    return offspring;
  }

  selectParent(survivors) {
    // Weighted selection based on fitness
    const totalFitness = survivors.reduce((sum, s) => sum + s.fitness_score, 0);
    let random = Math.random() * totalFitness;
    
    for (const survivor of survivors) {
      random -= survivor.fitness_score;
      if (random <= 0) {
        return survivor;
      }
    }
    
    return survivors[survivors.length - 1]; // Fallback
  }

  async crossover(parent1, parent2, speciesId, generation) {
    const traits = {};
    const traitNames = ['size', 'speed', 'intelligence', 'adaptability'];
    
    // Genetic crossover
    traitNames.forEach(trait => {
      const p1Value = parent1.traits[trait] || 0.5;
      const p2Value = parent2.traits[trait] || 0.5;
      
      // Random crossover point
      if (Math.random() < 0.5) {
        traits[trait] = p1Value;
      } else {
        traits[trait] = p2Value;
      }
      
      // Add some genetic variation
      const variation = (Math.random() - 0.5) * 0.1;
      traits[trait] = Math.max(0, Math.min(1, traits[trait] + variation));
    });
    
    // Create child individual
    const child = {
      species_id: speciesId,
      individual_name: `Gen${generation}_${Math.random().toString(36).substr(2, 9)}`,
      genome_id: `genome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parent1_id: parent1.genome_id,
      parent2_id: parent2.genome_id,
      generation: generation,
      age: 0,
      energy: 100.0,
      position_x: Math.random() * 1920,
      position_y: Math.random() * 1080,
      birth_time: Date.now(),
      fitness_score: 0.5,
      genome: traits,
      traits: traits,
      mutations: 0
    };
    
    return child;
  }

  async applyMutations(offspring) {
    const mutated = [];
    
    for (const individual of offspring) {
      let mutationCount = 0;
      const mutatedTraits = { ...individual.traits };
      
      Object.keys(mutatedTraits).forEach(trait => {
        if (Math.random() < this.mutationRate) {
          // Apply mutation
          const mutationStrength = (Math.random() - 0.5) * 0.2; // ±10% mutation
          mutatedTraits[trait] = Math.max(0, Math.min(1, mutatedTraits[trait] + mutationStrength));
          mutationCount++;
        }
      });
      
      // Create mutated individual
      const mutatedIndividual = {
        ...individual,
        traits: mutatedTraits,
        genome: mutatedTraits,
        mutations: mutationCount
      };
      
      // Store in database
      await this.db.createIndividual(mutatedIndividual);
      
      mutated.push(mutatedIndividual);
      
      if (mutationCount > 0) {
        this.stats.totalMutations += mutationCount;
      }
    }
    
    return mutated;
  }

  calculateAverageTraits(population) {
    if (population.length === 0) {
      return {
        size: 0.5, speed: 0.5, intelligence: 0.5, adaptability: 0.5,
        strength: 0.5, longevity: 0.5, resistance: 0.5, metabolism: 0.5,
        sociability: 0.5, vision_range: 0.5, camouflage: 0.5, reproduction_rate: 0.5
      };
    }
    
    const totals = {
      size: 0, speed: 0, intelligence: 0, adaptability: 0,
      strength: 0, longevity: 0, resistance: 0, metabolism: 0,
      sociability: 0, vision_range: 0, camouflage: 0, reproduction_rate: 0
    };
    
    population.forEach(individual => {
      Object.keys(totals).forEach(trait => {
        totals[trait] += individual.traits[trait] || 0.5;
      });
    });
    
    Object.keys(totals).forEach(trait => {
      totals[trait] /= population.length;
    });
    
    return totals;
  }

  calculateAverageFitness(population) {
    if (population.length === 0) return 0.5;
    
    const totalFitness = population.reduce((sum, individual) => sum + individual.fitness_score, 0);
    return totalFitness / population.length;
  }

  calculateExtinctionRisk(population, avgFitness, traits) {
    let risk = 0;
    
    // Population size risk
    if (population < 10) risk += 0.5;
    else if (population < 50) risk += 0.2;
    else if (population < 100) risk += 0.1;
    
    // Fitness risk
    if (avgFitness < 0.3) risk += 0.3;
    else if (avgFitness < 0.5) risk += 0.1;
    
    // Trait diversity risk (genetic bottleneck)
    const traitVariance = this.calculateTraitVariance(traits);
    if (traitVariance < 0.05) risk += 0.2;
    
    return Math.min(1, risk);
  }

  calculateTraitVariance(traits) {
    const values = Object.values(traits);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  async updateEnvironment(generation) {
    // Simulate seasonal changes
    const seasonCycle = (generation % 100) / 25; // 4 seasons per 100 generations
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    const season = seasons[Math.floor(seasonCycle)];
    
    // Base environmental conditions
    const environment = {
      temperature: 20 + Math.sin(seasonCycle * Math.PI * 2) * 10, // 10-30°C cycle
      humidity: 0.5 + Math.sin(seasonCycle * Math.PI * 2) * 0.2,
      precipitation: 0.3 + Math.sin(seasonCycle * Math.PI * 2) * 0.3,
      resource_abundance: 0.8 + Math.sin(seasonCycle * Math.PI * 2) * 0.2,
      predation_pressure: 0.3 + Math.random() * 0.2,
      disease_load: 0.1 + Math.random() * 0.1,
      seasonal_modifier: Math.sin(seasonCycle * Math.PI * 2),
      day_night_cycle: 0.5,
      season: season
    };
    
    // Add random fluctuations
    if (this.resourceFluctuations) {
      environment.resource_abundance += (Math.random() - 0.5) * 0.1;
      environment.resource_abundance = Math.max(0.1, Math.min(1, environment.resource_abundance));
    }
    
    await this.db.updateEnvironmentConditions(this.currentSimulationId, generation, environment);
  }

  async recordGenerationEvents(generation, evolutionResults) {
    for (const result of evolutionResults) {
      // Record generation completion
      await this.db.recordEvolutionEvent({
        simulation_id: this.currentSimulationId,
        species_id: result.speciesId,
        event_type: 'reproduction',
        generation: generation,
        description: `Generation ${generation} completed for species ${result.speciesId}`,
        metadata: {
          population: result.population,
          avgFitness: result.avgFitness,
          extinctionRisk: result.extinctionRisk,
          births: result.births,
          deaths: result.deaths,
          mutations: result.mutations
        }
      });
      
      // Record extinctions
      if (result.extinctionRisk > 0.8) {
        await this.db.recordEvolutionEvent({
          simulation_id: this.currentSimulationId,
          species_id: result.speciesId,
          event_type: 'extinction',
          generation: generation,
          description: `Species ${result.speciesId} at high extinction risk`,
          metadata: { extinctionRisk: result.extinctionRisk }
        });
      }
    }
  }

  async recordPerformanceMetrics(generation, stepTimeMs) {
    const now = Date.now();
    const generationsPerSecond = this.generationCount > 0 ? 
      this.generationCount / ((now - this.startTime) / 1000) : 0;
    
    const memoryUsage = process.memoryUsage();
    
    await this.db.recordPerformanceMetrics({
      simulation_id: this.currentSimulationId,
      generation: generation,
      generations_per_second: generationsPerSecond,
      memory_usage: memoryUsage.heapUsed / 1024 / 1024, // MB
      cpu_usage: stepTimeMs,
      frame_rate: 1000 / stepTimeMs,
      active_individuals: 0, // Will be calculated
      mutations_per_generation: this.stats.totalMutations,
      reproductions_per_generation: this.stats.totalReproductions
    });
  }

  async createDefaultSimulation() {
    const simulationData = {
      name: `Continuous Evolution ${new Date().toISOString()}`,
      description: 'Automated continuous evolution simulation',
      world_width: 1920,
      world_height: 1080,
      max_population: 10000,
      mutation_rate: this.mutationRate,
      crossover_rate: this.crossoverRate
    };
    
    return await this.db.createSimulation(simulationData);
  }

  async initializeSimulationState() {
    // Check if simulation has species
    const species = await this.db.getSpecies(this.currentSimulationId);
    
    if (species.length === 0) {
      await this.createInitialPopulation();
    }
  }

  async createInitialPopulation() {
    // Create initial species
    const speciesData = {
      simulation_id: this.currentSimulationId,
      species_name: 'Serina Genesis',
      ecological_niche: 'Generalist',
      population_count: 100,
      generation_span: 0,
      extinction_risk: 0.0,
      avg_fitness: 0.5
    };
    
    const speciesId = await this.db.createSpecies(speciesData);
    
    // Create initial individuals
    for (let i = 0; i < 100; i++) {
      const individual = {
        species_id: speciesId,
        individual_name: `Genesis_${i}`,
        genome_id: `genesis_genome_${i}`,
        generation: 0,
        age: Math.floor(Math.random() * 20),
        energy: 80 + Math.random() * 40,
        position_x: Math.random() * 1920,
        position_y: Math.random() * 1080,
        birth_time: Date.now(),
        fitness_score: 0.4 + Math.random() * 0.4,
        genome: {
          size: 0.3 + Math.random() * 0.4,
          speed: 0.3 + Math.random() * 0.4,
          intelligence: 0.3 + Math.random() * 0.4,
          adaptability: 0.3 + Math.random() * 0.4,
          strength: 0.3 + Math.random() * 0.4,
          longevity: 0.3 + Math.random() * 0.4,
          resistance: 0.3 + Math.random() * 0.4,
          metabolism: 0.3 + Math.random() * 0.4,
          sociability: 0.3 + Math.random() * 0.4,
          vision_range: 0.3 + Math.random() * 0.4,
          camouflage: 0.3 + Math.random() * 0.4,
          reproduction_rate: 0.3 + Math.random() * 0.4
        }
      };
      
      await this.db.createIndividual(individual);
    }
    
    logger.info(`Created initial population of 100 individuals for species ${speciesId}`);
  }

  async saveFinalState() {
    const simulation = await this.db.getSimulation(this.currentSimulationId);
    
    // Update simulation with final stats
    await this.db.updateSimulation(this.currentSimulationId, {
      is_active: false
    });
    
    // Record final evolution event
    await this.db.recordEvolutionEvent({
      simulation_id: this.currentSimulationId,
      event_type: 'evolution_complete',
      generation: simulation.current_generation,
      description: `Evolution completed after ${this.generationCount} generations`,
      metadata: {
        totalGenerations: this.generationCount,
        totalTime: Date.now() - this.startTime,
        finalStats: this.stats
      }
    });
    
    logger.info('Final simulation state saved');
  }

  // Public getters
  isRunning() {
    return this.isRunning;
  }

  getCurrentSimulation() {
    return this.currentSimulationId;
  }

  getGenerationCount() {
    return this.generationCount;
  }

  getStats() {
    return {
      ...this.stats,
      generationCount: this.generationCount,
      runtime: this.startTime ? Date.now() - this.startTime : 0,
      generationsPerSecond: this.generationCount > 0 && this.startTime ? 
        this.generationCount / ((Date.now() - this.startTime) / 1000) : 0
    };
  }

  // Configuration methods
  setEvolutionSpeed(speedMs) {
    this.evolutionSpeed = Math.max(100, speedMs);
    
    if (this.isRunning && this.evolutionInterval) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = setInterval(async () => {
        await this.executeEvolutionStep();
      }, this.evolutionSpeed);
    }
  }

  setMutationRate(rate) {
    this.mutationRate = Math.max(0, Math.min(1, rate));
  }

  setCrossoverRate(rate) {
    this.crossoverRate = Math.max(0, Math.min(1, rate));
  }

  async stop() {
    return await this.stopEvolution();
  }
}