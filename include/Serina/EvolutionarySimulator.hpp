#pragma once

#include "AdvancedGenetics.hpp"
#include "PopulationManager.hpp"
#include "NEAT.hpp"
#include "SpeciesManager.hpp"
#include "PerformanceOptimizations.hpp"
#include <memory>
#include <vector>
#include <functional>
#include <chrono>
#include <random>
#include <algorithm>
#include <cmath>

namespace Serina::Simulation
{

    /// @brief Configuration complète de simulation
    struct SimulationConfig
    {
        // Paramètres de population
        size_t initialPopulation = 500;
        size_t maxPopulation = 2000;
        double reproductionThreshold = 0.6;

        // Paramètres génétiques
        Genetics::MutationConfig mutationConfig;
        Genetics::SelectionConfig selectionConfig;
        Genetics::CrossoverConfig crossoverConfig;

        // Paramètres NEAT
        NEAT::NEATConfig neatConfig;
        bool useNEAT = true;
        uint32_t inputNodes = 8;  // Vision, énergie, âge, etc.
        uint32_t outputNodes = 4; // Mouvement X, Y, reproduction, agressivité

        // Paramètres environnementaux
        double worldWidth = 1000.0;
        double worldHeight = 1000.0;
        double spatialHashCellSize = 50.0;

        // Paramètres de performance
        bool useMultithreading = true;
        bool useSIMD = true;
        int maxThreads = 0; // 0 = auto-détection

        // Paramètres de simulation
        double timeStep = 0.1;
        uint32_t maxGenerations = 1000;
        double targetFitness = 0.95;
        bool enableProfiling = false;
    };

    /// @brief Organisme évolutif avec NEAT
    class EvolutionaryOrganism
    {
    private:
        std::unique_ptr<Genetics::AdvancedGenome> genome_;
        std::unique_ptr<NEAT::NEATGenome> brain_;

        uint64_t id_;
        double x_, y_;
        double vx_, vy_;
        double energy_;
        double age_;
        double fitness_;
        bool alive_;

        // Historique pour apprentissage
        std::vector<double> lastInputs_;
        std::vector<double> lastOutputs_;

        static uint64_t nextId_;

    public:
        EvolutionaryOrganism(std::unique_ptr<Genetics::AdvancedGenome> genome,
                             std::unique_ptr<NEAT::NEATGenome> brain)
            : genome_(std::move(genome)), brain_(std::move(brain)),
              id_(nextId_++), x_(0.0), y_(0.0), vx_(0.0), vy_(0.0),
              energy_(100.0), age_(0.0), fitness_(0.0), alive_(true) {}

        /// @brief Met à jour l'organisme avec l'environnement
        void update(double deltaTime, const std::vector<EvolutionaryOrganism *> &neighbors,
                    const SimulationConfig &config)
        {
            if (!alive_)
                return;

            // Prépare les entrées pour le réseau de neurones
            std::vector<double> inputs = prepareInputs(neighbors, config);

            // Évaluation du réseau NEAT
            std::vector<double> outputs = brain_->evaluate(inputs);

            // Interprète les sorties
            interpretOutputs(outputs, deltaTime, config);

            // Met à jour l'état physique
            updatePhysics(deltaTime, config);

            // Calcule la fitness
            updateFitness(deltaTime, neighbors);

            // Sauvegarde pour l'historique
            lastInputs_ = inputs;
            lastOutputs_ = outputs;
        }

