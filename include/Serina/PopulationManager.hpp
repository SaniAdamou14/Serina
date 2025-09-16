#pragma once

#include "AdvancedGenetics.hpp"
#include <vector>
#include <memory>
#include <algorithm>
#include <numeric>
#include <random>
#include <unordered_map>
#include <functional>

namespace Serina::Evolution
{

    /// @brief Statistiques de population pour analyse
    struct PopulationStats
    {
        size_t totalPopulation = 0;
        size_t generation = 0;
        double averageFitness = 0.0;
        double maxFitness = 0.0;
        double minFitness = 0.0;
        double geneticDiversity = 0.0; ///< Diversité génétique moyenne
        std::unordered_map<Genetics::TraitType, double> averageTraits;
        std::unordered_map<Genetics::TraitType, double> traitVariances;
        size_t extinctionCount = 0; ///< Nombre d'organismes morts
        size_t birthCount = 0;      ///< Nombre de nouveaux organismes
    };

    /// @brief Organisme avec génome avancé et propriétés de simulation
    class Organism
    {
    private:
        std::unique_ptr<Genetics::AdvancedGenome> genome_;
        uint64_t id_;
        std::string species_;
        double energy_;
        double age_;
        double maxAge_;
        bool alive_;

        // Position et mouvement pour intégration avec moteur physique
        double x_, y_;
        double vx_, vy_;

        static uint64_t nextId_;

    public:
        Organism(std::unique_ptr<Genetics::AdvancedGenome> genome,
                 const std::string &species = "Unknown")
            : genome_(std::move(genome)), id_(nextId_++), species_(species),
              energy_(100.0), age_(0.0), alive_(true),
              x_(0.0), y_(0.0), vx_(0.0), vy_(0.0)
        {

            // Calcule l'âge max basé sur le trait LONGEVITY
            maxAge_ = genome_->getTrait(Genetics::TraitType::LONGEVITY) * 1000.0; // Base 1000 unités
        }

        // Getters
        uint64_t getId() const { return id_; }
        const std::string &getSpecies() const { return species_; }
        const Genetics::AdvancedGenome &getGenome() const { return *genome_; }
        Genetics::AdvancedGenome &getGenome() { return *genome_; }
        double getEnergy() const { return energy_; }
        double getAge() const { return age_; }
        double getMaxAge() const { return maxAge_; }
        bool isAlive() const { return alive_; }

        // Position et mouvement
        double getX() const { return x_; }
        double getY() const { return y_; }
        double getVX() const { return vx_; }
        double getVY() const { return vy_; }

        // Setters
        void setEnergy(double energy) { energy_ = std::max(0.0, energy); }
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
        void setAlive(bool alive) { alive_ = alive; }

        /// @brief Met à jour l'organisme (vieillissement, métabolisme)
        void update(double deltaTime)
        {
            if (!alive_)
                return;

            age_ += deltaTime;

            // Métabolisme basé sur l'efficacité énergétique
            double efficiency = genome_->getTrait(Genetics::TraitType::ENERGY_EFFICIENCY);
            double metabolismRate = (1.0 - efficiency) * 0.1; // Base métabolisme

            // Coût du mouvement basé sur la taille et vitesse
            double size = genome_->getTrait(Genetics::TraitType::SIZE);
            double speed = std::sqrt(vx_ * vx_ + vy_ * vy_);
            double movementCost = size * speed * 0.05;

            energy_ -= (metabolismRate + movementCost) * deltaTime;

            // Mort par manque d'énergie ou vieillesse
            if (energy_ <= 0.0 || age_ >= maxAge_)
            {
                alive_ = false;
            }
        }

        /// @brief Calcule la fitness basée sur énergie, âge et reproduction
        double calculateFitness() const
        {
            if (!alive_)
                return 0.0;

            double energyComponent = energy_ / 100.0;                    // Normalise sur 100
            double ageComponent = std::min(age_ / (maxAge_ * 0.5), 1.0); // Favorise survie
            double reproductionPotential = genome_->getTrait(Genetics::TraitType::REPRODUCTION_RATE);

            double fitness = energyComponent * 0.4 + ageComponent * 0.3 + reproductionPotential * 0.3;
            genome_->setFitness(fitness);

            return fitness;
        }

