#pragma once

#include "SerinaEcosystem.hpp"
#include "EcologicalInteractions.hpp"
#include "EnvironmentalAdaptation.hpp"
#include "EvolutionaryConstraints.hpp"
#include "AdvancedGenetics.hpp"
#include <memory>
#include <vector>
#include <unordered_map>
#include <random>
#include <iostream>
#include <chrono>

namespace Serina::Simulation
{

    /// @brief Statistiques de simulation pour une espèce
    struct SpeciesSimulationStats
    {
        std::string species;
        uint32_t totalPopulation;
        double averageFitness;
        double geneticDiversity;
        std::vector<Ecosystem::EnvironmentType> occupiedEnvironments;
        std::vector<std::string> acquiredAdaptations;
        std::vector<std::string> evolutionaryInnovations;
        uint32_t generationsSinceLastInnovation;
        double extinctionRisk;
    };

    /// @brief Événements écologiques majeurs
    struct EcologicalEvent
    {
        enum Type { MIGRATION, SPECIATION, EXTINCTION, ADAPTATION, INNOVATION, INTERACTION_CHANGE };
        
        Type type;
        std::string description;
        std::vector<std::string> affectedSpecies;
        Ecosystem::EnvironmentType environment;
        uint32_t generation;
        double impact;
    };

    /// @brief Paramètres de simulation Serina simplifiés
    struct SerinaSimulationParameters
    {
        uint32_t totalGenerations = 100;
        uint32_t populationSize = 1000;
        double mutationRate = 0.02;
        double migrationRate = 0.01;
        bool enableSpeciation = true;
        bool enableExtinction = true;
        bool enableEnvironmentalChange = true;
        bool enableEcologicalInteractions = true;
        double adaptationThreshold = 0.7;
        double innovationThreshold = 0.8;
        uint32_t reportInterval = 10;
    };

    /// @brief Simulateur d'écosystème Serina simplifié
    class SimplifiedSerinaSimulator
    {
    private:
        // Composants principaux
        std::unique_ptr<Ecosystem::SerinaEcosystem> ecosystem_;
        std::unique_ptr<Ecology::EcologicalInteractionManager> interactions_;
        std::unique_ptr<Environment::SerinaEnvironmentManager> environments_;
        std::unique_ptr<Evolution::SerinaEvolutionaryConstraints> constraints_;

        // État de simulation
        std::mt19937 rng_;
        uint32_t currentGeneration_;
        SerinaSimulationParameters parameters_;
        
        // Données de simulation
        std::unordered_map<std::string, SpeciesSimulationStats> speciesStats_;
        std::unordered_map<Ecosystem::EnvironmentType, std::vector<std::string>> environmentSpecies_;
        std::vector<EcologicalEvent> eventHistory_;
        
        // Métriques globales
        double totalBiodiversity_;
        double ecosystemStability_;
        uint32_t totalSpeciationsEvents_;
        uint32_t totalExtinctionEvents_;

    public:
        SimplifiedSerinaSimulator(uint32_t seed = std::random_device{}())
            : rng_(seed), currentGeneration_(0), totalBiodiversity_(0.0), 
              ecosystemStability_(1.0), totalSpeciationsEvents_(0), totalExtinctionEvents_(0)
        {
            initializeComponents(seed);
        }

        /// @brief Initialise tous les composants de simulation
        void initializeComponents(uint32_t seed)
        {
            ecosystem_ = std::make_unique<Ecosystem::SerinaEcosystem>();
            interactions_ = std::make_unique<Ecology::EcologicalInteractionManager>();
            environments_ = std::make_unique<Environment::SerinaEnvironmentManager>(seed);
            constraints_ = std::make_unique<Evolution::SerinaEvolutionaryConstraints>(seed);

            // Initialiser les interactions
            interactions_->initializeBasicInteractions(*ecosystem_);

            std::cout << "🧬 Simulateur d'écosystème Serina simplifié initialisé" << std::endl;
        }

        /// @brief Lance la simulation complète
        void runSimulation(const SerinaSimulationParameters& params = {})
        {
            parameters_ = params;
            
            std::cout << "🌍 Début de la simulation de l'écosystème Serina" << std::endl;
            std::cout << "📅 " << parameters_.totalGenerations << " générations planifiées" << std::endl;
            
            initializeSpeciesPopulations();
            
            auto startTime = std::chrono::high_resolution_clock::now();
            
            for (uint32_t generation = 0; generation < parameters_.totalGenerations; ++generation)
            {
                currentGeneration_ = generation;
                simulateGeneration();
                
                if ((generation + 1) % parameters_.reportInterval == 0)
                {
                    generateReport();
                }
                
                if (checkStopConditions()) break;
            }
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            std::cout << "✅ Simulation terminée en " << duration.count() << " ms" << std::endl;
            generateFinalReport();
        }

