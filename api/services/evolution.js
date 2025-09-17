const EventEmitter = require('events');
const DatabaseService = require('./database');
const { TraitType } = require('../models/Species');

class EvolutionEngine extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.simulationSpeed = 1.0;
    this.generation = 0;
    this.populationLimit = 10000;
    this.mutationRate = 0.05;
    this.reproductionThreshold = 75;
    this.db = new DatabaseService();
    this.lastUpdate = Date.now();
    this.updateInterval = null;
  }

  async initialize() {
    try {
      console.log('🧬 Initializing Evolution Engine...');
      await this.db.connect();
      
      // Créer la population initiale si elle n'existe pas
      const existingPopulation = await this.db.getPopulation();
      if (existingPopulation.length === 0) {
        await this.createInitialPopulation();
      }
      
      console.log('✅ Evolution Engine initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Evolution Engine:', error);
      throw error;
    }
  }

  async createInitialPopulation() {
    console.log('🌱 Creating initial population...');
    
    const species = [
      {
        name: 'Serina Alpha',
        traits: this.generateRandomTraits(),
        energy: 100,
        position: { x: Math.random() * 1920, y: Math.random() * 1080 }
      },
      {
        name: 'Serina Beta', 
        traits: this.generateRandomTraits(),
        energy: 100,
        position: { x: Math.random() * 1920, y: Math.random() * 1080 }
      },
      {
        name: 'Serina Gamma',
        traits: this.generateRandomTraits(),
        energy: 100,
        position: { x: Math.random() * 1920, y: Math.random() * 1080 }
      }
    ];

    for (let i = 0; i < 100; i++) {
      const baseSpecies = species[i % species.length];
      const individual = {
        name: `${baseSpecies.name}_${i}`,
        species_id: (i % species.length) + 1,
        traits: this.mutateTraits(baseSpecies.traits),
        energy: baseSpecies.energy + (Math.random() - 0.5) * 20,
        position_x: baseSpecies.position.x + (Math.random() - 0.5) * 100,
        position_y: baseSpecies.position.y + (Math.random() - 0.5) * 100,
        generation: 0,
        is_alive: true
      };
      
      await this.db.createIndividual(individual);
    }

    console.log('✅ Initial population created');
  }

  generateRandomTraits() {
    const traits = {};
    Object.values(TraitType).forEach(trait => {
      traits[trait] = Math.random();
    });
    return traits;
  }

  mutateTraits(parentTraits, mutationRate = this.mutationRate) {
    const newTraits = { ...parentTraits };
    
    Object.keys(newTraits).forEach(trait => {
      if (Math.random() < mutationRate) {
        // Mutation gaussienne
        const mutation = (Math.random() - 0.5) * 0.2;
        newTraits[trait] = Math.max(0, Math.min(1, newTraits[trait] + mutation));
      }
    });
    
    return newTraits;
  }

  async start() {
    if (this.isRunning) return;
    
    console.log('▶️ Starting Evolution Engine...');
    this.isRunning = true;
    this.lastUpdate = Date.now();
    
    // Mettre à jour toutes les 100ms (ajustable selon la vitesse)
    this.updateInterval = setInterval(() => {
      this.evolutionStep();
    }, 100 / this.simulationSpeed);
    
    this.emit('started');
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('⏸️ Stopping Evolution Engine...');
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.emit('stopped');
  }

  setSpeed(speed) {
    this.simulationSpeed = Math.max(0.1, Math.min(10.0, speed));
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    
    this.emit('speedChanged', this.simulationSpeed);
  }

  async evolutionStep() {
    try {
      const now = Date.now();
      const deltaTime = now - this.lastUpdate;
      this.lastUpdate = now;

      // Récupérer la population actuelle
      const population = await this.db.getPopulation();
      
      if (population.length === 0) {
        console.warn('⚠️ No population found, creating new one...');
        await this.createInitialPopulation();
        return;
      }

      // Simuler le métabolisme et la consommation d'énergie
      await this.updateMetabolism(population, deltaTime);
      
      // Simuler la reproduction
      await this.handleReproduction(population);
      
      // Simuler la mort naturelle
      await this.handleNaturalSelection(population);
      
      // Incrémenter la génération toutes les 10 secondes
      if (now % 10000 < 100) {
        this.generation++;
        await this.db.saveGenerationStats(this.generation, population);
      }

      // Émettre les données mises à jour
      const simulationData = await this.getSimulationData();
      this.emit('update', simulationData);

    } catch (error) {
      console.error('❌ Error in evolution step:', error);
    }
  }

  async updateMetabolism(population, deltaTime) {
    const updates = population.map(individual => {
      // Calculer la consommation d'énergie basée sur les traits
      const metabolicRate = this.calculateMetabolicRate(individual.traits);
      const energyConsumption = metabolicRate * (deltaTime / 1000);
      
      const newEnergy = Math.max(0, individual.energy - energyConsumption);
      
      return this.db.updateIndividual(individual.id, {
        energy: newEnergy
      });
    });
    
    await Promise.all(updates);
  }

  calculateMetabolicRate(traits) {
    // Métabolisme basé sur la taille, la vitesse et le métabolisme
    const baseRate = 1.0;
    const sizeMultiplier = 0.5 + traits.SIZE * 1.5;
    const speedMultiplier = 0.8 + traits.SPEED * 0.4;
    const metabolismMultiplier = 2.0 - traits.METABOLISM;
    
    return baseRate * sizeMultiplier * speedMultiplier * metabolismMultiplier;
  }

  async handleReproduction(population) {
    const reproductiveIndividuals = population.filter(ind => 
      ind.energy >= this.reproductionThreshold && ind.is_alive
    );
    
    // Reproduction aléatoire entre individus compatibles
    for (let i = 0; i < reproductiveIndividuals.length - 1; i += 2) {
      const parent1 = reproductiveIndividuals[i];
      const parent2 = reproductiveIndividuals[i + 1];
      
      if (Math.random() < 0.1) { // 10% de chance de reproduction par étape
        await this.reproduce(parent1, parent2);
      }
    }
  }

  async reproduce(parent1, parent2) {
    try {
      // Créer les traits de l'enfant par croisement
      const childTraits = this.crossoverTraits(parent1.traits, parent2.traits);
      const mutatedTraits = this.mutateTraits(childTraits);
      
      // Calculer la position de l'enfant
      const childPosition = {
        x: (parent1.position_x + parent2.position_x) / 2 + (Math.random() - 0.5) * 50,
        y: (parent1.position_y + parent2.position_y) / 2 + (Math.random() - 0.5) * 50
      };
      
      // Créer l'enfant
      const child = {
        name: `${parent1.name}_${parent2.name}_child_${Date.now()}`,
        species_id: parent1.species_id,
        traits: mutatedTraits,
        energy: 50, // Énergie initiale
        position_x: childPosition.x,
        position_y: childPosition.y,
        generation: this.generation + 1,
        parent1_id: parent1.id,
        parent2_id: parent2.id,
        is_alive: true
      };
      
      await this.db.createIndividual(child);
      
      // Réduire l'énergie des parents
      await this.db.updateIndividual(parent1.id, { 
        energy: parent1.energy - 30 
      });
      await this.db.updateIndividual(parent2.id, { 
        energy: parent2.energy - 30 
      });
      
      console.log(`👶 New offspring: ${child.name}`);
      this.emit('reproduction', { parent1, parent2, child });
      
    } catch (error) {
      console.error('❌ Error in reproduction:', error);
    }
  }

  crossoverTraits(traits1, traits2) {
    const childTraits = {};
    
    Object.keys(traits1).forEach(trait => {
      // Croisement uniforme avec dominance aléatoire
      if (Math.random() < 0.5) {
        childTraits[trait] = traits1[trait];
      } else {
        childTraits[trait] = traits2[trait];
      }
    });
    
    return childTraits;
  }

  async handleNaturalSelection(population) {
    const deaths = [];
    
    for (const individual of population) {
      if (!individual.is_alive) continue;
      
      // Mort par manque d'énergie
      if (individual.energy <= 0) {
        deaths.push(individual.id);
        continue;
      }
      
      // Mort naturelle basée sur l'âge et la longévité
      const ageInGenerations = this.generation - individual.generation;
      const longevity = individual.traits.LONGEVITY || 0.5;
      const maxAge = 10 + longevity * 20; // 10-30 générations
      
      if (ageInGenerations > maxAge) {
        deaths.push(individual.id);
        continue;
      }
      
      // Mort aléatoire basée sur la résistance
      const resistance = individual.traits.RESISTANCE || 0.5;
      const deathProbability = (1 - resistance) * 0.001; // 0.1% max par étape
      
      if (Math.random() < deathProbability) {
        deaths.push(individual.id);
      }
    }
    
    // Marquer les individus comme morts
    for (const deathId of deaths) {
      await this.db.updateIndividual(deathId, { 
        is_alive: false,
        death_time: new Date()
      });
    }
    
    if (deaths.length > 0) {
      console.log(`💀 ${deaths.length} individuals died this step`);
      this.emit('deaths', deaths);
    }
  }

  async getSimulationData() {
    try {
      const population = await this.db.getPopulation();
      const species = await this.db.getSpeciesStats();
      const performance = this.getPerformanceMetrics();
      
      return {
        populationCount: population.length,
        generation: this.generation,
        species: species,
        evolutionStats: await this.calculateEvolutionStats(population),
        performance: performance,
        environment: this.getEnvironmentData(),
        isRunning: this.isRunning,
        simulationSpeed: this.simulationSpeed
      };
    } catch (error) {
      console.error('❌ Error getting simulation data:', error);
      return null;
    }
  }

  async calculateEvolutionStats(population) {
    const alivePopulation = population.filter(ind => ind.is_alive);
    
    if (alivePopulation.length === 0) {
      return {
        totalMutations: 0,
        totalReproductions: 0,
        averageFitness: 0,
        geneticDiversity: 0,
        speciesCount: 0,
        extinctionRate: 0
      };
    }
    
    // Calculer la diversité génétique
    const traitVariances = {};
    Object.keys(TraitType).forEach(trait => {
      const values = alivePopulation.map(ind => ind.traits[trait] || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
      traitVariances[trait] = variance;
    });
    
    const averageVariance = Object.values(traitVariances).reduce((a, b) => a + b, 0) / Object.keys(traitVariances).length;
    
    // Calculer le fitness moyen
    const averageFitness = alivePopulation.reduce((acc, ind) => {
      return acc + this.calculateFitness(ind);
    }, 0) / alivePopulation.length;
    
    return {
      totalMutations: await this.db.getTotalMutations(),
      totalReproductions: await this.db.getTotalReproductions(),
      averageFitness: averageFitness,
      geneticDiversity: Math.min(1, averageVariance * 4), // Normaliser entre 0 et 1
      speciesCount: new Set(alivePopulation.map(ind => ind.species_id)).size,
      extinctionRate: (population.length - alivePopulation.length) / Math.max(1, population.length)
    };
  }

  calculateFitness(individual) {
    // Fitness basé sur l'énergie, l'âge et les traits
    const energyFactor = individual.energy / 100;
    const ageFactor = Math.max(0, 1 - (this.generation - individual.generation) / 30);
    const traitFactor = (individual.traits.INTELLIGENCE + individual.traits.ADAPTABILITY) / 2;
    
    return (energyFactor * 0.4 + ageFactor * 0.3 + traitFactor * 0.3);
  }

  getPerformanceMetrics() {
    return {
      generationsPerSecond: this.simulationSpeed * 0.1, // Approximation
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000, // Approximation
      frameRate: 60 / this.simulationSpeed
    };
  }

  getEnvironmentData() {
    // Simuler des conditions environnementales dynamiques
    const time = Date.now();
    const dayNightCycle = (Math.sin(time / 10000) + 1) / 2; // Cycle jour/nuit
    const seasonalCycle = (Math.sin(time / 100000) + 1) / 2; // Cycle saisonnier
    
    return {
      temperature: 20 + seasonalCycle * 10 + (Math.random() - 0.5) * 5,
      humidity: 0.5 + seasonalCycle * 0.3 + (Math.random() - 0.5) * 0.2,
      precipitation: seasonalCycle * 0.8 + (Math.random() - 0.5) * 0.4,
      resourceAbundance: 0.6 + seasonalCycle * 0.3,
      predationPressure: 0.3 + (Math.random() - 0.5) * 0.2,
      diseaseLoad: 0.1 + (1 - seasonalCycle) * 0.3,
      seasonalModifier: seasonalCycle,
      dayNightCycle: dayNightCycle
    };
  }

  async reset() {
    console.log('🔄 Resetting Evolution Engine...');
    this.stop();
    this.generation = 0;
    
    // Supprimer toute la population existante
    await this.db.clearPopulation();
    
    // Créer une nouvelle population initiale
    await this.createInitialPopulation();
    
    console.log('✅ Evolution Engine reset complete');
    this.emit('reset');
  }

  async shutdown() {
    console.log('🛑 Shutting down Evolution Engine...');
    this.stop();
    await this.db.disconnect();
    this.emit('shutdown');
  }
}

module.exports = EvolutionEngine;