        /// @brief Vérifie si l'organisme peut se reproduire
        bool canReproduce() const
        {
            return alive_ && energy_ > 50.0 && age_ > 10.0; // Seuils de reproduction
        }
    };

    uint64_t Organism::nextId_ = 1;

    /// @brief Gestionnaire de population avec algorithmes évolutifs avancés
    class PopulationManager
    {
    private:
        std::vector<std::unique_ptr<Organism>> population_;
        PopulationStats currentStats_;
        Genetics::MutationConfig mutationConfig_;
        Genetics::SelectionConfig selectionConfig_;
        Genetics::CrossoverConfig crossoverConfig_;

        size_t maxPopulation_;
        uint32_t currentGeneration_;

        mutable std::mt19937 rng_;

    public:
        PopulationManager(size_t maxPopulation = 1000)
            : maxPopulation_(maxPopulation), currentGeneration_(0), rng_(std::random_device{}()) {}

        /// @brief Initialise la population avec des organismes aléatoires
        void initializePopulation(size_t initialSize, const std::string &species = "Serina")
        {
            population_.clear();
            population_.reserve(maxPopulation_);

            for (size_t i = 0; i < initialSize; ++i)
            {
                auto genome = std::make_unique<Genetics::AdvancedGenome>(currentGeneration_);
                auto organism = std::make_unique<Organism>(std::move(genome), species);

                // Position aléatoire
                std::uniform_real_distribution<double> posDist(-100.0, 100.0);
                organism->setPosition(posDist(rng_), posDist(rng_));

                population_.push_back(std::move(organism));
            }

            updateStatistics();
        }

        /// @brief Met à jour tous les organismes
        void updatePopulation(double deltaTime)
        {
            for (auto &organism : population_)
            {
                organism->update(deltaTime);
            }

            // Supprime les organismes morts
            auto newEnd = std::remove_if(population_.begin(), population_.end(),
                                         [](const std::unique_ptr<Organism> &org)
                                         { return !org->isAlive(); });

            currentStats_.extinctionCount += std::distance(newEnd, population_.end());
            population_.erase(newEnd, population_.end());

            updateStatistics();
        }

        /// @brief Sélection par tournoi
        std::vector<Organism *> tournamentSelection(size_t count)
        {
            std::vector<Organism *> selected;
            selected.reserve(count);

            std::uniform_int_distribution<size_t> indexDist(0, population_.size() - 1);

            for (size_t i = 0; i < count; ++i)
            {
                double bestFitness = -1.0;
                Organism *bestOrganism = nullptr;

                // Tournoi
                for (size_t j = 0; j < selectionConfig_.tournamentSize; ++j)
                {
                    size_t index = indexDist(rng_);
                    double fitness = population_[index]->calculateFitness();

                    if (fitness > bestFitness)
                    {
                        bestFitness = fitness;
                        bestOrganism = population_[index].get();
                    }
                }

                selected.push_back(bestOrganism);
            }

            return selected;
        }

        /// @brief Sélection par roulette wheel
        std::vector<Organism *> rouletteWheelSelection(size_t count)
        {
            std::vector<double> fitnesses;
            fitnesses.reserve(population_.size());

            double totalFitness = 0.0;
            for (auto &organism : population_)
            {
                double fitness = organism->calculateFitness();
                fitnesses.push_back(fitness);
                totalFitness += fitness;
            }

            std::vector<Organism *> selected;
            selected.reserve(count);

            std::uniform_real_distribution<double> spinDist(0.0, totalFitness);

            for (size_t i = 0; i < count; ++i)
            {
                double spin = spinDist(rng_);
                double accumulator = 0.0;

                for (size_t j = 0; j < population_.size(); ++j)
                {
                    accumulator += fitnesses[j];
                    if (accumulator >= spin)
                    {
                        selected.push_back(population_[j].get());
                        break;
                    }
                }
            }

            return selected;
        }

