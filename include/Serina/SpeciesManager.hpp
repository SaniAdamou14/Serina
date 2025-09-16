#pragma once

#include "NEAT.hpp"
#include <vector>
#include <memory>
#include <algorithm>
#include <unordered_map>
#include <random>
#include <numeric>

namespace Serina::NEAT
{

    /// @brief Espèce dans l'algorithme NEAT
    class Species
    {
    private:
        uint32_t speciesId_;
        std::vector<std::shared_ptr<NEATGenome>> members_;
        std::shared_ptr<NEATGenome> representative_;
        double bestFitness_;
        double averageFitness_;
        uint32_t generationsWithoutImprovement_;
        uint32_t age_;

    public:
        Species(uint32_t id, std::shared_ptr<NEATGenome> firstMember)
            : speciesId_(id), representative_(firstMember), bestFitness_(0.0),
              averageFitness_(0.0), generationsWithoutImprovement_(0), age_(0)
        {
            members_.push_back(firstMember);
            firstMember->setSpeciesId(id);
        }

        /// @brief Ajoute un membre à l'espèce
        void addMember(std::shared_ptr<NEATGenome> genome)
        {
            members_.push_back(genome);
            genome->setSpeciesId(speciesId_);
        }

        /// @brief Vérifie si un génome appartient à cette espèce
        bool isCompatible(const NEATGenome &genome, const NEATConfig &config) const
        {
            double distance = representative_->geneticDistance(genome, config);
            return distance < config.compatibilityThreshold;
        }

        /// @brief Met à jour les statistiques de l'espèce
        void updateStatistics()
        {
            if (members_.empty())
            {
                averageFitness_ = 0.0;
                return;
            }

            double totalFitness = 0.0;
            double maxFitness = -1e6;

            for (const auto &member : members_)
            {
                double fitness = member->getFitness();
                totalFitness += fitness;
                maxFitness = std::max(maxFitness, fitness);
            }

            averageFitness_ = totalFitness / members_.size();

            // Vérifie l'amélioration
            if (maxFitness > bestFitness_)
            {
                bestFitness_ = maxFitness;
                generationsWithoutImprovement_ = 0;
            }
            else
            {
                generationsWithoutImprovement_++;
            }

            age_++;
        }

        /// @brief Trie les membres par fitness (meilleur en premier)
        void sortByFitness()
        {
            std::sort(members_.begin(), members_.end(),
                      [](const std::shared_ptr<NEATGenome> &a, const std::shared_ptr<NEATGenome> &b)
                      {
                          return a->getFitness() > b->getFitness();
                      });
        }

        /// @brief Effectue la sélection dans l'espèce
        void selection(const NEATConfig &config)
        {
            if (members_.empty())
                return;

            sortByFitness();

            // Garde seulement les meilleurs
            size_t calculatedSurvivors = static_cast<size_t>(members_.size() * config.survivalThreshold);
            size_t survivorCount = calculatedSurvivors > 0 ? calculatedSurvivors : 1;

            members_.resize(survivorCount);

            // Met à jour le représentant
            if (!members_.empty())
            {
                representative_ = members_[0];
            }
        }