        /// @brief Simule une génération complète
        void simulateGeneration()
        {
            // 1. Changements environnementaux
            if (parameters_.enableEnvironmentalChange)
            {
                environments_->simulateEnvironmentalChange(1);
            }

            // 2. Interactions écologiques
            if (parameters_.enableEcologicalInteractions)
            {
                simulateEcologicalInteractions();
            }

            // 3. Adaptations environnementales
            simulateEnvironmentalAdaptations();

            // 4. Innovations évolutionnaires
            simulateEvolutionaryInnovations();

            // 5. Migration entre environnements
            simulateMigration();

            // 6. Spéciation et extinction
            if (parameters_.enableSpeciation)
            {
                simulateSpeciation();
            }
            
            if (parameters_.enableExtinction)
            {
                simulateExtinction();
            }

            // 7. Mise à jour des statistiques
            updateSpeciesStats();
            
            // 8. Avancement des composants
            constraints_->advanceGeneration();
        }

        /// @brief Simule les interactions écologiques
        void simulateEcologicalInteractions()
        {
            for (auto& [species, stats] : speciesStats_)
            {
                for (auto& environment : stats.occupiedEnvironments)
                {
                    // Obtenir les interactions pour cette espèce
                    auto interactions = interactions_->getSpeciesInteractions(species);
                    
                    for (const auto& interaction : interactions)
                    {
                        // Calculer l'impact sur la population
                        double impact = interactions_->calculatePopulationImpact(
                            interaction, environment, stats.totalPopulation);
                        
                        // Appliquer l'impact
                        stats.totalPopulation = static_cast<uint32_t>(
                            std::max(1.0, stats.totalPopulation * (1.0 + impact)));
                        
                        // Enregistrer l'événement si significatif
                        if (std::abs(impact) > 0.1)
                        {
                            EcologicalEvent event;
                            event.type = EcologicalEvent::INTERACTION_CHANGE;
                            event.description = "Interaction " + interaction.speciesA + " <-> " + interaction.speciesB;
                            event.affectedSpecies = {interaction.speciesA, interaction.speciesB};
                            event.environment = environment;
                            event.generation = currentGeneration_;
                            event.impact = impact;
                            eventHistory_.push_back(event);
                        }
                    }
                }
            }
        }

        /// @brief Simule les adaptations environnementales
        void simulateEnvironmentalAdaptations()
        {
            for (auto& [species, stats] : speciesStats_)
            {
                auto characteristics = ecosystem_->getSpeciesCharacteristics(species);
                if (!characteristics) continue;

                for (auto& environment : stats.occupiedEnvironments)
                {
                    double fitness = environments_->calculateEnvironmentalFitness(
                        species, environment, *characteristics);
                    
                    stats.averageFitness = fitness;
                    
                    if (fitness < parameters_.adaptationThreshold)
                    {
                        auto suggestions = environments_->suggestAdaptations(species, environment, *characteristics);
                        
                        for (const auto& adaptationName : suggestions)
                        {
                            std::uniform_real_distribution<double> adaptDist(0.0, 1.0);
                            if (adaptDist(rng_) < 0.1) // 10% chance d'adaptation
                            {
                                if (environments_->evolveAdaptation(species, adaptationName, currentGeneration_))
                                {
                                    stats.acquiredAdaptations.push_back(adaptationName);
                                    
                                    EcologicalEvent event;
                                    event.type = EcologicalEvent::ADAPTATION;
                                    event.description = species + " développe " + adaptationName;
                                    event.affectedSpecies = {species};
                                    event.environment = environment;
                                    event.generation = currentGeneration_;
                                    event.impact = 0.2;
                                    eventHistory_.push_back(event);
                                }
                            }
                        }
                    }
                }
            }
        }

