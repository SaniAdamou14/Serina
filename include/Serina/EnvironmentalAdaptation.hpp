#pragma once

#include "SerinaEcosystem.hpp"
#include "EcologicalInteractions.hpp"
#include "AdvancedGenetics.hpp"
#include <memory>
#include <vector>
#include <unordered_map>
#include <random>
#include <cmath>
#include <algorithm>

namespace Serina::Environment
{

    /// @brief Paramètres climatiques d'un environnement
    struct ClimateParameters
    {
        double temperature;        ///< Température moyenne (°C)
        double humidity;          ///< Humidité relative [0-1]
        double precipitation;     ///< Précipitations annuelles (mm)
        double seasonality;       ///< Variabilité saisonnière [0-1]
        double windSpeed;         ///< Vitesse du vent (m/s)
        double sunlightIntensity; ///< Intensité lumineuse [0-1]
        double oxygenLevel;       ///< Niveau d'oxygène [0-1] (important pour l'eau)
        double salinity;          ///< Salinité pour environnements aquatiques [0-1]
        
        ClimateParameters(double temp = 20.0, double hum = 0.6, double prec = 1000.0,
                         double seas = 0.3, double wind = 5.0, double sun = 0.8,
                         double oxy = 1.0, double sal = 0.0)
            : temperature(temp), humidity(hum), precipitation(prec), seasonality(seas),
              windSpeed(wind), sunlightIntensity(sun), oxygenLevel(oxy), salinity(sal) {}
    };

    /// @brief Ressources disponibles dans un environnement
    struct ResourceAvailability
    {
        double primaryProducers;  ///< Plantes/algues disponibles [0-1]
        double detritus;         ///< Matière organique en décomposition [0-1]
        double smallPrey;        ///< Petites proies disponibles [0-1]
        double largePrey;        ///< Grandes proies disponibles [0-1]
        double minerals;         ///< Minéraux disponibles [0-1]
        double waterQuality;     ///< Qualité de l'eau [0-1]
        double shelter;          ///< Abris disponibles [0-1]
        double nestingSites;     ///< Sites de nidification [0-1]
        
        ResourceAvailability(double plants = 0.7, double det = 0.5, double small = 0.4,
                           double large = 0.2, double min = 0.6, double water = 0.8,
                           double shel = 0.6, double nest = 0.5)
            : primaryProducers(plants), detritus(det), smallPrey(small), largePrey(large),
              minerals(min), waterQuality(water), shelter(shel), nestingSites(nest) {}
    };

    /// @brief Pressions sélectives spécifiques à un environnement
    struct SelectivePressures
    {
        double predationPressure;     ///< Pression de prédation [0-1]
        double competitionIntensity;  ///< Intensité de la compétition [0-1]
        double resourceScarcity;      ///< Rareté des ressources [0-1]
        double climaticStress;        ///< Stress climatique [0-1]
        double diseaseLoad;           ///< Charge parasitaire/pathogène [0-1]
        double habitatFragmentation;  ///< Fragmentation de l'habitat [0-1]
        double humanDisturbance;      ///< Perturbation humaine résiduelle [0-1]
        
        SelectivePressures(double pred = 0.3, double comp = 0.4, double res = 0.3,
                         double clim = 0.2, double dis = 0.2, double frag = 0.1,
                         double hum = 0.0)
            : predationPressure(pred), competitionIntensity(comp), resourceScarcity(res),
              climaticStress(clim), diseaseLoad(dis), habitatFragmentation(frag),
              humanDisturbance(hum) {}
    };

    /// @brief Définition complète d'un environnement de Serina
    struct EnvironmentDefinition
    {
        Ecosystem::EnvironmentType type;
        std::string name;
        std::string description;
        
        ClimateParameters climate;
        ResourceAvailability resources;
        SelectivePressures pressures;
        
        // Connectivité avec autres environnements
        std::vector<Ecosystem::EnvironmentType> connectedEnvironments;
        std::unordered_map<Ecosystem::EnvironmentType, double> migrationDifficulty;
        