        /// @brief Génère la descendance pour cette espèce
        std::vector<std::shared_ptr<NEATGenome>> reproduce(
            size_t targetSize, const NEATConfig &config, std::mt19937 &rng)
        {

            std::vector<std::shared_ptr<NEATGenome>> offspring;

            if (members_.empty() || targetSize == 0)
                return offspring;

            offspring.reserve(targetSize);

            // Le champion survit toujours
            if (targetSize > 0)
            {
                auto champion = std::make_shared<NEATGenome>(*members_[0]);
                offspring.push_back(champion);
                targetSize--;
            }

            // Génère le reste par croisement et mutation
            std::uniform_real_distribution<double> uniformDist(0.0, 1.0);
            std::uniform_int_distribution<size_t> memberDist(0, members_.size() - 1);

            for (size_t i = 0; i < targetSize; ++i)
            {
                std::shared_ptr<NEATGenome> child;

                if (members_.size() >= 2 && uniformDist(rng) < 0.75)
                {
                    // Croisement
                    size_t parent1Idx = memberDist(rng);
                    size_t parent2Idx = memberDist(rng);

                    // Assure des parents différents
                    if (parent1Idx == parent2Idx && members_.size() > 1)
                    {
                        parent2Idx = (parent1Idx + 1) % members_.size();
                    }

                    auto crossoverResult = members_[parent1Idx]->crossover(*members_[parent2Idx]);
                    child = std::make_shared<NEATGenome>(std::move(crossoverResult));
                }
                else
                {
                    // Copie simple
                    size_t parentIdx = memberDist(rng);
                    child = std::make_shared<NEATGenome>(*members_[parentIdx]);
                }

                // Mutations
                if (uniformDist(rng) < config.weightMutationRate)
                {
                    child->mutateWeights(config);
                }
                if (uniformDist(rng) < config.addNodeMutationRate)
                {
                    child->addNode(config);
                }
                if (uniformDist(rng) < config.addConnectionMutationRate)
                {
                    child->addConnection(config);
                }

                offspring.push_back(child);
            }

            return offspring;
        }

        /// @brief Calcule la fitness ajustée (partagée)
        void adjustFitness()
        {
            if (members_.empty())
                return;

            double speciesSize = static_cast<double>(members_.size());
            for (auto &member : members_)
            {
                double adjustedFitness = member->getFitness() / speciesSize;
                member->setFitness(adjustedFitness);
            }
        }

        /// @brief Réinitialise l'espèce pour la prochaine génération
        void reset()
        {
            members_.clear();
        }

        // Getters
        uint32_t getId() const { return speciesId_; }
        size_t size() const { return members_.size(); }
        double getBestFitness() const { return bestFitness_; }
        double getAverageFitness() const { return averageFitness_; }
        uint32_t getGenerationsWithoutImprovement() const { return generationsWithoutImprovement_; }
        uint32_t getAge() const { return age_; }
        bool isEmpty() const { return members_.empty(); }

        const std::vector<std::shared_ptr<NEATGenome>> &getMembers() const { return members_; }
        const std::shared_ptr<NEATGenome> &getRepresentative() const { return representative_; }
        const std::shared_ptr<NEATGenome> &getBestMember() const { return members_.empty() ? nullptr : members_[0]; }
    };

    /// @brief Gestionnaire d'espèces pour NEAT
    class SpeciesManager
    {
    private:
        std::vector<std::unique_ptr<Species>> species_;
        uint32_t nextSpeciesId_;
        NEATConfig config_;
        mutable std::mt19937 rng_;

    public:
        SpeciesManager(const NEATConfig &config = NEATConfig{})
            : nextSpeciesId_(1), config_(config), rng_(std::random_device{}()) {}

        /// @brief Spéciation des génomes
        void speciate(std::vector<std::shared_ptr<NEATGenome>> &genomes)
        {
            // Réinitialise toutes les espèces
            for (auto &species : species_)
            {
                species->reset();
            }

            // Assigne chaque génome à une espèce
            for (auto &genome : genomes)
            {
                bool assigned = false;

                // Essaie de l'assigner à une espèce existante
                for (auto &species : species_)
                {
                    if (species->isCompatible(*genome, config_))
                    {
                        species->addMember(genome);
                        assigned = true;
                        break;
                    }
                }

                // Crée une nouvelle espèce si nécessaire
                if (!assigned)
                {
                    auto newSpecies = std::make_unique<Species>(nextSpeciesId_++, genome);
                    species_.push_back(std::move(newSpecies));
                }
            }

            // Supprime les espèces vides
            species_.erase(
                std::remove_if(species_.begin(), species_.end(),
                               [](const std::unique_ptr<Species> &species)
                               {
                                   return species->isEmpty();
                               }),
                species_.end());
        }

