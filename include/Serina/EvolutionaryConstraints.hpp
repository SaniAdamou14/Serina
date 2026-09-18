#pragma once

#include "AdvancedGenetics.hpp"
#include "SerinaEcosystem.hpp"
#include "EnvironmentalAdaptation.hpp"
#include <memory>
#include <vector>
#include <unordered_map>
#include <functional>
#include <random>
#include <cmath>
#include <iostream>

namespace Serina::Evolution
{

    /// @brief Types de contraintes évolutionnaires
    enum class ConstraintType
    {
        MORPHOLOGICAL,     ///< Contraintes morphologiques (taille, forme)
        PHYSIOLOGICAL,     ///< Contraintes physiologiques (métabolisme, respiration)
        DEVELOPMENTAL,     ///< Contraintes développementales (embryologie, croissance)
        BIOMECHANICAL,     ///< Contraintes biomécaniques (locomotion, résistance)
        ECOLOGICAL,        ///< Contraintes écologiques (niche, interactions)
        GENETIC,          ///< Contraintes génétiques (linkage, pléiotropie)
        PHYLOGENETIC      ///< Contraintes phylogénétiques (héritage évolutif)
    };

    /// @brief Contrainte évolutionnaire spécifique
    struct EvolutionaryConstraint
    {
        ConstraintType type;
        std::string name;
        std::string description;
        
        // Fonction de validation
        std::function<bool(const Genetics::AdvancedTraitValues&)> validator;
        
        // Intensité de la contrainte [0-1]
        double strength;
        
        // Coût énergétique de violer la contrainte
        double violationCost;
        
        // Traits affectés
        std::vector<Genetics::TraitType> affectedTraits;
        
        // Probabilité que la contrainte soit active
        double activationProbability;
    };

    /// @brief Règles évolutionnaires spécifiques à un groupe biologique
    struct BiologicalGroupRules
    {
        Taxonomy::BiologicalType biologicalType;
        std::string groupName;
        
        // Contraintes spécifiques au groupe
        std::vector<EvolutionaryConstraint> constraints;
        
        // Limites des traits
        std::unordered_map<Genetics::TraitType, std::pair<double, double>> traitLimits;
        
        // Taux de mutation spécifique
        double baseMutationRate;
        std::unordered_map<Genetics::TraitType, double> traitSpecificMutationRates;
        
        // Corrélations entre traits (pléiotropie)
        std::vector<std::pair<Genetics::TraitType, Genetics::TraitType>> traitCorrelations;
        
        // Patterns de développement
        std::vector<std::string> developmentalPatterns;
        
        // Innovations évolutionnaires possibles
        std::vector<std::string> possibleInnovations;
        
        // Contraintes écologiques
        std::vector<Ecosystem::EnvironmentType> preferredEnvironments;
        std::vector<Ecosystem::DietType> possibleDiets;
    };

    /// @brief Innovations évolutionnaires majeures
    struct EvolutionaryInnovation
    {
        std::string name;
        std::string description;
        Taxonomy::BiologicalType requiredBiologicalType;
        
        // Prérequis évolutionnaires
        std::vector<std::string> prerequisites;
        
        // Modifications des traits
        std::unordered_map<Genetics::TraitType, double> traitModifications;
        
        // Nouvelles capacités débloquées
        std::vector<std::string> newCapabilities;
        
        // Probabilité d'apparition par génération
        double innovationProbability;
        
        // Coût évolutionnaire
        double evolutionaryCost;
        
        // Avantage adaptatif
        double adaptiveAdvantage;
        
        // Temps de fixation dans la population
        uint32_t fixationTime;
    };

    /// @brief Gestionnaire des contraintes évolutionnaires spécifiques à Serina
    class SerinaEvolutionaryConstraints
    {
    private:
        std::unordered_map<Taxonomy::BiologicalType, BiologicalGroupRules> groupRules_;
        std::unordered_map<std::string, std::vector<EvolutionaryInnovation>> speciesInnovations_;
        std::unordered_map<std::string, std::vector<std::string>> acquiredInnovations_;
        