        // Capacité de charge
        double carryingCapacity;      ///< Capacité de charge totale
        std::unordered_map<Ecosystem::DietType, double> dietSpecificCapacity;
        
        // Variabilité temporelle
        double annualVariation;       ///< Variation annuelle des conditions
        double stochasticEvents;      ///< Fréquence d'événements aléatoires
    };

    /// @brief Adaptations spécialisées développées par les espèces
    struct EvolutionaryAdaptation
    {
        std::string adaptationName;
        std::string description;
        Ecosystem::EnvironmentType targetEnvironment;
        
        // Modifications des traits
        std::unordered_map<Genetics::TraitType, double> traitModifications;
        
        // Nouvelles capacités
        std::vector<std::string> newAbilities;
        
        // Coût énergétique de l'adaptation
        double energyCost;
        
        // Temps de développement (générations)
        uint32_t developmentTime;
        
        // Compatibilité avec autres adaptations
        std::vector<std::string> compatibleAdaptations;
        std::vector<std::string> incompatibleAdaptations;
    };

    /// @brief Gestionnaire des environnements et adaptations de Serina
    class SerinaEnvironmentManager
    {
    private:
        std::unordered_map<Ecosystem::EnvironmentType, EnvironmentDefinition> environments_;
        std::unordered_map<std::string, std::vector<EvolutionaryAdaptation>> speciesAdaptations_;
        std::unordered_map<Ecosystem::EnvironmentType, std::vector<std::string>> environmentSpecies_;
        
        std::mt19937 rng_;
        uint32_t currentYear_;
        
        // Catalogue d'adaptations possibles
        std::vector<EvolutionaryAdaptation> adaptationCatalog_;

    public:
        SerinaEnvironmentManager(uint32_t seed = std::random_device{}())
            : rng_(seed), currentYear_(0)
        {
            initializeEnvironments();
            initializeAdaptationCatalog();
        }