        /// @brief Croisement BLX-α (Blend Crossover)
        std::unique_ptr<Genetics::AdvancedGenome> blendCrossover(
            const Genetics::AdvancedGenome &parent1,
            const Genetics::AdvancedGenome &parent2)
        {

            auto offspring = std::make_unique<Genetics::AdvancedGenome>(currentGeneration_ + 1);
            auto &offspringTraits = const_cast<std::vector<Genetics::GeneticTrait> &>(offspring->getTraits());

            const auto &traits1 = parent1.getTraits();
            const auto &traits2 = parent2.getTraits();

            std::uniform_real_distribution<double> blendDist(0.0, 1.0);

            for (size_t i = 0; i < traits1.size() && i < traits2.size(); ++i)
            {
                const auto &trait1 = traits1[i];
                const auto &trait2 = traits2[i];

                // BLX-α pour les allèles maternels
                double diff1 = std::abs(trait1.alleles.first.value - trait2.alleles.first.value);
                double range1 = diff1 * crossoverConfig_.blendAlpha;
                double min1 = std::min(trait1.alleles.first.value, trait2.alleles.first.value) - range1;
                double max1 = std::max(trait1.alleles.first.value, trait2.alleles.first.value) + range1;

                std::uniform_real_distribution<double> alleleDist1(
                    std::max(0.0, min1), std::min(1.0, max1));

                // BLX-α pour les allèles paternels
                double diff2 = std::abs(trait1.alleles.second.value - trait2.alleles.second.value);
                double range2 = diff2 * crossoverConfig_.blendAlpha;
                double min2 = std::min(trait1.alleles.second.value, trait2.alleles.second.value) - range2;
                double max2 = std::max(trait1.alleles.second.value, trait2.alleles.second.value) + range2;

                std::uniform_real_distribution<double> alleleDist2(
                    std::max(0.0, min2), std::min(1.0, max2));

                // Création des nouveaux allèles
                Genetics::Allele newMaternal(
                    alleleDist1(rng_),
                    (trait1.alleles.first.dominance + trait2.alleles.first.dominance) * 0.5,
                    false,
                    currentGeneration_ + 1);

                Genetics::Allele newPaternal(
                    alleleDist2(rng_),
                    (trait1.alleles.second.dominance + trait2.alleles.second.dominance) * 0.5,
                    false,
                    currentGeneration_ + 1);

                offspringTraits[i] = Genetics::GeneticTrait(trait1.type, newMaternal, newPaternal);
            }

            return offspring;
        }

        /// @brief Reproduction avec sélection et croisement
        void reproduce()
        {
            if (population_.size() >= maxPopulation_)
                return;

            // Filtre les organismes reproducteurs
            std::vector<Organism *> reproducers;
            for (auto &organism : population_)
            {
                if (organism->canReproduce())
                {
                    reproducers.push_back(organism.get());
                }
            }

            if (reproducers.size() < 2)
                return;

            size_t offspringCount = std::min(
                maxPopulation_ - population_.size(),
                reproducers.size() / 2);

            // Sélection des parents
            std::vector<Organism *> parents;
            switch (selectionConfig_.selectionMethod)
            {
            case Genetics::SelectionConfig::Method::TOURNAMENT:
                parents = tournamentSelection(offspringCount * 2);
                break;
            case Genetics::SelectionConfig::Method::ROULETTE_WHEEL:
                parents = rouletteWheelSelection(offspringCount * 2);
                break;
            default:
                parents = tournamentSelection(offspringCount * 2);
            }

            // Croisement et création de la descendance
            for (size_t i = 0; i < offspringCount && (i * 2 + 1) < parents.size(); ++i)
            {
                auto &parent1 = parents[i * 2]->getGenome();
                auto &parent2 = parents[i * 2 + 1]->getGenome();

                std::uniform_real_distribution<double> crossoverDist(0.0, 1.0);

                if (crossoverDist(rng_) < crossoverConfig_.crossoverRate)
                {
                    auto offspringGenome = blendCrossover(parent1, parent2);

                    // Mutation
                    offspringGenome->mutate(mutationConfig_);

                    // Création de l'organisme
                    auto offspring = std::make_unique<Organism>(
                        std::move(offspringGenome),
                        parents[i * 2]->getSpecies() + "_child");

                    // Position aléatoire proche des parents
                    std::normal_distribution<double> positionNoise(0.0, 5.0);
                    double newX = (parents[i * 2]->getX() + parents[i * 2 + 1]->getX()) * 0.5 + positionNoise(rng_);
                    double newY = (parents[i * 2]->getY() + parents[i * 2 + 1]->getY()) * 0.5 + positionNoise(rng_);

                    offspring->setPosition(newX, newY);
                    offspring->setEnergy(40.0); // Énergie initiale réduite

                    population_.push_back(std::move(offspring));
                    currentStats_.birthCount++;
                }
            }

            currentGeneration_++;
            updateStatistics();
        }