        std::mt19937 rng_;
        uint32_t currentGeneration_;

    public:
        SerinaEvolutionaryConstraints(uint32_t seed = std::random_device{}())
            : rng_(seed), currentGeneration_(0)
        {
            initializeBiologicalGroupRules();
        }

        /// @brief Initialise les règles pour chaque groupe biologique
        void initializeBiologicalGroupRules()
        {
            // === RÈGLES POUR LES OISEAUX ===
            BiologicalGroupRules birdRules;
            birdRules.biologicalType = Taxonomy::BiologicalType::BIRD;
            birdRules.groupName = "Oiseaux (Canaris et descendants)";
            birdRules.baseMutationRate = 0.02;
            
            // Limites des traits pour oiseaux
            birdRules.traitLimits = {
                {Genetics::TraitType::SIZE, {0.3, 2.0}},           // Taille limitée par contraintes de vol
                {Genetics::TraitType::SPEED, {0.5, 3.0}},          // Vitesse élevée possible
                {Genetics::TraitType::ENERGY_EFFICIENCY, {0.4, 1.5}}, // Métabolisme élevé
                {Genetics::TraitType::INTELLIGENCE, {0.6, 2.5}},    // Intelligence élevée possible
                {Genetics::TraitType::VISION_RANGE, {1.0, 4.0}},    // Excellente vision
                {Genetics::TraitType::SOCIAL_BEHAVIOR, {0.2, 2.0}}, // Variable selon espèce
                {Genetics::TraitType::RESISTANCE, {0.3, 1.2}},      // Résistance limitée
                {Genetics::TraitType::AGGRESSION, {0.1, 1.5}},      // Variable
                {Genetics::TraitType::REPRODUCTION_RATE, {0.4, 1.8}},       // Fertilité modérée
                {Genetics::TraitType::LONGEVITY, {0.5, 2.0}},       // Longévité variable
                {Genetics::TraitType::INTELLIGENCE, {0.8, 3.0}}, // Complexité neurale élevée
                {Genetics::TraitType::HEARING_ACUITY, {1.2, 3.5}}   // Excellents sens
            };

            // Contraintes spécifiques aux oiseaux
            EvolutionaryConstraint flightConstraint;
            flightConstraint.type = ConstraintType::BIOMECHANICAL;
            flightConstraint.name = "Flight Mechanics";
            flightConstraint.description = "Contraintes biomécaniques du vol";
            flightConstraint.strength = 0.8;
            flightConstraint.violationCost = 0.3;
            flightConstraint.affectedTraits = {Genetics::TraitType::SIZE, Genetics::TraitType::SPEED};
            flightConstraint.activationProbability = 1.0;
            flightConstraint.validator = [](const Genetics::AdvancedTraitValues& traits) {
                // Loi de carré-cube : grandes tailles rendent le vol difficile
                return traits.size < 1.5 || traits.speed < 2.0;
            };
            birdRules.constraints.push_back(flightConstraint);

            EvolutionaryConstraint eggConstraint;
            eggConstraint.type = ConstraintType::DEVELOPMENTAL;
            eggConstraint.name = "Egg Development";
            eggConstraint.description = "Contraintes liées au développement embryonnaire en œuf";
            eggConstraint.strength = 0.6;
            eggConstraint.violationCost = 0.4;
            eggConstraint.affectedTraits = {Genetics::TraitType::SIZE, Genetics::TraitType::REPRODUCTION_RATE};
            eggConstraint.activationProbability = 1.0;
            eggConstraint.validator = [](const Genetics::AdvancedTraitValues& traits) {
                // Gros oiseaux = œufs plus gros = fertilité réduite
                return traits.reproductionRate * traits.size < 2.5;
            };
            birdRules.constraints.push_back(eggConstraint);

            // Corrélations entre traits
            birdRules.traitCorrelations = {
                {Genetics::TraitType::SIZE, Genetics::TraitType::SPEED},        // Inverse: plus gros = moins rapide
                {Genetics::TraitType::INTELLIGENCE, Genetics::TraitType::INTELLIGENCE}, // Positive
                {Genetics::TraitType::VISION_RANGE, Genetics::TraitType::HEARING_ACUITY}     // Positive
            };

            // Innovations possibles
            birdRules.possibleInnovations = {"powered_flight", "tool_use", "complex_vocalizations", 
                                           "cooperative_hunting", "migration_navigation"};
            
            birdRules.preferredEnvironments = {Ecosystem::EnvironmentType::GRASSLAND, 
                                              Ecosystem::EnvironmentType::FOREST};
            birdRules.possibleDiets = {Ecosystem::DietType::HERBIVORE, Ecosystem::DietType::OMNIVORE, 
                                      Ecosystem::DietType::CARNIVORE};

            groupRules_[Taxonomy::BiologicalType::BIRD] = birdRules;

            // === RÈGLES POUR LES POISSONS ===
            BiologicalGroupRules fishRules;
            fishRules.biologicalType = Taxonomy::BiologicalType::FISH;
            fishRules.groupName = "Poissons (Guppys, Platys et descendants)";
            fishRules.baseMutationRate = 0.025;

            fishRules.traitLimits = {
                {Genetics::TraitType::SIZE, {0.2, 3.0}},           // Très variable
                {Genetics::TraitType::SPEED, {0.8, 4.0}},          // Excellent nageur
                {Genetics::TraitType::ENERGY_EFFICIENCY, {0.6, 2.0}}, // Efficace en milieu aquatique
                {Genetics::TraitType::INTELLIGENCE, {0.3, 1.5}},    // Intelligence limitée
                {Genetics::TraitType::VISION_RANGE, {0.4, 2.0}},    // Vision limitée par l'eau
                {Genetics::TraitType::SOCIAL_BEHAVIOR, {0.3, 2.5}}, // Bancs possibles
                {Genetics::TraitType::RESISTANCE, {0.5, 1.8}},      // Bonne résistance
                {Genetics::TraitType::REPRODUCTION_RATE, {0.8, 3.0}},       // Très fertile
                {Genetics::TraitType::LONGEVITY, {0.3, 1.0}}        // Vie courte
            };

            // Contrainte aquatique
            EvolutionaryConstraint aquaticConstraint;
            aquaticConstraint.type = ConstraintType::PHYSIOLOGICAL;
            aquaticConstraint.name = "Aquatic Respiration";
            aquaticConstraint.description = "Contraintes de respiration aquatique";
            aquaticConstraint.strength = 0.9;
            aquaticConstraint.violationCost = 0.5;
            aquaticConstraint.affectedTraits = {Genetics::TraitType::SIZE, Genetics::TraitType::ENERGY_EFFICIENCY};
            aquaticConstraint.activationProbability = 1.0;
            aquaticConstraint.validator = [](const Genetics::AdvancedTraitValues& traits) {
                return true; // Les poissons sont obligatoirement aquatiques
            };
            fishRules.constraints.push_back(aquaticConstraint);

            fishRules.possibleInnovations = {"schooling_behavior", "lateral_line_enhancement", 
                                           "electrical_sense", "deep_water_adaptation"};
            fishRules.preferredEnvironments = {Ecosystem::EnvironmentType::FRESHWATER, 
                                              Ecosystem::EnvironmentType::OCEAN};
            fishRules.possibleDiets = {Ecosystem::DietType::OMNIVORE, Ecosystem::DietType::CARNIVORE, 
                                      Ecosystem::DietType::FILTER_FEEDER};

            groupRules_[Taxonomy::BiologicalType::FISH] = fishRules;

            // === RÈGLES POUR LES ARTHROPODES ===
            BiologicalGroupRules arthropodRules;
            arthropodRules.biologicalType = Taxonomy::BiologicalType::ARTHROPOD;
            arthropodRules.groupName = "Arthropodes (Fourmis, Grillons, Collemboles)";
            arthropodRules.baseMutationRate = 0.03;

            arthropodRules.traitLimits = {
                {Genetics::TraitType::SIZE, {0.1, 1.0}},           // Petite taille obligatoire
                {Genetics::TraitType::SPEED, {0.5, 2.5}},          // Rapides
                {Genetics::TraitType::ENERGY_EFFICIENCY, {0.8, 2.5}}, // Très efficaces
                {Genetics::TraitType::SOCIAL_BEHAVIOR, {0.1, 3.0}}, // De solitaire à eusocial
                {Genetics::TraitType::RESISTANCE, {0.7, 2.0}},      // Exosquelette protecteur
                {Genetics::TraitType::REPRODUCTION_RATE, {1.0, 4.0}},       // Très fertiles
                {Genetics::TraitType::LONGEVITY, {0.2, 0.8}}        // Vie courte
            };

            // Contrainte d'exosquelette
            EvolutionaryConstraint exoskeletonConstraint;
            exoskeletonConstraint.type = ConstraintType::MORPHOLOGICAL;
            exoskeletonConstraint.name = "Exoskeleton Limitation";
            exoskeletonConstraint.description = "Contraintes de l'exosquelette articulé";
            exoskeletonConstraint.strength = 0.9;
            exoskeletonConstraint.violationCost = 0.4;
            exoskeletonConstraint.affectedTraits = {Genetics::TraitType::SIZE};
            exoskeletonConstraint.activationProbability = 1.0;
            exoskeletonConstraint.validator = [](const Genetics::AdvancedTraitValues& traits) {
                return traits.size < 1.0; // Taille limitée par l'exosquelette
            };
            arthropodRules.constraints.push_back(exoskeletonConstraint);

            // Contrainte de métamorphose
            EvolutionaryConstraint metamorphosisConstraint;
            metamorphosisConstraint.type = ConstraintType::DEVELOPMENTAL;
            metamorphosisConstraint.name = "Metamorphosis Constraint";
            metamorphosisConstraint.description = "Contraintes liées au développement avec métamorphose";
            metamorphosisConstraint.strength = 0.7;
            metamorphosisConstraint.violationCost = 0.3;
            metamorphosisConstraint.affectedTraits = {Genetics::TraitType::ENERGY_EFFICIENCY, Genetics::TraitType::RESISTANCE};
            metamorphosisConstraint.activationProbability = 0.8; // Pas tous les arthropodes
            arthropodRules.constraints.push_back(metamorphosisConstraint);

            arthropodRules.possibleInnovations = {"eusociality", "complex_metamorphosis", "chemical_communication",
                                                "flight_evolution", "agricultural_behavior"};
            arthropodRules.preferredEnvironments = {Ecosystem::EnvironmentType::GRASSLAND, 
                                                   Ecosystem::EnvironmentType::FOREST,
                                                   Ecosystem::EnvironmentType::WETLAND};

            groupRules_[Taxonomy::BiologicalType::ARTHROPOD] = arthropodRules;

            // === RÈGLES POUR LES MOLLUSQUES ===
            BiologicalGroupRules molluscRules;
            molluscRules.biologicalType = Taxonomy::BiologicalType::MOLLUSC;
            molluscRules.groupName = "Mollusques (Escargots, Limaces)";
            molluscRules.baseMutationRate = 0.015;

            molluscRules.traitLimits = {
                {Genetics::TraitType::SIZE, {0.2, 2.5}},           // Taille variable
                {Genetics::TraitType::SPEED, {0.1, 0.8}},          // Lents
                {Genetics::TraitType::ENERGY_EFFICIENCY, {0.5, 2.0}}, // Métabolisme lent
                {Genetics::TraitType::RESISTANCE, {0.8, 2.5}},      // Coquille protectrice
                {Genetics::TraitType::REPRODUCTION_RATE, {0.6, 2.0}},       // Fertilité modérée
                {Genetics::TraitType::LONGEVITY, {0.8, 2.5}}        // Relativement longévifs
            };

            // Contrainte de locomotion
            EvolutionaryConstraint locomotionConstraint;
            locomotionConstraint.type = ConstraintType::BIOMECHANICAL;
            locomotionConstraint.name = "Gastropod Locomotion";
            locomotionConstraint.description = "Contraintes de locomotion par glissement";
            locomotionConstraint.strength = 0.8;
            locomotionConstraint.violationCost = 0.2;
            locomotionConstraint.affectedTraits = {Genetics::TraitType::SPEED};
            locomotionConstraint.activationProbability = 1.0;
            locomotionConstraint.validator = [](const Genetics::AdvancedTraitValues& traits) {
                return traits.speed < 1.0; // Vitesse limitée par la locomotion
            };
            molluscRules.constraints.push_back(locomotionConstraint);

            molluscRules.possibleInnovations = {"shell_optimization", "slime_chemistry", "hermaphroditism_enhancement"};
            molluscRules.preferredEnvironments = {Ecosystem::EnvironmentType::FOREST, 
                                                 Ecosystem::EnvironmentType::WETLAND};
            molluscRules.possibleDiets = {Ecosystem::DietType::HERBIVORE, Ecosystem::DietType::DETRITIVORE};

            groupRules_[Taxonomy::BiologicalType::MOLLUSC] = molluscRules;

            // === RÈGLES POUR LES CNIDAIRES ===
            BiologicalGroupRules cnidarianRules;
            cnidarianRules.biologicalType = Taxonomy::BiologicalType::CNIDARIAN;
            cnidarianRules.groupName = "Cnidaires (Hydres, Méduses)";
            cnidarianRules.baseMutationRate = 0.02;

            cnidarianRules.traitLimits = {
                {Genetics::TraitType::SIZE, {0.1, 1.5}},           // Taille limitée
                {Genetics::TraitType::SPEED, {0.0, 1.0}},          // Peu mobiles
                {Genetics::TraitType::RESISTANCE, {0.4, 1.5}},      // Corps mou
                {Genetics::TraitType::REPRODUCTION_RATE, {1.5, 4.0}},       // Très fertiles (bourgeonnement)
                {Genetics::TraitType::LONGEVITY, {0.5, 3.0}}        // Potentiellement immortels
            };

            // Contrainte de symétrie radiale
            EvolutionaryConstraint radialConstraint;
            radialConstraint.type = ConstraintType::MORPHOLOGICAL;
            radialConstraint.name = "Radial Symmetry";
            radialConstraint.description = "Contraintes de la symétrie radiale";
            radialConstraint.strength = 0.9;
            radialConstraint.violationCost = 0.6;
            radialConstraint.affectedTraits = {Genetics::TraitType::SPEED, Genetics::TraitType::INTELLIGENCE};
            radialConstraint.activationProbability = 1.0;
            cnidarianRules.constraints.push_back(radialConstraint);

            cnidarianRules.possibleInnovations = {"colonial_organization", "cnidocyte_enhancement", "polymorphism"};
            cnidarianRules.preferredEnvironments = {Ecosystem::EnvironmentType::FRESHWATER, 
                                                   Ecosystem::EnvironmentType::WETLAND};

            groupRules_[Taxonomy::BiologicalType::CNIDARIAN] = cnidarianRules;
        }

