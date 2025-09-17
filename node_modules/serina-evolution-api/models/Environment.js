class Environment {
  constructor(data = {}) {
    this.id = data.id || null;
    this.simulation_id = data.simulation_id || null;
    this.temperature = data.temperature || 20.0;
    this.humidity = data.humidity || 0.6;
    this.oxygen_level = data.oxygen_level || 0.21;
    this.radiation_level = data.radiation_level || 0.0;
    this.food_availability = data.food_availability || 0.7;
    this.water_availability = data.water_availability || 0.8;
    this.predator_pressure = data.predator_pressure || 0.3;
    this.competition_level = data.competition_level || 0.5;
    this.seasonal_factor = data.seasonal_factor || 1.0;
    this.disaster_probability = data.disaster_probability || 0.01;
    this.width = data.width || 1920;
    this.height = data.height || 1080;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    
    // Ressources spatiales
    this.food_sources = data.food_sources || [];
    this.water_sources = data.water_sources || [];
    this.shelter_areas = data.shelter_areas || [];
    this.danger_zones = data.danger_zones || [];
    
    // Historique des changements
    this.change_history = data.change_history || [];
  }

  // Mettre à jour l'environnement
  update(timestep = 1) {
    // Variations naturelles
    this.applyNaturalVariations(timestep);
    
    // Changements saisonniers
    this.applySeasonalChanges(timestep);
    
    // Événements aléatoires
    this.checkRandomEvents();
    
    // Mise à jour des ressources
    this.updateResources();
    
    this.updated_at = new Date();
    
    return this.getEnvironmentState();
  }

  // Appliquer les variations naturelles
  applyNaturalVariations(timestep) {
    // Variations de température
    const tempVariation = (Math.random() - 0.5) * 2 * timestep * 0.1;
    this.temperature = Math.max(-20, Math.min(50, this.temperature + tempVariation));
    
    // Variations d'humidité
    const humidityVariation = (Math.random() - 0.5) * 0.1 * timestep;
    this.humidity = Math.max(0, Math.min(1, this.humidity + humidityVariation));
    
    // Variations de disponibilité alimentaire
    const foodVariation = (Math.random() - 0.5) * 0.05 * timestep;
    this.food_availability = Math.max(0, Math.min(1, this.food_availability + foodVariation));
    
    // Variations de pression prédateur
    const predatorVariation = (Math.random() - 0.5) * 0.03 * timestep;
    this.predator_pressure = Math.max(0, Math.min(1, this.predator_pressure + predatorVariation));
  }

  // Appliquer les changements saisonniers
  applySeasonalChanges(timestep) {
    // Cycle saisonnier simplifié (basé sur le temps)
    const timeInYear = (Date.now() / 1000 / 60 / 60 / 24 / 365) % 1; // Position dans l'année
    
    // Effet sur la température (variations saisonnières)
    const seasonalTempEffect = Math.sin(timeInYear * 2 * Math.PI) * 10;
    const targetTemp = 20 + seasonalTempEffect;
    
    // Ajustement graduel vers la température saisonnière
    const tempAdjustment = (targetTemp - this.temperature) * 0.01 * timestep;
    this.temperature += tempAdjustment;
    
    // Effet sur la disponibilité alimentaire
    const seasonalFoodEffect = 0.7 + Math.sin(timeInYear * 2 * Math.PI) * 0.2;
    this.food_availability = Math.max(0.1, Math.min(1, 
      this.food_availability * 0.99 + seasonalFoodEffect * 0.01
    ));
    
    this.seasonal_factor = 0.8 + Math.sin(timeInYear * 2 * Math.PI) * 0.2;
  }

  // Vérifier les événements aléatoires
  checkRandomEvents() {
    if (Math.random() < this.disaster_probability) {
      this.triggerRandomEvent();
    }
  }

  // Déclencher un événement aléatoire
  triggerRandomEvent() {
    const events = ['drought', 'flood', 'heat_wave', 'cold_snap', 'food_shortage', 'predator_invasion'];
    const event = events[Math.floor(Math.random() * events.length)];
    
    const eventData = {
      type: event,
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 50) + 10 // 10-60 timesteps
    };
    
    switch (event) {
      case 'drought':
        this.water_availability *= 0.3;
        this.food_availability *= 0.5;
        this.humidity *= 0.4;
        break;
        
      case 'flood':
        this.water_availability = Math.min(1, this.water_availability * 1.5);
        this.humidity = Math.min(1, this.humidity * 1.3);
        this.temperature -= 5;
        break;
        
      case 'heat_wave':
        this.temperature += 15;
        this.water_availability *= 0.7;
        break;
        
      case 'cold_snap':
        this.temperature -= 15;
        this.food_availability *= 0.6;
        break;
        
      case 'food_shortage':
        this.food_availability *= 0.2;
        this.competition_level = Math.min(1, this.competition_level * 1.5);
        break;
        
      case 'predator_invasion':
        this.predator_pressure = Math.min(1, this.predator_pressure * 2);
        break;
    }
    
    // Ajouter à l'historique
    this.change_history.push(eventData);
    
    console.log(`🌍 Environmental event: ${event} occurred`);
    
    return eventData;
  }

  // Mettre à jour les ressources spatiales
  updateResources() {
    // Régénération des sources de nourriture
    this.food_sources.forEach(source => {
      if (source.amount < source.max_amount) {
        source.amount = Math.min(source.max_amount, 
          source.amount + source.regeneration_rate
        );
      }
    });
    
    // Régénération des sources d'eau
    this.water_sources.forEach(source => {
      if (source.amount < source.max_amount) {
        source.amount = Math.min(source.max_amount, 
          source.amount + source.regeneration_rate
        );
      }
    });
  }

  // Générer des ressources aléatoirement
  generateRandomResources(count = 10) {
    // Générer des sources de nourriture
    for (let i = 0; i < count; i++) {
      this.food_sources.push({
        id: `food_${i}`,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        amount: Math.random() * 100 + 50,
        max_amount: Math.random() * 100 + 100,
        regeneration_rate: Math.random() * 5 + 1,
        type: ['plants', 'fruits', 'insects', 'small_animals'][Math.floor(Math.random() * 4)]
      });
    }
    
    // Générer des sources d'eau
    for (let i = 0; i < count / 2; i++) {
      this.water_sources.push({
        id: `water_${i}`,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        amount: Math.random() * 200 + 100,
        max_amount: Math.random() * 200 + 200,
        regeneration_rate: Math.random() * 10 + 5,
        quality: Math.random() * 0.5 + 0.5
      });
    }
    
    // Générer des zones de refuge
    for (let i = 0; i < count / 3; i++) {
      this.shelter_areas.push({
        id: `shelter_${i}`,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 100 + 50,
        protection_level: Math.random() * 0.8 + 0.2,
        capacity: Math.floor(Math.random() * 20) + 5
      });
    }
  }

  // Obtenir la ressource la plus proche
  getNearestResource(x, y, resourceType = 'food') {
    const resources = resourceType === 'food' ? this.food_sources : this.water_sources;
    
    let nearest = null;
    let minDistance = Infinity;
    
    resources.forEach(resource => {
      if (resource.amount > 0) {
        const distance = Math.sqrt(
          Math.pow(resource.x - x, 2) + Math.pow(resource.y - y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearest = { ...resource, distance };
        }
      }
    });
    
    return nearest;
  }

  // Consommer une ressource
  consumeResource(resourceId, amount, resourceType = 'food') {
    const resources = resourceType === 'food' ? this.food_sources : this.water_sources;
    const resource = resources.find(r => r.id === resourceId);
    
    if (resource && resource.amount >= amount) {
      resource.amount -= amount;
      return amount;
    }
    
    return 0;
  }

  // Calculer la capacité de charge
  getCarryingCapacity() {
    const foodCapacity = this.food_sources.reduce((sum, source) => sum + source.amount, 0) / 10;
    const waterCapacity = this.water_sources.reduce((sum, source) => sum + source.amount, 0) / 20;
    const spaceCapacity = (this.width * this.height) / 10000;
    
    return Math.min(foodCapacity, waterCapacity, spaceCapacity) * this.seasonal_factor;
  }

  // Obtenir l'état de l'environnement
  getEnvironmentState() {
    return {
      id: this.id,
      simulation_id: this.simulation_id,
      conditions: {
        temperature: this.temperature,
        humidity: this.humidity,
        oxygen_level: this.oxygen_level,
        radiation_level: this.radiation_level,
        food_availability: this.food_availability,
        water_availability: this.water_availability,
        predator_pressure: this.predator_pressure,
        competition_level: this.competition_level,
        seasonal_factor: this.seasonal_factor
      },
      resources: {
        food_sources: this.food_sources.length,
        water_sources: this.water_sources.length,
        shelter_areas: this.shelter_areas.length,
        total_food: this.food_sources.reduce((sum, s) => sum + s.amount, 0),
        total_water: this.water_sources.reduce((sum, s) => sum + s.amount, 0)
      },
      capacity: {
        carrying_capacity: this.getCarryingCapacity(),
        optimal_population: Math.floor(this.getCarryingCapacity() * 0.8)
      },
      recent_events: this.change_history.slice(-5),
      timestamp: this.updated_at
    };
  }

  // Obtenir les statistiques environnementales
  getEnvironmentStats() {
    return {
      stability: this.calculateStability(),
      harshness: this.calculateHarshness(),
      resource_abundance: this.calculateResourceAbundance(),
      diversity: this.calculateDiversity(),
      sustainability: this.calculateSustainability()
    };
  }

  // Calculer la stabilité environnementale
  calculateStability() {
    if (this.change_history.length < 2) return 1.0;
    
    // Basé sur la fréquence des événements récents
    const recentEvents = this.change_history.slice(-10);
    const eventFrequency = recentEvents.length / 10;
    
    return Math.max(0, 1 - eventFrequency);
  }

  // Calculer la dureté de l'environnement
  calculateHarshness() {
    let harshness = 0;
    
    // Température extrême
    if (this.temperature < 0 || this.temperature > 40) harshness += 0.3;
    
    // Faible disponibilité des ressources
    if (this.food_availability < 0.3) harshness += 0.3;
    if (this.water_availability < 0.3) harshness += 0.2;
    
    // Haute pression prédateur
    if (this.predator_pressure > 0.7) harshness += 0.2;
    
    return Math.min(1, harshness);
  }

  // Calculer l'abondance des ressources
  calculateResourceAbundance() {
    const foodScore = this.food_availability;
    const waterScore = this.water_availability;
    const spaceScore = Math.min(1, (this.width * this.height) / 2000000); // Normalized space
    
    return (foodScore + waterScore + spaceScore) / 3;
  }

  // Calculer la diversité environnementale
  calculateDiversity() {
    const foodTypeCount = new Set(this.food_sources.map(s => s.type)).size;
    const terrainDiversity = this.shelter_areas.length / 10; // Normalized shelter diversity
    
    return Math.min(1, (foodTypeCount / 4) * 0.6 + terrainDiversity * 0.4);
  }

  // Calculer la durabilité
  calculateSustainability() {
    const resourceRegeneration = this.food_sources.reduce((sum, s) => sum + s.regeneration_rate, 0) / this.food_sources.length;
    const stability = this.calculateStability();
    const abundance = this.calculateResourceAbundance();
    
    return (resourceRegeneration / 10) * 0.3 + stability * 0.4 + abundance * 0.3;
  }

  // Sérialiser pour la base de données
  toDatabase() {
    return {
      id: this.id,
      simulation_id: this.simulation_id,
      temperature: this.temperature,
      humidity: this.humidity,
      oxygen_level: this.oxygen_level,
      radiation_level: this.radiation_level,
      food_availability: this.food_availability,
      water_availability: this.water_availability,
      predator_pressure: this.predator_pressure,
      competition_level: this.competition_level,
      seasonal_factor: this.seasonal_factor,
      disaster_probability: this.disaster_probability,
      width: this.width,
      height: this.height,
      food_sources: JSON.stringify(this.food_sources),
      water_sources: JSON.stringify(this.water_sources),
      shelter_areas: JSON.stringify(this.shelter_areas),
      danger_zones: JSON.stringify(this.danger_zones),
      change_history: JSON.stringify(this.change_history),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Créer depuis les données de la base de données
  static fromDatabase(data) {
    const environmentData = {
      ...data,
      food_sources: typeof data.food_sources === 'string' ? JSON.parse(data.food_sources) : (data.food_sources || []),
      water_sources: typeof data.water_sources === 'string' ? JSON.parse(data.water_sources) : (data.water_sources || []),
      shelter_areas: typeof data.shelter_areas === 'string' ? JSON.parse(data.shelter_areas) : (data.shelter_areas || []),
      danger_zones: typeof data.danger_zones === 'string' ? JSON.parse(data.danger_zones) : (data.danger_zones || []),
      change_history: typeof data.change_history === 'string' ? JSON.parse(data.change_history) : (data.change_history || [])
    };
    return new Environment(environmentData);
  }

  // Créer un environnement par défaut
  static createDefault(simulationId) {
    const environment = new Environment({
      simulation_id: simulationId,
      temperature: 20 + (Math.random() - 0.5) * 10,
      humidity: 0.6 + (Math.random() - 0.5) * 0.3,
      food_availability: 0.7 + (Math.random() - 0.5) * 0.2,
      water_availability: 0.8 + (Math.random() - 0.5) * 0.2,
      predator_pressure: 0.3 + (Math.random() - 0.5) * 0.2,
      competition_level: 0.5 + (Math.random() - 0.5) * 0.2
    });
    
    environment.generateRandomResources(15);
    return environment;
  }
}

module.exports = Environment;