        /// @brief Initialise tous les environnements de Serina
        void initializeEnvironments()
        {
            // === PRAIRIE (Environnement principal original) ===
            EnvironmentDefinition grassland;
            grassland.type = Ecosystem::EnvironmentType::GRASSLAND;
            grassland.name = "Prairie de Serina";
            grassland.description = "Vastes étendues herbeuses, environnement principal de colonisation";
            grassland.climate = ClimateParameters(18.0, 0.65, 800.0, 0.4, 8.0, 0.85, 1.0, 0.0);
            grassland.resources = ResourceAvailability(0.8, 0.6, 0.5, 0.3, 0.7, 0.9, 0.4, 0.6);
            grassland.pressures = SelectivePressures(0.2, 0.3, 0.2, 0.1, 0.15, 0.05, 0.0);
            grassland.carryingCapacity = 10000.0;
            grassland.dietSpecificCapacity = {{Ecosystem::DietType::HERBIVORE, 0.6},
                                             {Ecosystem::DietType::OMNIVORE, 0.3},
                                             {Ecosystem::DietType::CARNIVORE, 0.1}};
            grassland.connectedEnvironments = {Ecosystem::EnvironmentType::FOREST,
                                               Ecosystem::EnvironmentType::WETLAND,
                                               Ecosystem::EnvironmentType::FRESHWATER};
            grassland.annualVariation = 0.3;
            grassland.stochasticEvents = 0.1;
            environments_[Ecosystem::EnvironmentType::GRASSLAND] = grassland;

            // === FORÊT ===
            EnvironmentDefinition forest;
            forest.type = Ecosystem::EnvironmentType::FOREST;
            forest.name = "Forêts de Serina";
            forest.description = "Formations forestières denses avec canopée complexe";
            forest.climate = ClimateParameters(16.0, 0.8, 1200.0, 0.5, 4.0, 0.6, 1.0, 0.0);
            forest.resources = ResourceAvailability(0.9, 0.8, 0.7, 0.4, 0.5, 0.7, 0.9, 0.8);
            forest.pressures = SelectivePressures(0.4, 0.5, 0.3, 0.2, 0.3, 0.2, 0.0);
            forest.carryingCapacity = 8000.0;
            forest.dietSpecificCapacity = {{Ecosystem::DietType::HERBIVORE, 0.5},
                                          {Ecosystem::DietType::OMNIVORE, 0.4},
                                          {Ecosystem::DietType::CARNIVORE, 0.1}};
            forest.connectedEnvironments = {Ecosystem::EnvironmentType::GRASSLAND,
                                           Ecosystem::EnvironmentType::MOUNTAIN,
                                           Ecosystem::EnvironmentType::WETLAND};
            forest.annualVariation = 0.4;
            forest.stochasticEvents = 0.15;
            environments_[Ecosystem::EnvironmentType::FOREST] = forest;

            // === EAU DOUCE ===
            EnvironmentDefinition freshwater;
            freshwater.type = Ecosystem::EnvironmentType::FRESHWATER;
            freshwater.name = "Lacs et rivières";
            freshwater.description = "Écosystèmes aquatiques d'eau douce";
            freshwater.climate = ClimateParameters(15.0, 1.0, 0.0, 0.6, 2.0, 0.7, 0.9, 0.0);
            freshwater.resources = ResourceAvailability(0.7, 0.6, 0.8, 0.2, 0.4, 1.0, 0.3, 0.4);
            freshwater.pressures = SelectivePressures(0.5, 0.6, 0.4, 0.3, 0.4, 0.3, 0.0);
            freshwater.carryingCapacity = 5000.0;
            freshwater.dietSpecificCapacity = {{Ecosystem::DietType::FILTER_FEEDER, 0.4},
                                              {Ecosystem::DietType::OMNIVORE, 0.4},
                                              {Ecosystem::DietType::CARNIVORE, 0.2}};
            freshwater.connectedEnvironments = {Ecosystem::EnvironmentType::GRASSLAND,
                                               Ecosystem::EnvironmentType::WETLAND,
                                               Ecosystem::EnvironmentType::OCEAN};
            freshwater.annualVariation = 0.5;
            freshwater.stochasticEvents = 0.2;
            environments_[Ecosystem::EnvironmentType::FRESHWATER] = freshwater;

            // === OCÉAN ===
            EnvironmentDefinition ocean;
            ocean.type = Ecosystem::EnvironmentType::OCEAN;
            ocean.name = "Océans de Serina";
            ocean.description = "Vastes étendues marines";
            ocean.climate = ClimateParameters(12.0, 1.0, 0.0, 0.3, 15.0, 0.5, 0.8, 0.8);
            ocean.resources = ResourceAvailability(0.6, 0.4, 0.9, 0.3, 0.8, 1.0, 0.1, 0.1);
            ocean.pressures = SelectivePressures(0.7, 0.4, 0.5, 0.4, 0.3, 0.1, 0.0);
            ocean.carryingCapacity = 20000.0;
            ocean.dietSpecificCapacity = {{Ecosystem::DietType::FILTER_FEEDER, 0.5},
                                         {Ecosystem::DietType::CARNIVORE, 0.3},
                                         {Ecosystem::DietType::OMNIVORE, 0.2}};
            ocean.connectedEnvironments = {Ecosystem::EnvironmentType::FRESHWATER};
            ocean.annualVariation = 0.2;
            ocean.stochasticEvents = 0.25;
            environments_[Ecosystem::EnvironmentType::OCEAN] = ocean;

            // === ZONES HUMIDES ===
            EnvironmentDefinition wetland;
            wetland.type = Ecosystem::EnvironmentType::WETLAND;
            wetland.name = "Marécages et zones humides";
            wetland.description = "Écosystèmes de transition aquatique-terrestre";
            wetland.climate = ClimateParameters(17.0, 0.9, 1500.0, 0.6, 6.0, 0.7, 0.7, 0.1);
            wetland.resources = ResourceAvailability(0.8, 0.9, 0.6, 0.3, 0.6, 0.8, 0.7, 0.9);
            wetland.pressures = SelectivePressures(0.3, 0.4, 0.3, 0.3, 0.5, 0.4, 0.0);
            wetland.carryingCapacity = 6000.0;
            wetland.dietSpecificCapacity = {{Ecosystem::DietType::DETRITIVORE, 0.4},
                                           {Ecosystem::DietType::OMNIVORE, 0.3},
                                           {Ecosystem::DietType::FILTER_FEEDER, 0.3}};
            wetland.connectedEnvironments = {Ecosystem::EnvironmentType::GRASSLAND,
                                            Ecosystem::EnvironmentType::FOREST,
                                            Ecosystem::EnvironmentType::FRESHWATER};
            wetland.annualVariation = 0.7;
            wetland.stochasticEvents = 0.3;
            environments_[Ecosystem::EnvironmentType::WETLAND] = wetland;

            // === MONTAGNE (À développer) ===
            EnvironmentDefinition mountain;
            mountain.type = Ecosystem::EnvironmentType::MOUNTAIN;
            mountain.name = "Chaînes montagneuses";
            mountain.description = "Environnements d'altitude aux conditions difficiles";
            mountain.climate = ClimateParameters(5.0, 0.4, 600.0, 0.8, 20.0, 0.9, 0.8, 0.0);
            mountain.resources = ResourceAvailability(0.3, 0.2, 0.2, 0.1, 0.9, 0.6, 0.8, 0.3);
            mountain.pressures = SelectivePressures(0.2, 0.7, 0.8, 0.9, 0.2, 0.6, 0.0);
            mountain.carryingCapacity = 2000.0;
            mountain.dietSpecificCapacity = {{Ecosystem::DietType::HERBIVORE, 0.6},
                                            {Ecosystem::DietType::OMNIVORE, 0.3},
                                            {Ecosystem::DietType::CARNIVORE, 0.1}};
            mountain.connectedEnvironments = {Ecosystem::EnvironmentType::FOREST,
                                             Ecosystem::EnvironmentType::ARCTIC};
            mountain.annualVariation = 0.9;
            mountain.stochasticEvents = 0.4;
            environments_[Ecosystem::EnvironmentType::MOUNTAIN] = mountain;

            std::cout << "🌍 " << environments_.size() 
                      << " environnements de Serina initialisés" << std::endl;
        }

