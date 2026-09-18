#pragma once

#include "SerinaEcosystem.hpp"
#include "EcologicalInteractions.hpp"
#include "EnvironmentalAdaptation.hpp"
#include "EvolutionaryConstraints.hpp"
#include "AdvancedGenetics.hpp"
#include "PopulationManager.hpp"
#include "NEAT.hpp"
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
        enum Type
        {
            MIGRATION,
            SPECIATION,
            EXTINCTION,
            ADAPTATION,
            INNOVATION,
            INTERACTION_CHANGE
        };

        Type type;
        std::string description;
        std::vector<std::string> affectedSpecies;
        Ecosystem::EnvironmentType environment;
        uint32_t generation;
        double impact;
    };

    /// @brief Paramètres de simulation Serina
    struct SerinaSimulationParameters
    {
        uint32_t totalGenerations;
        uint32_t populationSize;
        double mutationRate;
        double migrationRate;
        bool enableSpeciation;
        bool enableExtinction;
        bool enableEnvironmentalChange;
        bool enableEcologicalInteractions;
        double adaptationThreshold;
        double innovationThreshold;
        uint32_t reportInterval;
    };

    /// @brief Simulateur principal de l'écosystème Serina
    class SerinaEcosystemSimulator
    {
    private:
        // Composants principaux
        std::unique_ptr<Ecosystem::SerinaEcosystem> ecosystem_;
        std::unique_ptr<Ecology::EcologicalInteractionManager> interactions_;
        std::unique_ptr<Environment::SerinaEnvironmentManager> environments_;
        std::unique_ptr<Evolution::SerinaEvolutionaryConstraints> constraints_;
        // std::unique_ptr<Genetics::AdvancedGeneticSystem> genetics_;  // Commenté - classe manquante
        // std::unique_ptr<Population::PopulationManager> population_;  // Commenté - classe manquante
        // std::unique_ptr<AI::NEATEvolution> neat_;                    // Commenté - classe manquante

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
        SerinaEcosystemSimulator(uint32_t seed = std::random_device{}())
            : rng_(seed), currentGeneration_(0), totalBiodiversity_(0.0),
              ecosystemStability_(1.0), totalSpeciationsEvents_(0), totalExtinctionEvents_(0)
        {
            initializeComponents(seed);
            setupDefaultParameters();
        }

        // ===================== Accès en lecture à l'état réel =====================
        // Permet à des consommateurs externes (CLI, API) de rapporter l'état
        // véritable de la simulation plutôt que des données inventées.

        /// @brief Peuple l'écosystème avec les espèces d'origine de Serina
        /// (à appeler une fois avant les premiers simulateGeneration()).
        void seedInitialPopulations() { initializeSpeciesPopulations(); }

        uint32_t getCurrentGeneration() const { return currentGeneration_; }
        double getTotalBiodiversity() const { return totalBiodiversity_; }
        double getEcosystemStability() const { return ecosystemStability_; }
        uint32_t getTotalSpeciationsEvents() const { return totalSpeciationsEvents_; }
        uint32_t getTotalExtinctionEvents() const { return totalExtinctionEvents_; }
        const std::unordered_map<std::string, SpeciesSimulationStats> &getSpeciesStats() const { return speciesStats_; }
        const std::vector<EcologicalEvent> &getEventHistory() const { return eventHistory_; }
        const Ecosystem::SerinaEcosystem &getEcosystem() const { return *ecosystem_; }
        const Environment::SerinaEnvironmentManager &getEnvironments() const { return *environments_; }

        // ===================== Restauration d'état =====================
        // Un processus CLI est relancé à chaque commande (pas de démon) : ces
        // setters permettent à l'appelant de recharger un état persistant
        // (fichier JSON) avant de reprendre la simulation là où elle s'était
        // arrêtée, au lieu de repartir de zéro à chaque invocation.
        void restoreState(uint32_t generation,
                           std::unordered_map<std::string, SpeciesSimulationStats> speciesStats,
                           double totalBiodiversity, double ecosystemStability,
                           uint32_t totalSpeciations, uint32_t totalExtinctions)
        {
            currentGeneration_ = generation;
            speciesStats_ = std::move(speciesStats);
            totalBiodiversity_ = totalBiodiversity;
            ecosystemStability_ = ecosystemStability;
            totalSpeciationsEvents_ = totalSpeciations;
            totalExtinctionEvents_ = totalExtinctions;
        }

        /// @brief Initialise tous les composants de simulation
        void initializeComponents(uint32_t seed)
        {
            ecosystem_ = std::make_unique<Ecosystem::SerinaEcosystem>();
            interactions_ = std::make_unique<Ecology::EcologicalInteractionManager>();
            environments_ = std::make_unique<Environment::SerinaEnvironmentManager>(seed);
            constraints_ = std::make_unique<Evolution::SerinaEvolutionaryConstraints>(seed);
            // genetics_ = std::make_unique<Genetics::AdvancedGeneticSystem>(seed);    // Commenté - classe manquante
            // population_ = std::make_unique<Population::PopulationManager>(seed);    // Commenté - classe manquante
            // neat_ = std::make_unique<AI::NEATEvolution>(seed);                      // Commenté - classe manquante

            // Initialiser les interactions écologiques de base
            interactions_->initializeBasicInteractions(*ecosystem_);
        }

        /// @brief Configure les paramètres par défaut
        void setupDefaultParameters()
        {
            parameters_.totalGenerations = 10000;
            parameters_.populationSize = 1000;
            parameters_.mutationRate = 0.02;
            parameters_.migrationRate = 0.01;
            parameters_.enableSpeciation = true;
            parameters_.enableExtinction = true;
            parameters_.enableEnvironmentalChange = true;
            parameters_.enableEcologicalInteractions = true;
            parameters_.adaptationThreshold = 0.7;
            parameters_.innovationThreshold = 0.8;
            parameters_.reportInterval = 100;
        }

        /// @brief Lance la simulation complète
        void runSimulation(const SerinaSimulationParameters &params = {})
        {
            parameters_ = params.totalGenerations > 0 ? params : parameters_;

            std::cout << "🌍 Début de la simulation de l'écosystème Serina" << std::endl;
            std::cout << "📅 " << parameters_.totalGenerations << " générations planifiées" << std::endl;

            initializeSpeciesPopulations();

            auto startTime = std::chrono::high_resolution_clock::now();

            for (uint32_t generation = 0; generation < parameters_.totalGenerations; ++generation)
            {
                // Simulation d'une génération (avance aussi currentGeneration_)
                simulateGeneration();

                // Rapport périodique
                if (generation % parameters_.reportInterval == 0)
                {
                    generateReport();
                }

                // Vérification d'arrêt prématuré
                if (checkStopConditions())
                {
                    std::cout << "🛑 Simulation arrêtée prématurément à la génération "
                              << generation << std::endl;
                    break;
                }
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

            // 3. Évolution génétique
            simulateGeneticEvolution();

            // 4. Adaptations environnementales
            simulateEnvironmentalAdaptations();

            // 5. Innovations évolutionnaires
            simulateEvolutionaryInnovations();

            // 6. Migration entre environnements
            simulateMigration();

            // 7. Spéciation et extinction
            if (parameters_.enableSpeciation)
            {
                simulateSpeciation();
            }

            if (parameters_.enableExtinction)
            {
                simulateExtinction();
            }

            // 8. Mise à jour des statistiques
            updateSpeciesStats();

            // 9. Avancement des composants
            constraints_->advanceGeneration();

            // 10. Avancement du compteur de génération (une seule source de
            // vérité, que l'appelant soit runSimulation() ou un appel direct
            // et répété à simulateGeneration() depuis l'extérieur, par ex.
            // depuis la CLI).
            ++currentGeneration_;
        }

        /// @brief Simule les interactions écologiques
        void simulateEcologicalInteractions()
        {
            for (auto &[species, stats] : speciesStats_)
            {
                for (auto &environment : stats.occupiedEnvironments)
                {
                    // Obtenir les interactions pour cette espèce
                    auto interactions = interactions_->getSpeciesInteractions(species);

                    for (const auto &interaction : interactions)
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

        /// @brief Simule l'évolution génétique (version simplifiée)
        void simulateGeneticEvolution()
        {
            for (auto &[species, stats] : speciesStats_)
            {
                auto characteristics = ecosystem_->getSpeciesCharacteristics(species);
                if (!characteristics)
                    continue;

                // Mutation génétique simplifiée avec contraintes biologiques
                Genetics::AdvancedTraitValues currentTraits = {
                    1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0}; // Traits par défaut

                // Simulation simple de mutation (sans classe AdvancedGeneticSystem)
                std::uniform_real_distribution<double> mutationDist(-0.1, 0.1);
                Genetics::AdvancedTraitValues mutatedTraits = currentTraits;

                if (std::uniform_real_distribution<double>(0.0, 1.0)(rng_) < parameters_.mutationRate)
                {
                    mutatedTraits.size += mutationDist(rng_);
                    mutatedTraits.speed += mutationDist(rng_);
                    mutatedTraits.intelligence += mutationDist(rng_);
                    // Limiter les valeurs
                    mutatedTraits.size = std::clamp(mutatedTraits.size, 0.1, 5.0);
                    mutatedTraits.speed = std::clamp(mutatedTraits.speed, 0.1, 5.0);
                    mutatedTraits.intelligence = std::clamp(mutatedTraits.intelligence, 0.1, 5.0);
                }

                if (constraints_->validateMutation(species, currentTraits, mutatedTraits,
                                                   characteristics->biologicalType))
                {
                    // Appliquer corrélations entre traits
                    mutatedTraits = constraints_->applyTraitCorrelations(mutatedTraits,
                                                                         characteristics->biologicalType);

                    // Calculer fitness dans environnements actuels
                    double totalFitness = 0.0;
                    for (auto &env : stats.occupiedEnvironments)
                    {
                        double fitness = environments_->calculateEnvironmentalFitness(
                            species, env, *characteristics);
                        totalFitness += fitness;
                    }
                    stats.averageFitness = totalFitness / stats.occupiedEnvironments.size();
                }
            }
        }

        /// @brief Simule les adaptations environnementales
        void simulateEnvironmentalAdaptations()
        {
            for (auto &[species, stats] : speciesStats_)
            {
                auto characteristics = ecosystem_->getSpeciesCharacteristics(species);
                if (!characteristics)
                    continue;

                for (auto &environment : stats.occupiedEnvironments)
                {
                    // Suggérer adaptations basées sur les pressions sélectives
                    auto suggestions = environments_->suggestAdaptations(species, environment, *characteristics);

                    for (const auto &adaptationName : suggestions)
                    {
                        std::uniform_real_distribution<double> adaptDist(0.0, 1.0);
                        if (adaptDist(rng_) < parameters_.adaptationThreshold * 0.01) // Probabilité faible
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
                                event.impact = 0.2; // Bonus de fitness
                                eventHistory_.push_back(event);
                            }
                        }
                    }
                }
            }
        }

        /// @brief Simule les innovations évolutionnaires
        void simulateEvolutionaryInnovations()
        {
            for (auto &[species, stats] : speciesStats_)
            {
                auto characteristics = ecosystem_->getSpeciesCharacteristics(species);
                if (!characteristics)
                    continue;

                for (auto &environment : stats.occupiedEnvironments)
                {
                    auto envDef = environments_->getEnvironment(environment);
                    if (!envDef)
                        continue;

                    auto rules = constraints_->getBiologicalGroupRules(characteristics->biologicalType);
                    if (!rules)
                        continue;

                    // Évaluer chaque innovation possible
                    for (const auto &innovation : rules->possibleInnovations)
                    {
                        double innovProb = constraints_->calculateInnovationProbability(
                            species, innovation, characteristics->biologicalType, *envDef);

                        std::uniform_real_distribution<double> innovDist(0.0, 1.0);
                        if (innovDist(rng_) < innovProb)
                        {
                            if (constraints_->applyInnovation(species, innovation, characteristics->biologicalType))
                            {
                                stats.evolutionaryInnovations.push_back(innovation);
                                stats.generationsSinceLastInnovation = 0;

                                EcologicalEvent event;
                                event.type = EcologicalEvent::INNOVATION;
                                event.description = species + " développe " + innovation;
                                event.affectedSpecies = {species};
                                event.environment = environment;
                                event.generation = currentGeneration_;
                                event.impact = 0.5; // Impact majeur
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
            for (auto &[species, stats] : speciesStats_)
            {
                auto characteristics = ecosystem_->getSpeciesCharacteristics(species);
                if (!characteristics)
                    continue;

                // Migrer vers environnements connectés si conditions favorables
                std::vector<Ecosystem::EnvironmentType> newEnvironments;

                for (auto &currentEnv : stats.occupiedEnvironments)
                {
                    auto envDef = environments_->getEnvironment(currentEnv);
                    if (!envDef)
                        continue;

                    for (auto &connectedEnv : envDef->connectedEnvironments)
                    {
                        // Vérifier si pas déjà occupé
                        if (std::find(stats.occupiedEnvironments.begin(),
                                      stats.occupiedEnvironments.end(), connectedEnv) != stats.occupiedEnvironments.end())
                            continue;

                        // Calculer fitness dans nouvel environnement
                        double fitness = environments_->calculateEnvironmentalFitness(
                            species, connectedEnv, *characteristics);

                        std::uniform_real_distribution<double> migDist(0.0, 1.0);
                        if (fitness > 0.6 && migDist(rng_) < parameters_.migrationRate)
                        {
                            newEnvironments.push_back(connectedEnv);

                            EcologicalEvent event;
                            event.type = EcologicalEvent::MIGRATION;
                            event.description = species + " colonise nouvel environnement";
                            event.affectedSpecies = {species};
                            event.environment = connectedEnv;
                            event.generation = currentGeneration_;
                            event.impact = fitness;
                            eventHistory_.push_back(event);
                        }
                    }
                }

                // Ajouter nouveaux environnements
                for (auto &newEnv : newEnvironments)
                {
                    stats.occupiedEnvironments.push_back(newEnv);
                    environmentSpecies_[newEnv].push_back(species);
                }
            }
        }

        /// @brief Simule la spéciation
        void simulateSpeciation()
        {
            // Pour simplifier, spéciation basée sur isolation géographique et divergence génétique
            for (auto &[species, stats] : speciesStats_)
            {
                // Spéciation possible si espèce dans multiple environnements
                if (stats.occupiedEnvironments.size() > 1 &&
                    stats.geneticDiversity > 0.8 &&
                    currentGeneration_ > 1000) // Temps minimum
                {
                    std::uniform_real_distribution<double> specDist(0.0, 1.0);
                    if (specDist(rng_) < 0.001) // Très rare
                    {
                        std::string newSpecies = species + "_subspecies_" + std::to_string(totalSpeciationsEvents_);

                        // Créer nouvelle espèce avec variations
                        SpeciesSimulationStats newStats = stats;
                        newStats.species = newSpecies;
                        newStats.totalPopulation = stats.totalPopulation / 2;
                        stats.totalPopulation /= 2;

                        // Isoler dans environnements différents
                        if (stats.occupiedEnvironments.size() > 1)
                        {
                            size_t splitPoint = stats.occupiedEnvironments.size() / 2;
                            newStats.occupiedEnvironments = std::vector<Ecosystem::EnvironmentType>(
                                stats.occupiedEnvironments.begin() + splitPoint,
                                stats.occupiedEnvironments.end());
                            stats.occupiedEnvironments.resize(splitPoint);
                        }

                        speciesStats_[newSpecies] = newStats;
                        totalSpeciationsEvents_++;

                        EcologicalEvent event;
                        event.type = EcologicalEvent::SPECIATION;
                        event.description = "Spéciation: " + species + " -> " + newSpecies;
                        event.affectedSpecies = {species, newSpecies};
                        event.generation = currentGeneration_;
                        event.impact = 1.0;
                        eventHistory_.push_back(event);
                    }
                }
            }
        }

        /// @brief Simule l'extinction
        void simulateExtinction()
        {
            std::vector<std::string> extinctSpecies;

            for (auto &[species, stats] : speciesStats_)
            {
                // Calculer risque d'extinction
                double extinctionRisk = 0.0;

                if (stats.totalPopulation < 50)
                    extinctionRisk += 0.3; // Population critique
                if (stats.averageFitness < 0.3)
                    extinctionRisk += 0.4; // Faible fitness
                if (stats.occupiedEnvironments.empty())
                    extinctionRisk += 0.5; // Sans habitat
                if (stats.geneticDiversity < 0.2)
                    extinctionRisk += 0.3; // Dépression consanguine

                stats.extinctionRisk = extinctionRisk;

                std::uniform_real_distribution<double> extDist(0.0, 1.0);
                if (extinctionRisk > 0.8 && extDist(rng_) < 0.1)
                {
                    extinctSpecies.push_back(species);
                }
            }

            // Supprimer espèces éteintes
            for (const auto &species : extinctSpecies)
            {
                EcologicalEvent event;
                event.type = EcologicalEvent::EXTINCTION;
                event.description = "Extinction de " + species;
                event.affectedSpecies = {species};
                event.generation = currentGeneration_;
                event.impact = -1.0;
                eventHistory_.push_back(event);

                speciesStats_.erase(species);
                totalExtinctionEvents_++;
            }
        }

        /// @brief Met à jour les statistiques des espèces
        void updateSpeciesStats()
        {
            totalBiodiversity_ = static_cast<double>(speciesStats_.size());

            // Calculer diversité génétique (simulée)
            for (auto &[species, stats] : speciesStats_)
            {
                std::uniform_real_distribution<double> divDist(0.1, 1.0);
                stats.geneticDiversity = divDist(rng_);

                // Ajuster selon la taille de population
                if (stats.totalPopulation < 100)
                    stats.geneticDiversity *= 0.5; // Goulot d'étranglement
            }

            // Calculer stabilité écosystémique
            ecosystemStability_ = 1.0 - (totalExtinctionEvents_ * 0.1);
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

            // Top 5 espèces par population
            std::vector<std::pair<std::string, uint32_t>> sortedSpecies;
            for (const auto &[species, stats] : speciesStats_)
            {
                sortedSpecies.emplace_back(species, stats.totalPopulation);
            }
            std::sort(sortedSpecies.begin(), sortedSpecies.end(),
                      [](const auto &a, const auto &b)
                      { return a.second > b.second; });

            std::cout << "🔝 Top 5 espèces:" << std::endl;
            for (size_t i = 0; i < std::min(size_t(5), sortedSpecies.size()); ++i)
            {
                std::cout << "   " << (i + 1) << ". " << sortedSpecies[i].first
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

            // Analyses finales
            std::cout << "\n📋 ANALYSE DES ÉVÉNEMENTS MAJEURS:" << std::endl;
            int innovationCount = 0, adaptationCount = 0, migrationCount = 0;
            for (const auto &event : eventHistory_)
            {
                switch (event.type)
                {
                case EcologicalEvent::INNOVATION:
                    innovationCount++;
                    break;
                case EcologicalEvent::ADAPTATION:
                    adaptationCount++;
                    break;
                case EcologicalEvent::MIGRATION:
                    migrationCount++;
                    break;
                default:
                    break;
                }
            }
            std::cout << "🚀 Innovations évolutionnaires: " << innovationCount << std::endl;
            std::cout << "🧬 Adaptations environnementales: " << adaptationCount << std::endl;
            std::cout << "🗺️ Événements de migration: " << migrationCount << std::endl;
        }

    private:
        void initializeSpeciesPopulations()
        {
            // Initialiser avec les espèces originales de Serina
            std::vector<std::string> originalSpecies = {
                "Serinus canaria",      // Canari original
                "Xiphophorus hellerii", // Porte-épée
                "Poecilia reticulata",  // Guppy
                "Solenopsis invicta",   // Fourmi de feu
                "Acheta domesticus",    // Grillon domestique
                "Folsomia candida",     // Collembole
                "Helix pomatia",        // Escargot de Bourgogne
                "Limax maximus",        // Limace léopard
                "Hydra vulgaris",       // Hydre commune
                "Aurelia aurita",       // Méduse commune
                "Lumbricus terrestris", // Ver de terre
                "Procambarus clarkii",  // Écrevisse de Louisiane
                "Artemia salina"        // Artémie
            };

            for (const auto &species : originalSpecies)
            {
                SpeciesSimulationStats stats;
                stats.species = species;
                stats.totalPopulation = parameters_.populationSize;
                stats.averageFitness = 1.0;
                stats.geneticDiversity = 0.8;
                stats.occupiedEnvironments = {Ecosystem::EnvironmentType::GRASSLAND}; // Tous commencent en prairie
                stats.generationsSinceLastInnovation = 0;
                stats.extinctionRisk = 0.0;

                speciesStats_[species] = stats;
                environmentSpecies_[Ecosystem::EnvironmentType::GRASSLAND].push_back(species);
            }
        }

        bool checkStopConditions()
        {
            // Arrêt si trop peu d'espèces restantes
            if (speciesStats_.size() < 2)
            {
                std::cout << "⚠️ Biodiversité critique atteinte" << std::endl;
                return true;
            }

            // Arrêt si écosystème trop instable
            if (ecosystemStability_ < 0.1)
            {
                std::cout << "⚠️ Écosystème effondré" << std::endl;
                return true;
            }

            return false;
        }
    };

} // namespace Serina::Simulation