    private:
        /// @brief Prépare les entrées sensorielles
        std::vector<double> prepareInputs(const std::vector<EvolutionaryOrganism *> &neighbors,
                                          const SimulationConfig &config)
        {
            std::vector<double> inputs(config.inputNodes, 0.0);

            // Input 0: Énergie normalisée
            inputs[0] = energy_ / 100.0;

            // Input 1: Âge normalisé
            double maxAge = genome_->getTrait(Genetics::TraitType::LONGEVITY) * 1000.0;
            inputs[1] = age_ / maxAge;

            // Input 2-3: Position relative au centre du monde
            inputs[2] = (x_ - config.worldWidth * 0.5) / (config.worldWidth * 0.5);
            inputs[3] = (y_ - config.worldHeight * 0.5) / (config.worldHeight * 0.5);

            // Input 4-5: Densité des voisins et énergie moyenne
            if (!neighbors.empty())
            {
                double totalEnergy = 0.0;
                int closeNeighbors = 0;
                double visionRange = genome_->getTrait(Genetics::TraitType::VISION_RANGE) * 100.0;

                for (auto *neighbor : neighbors)
                {
                    if (neighbor == this || !neighbor->isAlive())
                        continue;

                    double dx = neighbor->getX() - x_;
                    double dy = neighbor->getY() - y_;
                    double distance = std::sqrt(dx * dx + dy * dy);

                    if (distance <= visionRange)
                    {
                        closeNeighbors++;
                        totalEnergy += neighbor->getEnergy();
                    }
                }

                inputs[4] = std::min(closeNeighbors / 10.0, 1.0); // Densité (max 10)
                inputs[5] = closeNeighbors > 0 ? (totalEnergy / closeNeighbors) / 100.0 : 0.0;
            }

            // Input 6: Vitesse actuelle
            double speed = std::sqrt(vx_ * vx_ + vy_ * vy_);
            double maxSpeed = genome_->getTrait(Genetics::TraitType::SPEED) * 10.0;
            inputs[6] = speed / maxSpeed;

            // Input 7: Biais constant (toujours 1.0)
            inputs[7] = 1.0;

            return inputs;
        }

        /// @brief Interprète les sorties du réseau
        void interpretOutputs(const std::vector<double> &outputs, double deltaTime,
                              const SimulationConfig &config)
        {
            if (outputs.size() < config.outputNodes)
                return;

            // Output 0-1: Mouvement (X, Y)
            double maxSpeed = genome_->getTrait(Genetics::TraitType::SPEED) * 10.0;
            double acceleration = 5.0;

            vx_ += (outputs[0] - 0.5) * acceleration * deltaTime;
            vy_ += (outputs[1] - 0.5) * acceleration * deltaTime;

            // Limite la vitesse
            double currentSpeed = std::sqrt(vx_ * vx_ + vy_ * vy_);
            if (currentSpeed > maxSpeed)
            {
                vx_ = (vx_ / currentSpeed) * maxSpeed;
                vy_ = (vy_ / currentSpeed) * maxSpeed;
            }

            // Output 2: Tentative de reproduction
            if (outputs[2] > 0.7 && canReproduce())
            {
                // Signal de reproduction (géré par le gestionnaire de population)
            }

            // Output 3: Agressivité/Défense
            double aggression = outputs[3] * genome_->getTrait(Genetics::TraitType::AGGRESSION);
            // L'agressivité peut affecter l'énergie et les interactions
        }

        /// @brief Met à jour la physique de l'organisme
        void updatePhysics(double deltaTime, const SimulationConfig &config)
        {
            // Mouvement
            x_ += vx_ * deltaTime;
            y_ += vy_ * deltaTime;

            // Limites du monde (rebond)
            if (x_ < 0)
            {
                x_ = 0;
                vx_ = std::abs(vx_);
            }
            if (x_ > config.worldWidth)
            {
                x_ = config.worldWidth;
                vx_ = -std::abs(vx_);
            }
            if (y_ < 0)
            {
                y_ = 0;
                vy_ = std::abs(vy_);
            }
            if (y_ > config.worldHeight)
            {
                y_ = config.worldHeight;
                vy_ = -std::abs(vy_);
            }

            // Friction
            double friction = 0.95;
            vx_ *= friction;
            vy_ *= friction;

            // Vieillissement
            age_ += deltaTime;

            // Métabolisme
            double efficiency = genome_->getTrait(Genetics::TraitType::ENERGY_EFFICIENCY);
            double size = genome_->getTrait(Genetics::TraitType::SIZE);
            double speed = std::sqrt(vx_ * vx_ + vy_ * vy_);

            double metabolismRate = (1.0 - efficiency) * 0.1;
            double movementCost = size * speed * 0.05;
            double baseCost = size * 0.02;

            energy_ -= (metabolismRate + movementCost + baseCost) * deltaTime;

            // Mort par épuisement ou vieillesse
            double maxAge = genome_->getTrait(Genetics::TraitType::LONGEVITY) * 1000.0;
            if (energy_ <= 0.0 || age_ >= maxAge)
            {
                alive_ = false;
            }
        }