        /// @brief Valide une mutation selon les contraintes biologiques
        bool validateMutation(const std::string& species,
                            const Genetics::AdvancedTraitValues& originalTraits,
                            const Genetics::AdvancedTraitValues& mutatedTraits,
                            Taxonomy::BiologicalType biologicalType) const
        {
            auto rulesIt = groupRules_.find(biologicalType);
            if (rulesIt == groupRules_.end()) return true; // Pas de contraintes = accepté

            const auto& rules = rulesIt->second;

            // Vérifier les limites des traits
            for (const auto& [trait, limits] : rules.traitLimits)
            {
                double value = getTraitValue(mutatedTraits, trait);
                if (value < limits.first || value > limits.second)
                    return false;
            }

            // Vérifier les contraintes spécifiques
            for (const auto& constraint : rules.constraints)
            {
                std::uniform_real_distribution<double> probDist(0.0, 1.0);
                if (probDist(const_cast<std::mt19937&>(rng_)) < constraint.activationProbability)
                {
                    if (!constraint.validator(mutatedTraits))
                        return false;
                }
            }

            return true;
        }

        /// @brief Applique les corrélations entre traits (pléiotropie)
        Genetics::AdvancedTraitValues applyTraitCorrelations(
            const Genetics::AdvancedTraitValues& traits,
            Taxonomy::BiologicalType biologicalType) const
        {
            auto rulesIt = groupRules_.find(biologicalType);
            if (rulesIt == groupRules_.end()) return traits;

            Genetics::AdvancedTraitValues correlatedTraits = traits;
            const auto& rules = rulesIt->second;

            for (const auto& [trait1, trait2] : rules.traitCorrelations)
            {
                double value1 = getTraitValue(traits, trait1);
                double value2 = getTraitValue(traits, trait2);

                // Corrélation simple : trait2 influence trait1
                double correlation = 0.2; // Intensité de corrélation
                double newValue1 = value1 + (value2 - 1.0) * correlation;
                
                setTraitValue(correlatedTraits, trait1, newValue1);
            }

            return correlatedTraits;
        }

