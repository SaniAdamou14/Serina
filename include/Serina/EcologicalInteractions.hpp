#pragma once

#include "SerinaEcosystem.hpp"
#include <memory>
#include <vector>
#include <unordered_map>
#include <functional>
#include <random>
#include <algorithm>
#include <cmath>

namespace Serina::Ecology
{

    /// @brief Types d'interactions écologiques
    enum class InteractionType
    {
        PREDATION,      ///< Prédateur-proie
        COMPETITION,    ///< Compétition pour les ressources
        MUTUALISM,      ///< Mutualisme bénéfique
        COMMENSALISM,   ///< Commensalisme (un bénéfice, un neutre)
        PARASITISM,     ///< Parasitisme
        AMENSALISM,     ///< Aménsalisme (un nuisance, un neutre)
        NEUTRALISM      ///< Aucune interaction significative
    };

    /// @brief Force et direction d'une interaction
    struct InteractionStrength
    {
        double effectOnSpeciesA;  ///< Effet sur l'espèce A [-1.0 à 1.0]
        double effectOnSpeciesB;  ///< Effet sur l'espèce B [-1.0 à 1.0]
        double baseStrength;      ///< Force de base de l'interaction
        double environmentModifier; ///< Modificateur environnemental

        InteractionStrength(double effA = 0.0, double effB = 0.0, double base = 1.0, double envMod = 1.0)
            : effectOnSpeciesA(effA), effectOnSpeciesB(effB), baseStrength(base), environmentModifier(envMod) {}
    };

    /// @brief Définition complète d'une interaction écologique
    struct EcologicalInteraction
    {
        std::string speciesA;
        std::string speciesB;
        InteractionType type;
        InteractionStrength strength;
        std::vector<Ecosystem::EnvironmentType> activeEnvironments; ///< Environnements où l'interaction a lieu
        
        // Conditions d'activation
        double minPopulationA;    ///< Population minimum requise pour A
        double minPopulationB;    ///< Population minimum requise pour B
        double activationDistance; ///< Distance maximale pour l'interaction
        
        // Paramètres spécifiques
        double resourceOverlap;   ///< Chevauchement des ressources [0-1]
        double huntingEfficiency; ///< Efficacité de chasse pour prédation
        double escapeAbility;     ///< Capacité d'évasion de la proie
        
        std::string description;  ///< Description de l'interaction
    };

    /// @brief Gestionnaire des interactions écologiques
    class EcologicalInteractionManager
    {
    private:
        std::vector<EcologicalInteraction> interactions_;
        std::unordered_map<std::string, std::vector<size_t>> speciesInteractions_; ///< Index des interactions par espèce
        std::mt19937 rng_;
        
        // Statistiques des interactions
        std::unordered_map<InteractionType, uint64_t> interactionCounts_;
        std::unordered_map<std::string, double> speciesImpacts_; ///< Impact cumulé sur chaque espèce

    public:
        EcologicalInteractionManager(uint32_t seed = std::random_device{}())
            : rng_(seed) {}