        /// @brief Met à jour la fitness
        void updateFitness(double deltaTime, const std::vector<EvolutionaryOrganism *> &neighbors)
        {
            if (!alive_)
            {
                fitness_ = age_ / 1000.0; // Fitness basée sur la survie
                return;
            }

            // Composantes de fitness
            double survivalComponent = age_ / 1000.0; // Récompense la survie
            double energyComponent = energy_ / 100.0; // Récompense l'énergie
            double reproductionComponent = genome_->getTrait(Genetics::TraitType::REPRODUCTION_RATE);

            // Bonus pour la diversité comportementale
            double explorationBonus = 0.0;
            if (!lastOutputs_.empty())
            {
                double outputVariance = 0.0;
                for (double output : lastOutputs_)
                {
                    outputVariance += output * output;
                }
                explorationBonus = std::sqrt(outputVariance) * 0.1;
            }

            // Bonus social (récompense la proximité modérée)
            double socialBonus = 0.0;
            int nearbyCount = 0;
            for (auto *neighbor : neighbors)
            {
                if (neighbor == this || !neighbor->isAlive())
                    continue;

                double dx = neighbor->getX() - x_;
                double dy = neighbor->getY() - y_;
                double distance = std::sqrt(dx * dx + dy * dy);

                if (distance < 100.0)
                {
                    nearbyCount++;
                }
            }

            // Optimal: 2-5 voisins proches
            if (nearbyCount >= 2 && nearbyCount <= 5)
            {
                socialBonus = 0.2;
            }
            else if (nearbyCount > 10)
            {
                socialBonus = -0.1; // Pénalise la surpopulation
            }

            fitness_ = survivalComponent * 0.4 +
                       energyComponent * 0.3 +
                       reproductionComponent * 0.2 +
                       explorationBonus * 0.05 +
                       socialBonus * 0.05;

            // Met à jour la fitness dans les génomes
            genome_->setFitness(fitness_);
            brain_->setFitness(fitness_);
        }

    public:
        // Getters
        uint64_t getId() const { return id_; }
        double getX() const { return x_; }
        double getY() const { return y_; }
        double getVX() const { return vx_; }
        double getVY() const { return vy_; }
        double getEnergy() const { return energy_; }
        double getAge() const { return age_; }
        double getFitness() const { return fitness_; }
        bool isAlive() const { return alive_; }

        const Genetics::AdvancedGenome &getGenome() const { return *genome_; }
        const NEAT::NEATGenome &getBrain() const { return *brain_; }

        // Setters
        void setPosition(double x, double y)
        {
            x_ = x;
            y_ = y;
        }
        void setVelocity(double vx, double vy)
        {
            vx_ = vx;
            vy_ = vy;
        }
        void setEnergy(double energy) { energy_ = std::max(0.0, energy); }
        void setAlive(bool alive) { alive_ = alive; }

        /// @brief Vérifie si peut se reproduire
        bool canReproduce() const
        {
            return alive_ && energy_ > 60.0 && age_ > 50.0;
        }

        /// @brief Crée un descendant par croisement
        static std::unique_ptr<EvolutionaryOrganism> createOffspring(
            const EvolutionaryOrganism &parent1,
            const EvolutionaryOrganism &parent2,
            const SimulationConfig &config)
        {

            // Croisement génétique - utilise la nouvelle méthode crossover
            Genetics::AdvancedGenome offspringGenomeTemp = parent1.genome_->crossover(*parent2.genome_, config.crossoverConfig);
            auto offspringGenome = std::make_unique<Genetics::AdvancedGenome>(std::move(offspringGenomeTemp));

            // Mutation génétique
            offspringGenome->mutate(config.mutationConfig);

            // Croisement des cerveaux NEAT
            NEAT::NEATGenome offspringBrainTemp = parent1.brain_->crossover(*parent2.brain_);
            auto offspringBrain = std::make_unique<NEAT::NEATGenome>(std::move(offspringBrainTemp));

            // Mutations NEAT
            offspringBrain->mutateWeights(config.neatConfig);
            std::mt19937 rng{std::random_device{}()};
            if (std::uniform_real_distribution<double>(0.0, 1.0)(rng) < config.neatConfig.addNodeMutationRate)
            {
                offspringBrain->addNode(config.neatConfig);
            }
            if (std::uniform_real_distribution<double>(0.0, 1.0)(rng) < config.neatConfig.addConnectionMutationRate)
            {
                offspringBrain->addConnection(config.neatConfig);
            }

            auto offspring = std::make_unique<EvolutionaryOrganism>(
                std::move(offspringGenome), std::move(offspringBrain));

            // Position initiale près des parents
            std::normal_distribution<double> positionNoise(0.0, 10.0);
            std::mt19937 rng{std::random_device{}()};

            double newX = (parent1.getX() + parent2.getX()) * 0.5 + positionNoise(rng);
            double newY = (parent1.getY() + parent2.getY()) * 0.5 + positionNoise(rng);

            offspring->setPosition(newX, newY);
            offspring->setEnergy(50.0); // Énergie initiale réduite

            return offspring;
        }
    };