        /// @brief Calcule la probabilité d'innovation évolutionnaire
        double calculateInnovationProbability(const std::string& species,
                                             const std::string& innovation,
                                             Taxonomy::BiologicalType biologicalType,
                                             const Environment::EnvironmentDefinition& environment) const
        {
            auto rulesIt = groupRules_.find(biologicalType);
            if (rulesIt == groupRules_.end()) return 0.0;

            const auto& rules = rulesIt->second;

            // Vérifier si l'innovation est possible pour ce groupe
            if (std::find(rules.possibleInnovations.begin(), rules.possibleInnovations.end(), innovation) 
                == rules.possibleInnovations.end())
                return 0.0;

            double baseProbability = 0.001; // 0.1% par génération

            // Modifier selon les pressions sélectives
            if (environment.pressures.competitionIntensity > 0.7)
                baseProbability *= 2.0; // Plus de pression = plus d'innovation

            if (environment.pressures.resourceScarcity > 0.6)
                baseProbability *= 1.5;

            // Réduire si l'espèce a déjà beaucoup d'innovations
            auto innovIt = acquiredInnovations_.find(species);
            if (innovIt != acquiredInnovations_.end())
            {
                double innovationCount = static_cast<double>(innovIt->second.size());
                baseProbability *= std::exp(-innovationCount * 0.3);
            }

            return std::clamp(baseProbability, 0.0, 0.01);
        }