        /// @brief Simule les innovations évolutionnaires
        void simulateEvolutionaryInnovations()
        {
            for (auto& [species, stats] : speciesStats_)
            {
                auto characteristics = ecosystem_->getSpeciesCharacteristics(species);
                if (!characteristics) continue;

                for (auto& environment : stats.occupiedEnvironments)
                {
                    auto envDef = environments_->getEnvironment(environment);
                    if (!envDef) continue;

                    auto rules = constraints_->getBiologicalGroupRules(characteristics->biologicalType);
                    if (!rules) continue;

                    // Évaluer chaque innovation possible
                    for (const auto& innovation : rules->possibleInnovations)
                    {
                        double innovProb = constraints_->calculateInnovationProbability(
                            species, innovation, characteristics->biologicalType, *envDef);
                        
                        std::uniform_real_distribution<double> innovDist(0.0, 1.0);
                        if (innovDist(rng_) < innovProb * 0.01) // Très rare
                        {
                            if (constraints_->applyInnovation(species, innovation, characteristics->biologicalType))
                            {
                                stats.evolutionaryInnovations.push_back(innovation);
                                stats.generationsSinceLastInnovation = 0;
                                
                                EcologicalEvent event;
                                event.type = EcologicalEvent::INNOVATION;
                                event.description = species + " développe l'innovation " + innovation;
                                event.affectedSpecies = {species};
                                event.environment = environment;
                                event.generation = currentGeneration_;
                                event.impact = 0.5;
                                eventHistory_.push_back(event);
                            }
                        }
                    }
                }

                stats.generationsSinceLastInnovation++;
            }
        }

        /// @brief Simule la migration entre environnements
        void simulateMigration()
        {
            for (auto& [species, stats] : speciesStats_)
            {
                auto characteristics = ecosystem_->getSpeciesCharacteristics(species);
                if (!characteristics) continue;

                std::uniform_real_distribution<double> migrationDist(0.0, 1.0);
                if (migrationDist(rng_) < parameters_.migrationRate)
                {
                    // Choisir un nouvel environnement
                    std::vector<Ecosystem::EnvironmentType> allEnvs = {
                        Ecosystem::EnvironmentType::GRASSLAND,
                        Ecosystem::EnvironmentType::FOREST,
                        Ecosystem::EnvironmentType::FRESHWATER,
                        Ecosystem::EnvironmentType::OCEAN,
                        Ecosystem::EnvironmentType::WETLAND
                    };

                    std::uniform_int_distribution<size_t> envDist(0, allEnvs.size() - 1);
                    auto newEnv = allEnvs[envDist(rng_)];

                    // Vérifier si l'espèce peut survivre dans ce nouvel environnement
                    double fitness = environments_->calculateEnvironmentalFitness(
                        species, newEnv, *characteristics);

                    if (fitness > 0.3) // Seuil minimum de survie
                    {
                        auto it = std::find(stats.occupiedEnvironments.begin(), 
                                          stats.occupiedEnvironments.end(), newEnv);
                        if (it == stats.occupiedEnvironments.end())
                        {
                            stats.occupiedEnvironments.push_back(newEnv);
                            environmentSpecies_[newEnv].push_back(species);

                            EcologicalEvent event;
                            event.type = EcologicalEvent::MIGRATION;
                            event.description = species + " migre vers un nouvel environnement";
                            event.affectedSpecies = {species};
                            event.environment = newEnv;
                            event.generation = currentGeneration_;
                            event.impact = 0.1;
                            eventHistory_.push_back(event);
                        }
                    }
                }
            }
        }

        /// @brief Simule la spéciation
        void simulateSpeciation()
        {
            for (auto& [species, stats] : speciesStats_)
            {
                if (stats.occupiedEnvironments.size() > 1 && 
                    stats.geneticDiversity > 0.8 &&
                    currentGeneration_ > 50) // Temps minimum
                {
                    std::uniform_real_distribution<double> specDist(0.0, 1.0);
                    if (specDist(rng_) < 0.001) // Très rare
                    {
                        std::string newSpecies = species + "_subspecies_" + std::to_string(totalSpeciationsEvents_);
                        
                        SpeciesSimulationStats newStats = stats;
                        newStats.species = newSpecies;
                        newStats.totalPopulation = stats.totalPopulation / 2;
                        stats.totalPopulation /= 2;
                        
                        speciesStats_[newSpecies] = newStats;
                        totalSpeciationsEvents_++;
                        
                        EcologicalEvent event;
                        event.type = EcologicalEvent::SPECIATION;
                        event.description = "Spéciation de " + species + " en " + newSpecies;
                        event.affectedSpecies = {species, newSpecies};
                        event.generation = currentGeneration_;
                        event.impact = 0.3;
                        eventHistory_.push_back(event);
                    }
                }
            }
        }

        /// @brief Simule l'extinction
        void simulateExtinction()
        {
            std::vector<std::string> extinctSpecies;
            
            for (auto& [species, stats] : speciesStats_)
            {
                // Calcul du risque d'extinction
                stats.extinctionRisk = 1.0 / (stats.totalPopulation + 1.0);
                if (stats.averageFitness < 0.1) stats.extinctionRisk *= 2.0;
                if (stats.occupiedEnvironments.empty()) stats.extinctionRisk = 1.0;
                
                std::uniform_real_distribution<double> extinctDist(0.0, 1.0);
                if (stats.totalPopulation < 10 || extinctDist(rng_) < stats.extinctionRisk * 0.01)
                {
                    extinctSpecies.push_back(species);
                }
            }
            
            for (const auto& species : extinctSpecies)
            {
                speciesStats_.erase(species);
                totalExtinctionEvents_++;
                
                EcologicalEvent event;
                event.type = EcologicalEvent::EXTINCTION;
                event.description = "Extinction de " + species;
                event.affectedSpecies = {species};
                event.generation = currentGeneration_;
                event.impact = -0.2;
                eventHistory_.push_back(event);
            }
        }