        /// @brief Initialise toutes les interactions écologiques de base de Serina
        void initializeBasicInteractions(const Ecosystem::SerinaEcosystem& ecosystem)
        {
            const auto& allSpecies = ecosystem.getAllSpecies();

            // === PRÉDATION ===
            // Canaris mangent des insectes
            addPredationInteraction("Serinus canaria domestica", "Gryllus bimaculatus", 0.3, 0.7);
            addPredationInteraction("Serinus canaria domestica", "Folsomia candida", 0.2, 0.8);
            addPredationInteraction("Serinus canaria domestica", "Solenopsis invicta", 0.1, 0.6);

            // Coccinelles mangent les pucerons (simulé par interaction avec fourmis éleveuses)
            addPredationInteraction("Coccinella septempunctata", "Atta cephalotes", 0.4, 0.6);

            // Poissons prédateurs
            addPredationInteraction("Xiphophorus hellerii", "Neocaridina davidi", 0.3, 0.8);
            addPredationInteraction("Poecilia sphenops", "Folsomia candida", 0.2, 0.5); // Si dans l'eau

            // Hydres mangent petits crustacés
            addPredationInteraction("Hydra vulgaris", "Neocaridina davidi", 0.4, 0.9);
            addPredationInteraction("Aurelia aurita", "Triops longicaudatus", 0.2, 0.7);

            // Écrevisses omnivores
            addPredationInteraction("Procambarus fallax", "Neocaridina davidi", 0.3, 0.8);
            addPredationInteraction("Procambarus fallax", "Lymnaea stagnalis", 0.2, 0.6);

            // === COMPÉTITION ===
            // Compétition entre poissons pour les ressources aquatiques
            addCompetitionInteraction("Xiphophorus maculatus", "Xiphophorus hellerii", 0.7);
            addCompetitionInteraction("Poecilia reticulata", "Poecilia sphenops", 0.6);
            addCompetitionInteraction("Xiphophorus maculatus", "Poecilia reticulata", 0.5);

            // Compétition entre fourmis
            addCompetitionInteraction("Atta cephalotes", "Solenopsis invicta", 0.8);

            // Compétition entre escargots terrestres
            addCompetitionInteraction("Achatina fulica", "Limax maximus", 0.6);

            // Compétition entre crustacés d'eau douce
            addCompetitionInteraction("Procambarus fallax", "Triops longicaudatus", 0.7);
            addCompetitionInteraction("Neocaridina davidi", "Triops longicaudatus", 0.5);

            // === MUTUALISME ===
            // Fourmis et protection (simulation de mutualisme avec plantes futures)
            addMutualismInteraction("Atta cephalotes", "Gryllus bimaculatus", 0.2, 0.1); // Partage d'habitat

            // Crustacés nettoyeurs
            addMutualismInteraction("Neocaridina davidi", "Xiphophorus maculatus", 0.3, 0.2); // Nettoyage

            // === COMMENSALISME ===
            // Certains organismes bénéficient des activités d'autres
            addCommensalismInteraction("Folsomia candida", "Lumbricus terrestris", 0.3); // Aération du sol
            addCommensalismInteraction("Lymnaea stagnalis", "Procambarus fallax", 0.2); // Détritus

            // === PARASITISME ===
            // Simulation de parasites (acariens sur divers hôtes)
            addParasitismInteraction("Solenopsis invicta", "Achatina fulica", 0.1, -0.3); // Fourmis parasites
            
            // === AMÉNSALISME ===
            // Organismes qui nuisent sans bénéfice
            addAmensalismInteraction("Achatina fulica", "Folsomia candida", -0.2); // Compaction du sol

            std::cout << "🔗 " << interactions_.size() 
                      << " interactions écologiques de base initialisées" << std::endl;
        }

        /// @brief Ajoute une interaction de prédation
        void addPredationInteraction(const std::string& predator, const std::string& prey, 
                                   double huntingEff, double escapeAb,
                                   const std::vector<Ecosystem::EnvironmentType>& environments = {})
        {
            EcologicalInteraction interaction;
            interaction.speciesA = predator;
            interaction.speciesB = prey;
            interaction.type = InteractionType::PREDATION;
            interaction.strength = InteractionStrength(0.5, -0.8, 1.0, 1.0); // Prédateur +, proie -
            interaction.activeEnvironments = environments;
            interaction.huntingEfficiency = huntingEff;
            interaction.escapeAbility = escapeAb;
            interaction.activationDistance = 10.0; // Mètres
            interaction.description = predator + " hunts " + prey;

            addInteraction(interaction);
        }

        /// @brief Ajoute une interaction de compétition
        void addCompetitionInteraction(const std::string& speciesA, const std::string& speciesB, 
                                     double overlap,
                                     const std::vector<Ecosystem::EnvironmentType>& environments = {})
        {
            EcologicalInteraction interaction;
            interaction.speciesA = speciesA;
            interaction.speciesB = speciesB;
            interaction.type = InteractionType::COMPETITION;
            
            double competitionStrength = -overlap * 0.5; // Effet négatif proportionnel au chevauchement
            interaction.strength = InteractionStrength(competitionStrength, competitionStrength, 1.0, 1.0);
            interaction.activeEnvironments = environments;
            interaction.resourceOverlap = overlap;
            interaction.activationDistance = 50.0;
            interaction.description = speciesA + " competes with " + speciesB + " for resources";

            addInteraction(interaction);
        }

        /// @brief Ajoute une interaction de mutualisme
        void addMutualismInteraction(const std::string& speciesA, const std::string& speciesB,
                                   double benefitA, double benefitB,
                                   const std::vector<Ecosystem::EnvironmentType>& environments = {})
        {
            EcologicalInteraction interaction;
            interaction.speciesA = speciesA;
            interaction.speciesB = speciesB;
            interaction.type = InteractionType::MUTUALISM;
            interaction.strength = InteractionStrength(benefitA, benefitB, 1.0, 1.0);
            interaction.activeEnvironments = environments;
            interaction.activationDistance = 5.0;
            interaction.description = speciesA + " and " + speciesB + " benefit each other";

            addInteraction(interaction);
        }