        /// @brief Applique une innovation évolutionnaire
        bool applyInnovation(const std::string& species, const std::string& innovation,
                           Taxonomy::BiologicalType biologicalType)
        {
            // Vérifier si l'innovation n'est pas déjà acquise
            auto innovIt = acquiredInnovations_.find(species);
            if (innovIt != acquiredInnovations_.end())
            {
                if (std::find(innovIt->second.begin(), innovIt->second.end(), innovation) 
                    != innovIt->second.end())
                    return false; // Déjà acquise
            }

            // Ajouter l'innovation
            acquiredInnovations_[species].push_back(innovation);

            return true;
        }

        /// @brief Obtient le taux de mutation spécifique
        double getMutationRate(Taxonomy::BiologicalType biologicalType, 
                             Genetics::TraitType trait) const
        {
            auto rulesIt = groupRules_.find(biologicalType);
            if (rulesIt == groupRules_.end()) return 0.02; // Taux par défaut

            const auto& rules = rulesIt->second;
            
            auto traitRateIt = rules.traitSpecificMutationRates.find(trait);
            if (traitRateIt != rules.traitSpecificMutationRates.end())
                return traitRateIt->second;
            
            return rules.baseMutationRate;
        }

        /// @brief Obtient les règles d'un groupe biologique
        const BiologicalGroupRules* getBiologicalGroupRules(Taxonomy::BiologicalType type) const
        {
            auto it = groupRules_.find(type);
            return (it != groupRules_.end()) ? &it->second : nullptr;
        }