        /// @brief Met à jour les statistiques des espèces
        void updateSpeciesStats()
        {
            totalBiodiversity_ = static_cast<double>(speciesStats_.size());
            
            for (auto& [species, stats] : speciesStats_)
            {
                stats.geneticDiversity = 0.5 + 0.5 * std::sin(currentGeneration_ * 0.1);
            }
            
            ecosystemStability_ = 1.0 - (totalExtinctionEvents_ * 0.05);
            ecosystemStability_ = std::clamp(ecosystemStability_, 0.0, 1.0);
        }

        /// @brief Génère un rapport de simulation
        void generateReport()
        {
            std::cout << "\n📊 === RAPPORT GÉNÉRATION " << currentGeneration_ << " ===" << std::endl;
            std::cout << "🌍 Biodiversité totale: " << totalBiodiversity_ << " espèces" << std::endl;
            std::cout << "⚖️ Stabilité écosystémique: " << ecosystemStability_ * 100 << "%" << std::endl;
            std::cout << "🌱 Spéciations: " << totalSpeciationsEvents_ << std::endl;
            std::cout << "💀 Extinctions: " << totalExtinctionEvents_ << std::endl;
            
            // Top 3 espèces par population
            std::vector<std::pair<std::string, uint32_t>> sortedSpecies;
            for (const auto& [species, stats] : speciesStats_)
            {
                sortedSpecies.emplace_back(species, stats.totalPopulation);
            }
            std::sort(sortedSpecies.begin(), sortedSpecies.end(),
                     [](const auto& a, const auto& b) { return a.second > b.second; });
            
            std::cout << "🔝 Top 3 espèces:" << std::endl;
            for (size_t i = 0; i < std::min(size_t(3), sortedSpecies.size()); ++i)
            {
                std::cout << "   " << (i+1) << ". " << sortedSpecies[i].first 
                         << " (" << sortedSpecies[i].second << " individus)" << std::endl;
            }
            std::cout << std::endl;
        }

        /// @brief Génère le rapport final
        void generateFinalReport()
        {
            std::cout << "\n🎯 === RAPPORT FINAL DE SIMULATION ===" << std::endl;
            std::cout << "⏱️ Générations simulées: " << currentGeneration_ + 1 << std::endl;
            std::cout << "🌍 Biodiversité finale: " << totalBiodiversity_ << " espèces" << std::endl;
            std::cout << "🌱 Total spéciations: " << totalSpeciationsEvents_ << std::endl;
            std::cout << "💀 Total extinctions: " << totalExtinctionEvents_ << std::endl;
            std::cout << "📈 Événements écologiques majeurs: " << eventHistory_.size() << std::endl;
        }

    private:
        void initializeSpeciesPopulations()
        {
            const auto& allSpecies = ecosystem_->getAllSpecies();
            
            for (const auto& [species, characteristics] : allSpecies)
            {
                SpeciesSimulationStats stats;
                stats.species = species;
                stats.totalPopulation = parameters_.populationSize / allSpecies.size();
                stats.averageFitness = 1.0;
                stats.geneticDiversity = 0.5;
                stats.occupiedEnvironments = characteristics.preferredEnvironments;
                stats.generationsSinceLastInnovation = 0;
                stats.extinctionRisk = 0.01;
                
                speciesStats_[species] = stats;
                
                for (auto env : characteristics.preferredEnvironments)
                {
                    environmentSpecies_[env].push_back(species);
                }
            }
            
            std::cout << "🌱 " << speciesStats_.size() << " espèces initialisées" << std::endl;
        }

        bool checkStopConditions()
        {
            // Arrêter si toutes les espèces ont disparu
            if (speciesStats_.empty())
            {
                std::cout << "⚠️ Toutes les espèces ont disparu - arrêt de la simulation" << std::endl;
                return true;
            }
            
            // Arrêter si l'écosystème est devenu trop instable
            if (ecosystemStability_ < 0.1)
            {
                std::cout << "⚠️ Écosystème trop instable - arrêt de la simulation" << std::endl;
                return true;
            }
            
            return false;
        }
    };

} // namespace Serina::Simulation