    uint64_t EvolutionaryOrganism::nextId_ = 1;

    /// @brief Simulateur évolutif principal
    class EvolutionarySimulator
    {
    private:
        SimulationConfig config_;
        std::vector<std::unique_ptr<EvolutionaryOrganism>> population_;
        std::unique_ptr<NEAT::SpeciesManager> speciesManager_;
        std::unique_ptr<Performance::SpatialHashGrid<EvolutionaryOrganism>> spatialGrid_;
        std::unique_ptr<Performance::ParallelTaskManager> taskManager_;
        std::unique_ptr<Performance::PerformanceProfiler> profiler_;

        uint32_t currentGeneration_;
        double simulationTime_;
        bool running_;

        // Statistiques
        struct SimulationStats
        {
            uint32_t generation = 0;
            size_t population = 0;
            double averageFitness = 0.0;
            double bestFitness = 0.0;
            double averageAge = 0.0;
            double averageEnergy = 0.0;
            size_t speciesCount = 0;
            double geneticDiversity = 0.0;
            double simulationTime = 0.0;

            // Statistiques NEAT
            double averageNodes = 0.0;
            double averageConnections = 0.0;
            double averageComplexity = 0.0;
        } stats_;

    public:
        EvolutionarySimulator(const SimulationConfig &config = SimulationConfig{})
            : config_(config), currentGeneration_(0), simulationTime_(0.0), running_(false)
        {

            // Initialise les composants
            speciesManager_ = std::make_unique<NEAT::SpeciesManager>(config_.neatConfig);

            spatialGrid_ = std::make_unique<Performance::SpatialHashGrid<EvolutionaryOrganism>>(
                0.0, 0.0, config_.worldWidth, config_.worldHeight, config_.spatialHashCellSize);

            if (config_.useMultithreading)
            {
                taskManager_ = std::make_unique<Performance::ParallelTaskManager>();
                if (config_.maxThreads > 0)
                {
                    taskManager_->setMaxThreads(config_.maxThreads);
                }
            }

            if (config_.enableProfiling)
            {
                profiler_ = std::make_unique<Performance::PerformanceProfiler>();
            }
        }

        /// @brief Initialise la simulation
        void initialize()
        {
            if (config_.enableProfiling)
            {
                PROFILE_SCOPE(*profiler_, "Initialization");
            }

            population_.clear();
            population_.reserve(config_.maxPopulation);

            // Crée la population initiale
            std::mt19937 rng{std::random_device{}()};
            std::uniform_real_distribution<double> posDist(50.0,
                                                           std::min(config_.worldWidth - 50.0, config_.worldHeight - 50.0));

            for (size_t i = 0; i < config_.initialPopulation; ++i)
            {
                // Génome génétique
                auto genome = std::make_unique<Genetics::AdvancedGenome>(0);

                // Cerveau NEAT
                auto brain = std::make_unique<NEAT::NEATGenome>(
                    config_.inputNodes, config_.outputNodes);

                // Organisme
                auto organism = std::make_unique<EvolutionaryOrganism>(
                    std::move(genome), std::move(brain));

                // Position aléatoire
                organism->setPosition(posDist(rng), posDist(rng));

                population_.push_back(std::move(organism));
            }

            currentGeneration_ = 0;
            simulationTime_ = 0.0;
            running_ = true;

            updateStatistics();
        }

        /// @brief Exécute un pas de simulation
        void step()
        {
            if (!running_ || population_.empty())
                return;

            if (config_.enableProfiling)
            {
                PROFILE_SCOPE(*profiler_, "SimulationStep");
            }

            // Met à jour la grille spatiale
            updateSpatialGrid();

            // Met à jour tous les organismes
            updateOrganisms();

            // Gère la reproduction
            handleReproduction();

            // Supprime les organismes morts
            removeDeadOrganisms();

            // Vérifie les conditions de nouvelle génération
            if (shouldAdvanceGeneration())
            {
                advanceGeneration();
            }

            simulationTime_ += config_.timeStep;
            updateStatistics();
        }

        /// @brief Exécute la simulation pour un nombre d'étapes
        void run(uint32_t steps)
        {
            for (uint32_t i = 0; i < steps && running_; ++i)
            {
                step();

                // Conditions d'arrêt
                if (currentGeneration_ >= config_.maxGenerations)
                {
                    running_ = false;
                    break;
                }

                if (stats_.bestFitness >= config_.targetFitness)
                {
                    running_ = false;
                    break;
                }

                if (population_.empty())
                {
                    running_ = false;
                    break;
                }
            }
        }