        /// @brief Obtient les innovations acquises par une espèce
        std::vector<std::string> getSpeciesInnovations(const std::string& species) const
        {
            auto it = acquiredInnovations_.find(species);
            return (it != acquiredInnovations_.end()) ? it->second : std::vector<std::string>();
        }

        /// @brief Avance la simulation d'une génération
        void advanceGeneration() { currentGeneration_++; }

        /// @brief Obtient la génération actuelle
        uint32_t getCurrentGeneration() const { return currentGeneration_; }

        /// @brief Obtient la valeur d'un trait spécifique
        double getTraitValue(const Genetics::AdvancedTraitValues& traits, Genetics::TraitType trait) const
        {
            switch (trait)
            {
            case Genetics::TraitType::SIZE: return traits.size;
            case Genetics::TraitType::SPEED: return traits.speed;
            case Genetics::TraitType::ENERGY_EFFICIENCY: return traits.energyEfficiency;
            case Genetics::TraitType::INTELLIGENCE: return traits.intelligence;
            case Genetics::TraitType::VISION_RANGE: return traits.visionRange;
            case Genetics::TraitType::SOCIAL_BEHAVIOR: return traits.socialBehavior;
            case Genetics::TraitType::RESISTANCE: return traits.resistance;
            case Genetics::TraitType::AGGRESSION: return traits.aggression;
            case Genetics::TraitType::REPRODUCTION_RATE: return traits.reproductionRate;
            case Genetics::TraitType::LONGEVITY: return traits.longevity;
            case Genetics::TraitType::HEARING_ACUITY: return traits.hearingAcuity;
            case Genetics::TraitType::CAMOUFLAGE: return traits.camouflage;
            default: return 1.0;
            }
        }