        /// @brief Met à jour toutes les espèces
        void updateSpecies()
        {
            for (auto &species : species_)
            {
                species->updateStatistics();
                species->adjustFitness();
            }
        }

        /// @brief Effectue la sélection dans toutes les espèces
        void performSelection()
        {
            for (auto &species : species_)
            {
                species->selection(config_);
            }

            // Supprime les espèces qui stagnent trop longtemps
            const uint32_t maxStagnation = 15;
            species_.erase(
                std::remove_if(species_.begin(), species_.end(),
                               [maxStagnation](const std::unique_ptr<Species> &species)
                               {
                                   return species->getGenerationsWithoutImprovement() > maxStagnation &&
                                          species->size() < 2;
                               }),
                species_.end());
        }

        /// @brief Calcule le nombre d'offspring pour chaque espèce
        std::vector<size_t> calculateOffspringCounts(size_t totalPopulation) const
        {
            std::vector<size_t> offspringCounts(species_.size(), 0);

            if (species_.empty())
                return offspringCounts;

            // Calcule la fitness totale ajustée
            double totalAdjustedFitness = 0.0;
            for (const auto &species : species_)
            {
                totalAdjustedFitness += species->getAverageFitness() * species->size();
            }

            if (totalAdjustedFitness <= 0.0)
            {
                // Distribution égale si pas de fitness
                size_t equalShare = totalPopulation / species_.size();
                std::fill(offspringCounts.begin(), offspringCounts.end(), equalShare);

                // Distribue le reste
                size_t remainder = totalPopulation % species_.size();
                for (size_t i = 0; i < remainder; ++i)
                {
                    offspringCounts[i]++;
                }
            }
            else
            {
                // Distribution proportionnelle à la fitness
                size_t assignedTotal = 0;

                for (size_t i = 0; i < species_.size(); ++i)
                {
                    double speciesFitness = species_[i]->getAverageFitness() * species_[i]->size();
                    double proportion = speciesFitness / totalAdjustedFitness;
                    size_t offspring = static_cast<size_t>(proportion * totalPopulation);

                    // Assure au moins 1 offspring par espèce non vide
                    size_t minOffspring = species_[i]->size() > 0 ? static_cast<size_t>(1) : static_cast<size_t>(0);
                    offspring = std::max(offspring, minOffspring);

                    offspringCounts[i] = offspring;
                    assignedTotal += offspring;
                }

                // Distribue le reste aux meilleures espèces
                if (assignedTotal < totalPopulation)
                {
                    std::vector<size_t> indices(species_.size());
                    std::iota(indices.begin(), indices.end(), 0);

                    std::sort(indices.begin(), indices.end(),
                              [this](size_t a, size_t b)
                              {
                                  return species_[a]->getBestFitness() > species_[b]->getBestFitness();
                              });

                    size_t remaining = totalPopulation - assignedTotal;
                    for (size_t i = 0; i < remaining && i < indices.size(); ++i)
                    {
                        offspringCounts[indices[i]]++;
                    }
                }
            }

            return offspringCounts;
        }

        /// @brief Reproduit toutes les espèces
        std::vector<std::shared_ptr<NEATGenome>> reproduce(size_t targetPopulation)
        {
            std::vector<std::shared_ptr<NEATGenome>> newGeneration;
            newGeneration.reserve(targetPopulation);

            auto offspringCounts = calculateOffspringCounts(targetPopulation);

            // Reproduction par espèce
            for (size_t i = 0; i < species_.size(); ++i)
            {
                auto offspring = species_[i]->reproduce(offspringCounts[i], config_, rng_);
                newGeneration.insert(newGeneration.end(), offspring.begin(), offspring.end());
            }

            // Croisement inter-espèces occasionnel
            std::uniform_real_distribution<double> uniformDist(0.0, 1.0);
            if (species_.size() >= 2 && uniformDist(rng_) < config_.interspeciesMatingRate)
            {
                std::uniform_int_distribution<size_t> speciesDist(0, species_.size() - 1);

                size_t species1Idx = speciesDist(rng_);
                size_t species2Idx = speciesDist(rng_);

                if (species1Idx != species2Idx &&
                    !species_[species1Idx]->isEmpty() &&
                    !species_[species2Idx]->isEmpty())
                {

                    auto parent1 = species_[species1Idx]->getBestMember();
                    auto parent2 = species_[species2Idx]->getBestMember();

                    if (parent1 && parent2)
                    {
                        auto hybrid = std::make_shared<NEATGenome>(parent1->crossover(*parent2));
                        hybrid->mutateWeights(config_);
                        newGeneration.push_back(hybrid);
                    }
                }
            }

            return newGeneration;
        }