        /// @brief Ajoute une interaction de commensalisme
        void addCommensalismInteraction(const std::string& beneficiary, const std::string& neutral,
                                      double benefit,
                                      const std::vector<Ecosystem::EnvironmentType>& environments = {})
        {
            EcologicalInteraction interaction;
            interaction.speciesA = beneficiary;
            interaction.speciesB = neutral;
            interaction.type = InteractionType::COMMENSALISM;
            interaction.strength = InteractionStrength(benefit, 0.0, 1.0, 1.0);
            interaction.activeEnvironments = environments;
            interaction.activationDistance = 20.0;
            interaction.description = beneficiary + " benefits from " + neutral + " without affecting it";

            addInteraction(interaction);
        }

        /// @brief Ajoute une interaction de parasitisme
        void addParasitismInteraction(const std::string& parasite, const std::string& host,
                                    double parasiteBenefit, double hostHarm,
                                    const std::vector<Ecosystem::EnvironmentType>& environments = {})
        {
            EcologicalInteraction interaction;
            interaction.speciesA = parasite;
            interaction.speciesB = host;
            interaction.type = InteractionType::PARASITISM;
            interaction.strength = InteractionStrength(parasiteBenefit, hostHarm, 1.0, 1.0);
            interaction.activeEnvironments = environments;
            interaction.activationDistance = 1.0; // Contact proche
            interaction.description = parasite + " parasitizes " + host;

            addInteraction(interaction);
        }

        /// @brief Ajoute une interaction d'aménsalisme
        void addAmensalismInteraction(const std::string& neutral, const std::string& harmed,
                                    double harm,
                                    const std::vector<Ecosystem::EnvironmentType>& environments = {})
        {
            EcologicalInteraction interaction;
            interaction.speciesA = neutral;
            interaction.speciesB = harmed;
            interaction.type = InteractionType::AMENSALISM;
            interaction.strength = InteractionStrength(0.0, harm, 1.0, 1.0);
            interaction.activeEnvironments = environments;
            interaction.activationDistance = 15.0;
            interaction.description = neutral + " inadvertently harms " + harmed;

            addInteraction(interaction);
        }

        /// @brief Calcule l'impact des interactions sur les populations
        std::unordered_map<std::string, double> calculatePopulationImpacts(
            const std::unordered_map<std::string, size_t>& populations,
            Ecosystem::EnvironmentType environment,
            double deltaTime)
        {
            std::unordered_map<std::string, double> impacts;

            // Initialiser tous les impacts à zéro
            for (const auto& [species, population] : populations)
            {
                impacts[species] = 0.0;
            }

            // Traiter chaque interaction
            for (const auto& interaction : interactions_)
            {
                // Vérifier si l'interaction est active dans cet environnement
                if (!interaction.activeEnvironments.empty())
                {
                    if (std::find(interaction.activeEnvironments.begin(), 
                                interaction.activeEnvironments.end(), 
                                environment) == interaction.activeEnvironments.end())
                        continue;
                }

                // Vérifier la présence des deux espèces
                auto popA = populations.find(interaction.speciesA);
                auto popB = populations.find(interaction.speciesB);
                
                if (popA == populations.end() || popB == populations.end())
                    continue;

                if (popA->second < interaction.minPopulationA || 
                    popB->second < interaction.minPopulationB)
                    continue;

                // Calculer l'intensité de l'interaction
                double intensity = calculateInteractionIntensity(interaction, popA->second, popB->second);

                // Appliquer les effets
                impacts[interaction.speciesA] += interaction.strength.effectOnSpeciesA * intensity * deltaTime;
                impacts[interaction.speciesB] += interaction.strength.effectOnSpeciesB * intensity * deltaTime;

                // Mettre à jour les statistiques
                interactionCounts_[interaction.type]++;
            }

            return impacts;
        }

        /// @brief Calcule l'impact d'une interaction spécifique sur la population
        double calculatePopulationImpact(const EcologicalInteraction& interaction,
                                        Ecosystem::EnvironmentType environment,
                                        uint32_t currentPopulation) const
        {
            // Vérifier si l'interaction est active dans cet environnement
            if (!interaction.activeEnvironments.empty())
            {
                if (std::find(interaction.activeEnvironments.begin(), 
                            interaction.activeEnvironments.end(), 
                            environment) == interaction.activeEnvironments.end())
                    return 0.0;
            }

            // Calculer l'impact basé sur le type d'interaction et la population
            double baseImpact = 0.0;
            double populationFactor = std::min(1.0, static_cast<double>(currentPopulation) / 1000.0);

            switch (interaction.type)
            {
            case InteractionType::PREDATION:
                baseImpact = interaction.strength.baseStrength * populationFactor * 0.1;
                break;
            case InteractionType::COMPETITION:
                baseImpact = -interaction.strength.baseStrength * populationFactor * 0.05;
                break;
            case InteractionType::MUTUALISM:
                baseImpact = interaction.strength.baseStrength * populationFactor * 0.03;
                break;
            case InteractionType::PARASITISM:
                baseImpact = -interaction.strength.baseStrength * populationFactor * 0.07;
                break;
            default:
                baseImpact = 0.0;
            }

            return baseImpact * interaction.strength.environmentModifier;
        }