        /// @brief Modifie la valeur d'un trait spécifique
        void setTraitValue(Genetics::AdvancedTraitValues& traits, Genetics::TraitType trait, double value) const
        {
            value = std::clamp(value, 0.1, 5.0); // Limites globales
            
            switch (trait)
            {
            case Genetics::TraitType::SIZE: traits.size = value; break;
            case Genetics::TraitType::SPEED: traits.speed = value; break;
            case Genetics::TraitType::ENERGY_EFFICIENCY: traits.energyEfficiency = value; break;
            case Genetics::TraitType::INTELLIGENCE: traits.intelligence = value; break;
            case Genetics::TraitType::VISION_RANGE: traits.visionRange = value; break;
            case Genetics::TraitType::SOCIAL_BEHAVIOR: traits.socialBehavior = value; break;
            case Genetics::TraitType::RESISTANCE: traits.resistance = value; break;
            case Genetics::TraitType::AGGRESSION: traits.aggression = value; break;
            case Genetics::TraitType::REPRODUCTION_RATE: traits.reproductionRate = value; break;
            case Genetics::TraitType::LONGEVITY: traits.longevity = value; break;
            case Genetics::TraitType::HEARING_ACUITY: traits.hearingAcuity = value; break;
            case Genetics::TraitType::CAMOUFLAGE: traits.camouflage = value; break;
            default: break;
            }
        }

    private:
        // Données membres privées déjà définies au début de la classe
    };

} // namespace Serina::Evolution