        /// @brief Initialise le catalogue d'adaptations possibles
        void initializeAdaptationCatalog()
        {
            // === ADAPTATIONS POUR FORÊT ===
            EvolutionaryAdaptation arboreal;
            arboreal.adaptationName = "Arboreal Specialization";
            arboreal.description = "Adaptation à la vie dans les arbres";
            arboreal.targetEnvironment = Ecosystem::EnvironmentType::FOREST;
            arboreal.traitModifications = {{Genetics::TraitType::SPEED, -0.2},
                                          {Genetics::TraitType::AGGRESSION, -0.1},
                                          {Genetics::TraitType::VISION_RANGE, 0.3}};
            arboreal.newAbilities = {"tree_climbing", "branch_navigation", "canopy_nesting"};
            arboreal.energyCost = 0.15;
            arboreal.developmentTime = 50;
            adaptationCatalog_.push_back(arboreal);

            // === ADAPTATIONS AQUATIQUES ===
            EvolutionaryAdaptation aquatic;
            aquatic.adaptationName = "Aquatic Adaptation";
            aquatic.description = "Adaptation à la vie aquatique";
            aquatic.targetEnvironment = Ecosystem::EnvironmentType::FRESHWATER;
            aquatic.traitModifications = {{Genetics::TraitType::SPEED, 0.4},
                                         {Genetics::TraitType::ENERGY_EFFICIENCY, 0.2},
                                         {Genetics::TraitType::RESISTANCE, 0.1}};
            aquatic.newAbilities = {"swimming", "underwater_breathing", "pressure_resistance"};
            aquatic.energyCost = 0.2;
            aquatic.developmentTime = 80;
            adaptationCatalog_.push_back(aquatic);

            // === ADAPTATIONS MARINES ===
            EvolutionaryAdaptation marine;
            marine.adaptationName = "Marine Specialization";
            marine.description = "Adaptation aux environnements marins";
            marine.targetEnvironment = Ecosystem::EnvironmentType::OCEAN;
            marine.traitModifications = {{Genetics::TraitType::SIZE, 0.3},
                                        {Genetics::TraitType::RESISTANCE, 0.4},
                                        {Genetics::TraitType::ENERGY_EFFICIENCY, 0.1}};
            marine.newAbilities = {"salt_tolerance", "deep_diving", "echolocation"};
            marine.energyCost = 0.25;
            marine.developmentTime = 120;
            marine.incompatibleAdaptations = {"Freshwater Adaptation"};
            adaptationCatalog_.push_back(marine);

            // === ADAPTATIONS MONTAGNARDES ===
            EvolutionaryAdaptation alpine;
            alpine.adaptationName = "Alpine Adaptation";
            alpine.description = "Adaptation aux conditions d'altitude";
            alpine.targetEnvironment = Ecosystem::EnvironmentType::MOUNTAIN;
            alpine.traitModifications = {{Genetics::TraitType::SIZE, 0.2},
                                        {Genetics::TraitType::RESISTANCE, 0.5},
                                        {Genetics::TraitType::ENERGY_EFFICIENCY, 0.3}};
            alpine.newAbilities = {"cold_resistance", "altitude_tolerance", "efficient_breathing"};
            alpine.energyCost = 0.3;
            alpine.developmentTime = 100;
            adaptationCatalog_.push_back(alpine);

            // === ADAPTATIONS SOCIALES ===
            EvolutionaryAdaptation social;
            social.adaptationName = "Eusocial Behavior";
            social.description = "Développement de comportements eusociaux";
            social.targetEnvironment = Ecosystem::EnvironmentType::GRASSLAND; // Peut se développer partout
            social.traitModifications = {{Genetics::TraitType::SOCIAL_BEHAVIOR, 0.8},
                                        {Genetics::TraitType::INTELLIGENCE, 0.4},
                                        {Genetics::TraitType::AGGRESSION, -0.3}};
            social.newAbilities = {"collective_intelligence", "division_of_labor", "chemical_communication"};
            social.energyCost = 0.1;
            social.developmentTime = 200;
            adaptationCatalog_.push_back(social);

            std::cout << "🧬 " << adaptationCatalog_.size() 
                      << " adaptations évolutionnaires disponibles" << std::endl;
        }