        /// @brief Simule l'évolution des interactions lors d'adaptations
        void evolveInteractions(const std::string& ancestorSpecies, const std::string& descendantSpecies)
        {
            // Copier les interactions de l'ancêtre vers le descendant
            for (auto& interaction : interactions_)
            {
                if (interaction.speciesA == ancestorSpecies)
                {
                    EcologicalInteraction newInteraction = interaction;
                    newInteraction.speciesA = descendantSpecies;
                    
                    // Modifier légèrement les paramètres pour refléter l'évolution
                    std::uniform_real_distribution<double> evolutionDist(-0.1, 0.1);
                    newInteraction.strength.effectOnSpeciesA += evolutionDist(rng_);
                    newInteraction.huntingEfficiency = std::clamp(newInteraction.huntingEfficiency + evolutionDist(rng_), 0.0, 1.0);
                    newInteraction.escapeAbility = std::clamp(newInteraction.escapeAbility + evolutionDist(rng_), 0.0, 1.0);
                    
                    addInteraction(newInteraction);
                }
                else if (interaction.speciesB == ancestorSpecies)
                {
                    EcologicalInteraction newInteraction = interaction;
                    newInteraction.speciesB = descendantSpecies;
                    
                    std::uniform_real_distribution<double> evolutionDist(-0.1, 0.1);
                    newInteraction.strength.effectOnSpeciesB += evolutionDist(rng_);
                    newInteraction.escapeAbility = std::clamp(newInteraction.escapeAbility + evolutionDist(rng_), 0.0, 1.0);
                    
                    addInteraction(newInteraction);
                }
            }
        }

        /// @brief Obtient toutes les interactions impliquant une espèce
        std::vector<EcologicalInteraction> getSpeciesInteractions(const std::string& species) const
        {
            std::vector<EcologicalInteraction> result;
            
            auto it = speciesInteractions_.find(species);
            if (it != speciesInteractions_.end())
            {
                for (size_t index : it->second)
                {
                    result.push_back(interactions_[index]);
                }
            }
            
            return result;
        }

        /// @brief Obtient les statistiques des interactions
        std::unordered_map<InteractionType, uint64_t> getInteractionStatistics() const
        {
            return interactionCounts_;
        }

        /// @brief Obtient toutes les interactions
        const std::vector<EcologicalInteraction>& getAllInteractions() const
        {
            return interactions_;
        }

    private:
        void addInteraction(const EcologicalInteraction& interaction)
        {
            size_t index = interactions_.size();
            interactions_.push_back(interaction);
            
            // Indexer par espèce
            speciesInteractions_[interaction.speciesA].push_back(index);
            speciesInteractions_[interaction.speciesB].push_back(index);
        }

        double calculateInteractionIntensity(const EcologicalInteraction& interaction,
                                           size_t populationA, size_t populationB) const
        {
            double intensity = interaction.strength.baseStrength * interaction.strength.environmentModifier;
            
            // Ajuster selon le type d'interaction
            switch (interaction.type)
            {
            case InteractionType::PREDATION:
                // Intensité basée sur le modèle de Lotka-Volterra modifié
                intensity *= (populationA * populationB) / 10000.0; // Normalisation
                intensity *= interaction.huntingEfficiency;
                intensity *= (1.0 - interaction.escapeAbility);
                break;
                
            case InteractionType::COMPETITION:
                // Intensité augmente avec les populations et le chevauchement des ressources
                intensity *= interaction.resourceOverlap;
                intensity *= std::sqrt(populationA * populationB) / 1000.0;
                break;
                
            case InteractionType::MUTUALISM:
                // Effet positif renforcé par les populations
                intensity *= std::log(1 + populationA) * std::log(1 + populationB) / 100.0;
                break;
                
            case InteractionType::PARASITISM:
                // Dépend de la densité de l'hôte
                intensity *= populationB / 1000.0;
                break;
                
            case InteractionType::COMMENSALISM:
            case InteractionType::AMENSALISM:
                // Effet proportionnel à la population qui cause l'effet
                intensity *= populationA / 1000.0;
                break;
                
            case InteractionType::NEUTRALISM:
                intensity = 0.0;
                break;
            }

            return std::clamp(intensity, 0.0, 1.0);
        }
    };

} // namespace Serina::Ecology