        /// @brief Obtient les statistiques des espèces
        struct SpeciesStats
        {
            size_t totalSpecies;
            size_t totalOrganisms;
            double bestFitness;
            double averageFitness;
            std::vector<size_t> speciesSizes;
            std::vector<double> speciesFitnesses;
            size_t largestSpeciesSize;
            double geneticDiversity;
        };

        SpeciesStats getStatistics() const
        {
            SpeciesStats stats;
            stats.totalSpecies = species_.size();
            stats.totalOrganisms = 0;
            stats.bestFitness = -1e6;
            stats.averageFitness = 0.0;
            stats.largestSpeciesSize = 0;
            stats.geneticDiversity = 0.0;

            double totalFitness = 0.0;
            size_t totalGenomes = 0;

            for (const auto &species : species_)
            {
                size_t speciesSize = species->size();
                double speciesBestFitness = species->getBestFitness();

                stats.totalOrganisms += speciesSize;
                stats.speciesSizes.push_back(speciesSize);
                stats.speciesFitnesses.push_back(speciesBestFitness);
                stats.largestSpeciesSize = std::max(stats.largestSpeciesSize, speciesSize);
                stats.bestFitness = std::max(stats.bestFitness, speciesBestFitness);

                // Accumule pour la moyenne
                for (const auto &member : species->getMembers())
                {
                    totalFitness += member->getFitness();
                    totalGenomes++;
                }
            }

            stats.averageFitness = totalGenomes > 0 ? totalFitness / totalGenomes : 0.0;

            // Calcule la diversité génétique (distance moyenne entre espèces)
            if (species_.size() >= 2)
            {
                double totalDistance = 0.0;
                size_t comparisons = 0;

                for (size_t i = 0; i < species_.size(); ++i)
                {
                    for (size_t j = i + 1; j < species_.size(); ++j)
                    {
                        if (!species_[i]->isEmpty() && !species_[j]->isEmpty())
                        {
                            double distance = species_[i]->getRepresentative()->geneticDistance(
                                *species_[j]->getRepresentative(), config_);
                            totalDistance += distance;
                            comparisons++;
                        }
                    }
                }

                stats.geneticDiversity = comparisons > 0 ? totalDistance / comparisons : 0.0;
            }

            return stats;
        }

        // Getters et setters
        const std::vector<std::unique_ptr<Species>> &getSpecies() const { return species_; }
        size_t getSpeciesCount() const { return species_.size(); }
        void setConfig(const NEATConfig &config) { config_ = config; }
        const NEATConfig &getConfig() const { return config_; }

        /// @brief Trouve la meilleure fitness globale
        double getBestFitness() const
        {
            double best = -1e6;
            for (const auto &species : species_)
            {
                best = std::max(best, species->getBestFitness());
            }
            return best;
        }

        /// @brief Trouve le meilleur génome global
        std::shared_ptr<NEATGenome> getBestGenome() const
        {
            std::shared_ptr<NEATGenome> best = nullptr;
            double bestFitness = -1e6;

            for (const auto &species : species_)
            {
                if (!species->isEmpty() && species->getBestFitness() > bestFitness)
                {
                    best = species->getBestMember();
                    bestFitness = species->getBestFitness();
                }
            }

            return best;
        }
    };

} // namespace Serina::NEAT