        /// @brief Évalue si une espèce peut développer une adaptation
        bool canDevelopAdaptation(const std::string& species, 
                                const EvolutionaryAdaptation& adaptation,
                                const Ecosystem::SpeciesCharacteristics& characteristics) const
        {
            // Vérifier la compatibilité biologique
            if (adaptation.targetEnvironment == Ecosystem::EnvironmentType::FRESHWATER ||
                adaptation.targetEnvironment == Ecosystem::EnvironmentType::OCEAN)
            {
                if (characteristics.biologicalType == Taxonomy::BiologicalType::BIRD &&
                    !characteristics.canSwim)
                    return false; // Les oiseaux non-nageurs ne peuvent pas s'adapter à l'aquatique facilement
            }

            // Vérifier les adaptations incompatibles existantes
            auto speciesAdaptIt = speciesAdaptations_.find(species);
            if (speciesAdaptIt != speciesAdaptations_.end())
            {
                for (const auto& existingAdapt : speciesAdaptIt->second)
                {
                    if (std::find(adaptation.incompatibleAdaptations.begin(),
                                adaptation.incompatibleAdaptations.end(),
                                existingAdapt.adaptationName) != adaptation.incompatibleAdaptations.end())
                        return false;
                }
            }

            // Vérifier la flexibilité d'adaptation de l'espèce
            return characteristics.adaptationFlexibility > 0.3; // Seuil minimum
        }