    private:
        /// @brief Met à jour la grille spatiale
        void updateSpatialGrid()
        {
            if (config_.enableProfiling)
            {
                PROFILE_SCOPE(*profiler_, "SpatialGridUpdate");
            }

            spatialGrid_->clear();

            for (auto &organism : population_)
            {
                if (organism->isAlive())
                {
                    spatialGrid_->insert(organism.get(), organism->getX(), organism->getY());
                }
            }
        }

        /// @brief Met à jour tous les organismes
        void updateOrganisms()
        {
            if (config_.enableProfiling)
            {
                PROFILE_SCOPE(*profiler_, "OrganismUpdate");
            }

            if (config_.useMultithreading && taskManager_)
            {
                // Mise à jour parallèle
                taskManager_->parallelFor(0, population_.size(),
                                          [this](size_t i)
                                          {
                                              auto &organism = population_[i];
                                              if (!organism->isAlive())
                                                  return;

                                              // Trouve les voisins
                                              const auto &neighbors = spatialGrid_->queryRadius(
                                                  organism->getX(), organism->getY(), 200.0);

                                              organism->update(config_.timeStep, neighbors, config_);
                                          });
            }
            else
            {
                // Mise à jour séquentielle
                for (auto &organism : population_)
                {
                    if (!organism->isAlive())
                        continue;

                    const auto &neighbors = spatialGrid_->queryRadius(
                        organism->getX(), organism->getY(), 200.0);

                    organism->update(config_.timeStep, neighbors, config_);
                }
            }
        }

        /// @brief Gère la reproduction
        void handleReproduction()
        {
            if (config_.enableProfiling)
            {
                PROFILE_SCOPE(*profiler_, "Reproduction");
            }

            if (population_.size() >= config_.maxPopulation)
                return;

            std::vector<EvolutionaryOrganism *> reproducers;
            for (auto &organism : population_)
            {
                if (organism->canReproduce())
                {
                    reproducers.push_back(organism.get());
                }
            }

            if (reproducers.size() < 2)
                return;

            std::mt19937 rng{std::random_device{}()};
            std::uniform_int_distribution<size_t> parentDist(0, reproducers.size() - 1);
            std::uniform_real_distribution<double> reproduceDist(0.0, 1.0);

            size_t maxOffspring = std::min(
                config_.maxPopulation - population_.size(),
                reproducers.size() / 2);

            for (size_t i = 0; i < maxOffspring; ++i)
            {
                if (reproduceDist(rng) < config_.reproductionThreshold)
                {
                    size_t parent1Idx = parentDist(rng);
                    size_t parent2Idx = parentDist(rng);

                    // Assure des parents différents
                    if (parent1Idx == parent2Idx && reproducers.size() > 1)
                    {
                        parent2Idx = (parent1Idx + 1) % reproducers.size();
                    }

                    auto offspring = EvolutionaryOrganism::createOffspring(
                        *reproducers[parent1Idx], *reproducers[parent2Idx], config_);

                    // Coût énergétique pour les parents
                    reproducers[parent1Idx]->setEnergy(
                        reproducers[parent1Idx]->getEnergy() - 20.0);
                    reproducers[parent2Idx]->setEnergy(
                        reproducers[parent2Idx]->getEnergy() - 20.0);

                    population_.push_back(std::move(offspring));
                }
            }
        }

        /// @brief Supprime les organismes morts
        void removeDeadOrganisms()
        {
            if (config_.enableProfiling)
            {
                PROFILE_SCOPE(*profiler_, "RemoveDeadOrganisms");
            }

            population_.erase(
                std::remove_if(population_.begin(), population_.end(),
                               [](const std::unique_ptr<EvolutionaryOrganism> &organism)
                               {
                                   return !organism->isAlive();
                               }),
                population_.end());
        }

        /// @brief Vérifie si doit avancer à la génération suivante
        bool shouldAdvanceGeneration() const
        {
            // Critères: âge moyen élevé, faible diversité, ou stagnation
            return stats_.averageAge > 500.0 ||
                   stats_.speciesCount < 3 ||
                   population_.size() < config_.initialPopulation / 4;
        }

