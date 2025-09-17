class Species {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.simulation_id = data.simulation_id || null;
    this.population_count = data.population_count || 0;
    this.generation = data.generation || 0;
    this.traits = data.traits || {};
    this.fitness_average = data.fitness_average || 0;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.is_extinct = data.is_extinct || false;
    this.extinction_generation = data.extinction_generation || null;
    
    // Traits par défaut pour Serina
    this.defaultTraits = {
      size: 0.5,           // Taille corporelle (0-1)
      speed: 0.5,          // Vitesse de déplacement (0-1)
      intelligence: 0.5,    // Intelligence/capacité d'apprentissage (0-1)
      endurance: 0.5,      // Endurance/résistance (0-1)
      aggression: 0.5,     // Agressivité (0-1)
      social_tendency: 0.5, // Tendance sociale (0-1)
      reproduction_rate: 0.5, // Taux de reproduction (0-1)
      lifespan: 0.5,       // Espérance de vie (0-1)
      adaptability: 0.5,   // Capacité d'adaptation (0-1)
      energy_efficiency: 0.5, // Efficacité énergétique (0-1)
      sensory_acuity: 0.5, // Acuité sensorielle (0-1)
      camouflage: 0.5      // Capacité de camouflage (0-1)
    };
    
    // Appliquer les traits par défaut si manquants
    this.traits = { ...this.defaultTraits, ...this.traits };
  }

  // Calculer la fitness basée sur les traits
  calculateFitness(environment = {}) {
    const traits = this.traits;
    let fitness = 0;
    
    // Facteurs environnementaux par défaut
    const env = {
      temperature: environment.temperature || 20,
      food_availability: environment.food_availability || 0.7,
      predator_pressure: environment.predator_pressure || 0.3,
      competition_level: environment.competition_level || 0.5,
      ...environment
    };

    // Calculs de fitness basés sur l'adaptation environnementale
    
    // Survie de base (taille, endurance, efficacité énergétique)
    fitness += (traits.endurance * 0.3 + traits.energy_efficiency * 0.2 + (1 - Math.abs(traits.size - 0.6)) * 0.1) * 25;
    
    // Acquisition de nourriture (intelligence, sensory_acuity, speed)
    fitness += (traits.intelligence * 0.4 + traits.sensory_acuity * 0.3 + traits.speed * 0.3) * env.food_availability * 20;
    
    // Évitement des prédateurs (speed, camouflage, intelligence)
    fitness += (traits.speed * 0.4 + traits.camouflage * 0.4 + traits.intelligence * 0.2) * (1 - env.predator_pressure) * 15;
    
    // Reproduction (reproduction_rate, social_tendency, size)
    fitness += (traits.reproduction_rate * 0.5 + traits.social_tendency * 0.3 + traits.size * 0.2) * 20;
    
    // Adaptation environnementale (adaptability, intelligence)
    fitness += (traits.adaptability * 0.6 + traits.intelligence * 0.4) * 10;
    
    // Competition (aggression, size, intelligence)
    const competitionBonus = (traits.aggression * 0.4 + traits.size * 0.3 + traits.intelligence * 0.3) * env.competition_level * 10;
    fitness += competitionBonus;
    
    // Normaliser la fitness entre 0 et 1
    this.fitness_average = Math.max(0, Math.min(1, fitness / 100));
    
    return this.fitness_average;
  }

  // Muter les traits
  mutate(mutationRate = 0.1, mutationStrength = 0.1) {
    const mutatedTraits = { ...this.traits };
    
    Object.keys(mutatedTraits).forEach(trait => {
      if (Math.random() < mutationRate) {
        // Mutation gaussienne
        const mutation = (Math.random() - 0.5) * 2 * mutationStrength;
        mutatedTraits[trait] = Math.max(0, Math.min(1, mutatedTraits[trait] + mutation));
      }
    });
    
    return new Species({
      ...this,
      traits: mutatedTraits,
      generation: this.generation + 1,
      created_at: new Date()
    });
  }

  // Croisement avec une autre espèce
  crossover(otherSpecies, crossoverRate = 0.7) {
    const offspring1Traits = {};
    const offspring2Traits = {};
    
    Object.keys(this.traits).forEach(trait => {
      if (Math.random() < crossoverRate) {
        // Croisement
        offspring1Traits[trait] = otherSpecies.traits[trait];
        offspring2Traits[trait] = this.traits[trait];
      } else {
        // Pas de croisement
        offspring1Traits[trait] = this.traits[trait];
        offspring2Traits[trait] = otherSpecies.traits[trait];
      }
    });
    
    const offspring1 = new Species({
      simulation_id: this.simulation_id,
      traits: offspring1Traits,
      generation: Math.max(this.generation, otherSpecies.generation) + 1,
      created_at: new Date()
    });
    
    const offspring2 = new Species({
      simulation_id: this.simulation_id,
      traits: offspring2Traits,
      generation: Math.max(this.generation, otherSpecies.generation) + 1,
      created_at: new Date()
    });
    
    return [offspring1, offspring2];
  }

  // Vérifier si l'espèce est viable
  isViable() {
    // Une espèce est viable si elle a une fitness minimale et une population suffisante
    return this.fitness_average > 0.1 && this.population_count > 0 && !this.is_extinct;
  }

  // Marquer comme éteinte
  markExtinct(generation) {
    this.is_extinct = true;
    this.extinction_generation = generation;
    this.population_count = 0;
    this.updated_at = new Date();
  }

  // Obtenir les statistiques de l'espèce
  getStats() {
    return {
      id: this.id,
      name: this.name,
      population_count: this.population_count,
      generation: this.generation,
      fitness_average: this.fitness_average,
      is_extinct: this.is_extinct,
      traits: this.traits,
      viability: this.isViable(),
      trait_averages: this.getTraitAverages(),
      trait_diversity: this.getTraitDiversity()
    };
  }

  // Calculer la moyenne des traits
  getTraitAverages() {
    const averages = {};
    Object.keys(this.traits).forEach(trait => {
      averages[trait] = this.traits[trait];
    });
    return averages;
  }

  // Calculer la diversité des traits (variance)
  getTraitDiversity() {
    // Pour une seule espèce, la diversité est basée sur l'écart aux valeurs moyennes
    let totalVariance = 0;
    const traitCount = Object.keys(this.traits).length;
    
    Object.values(this.traits).forEach(value => {
      totalVariance += Math.pow(value - 0.5, 2);
    });
    
    return totalVariance / traitCount;
  }

  // Obtenir une description phénotypique
  getPhenotype() {
    const t = this.traits;
    
    const sizeDesc = t.size > 0.7 ? 'large' : t.size > 0.4 ? 'medium' : 'small';
    const speedDesc = t.speed > 0.7 ? 'fast' : t.speed > 0.4 ? 'moderate' : 'slow';
    const intDesc = t.intelligence > 0.7 ? 'highly intelligent' : t.intelligence > 0.4 ? 'moderately intelligent' : 'simple';
    const socialDesc = t.social_tendency > 0.7 ? 'highly social' : t.social_tendency > 0.4 ? 'somewhat social' : 'solitary';
    const aggrDesc = t.aggression > 0.7 ? 'aggressive' : t.aggression > 0.4 ? 'assertive' : 'peaceful';
    
    return {
      description: `A ${sizeDesc}, ${speedDesc}, ${intDesc} creature that is ${socialDesc} and ${aggrDesc}`,
      dominant_traits: this.getDominantTraits(),
      fitness_category: this.getFitnessCategory()
    };
  }

  // Identifier les traits dominants
  getDominantTraits() {
    const sortedTraits = Object.entries(this.traits)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    return sortedTraits.map(([trait, value]) => ({
      trait,
      value: Math.round(value * 100) / 100,
      strength: value > 0.8 ? 'very high' : value > 0.6 ? 'high' : 'moderate'
    }));
  }

  // Catégoriser la fitness
  getFitnessCategory() {
    if (this.fitness_average > 0.8) return 'excellent';
    if (this.fitness_average > 0.6) return 'good';
    if (this.fitness_average > 0.4) return 'average';
    if (this.fitness_average > 0.2) return 'poor';
    return 'critical';
  }

  // Sérialiser pour la base de données
  toDatabase() {
    return {
      id: this.id,
      name: this.name,
      simulation_id: this.simulation_id,
      population_count: this.population_count,
      generation: this.generation,
      traits: JSON.stringify(this.traits),
      fitness_average: this.fitness_average,
      created_at: this.created_at,
      updated_at: this.updated_at,
      is_extinct: this.is_extinct,
      extinction_generation: this.extinction_generation
    };
  }

  // Créer depuis les données de la base de données
  static fromDatabase(data) {
    const speciesData = {
      ...data,
      traits: typeof data.traits === 'string' ? JSON.parse(data.traits) : data.traits
    };
    return new Species(speciesData);
  }

  // Créer une espèce aléatoire
  static createRandom(simulationId, name = null) {
    const randomTraits = {};
    const traitNames = [
      'size', 'speed', 'intelligence', 'endurance', 'aggression',
      'social_tendency', 'reproduction_rate', 'lifespan', 'adaptability',
      'energy_efficiency', 'sensory_acuity', 'camouflage'
    ];
    
    traitNames.forEach(trait => {
      // Distribution normale autour de 0.5
      randomTraits[trait] = Math.max(0, Math.min(1, 
        0.5 + (Math.random() - 0.5) * 0.6
      ));
    });
    
    return new Species({
      name: name || `Species_${Date.now()}`,
      simulation_id: simulationId,
      population_count: Math.floor(Math.random() * 50) + 10,
      generation: 0,
      traits: randomTraits,
      created_at: new Date()
    });
  }
}

module.exports = Species;