        /// @brief Applique une pression sélective pour encourager l'adaptation
        std::vector<std::string> suggestAdaptations(const std::string& species,
                                                   Ecosystem::EnvironmentType currentEnv,
                                                   const Ecosystem::SpeciesCharacteristics& characteristics) const
        {
            std::vector<std::string> suggestions;
            
            auto envIt = environments_.find(currentEnv);
            if (envIt == environments_.end()) return suggestions;
            
            const auto& environment = envIt->second;
            
            // Analyser les pressions sélectives
            if (environment.pressures.climaticStress > 0.5)
            {
                for (const auto& adaptation : adaptationCatalog_)
                {
                    if (adaptation.targetEnvironment == currentEnv &&
                        canDevelopAdaptation(species, adaptation, characteristics))
                    {
                        suggestions.push_back(adaptation.adaptationName);
                    }
                }
            }

            // Suggérer expansion vers environnements connectés si surpopulation
            if (environment.pressures.competitionIntensity > 0.6)
            {
                for (auto connectedEnv : environment.connectedEnvironments)
                {
                    for (const auto& adaptation : adaptationCatalog_)
                    {
                        if (adaptation.targetEnvironment == connectedEnv &&
                            canDevelopAdaptation(species, adaptation, characteristics))
                        {
                            suggestions.push_back(adaptation.adaptationName);
                        }
                    }
                }
            }

            return suggestions;
        }

        /// @brief Simule l'évolution d'une adaptation
        bool evolveAdaptation(const std::string& species, const std::string& adaptationName,
                            uint32_t generationsElapsed)
        {
            // Trouver l'adaptation dans le catalogue
            auto adaptIt = std::find_if(adaptationCatalog_.begin(), adaptationCatalog_.end(),
                [&adaptationName](const EvolutionaryAdaptation& adapt) {
                    return adapt.adaptationName == adaptationName;
                });
            
            if (adaptIt == adaptationCatalog_.end()) return false;

            // Vérifier si assez de temps s'est écoulé
            if (generationsElapsed < adaptIt->developmentTime) return false;

            // Ajouter l'adaptation à l'espèce
            speciesAdaptations_[species].push_back(*adaptIt);
            
            std::cout << "🧬 " << species << " a développé l'adaptation : " 
                      << adaptationName << std::endl;
            
            return true;
        }

        /// @brief Calcule l'effet des conditions environnementales sur une espèce
        double calculateEnvironmentalFitness(const std::string& species,
                                            Ecosystem::EnvironmentType environment,
                                            const Ecosystem::SpeciesCharacteristics& characteristics) const
        {
            auto envIt = environments_.find(environment);
            if (envIt == environments_.end()) return 0.5; // Fitness neutre par défaut

            const auto& env = envIt->second;
            double fitness = 1.0;

            // Facteurs climatiques
            double tempOptimum = getSpeciesTemperatureOptimum(characteristics);
            double tempStress = std::abs(env.climate.temperature - tempOptimum) / 30.0;
            fitness *= std::exp(-tempStress);

            // Disponibilité des ressources selon le régime alimentaire
            double resourceFitness = getResourceFitness(characteristics.diet, env.resources);
            fitness *= resourceFitness;

            // Adaptations spécifiques
            auto adaptIt = speciesAdaptations_.find(species);
            if (adaptIt != speciesAdaptations_.end())
            {
                for (const auto& adaptation : adaptIt->second)
                {
                    if (adaptation.targetEnvironment == environment)
                    {
                        fitness *= (1.0 + 0.5); // Bonus de 50% pour adaptation spécialisée
                    }
                    fitness *= (1.0 - adaptation.energyCost); // Coût énergétique
                }
            }

            // Pressions sélectives
            fitness *= (1.0 - env.pressures.climaticStress * 0.3);
            fitness *= (1.0 - env.pressures.diseaseLoad * 0.2);

            return std::clamp(fitness, 0.01, 2.0);
        }