        /// @brief Avance à la génération suivante
        void advanceGeneration()
        {
            if (config_.enableProfiling)
            {
                PROFILE_SCOPE(*profiler_, "GenerationAdvancement");
            }

            currentGeneration_++;

            // Collecte les génomes NEAT pour spéciation
            std::vector<std::shared_ptr<NEAT::NEATGenome>> neatGenomes;
            for (auto &organism : population_)
            {
                neatGenomes.push_back(
                    std::shared_ptr<NEAT::NEATGenome>(
                        new NEAT::NEATGenome(organism->getBrain())));
            }

            // Spéciation NEAT
            speciesManager_->speciate(neatGenomes);
            speciesManager_->updateSpecies();
            speciesManager_->performSelection();

            // Reproduction NEAT
            auto newGenomes = speciesManager_->reproduce(config_.initialPopulation);

            // Crée la nouvelle population
            population_.clear();
            population_.reserve(config_.maxPopulation);

            std::mt19937 rng{std::random_device{}()};
            std::uniform_real_distribution<double> posDist(50.0,
                                                           std::min(config_.worldWidth - 50.0, config_.worldHeight - 50.0));

            for (auto &neatGenome : newGenomes)
            {
                // Nouveau génome génétique
                auto genome = std::make_unique<Genetics::AdvancedGenome>(currentGeneration_);

                // Organisme
                auto organism = std::make_unique<EvolutionaryOrganism>(
                    std::move(genome),
                    std::unique_ptr<NEAT::NEATGenome>(new NEAT::NEATGenome(*neatGenome)));

                // Position aléatoire
                organism->setPosition(posDist(rng), posDist(rng));

                population_.push_back(std::move(organism));
            }
        }

        /// @brief Met à jour les statistiques
        void updateStatistics()
        {
            stats_.generation = currentGeneration_;
            stats_.population = population_.size();
            stats_.simulationTime = simulationTime_;

            if (population_.empty())
            {
                stats_.averageFitness = 0.0;
                stats_.bestFitness = 0.0;
                stats_.averageAge = 0.0;
                stats_.averageEnergy = 0.0;
                return;
            }

            double totalFitness = 0.0;
            double totalAge = 0.0;
            double totalEnergy = 0.0;
            double totalNodes = 0.0;
            double totalConnections = 0.0;
            double bestFitness = -1e6;

            for (const auto &organism : population_)
            {
                double fitness = organism->getFitness();
                totalFitness += fitness;
                totalAge += organism->getAge();
                totalEnergy += organism->getEnergy();
                bestFitness = std::max(bestFitness, fitness);

                const auto &brain = organism->getBrain();
                totalNodes += brain.getNodeGenes().size();
                totalConnections += brain.getConnectionGenes().size();
            }

            stats_.averageFitness = totalFitness / population_.size();
            stats_.bestFitness = bestFitness;
            stats_.averageAge = totalAge / population_.size();
            stats_.averageEnergy = totalEnergy / population_.size();
            stats_.averageNodes = totalNodes / population_.size();
            stats_.averageConnections = totalConnections / population_.size();
            stats_.averageComplexity = (totalNodes + totalConnections) / population_.size();

            // Statistiques des espèces
            auto speciesStats = speciesManager_->getStatistics();
            stats_.speciesCount = speciesStats.totalSpecies;
            stats_.geneticDiversity = speciesStats.geneticDiversity;
        }

    public:
        // Getters
        const SimulationStats &getStatistics() const { return stats_; }
        const std::vector<std::unique_ptr<EvolutionaryOrganism>> &getPopulation() const { return population_; }
        const SimulationConfig &getConfig() const { return config_; }
        bool isRunning() const { return running_; }

        /// @brief Obtient les résultats du profiling
        std::vector<Performance::PerformanceProfiler::ProfileResult> getProfilingResults() const
        {
            if (profiler_)
            {
                return profiler_->getResults();
            }
            return {};
        }

        /// @brief Sauvegarde l'état de la simulation
        void saveState(const std::string &filename) const
        {
            // Implémentation de sauvegarde (JSON/binaire)
            // TODO: Sérialisation complète de l'état
        }

        /// @brief Charge l'état de la simulation
        void loadState(const std::string &filename)
        {
            // Implémentation de chargement
            // TODO: Désérialisation complète de l'état
        }

        /// @brief Réinitialise la simulation
        void reset()
        {
            population_.clear();
            currentGeneration_ = 0;
            simulationTime_ = 0.0;
            running_ = false;

            if (profiler_)
            {
                profiler_->reset();
            }
        }
    };

} // namespace Serina::Simulation