        /// @brief Met à jour les statistiques de population
        void updateStatistics()
        {
            currentStats_.totalPopulation = population_.size();
            currentStats_.generation = currentGeneration_;

            if (population_.empty())
            {
                currentStats_.averageFitness = 0.0;
                currentStats_.maxFitness = 0.0;
                currentStats_.minFitness = 0.0;
                currentStats_.geneticDiversity = 0.0;
                return;
            }

            // Calcul des fitness
            std::vector<double> fitnesses;
            fitnesses.reserve(population_.size());

            for (auto &organism : population_)
            {
                double fitness = organism->calculateFitness();
                fitnesses.push_back(fitness);
            }

            currentStats_.averageFitness = std::accumulate(fitnesses.begin(), fitnesses.end(), 0.0) / fitnesses.size();
            currentStats_.maxFitness = *std::max_element(fitnesses.begin(), fitnesses.end());
            currentStats_.minFitness = *std::min_element(fitnesses.begin(), fitnesses.end());

            // Calcul de la diversité génétique moyenne
            double totalDistance = 0.0;
            size_t comparisons = 0;

            for (size_t i = 0; i < population_.size(); ++i)
            {
                for (size_t j = i + 1; j < population_.size(); ++j)
                {
                    totalDistance += population_[i]->getGenome().geneticDistance(population_[j]->getGenome());
                    comparisons++;
                }
            }

            currentStats_.geneticDiversity = comparisons > 0 ? totalDistance / comparisons : 0.0;

            // Calcul des moyennes et variances des traits
            currentStats_.averageTraits.clear();
            currentStats_.traitVariances.clear();

            for (size_t traitIndex = 0; traitIndex < static_cast<size_t>(Genetics::TraitType::TRAIT_COUNT); ++traitIndex)
            {
                auto traitType = static_cast<Genetics::TraitType>(traitIndex);

                std::vector<double> traitValues;
                traitValues.reserve(population_.size());

                for (auto &organism : population_)
                {
                    traitValues.push_back(organism->getGenome().getTrait(traitType));
                }

                double mean = std::accumulate(traitValues.begin(), traitValues.end(), 0.0) / traitValues.size();
                currentStats_.averageTraits[traitType] = mean;

                double variance = 0.0;
                for (double value : traitValues)
                {
                    variance += (value - mean) * (value - mean);
                }
                variance /= traitValues.size();
                currentStats_.traitVariances[traitType] = variance;
            }
        }

        // Getters et configuration
        const PopulationStats &getStatistics() const { return currentStats_; }
        const std::vector<std::unique_ptr<Organism>> &getPopulation() const { return population_; }
        size_t getPopulationSize() const { return population_.size(); }
        uint32_t getCurrentGeneration() const { return currentGeneration_; }

        void setMutationConfig(const Genetics::MutationConfig &config) { mutationConfig_ = config; }
        void setSelectionConfig(const Genetics::SelectionConfig &config) { selectionConfig_ = config; }
        void setCrossoverConfig(const Genetics::CrossoverConfig &config) { crossoverConfig_ = config; }

        const Genetics::MutationConfig &getMutationConfig() const { return mutationConfig_; }
        const Genetics::SelectionConfig &getSelectionConfig() const { return selectionConfig_; }
        const Genetics::CrossoverConfig &getCrossoverConfig() const { return crossoverConfig_; }
    };

} // namespace Serina::Evolution