        /// @brief Simule les changements environnementaux au fil du temps
        void simulateEnvironmentalChange(uint32_t years)
        {
            currentYear_ += years;
            
            // Changements climatiques graduels
            for (auto& [envType, env] : environments_)
            {
                std::uniform_real_distribution<double> changeDist(-0.01, 0.01);
                
                // Dérive climatique lente
                env.climate.temperature += changeDist(rng_) * years;
                env.climate.precipitation *= (1.0 + changeDist(rng_) * years * 0.1);
                
                // Événements stochastiques
                std::uniform_real_distribution<double> eventDist(0.0, 1.0);
                if (eventDist(rng_) < env.stochasticEvents * years * 0.01)
                {
                    // Événement majeur (sécheresse, inondation, etc.)
                    simulateStochasticEvent(env);
                }
            }
        }

        /// @brief Obtient la définition d'un environnement
        const EnvironmentDefinition* getEnvironment(Ecosystem::EnvironmentType type) const
        {
            auto it = environments_.find(type);
            return (it != environments_.end()) ? &it->second : nullptr;
        }

        /// @brief Obtient toutes les adaptations d'une espèce
        std::vector<EvolutionaryAdaptation> getSpeciesAdaptations(const std::string& species) const
        {
            auto it = speciesAdaptations_.find(species);
            return (it != speciesAdaptations_.end()) ? it->second : std::vector<EvolutionaryAdaptation>();
        }

        /// @brief Obtient l'année actuelle de simulation
        uint32_t getCurrentYear() const { return currentYear_; }

    private:
        double getSpeciesTemperatureOptimum(const Ecosystem::SpeciesCharacteristics& characteristics) const
        {
            // Température optimale basée sur le type biologique
            switch (characteristics.biologicalType)
            {
            case Taxonomy::BiologicalType::BIRD: return 22.0;
            case Taxonomy::BiologicalType::FISH: return 18.0;
            case Taxonomy::BiologicalType::ARTHROPOD: return 25.0;
            case Taxonomy::BiologicalType::MOLLUSC: return 20.0;
            case Taxonomy::BiologicalType::CNIDARIAN: return 16.0;
            case Taxonomy::BiologicalType::ANNELID: return 15.0;
            case Taxonomy::BiologicalType::CRUSTACEAN: return 18.0;
            case Taxonomy::BiologicalType::PLANT: return 20.0;
            default: return 20.0;
            }
        }

        double getResourceFitness(Ecosystem::DietType diet, const ResourceAvailability& resources) const
        {
            switch (diet)
            {
            case Ecosystem::DietType::HERBIVORE:
                return resources.primaryProducers;
            case Ecosystem::DietType::CARNIVORE:
                return (resources.smallPrey + resources.largePrey) * 0.5;
            case Ecosystem::DietType::OMNIVORE:
                return (resources.primaryProducers + resources.smallPrey) * 0.5;
            case Ecosystem::DietType::DETRITIVORE:
                return resources.detritus;
            case Ecosystem::DietType::FILTER_FEEDER:
                return resources.waterQuality * resources.smallPrey;
            case Ecosystem::DietType::PARASITE:
                return resources.largePrey; // Hôtes disponibles
            case Ecosystem::DietType::PHOTOSYNTHETIC:
                return resources.waterQuality * 0.5 + 0.5; // Luminosité simulée
            default:
                return 0.5;
            }
        }

        void simulateStochasticEvent(EnvironmentDefinition& env)
        {
            std::uniform_int_distribution<int> eventType(0, 3);
            
            switch (eventType(rng_))
            {
            case 0: // Sécheresse
                env.climate.precipitation *= 0.3;
                env.resources.waterQuality *= 0.5;
                env.pressures.resourceScarcity += 0.3;
                break;
                
            case 1: // Inondation
                env.climate.precipitation *= 3.0;
                env.resources.shelter *= 0.7;
                env.pressures.climaticStress += 0.2;
                break;
                
            case 2: // Épidémie
                env.pressures.diseaseLoad += 0.4;
                break;
                
            case 3: // Boom de ressources
                env.resources.primaryProducers *= 1.5;
                env.resources.smallPrey *= 1.3;
                break;
            }
        }
    };

} // namespace Serina::Environment