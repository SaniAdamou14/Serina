class Individual {
  constructor(data = {}) {
    this.id = data.id || null;
    this.species_id = data.species_id || null;
    this.simulation_id = data.simulation_id || null;
    this.name = data.name || `Individual_${Date.now()}`;
    this.traits = data.traits || {};
    this.genome = data.genome || null;
    this.fitness = data.fitness || 0;
    this.energy = data.energy || 100;
    this.age = data.age || 0;
    this.generation = data.generation || 0;
    this.parent1_id = data.parent1_id || null;
    this.parent2_id = data.parent2_id || null;
    this.position_x = data.position_x || Math.random() * 1920;
    this.position_y = data.position_y || Math.random() * 1080;
    this.is_alive = data.is_alive !== undefined ? data.is_alive : true;
    this.birth_timestamp = data.birth_timestamp || new Date();
    this.death_timestamp = data.death_timestamp || null;
    this.death_generation = data.death_generation || null;
    this.offspring_count = data.offspring_count || 0;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  // Calculer la fitness de l'individu
  calculateFitness(environment = {}) {
    const traits = this.traits;
    const env = {
      temperature: environment.temperature || 20,
      food_availability: environment.food_availability || 0.7,
      predator_pressure: environment.predator_pressure || 0.3,
      competition_level: environment.competition_level || 0.5,
      ...environment
    };

    let fitness = 0;

    // Survie de base
    fitness += traits.endurance * 0.3;
    fitness += traits.energy_efficiency * 0.2;
    
    // Adaptation à la taille optimale
    const optimalSize = 0.6;
    fitness += (1 - Math.abs(traits.size - optimalSize)) * 0.1;

    // Acquisition de nourriture
    const foodScore = (traits.intelligence * 0.4 + traits.sensory_acuity * 0.3 + traits.speed * 0.3);
    fitness += foodScore * env.food_availability * 0.25;

    // Évitement des prédateurs
    const predatorAvoidance = (traits.speed * 0.4 + traits.camouflage * 0.4 + traits.intelligence * 0.2);
    fitness += predatorAvoidance * (1 - env.predator_pressure) * 0.2;

    // Compétition
    const competitionScore = (traits.aggression * 0.4 + traits.size * 0.3 + traits.intelligence * 0.3);
    fitness += competitionScore * env.competition_level * 0.15;

    // Reproduction potentielle
    fitness += traits.reproduction_rate * 0.1;

    // Facteurs d'âge et d'énergie
    const ageFactor = Math.max(0, 1 - (this.age / 100)); // Diminue avec l'âge
    const energyFactor = this.energy / 100;
    
    fitness *= ageFactor * energyFactor;

    this.fitness = Math.max(0, Math.min(1, fitness));
    return this.fitness;
  }

  // Vieillir l'individu
  age_individual(timestep = 1) {
    this.age += timestep;
    
    // Réduction d'énergie avec l'âge
    const ageEnergyLoss = timestep * (1 + (this.age / 100)) * 0.5;
    this.energy = Math.max(0, this.energy - ageEnergyLoss);
    
    // Mort naturelle basée sur la longévité
    const maxAge = this.traits.lifespan * 100 + 20; // 20-120 ans selon le trait
    if (this.age >= maxAge || this.energy <= 0) {
      this.die('natural_causes');
    }
    
    this.updated_at = new Date();
  }

  // Nourrir l'individu
  feed(foodValue = 20) {
    if (!this.is_alive) return false;
    
    const efficiency = this.traits.energy_efficiency || 0.5;
    const energyGain = foodValue * (0.5 + efficiency * 0.5);
    
    this.energy = Math.min(100, this.energy + energyGain);
    this.updated_at = new Date();
    
    return true;
  }

  // Faire mourir l'individu
  die(cause = 'unknown') {
    this.is_alive = false;
    this.death_timestamp = new Date();
    this.death_generation = this.generation;
    this.energy = 0;
    this.updated_at = new Date();
    
    return {
      individual_id: this.id,
      cause: cause,
      age_at_death: this.age,
      fitness_at_death: this.fitness,
      offspring_count: this.offspring_count
    };
  }

  // Vérifier si l'individu peut se reproduire
  canReproduce() {
    if (!this.is_alive) return false;
    if (this.energy < 50) return false;
    if (this.age < 10) return false; // Maturité sexuelle
    
    const reproductionProbability = this.traits.reproduction_rate * (this.energy / 100) * (this.fitness);
    return Math.random() < reproductionProbability;
  }

  // Se reproduire avec un autre individu
  reproduce(partner, mutationRate = 0.1) {
    if (!this.canReproduce() || !partner.canReproduce()) {
      return null;
    }

    // Coût énergétique de la reproduction
    this.energy -= 30;
    partner.energy -= 30;

    // Croisement des traits
    const offspringTraits = {};
    Object.keys(this.traits).forEach(trait => {
      if (Math.random() < 0.5) {
        offspringTraits[trait] = this.traits[trait];
      } else {
        offspringTraits[trait] = partner.traits[trait];
      }

      // Mutation
      if (Math.random() < mutationRate) {
        const mutation = (Math.random() - 0.5) * 0.2;
        offspringTraits[trait] = Math.max(0, Math.min(1, offspringTraits[trait] + mutation));
      }
    });

    // Créer l'offspring
    const offspring = new Individual({
      species_id: this.species_id,
      simulation_id: this.simulation_id,
      traits: offspringTraits,
      generation: Math.max(this.generation, partner.generation) + 1,
      parent1_id: this.id,
      parent2_id: partner.id,
      energy: 80, // Commence avec moins d'énergie
      position_x: this.position_x + (Math.random() - 0.5) * 100,
      position_y: this.position_y + (Math.random() - 0.5) * 100
    });

    // Incrementer le compteur d'offspring
    this.offspring_count++;
    partner.offspring_count++;

    this.updated_at = new Date();
    partner.updated_at = new Date();

    return offspring;
  }

  // Déplacer l'individu
  move(environment = {}) {
    if (!this.is_alive) return;

    const speed = this.traits.speed || 0.5;
    const intelligence = this.traits.intelligence || 0.5;
    
    // Mouvement basé sur la vitesse et l'intelligence
    const maxMovement = speed * 50;
    const direction = Math.random() * 2 * Math.PI;
    
    // Intelligence influence la direction (vers la nourriture, loin des prédateurs)
    const smartMovement = intelligence * 0.3;
    
    const dx = Math.cos(direction) * maxMovement * (1 + smartMovement);
    const dy = Math.sin(direction) * maxMovement * (1 + smartMovement);
    
    this.position_x = Math.max(0, Math.min(1920, this.position_x + dx));
    this.position_y = Math.max(0, Math.min(1080, this.position_y + dy));
    
    // Coût énergétique du mouvement
    const energyCost = (speed * 2) + (Math.abs(dx) + Math.abs(dy)) / 100;
    this.energy = Math.max(0, this.energy - energyCost);
    
    this.updated_at = new Date();
  }

  // Obtenir les statistiques de l'individu
  getStats() {
    return {
      id: this.id,
      name: this.name,
      species_id: this.species_id,
      generation: this.generation,
      age: this.age,
      fitness: this.fitness,
      energy: this.energy,
      is_alive: this.is_alive,
      position: {
        x: this.position_x,
        y: this.position_y
      },
      traits: this.traits,
      offspring_count: this.offspring_count,
      survival_time: this.is_alive ? 
        Date.now() - this.birth_timestamp.getTime() : 
        this.death_timestamp.getTime() - this.birth_timestamp.getTime()
    };
  }

  // Obtenir le phénotype
  getPhenotype() {
    const t = this.traits;
    
    return {
      size_category: t.size > 0.7 ? 'large' : t.size > 0.4 ? 'medium' : 'small',
      speed_category: t.speed > 0.7 ? 'fast' : t.speed > 0.4 ? 'average' : 'slow',
      intelligence_level: t.intelligence > 0.7 ? 'high' : t.intelligence > 0.4 ? 'average' : 'low',
      social_behavior: t.social_tendency > 0.7 ? 'social' : t.social_tendency > 0.4 ? 'neutral' : 'solitary',
      aggression_level: t.aggression > 0.7 ? 'aggressive' : t.aggression > 0.4 ? 'assertive' : 'peaceful',
      fitness_status: this.fitness > 0.7 ? 'excellent' : this.fitness > 0.4 ? 'good' : 'struggling',
      life_stage: this.age < 10 ? 'juvenile' : this.age < 50 ? 'adult' : 'elderly',
      energy_status: this.energy > 70 ? 'energetic' : this.energy > 30 ? 'tired' : 'exhausted'
    };
  }

  // Sérialiser pour la base de données
  toDatabase() {
    return {
      id: this.id,
      species_id: this.species_id,
      simulation_id: this.simulation_id,
      name: this.name,
      traits: JSON.stringify(this.traits),
      genome: this.genome,
      fitness: this.fitness,
      energy: this.energy,
      age: this.age,
      generation: this.generation,
      parent1_id: this.parent1_id,
      parent2_id: this.parent2_id,
      position_x: this.position_x,
      position_y: this.position_y,
      is_alive: this.is_alive,
      birth_timestamp: this.birth_timestamp,
      death_timestamp: this.death_timestamp,
      death_generation: this.death_generation,
      offspring_count: this.offspring_count,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Créer depuis les données de la base de données
  static fromDatabase(data) {
    const individualData = {
      ...data,
      traits: typeof data.traits === 'string' ? JSON.parse(data.traits) : data.traits
    };
    return new Individual(individualData);
  }

  // Créer un individu aléatoire
  static createRandom(speciesId, simulationId, generation = 0) {
    const randomTraits = {};
    const traitNames = [
      'size', 'speed', 'intelligence', 'endurance', 'aggression',
      'social_tendency', 'reproduction_rate', 'lifespan', 'adaptability',
      'energy_efficiency', 'sensory_acuity', 'camouflage'
    ];
    
    traitNames.forEach(trait => {
      randomTraits[trait] = Math.max(0, Math.min(1, 
        0.5 + (Math.random() - 0.5) * 0.6
      ));
    });
    
    return new Individual({
      species_id: speciesId,
      simulation_id: simulationId,
      traits: randomTraits,
      generation: generation,
      energy: 80 + Math.random() * 20,
      age: Math.random() * 20,
      position_x: Math.random() * 1920,
      position_y: Math.random() * 1080
    });
  }
}

module.exports = Individual;