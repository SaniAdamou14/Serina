#pragma once

// The unified engine (see docs/UNIFIED_ENGINE_DESIGN.md): real individuals
// with diploid genomes (Evolution::Organism / Genetics::AdvancedGenome,
// PopulationManager.hpp), living on a real region grid (Region.hpp),
// organized into named taxa (Taxonomy::EcosystemTaxonomy), subject to real
// ecological interactions and biological constraints applied per
// individual rather than per aggregate species.

#include "Region.hpp"
#include "PopulationManager.hpp"
#include "EcosystemTaxonomy.hpp"
#include "EcologicalInteractions.hpp"
#include "EvolutionaryConstraints.hpp"
#include "EnvironmentalAdaptation.hpp"
#include "NEAT.hpp"

#include <vector>
#include <unordered_map>
#include <string>
#include <random>
#include <algorithm>
#include <cmath>
#include <optional>
#include <array>

namespace Serina::Simulation
{
    /// @brief Snapshot en lecture seule de l'état réel d'une lignée
    /// (espèce vivante), calculé à partir des individus qui la composent —
    /// pas d'agrégat maintenu séparément qui pourrait diverger de la
    /// réalité de la population.
    struct LineageSnapshot
    {
        std::string speciesName;
        Taxonomy::BiologicalType biologicalType;
        uint32_t population = 0;
        double averageFitness = 0.0;
        double geneticDiversity = 0.0; ///< Distance génétique moyenne réelle (AdvancedGenome::geneticDistance)
        uint32_t regionsOccupied = 0;
        std::vector<std::string> adaptations;
        std::vector<std::string> innovations;
    };

    struct SpeciationEvent
    {
        std::string parentSpecies;
        std::string newSpecies;
        uint32_t generation;
        double geneticDistanceAtSplit;
    };

    /// @brief Snapshot en lecture seule d'une case de la carte : son biome
    /// réel et les valeurs d'environnement réellement utilisées par la
    /// simulation pour cette case (pas une constante globale), plus le
    /// compte réel d'individus vivants actuellement dedans — pour un
    /// frontend qui veut dessiner une vraie carte de régions, pas un
    /// placeholder.
    struct RegionSnapshot
    {
        int gridX = 0;
        int gridY = 0;
        Ecosystem::EnvironmentType environmentType = Ecosystem::EnvironmentType::GRASSLAND;
        std::string environmentName;
        double temperature = 0.0;
        double primaryProducers = 0.0;
        double predationPressure = 0.0;
        double competitionIntensity = 0.0;
        double climaticStress = 0.0;
        uint32_t population = 0;
    };

    /// @brief Snapshot en lecture seule d'un individu réel : de quoi
    /// dessiner un point sur la carte et l'inspecter, sans exposer le
    /// génome complet ni permettre de le muter depuis l'extérieur.
    struct IndividualSnapshot
    {
        uint64_t id = 0;
        std::string species;
        double x = 0.0;
        double y = 0.0;
        double energy = 0.0;
        double age = 0.0;
    };

    /// @brief Le "cerveau" d'une lignée : un seul réseau NEAT partagé par
    /// tous ses individus (pas un par individu — voir
    /// docs/UNIFIED_ENGINE_DESIGN.md, "échelle cible"), piloté par
    /// évolution (1+1) : `brain` est le candidat actuellement à l'essai,
    /// `stableBrain` la dernière version dont la fitness mesurée de la
    /// lignée a confirmé qu'elle n'était pas pire.
    struct LineageBrain
    {
        NEAT::NEATGenome brain;
        NEAT::NEATGenome stableBrain;
        double fitnessAtCheckpoint = 0.0;
        bool hasCheckpoint = false;

        LineageBrain(NEAT::NEATGenome initial)
            : brain(initial), stableBrain(std::move(initial)) {}
    };

    struct WorldSimulationParameters
    {
        int gridWidth = 12;
        int gridHeight = 9;
        double cellSize = 10.0; ///< Unités continues par case de grille

        Genetics::MutationConfig mutation{};
        Genetics::CrossoverConfig crossover{};

        /// Distance génétique moyenne (0..1) au-delà de laquelle deux
        /// sous-groupes régionaux d'une même espèce sont considérés en
        /// divergence.
        double speciationDistanceThreshold = 0.30;
        /// Nombre de générations consécutives de divergence soutenue
        /// avant qu'une scission d'espèce ne soit déclenchée. Une
        /// approximation volontairement simple de l'isolement
        /// reproducteur (voir docs/UNIFIED_ENGINE_DESIGN.md) : on ne
        /// modélise pas de graphe de migration individuel, seulement la
        /// persistance mesurée de la divergence.
        uint32_t speciationIsolationGenerations = 10;

        uint32_t maxAttemptsPerConstraintRetry = 3;

        /// Nombre d'entrées/sorties du cerveau NEAT de chaque lignée : voir
        /// buildBrainInputs()/applyBrainOutputs() pour ce qu'elles
        /// signifient concrètement.
        static constexpr uint32_t brainInputCount = 7;
        static constexpr uint32_t brainOutputCount = 2;

        /// Tous les combien de générations un cerveau de lignée est
        /// réévalué : sa fitness mesurée sur la fenêtre écoulée décide si
        /// la mutation à l'essai est gardée ou annulée (évolution (1+1)).
        uint32_t brainEvolutionInterval = 8;

        NEAT::NEATConfig neat{};
    };

    /// @brief Moteur de simulation unifié : individus réels, espace réel,
    /// taxonomie réelle. Voir docs/UNIFIED_ENGINE_DESIGN.md pour la
    /// conception complète et ce que les phases suivantes y ajouteront
    /// (interactions écologiques à granularité fine, comportement piloté
    /// par NEAT, exposition via serina_cli).
    class UnifiedWorldSimulator
    {
    public:
        explicit UnifiedWorldSimulator(WorldSimulationParameters params = {},
                                        uint32_t seed = std::random_device{}())
            : params_(params), grid_(params.gridWidth, params.gridHeight, seed),
              environments_(seed), rng_(seed)
        {
        }

        /// @brief Peuple le monde avec les cinq lignées fondatrices de
        /// Serina, chacune placée dans un biome cohérent avec sa biologie,
        /// avec une population initiale de vrais individus à génome
        /// diploïde.
        void seedFounderSpecies(uint32_t individualsPerFounder = 40)
        {
            struct Founder
            {
                std::string commonName;
                Taxonomy::BiologicalType type;
                Ecosystem::EnvironmentType preferredBiome;
            };

            static const Founder founders[] = {
                {"Serinus canaria", Taxonomy::BiologicalType::BIRD, Ecosystem::EnvironmentType::GRASSLAND},
                {"Xiphophorus hellerii", Taxonomy::BiologicalType::FISH, Ecosystem::EnvironmentType::FRESHWATER},
                {"Gryllus seriensis", Taxonomy::BiologicalType::ARTHROPOD, Ecosystem::EnvironmentType::GRASSLAND},
                {"Solenopsis invicta", Taxonomy::BiologicalType::ARTHROPOD, Ecosystem::EnvironmentType::FOREST},
                {"Achatina fulica", Taxonomy::BiologicalType::MOLLUSC, Ecosystem::EnvironmentType::WETLAND},
            };

            for (const auto &founder : founders)
            {
                biologicalTypeOf_[founder.commonName] = founder.type;
                ensureBrain(founder.commonName);

                auto candidateRegions = grid_.regionsOfType(founder.preferredBiome);
                if (candidateRegions.empty())
                    candidateRegions = {{0, 0}}; // biome absent de cette carte : repli sur l'origine

                std::uniform_int_distribution<size_t> regionPick(0, candidateRegions.size() - 1);

                for (uint32_t i = 0; i < individualsPerFounder; ++i)
                {
                    auto [gx, gy] = candidateRegions[regionPick(rng_)];
                    auto genome = std::make_unique<Genetics::AdvancedGenome>(generation_);
                    Evolution::Organism organism(std::move(genome), founder.commonName);
                    placeInRegion(organism, gx, gy);
                    organism.setEnergy(100.0);
                    population_.push_back(std::move(organism));
                }
            }
        }

        /// @brief Avance la simulation d'une génération réelle : mouvement,
        /// métabolisme + interactions écologiques régionales, reproduction
        /// contrainte biologiquement, vérification de spéciation par
        /// divergence mesurée, extinction.
        void step()
        {
            ++generation_;
            moveOrganisms();
            applySurvivalAndInteractions();
            removeDead();
            reproduce();
            checkSpeciation();
            checkExtinction();

            if (generation_ % params_.brainEvolutionInterval == 0)
                evolveBrains();
        }

        uint32_t getGeneration() const { return generation_; }
        size_t getPopulationCount() const { return population_.size(); }
        const Spatial::RegionGrid &getGrid() const { return grid_; }

        /// @brief Unités continues par case de grille : le facteur dont un
        /// consommateur externe (le daemon, un frontend) a besoin pour
        /// replacer une position d'individu (continue) sur la grille de
        /// régions (discrète) sans dupliquer cette constante.
        double getCellSize() const { return params_.cellSize; }
        const std::vector<SpeciationEvent> &getSpeciationEvents() const { return speciationEvents_; }

        /// @brief Un instantané par espèce vivante, calculé depuis les
        /// individus réels (jamais un tirage aléatoire).
        std::vector<LineageSnapshot> getLineageSnapshots() const
        {
            return buildSnapshots();
        }

        bool hasBrain(const std::string &species) const { return brains_.find(species) != brains_.end(); }

        /// @brief Nombre de nœuds + connexions du cerveau stable d'une
        /// lignée — utile pour vérifier qu'une mutation structurelle
        /// (addNode/addConnection) a bien eu lieu au fil des générations.
        size_t getBrainComplexity(const std::string &species) const
        {
            auto it = brains_.find(species);
            return it != brains_.end() ? it->second.stableBrain.getComplexity() : 0;
        }

        /// @brief Un instantané par case de la carte, avec le compte réel
        /// d'individus vivants dedans à cet instant — pour dessiner une
        /// vraie carte de régions plutôt qu'un seul environnement global.
        std::vector<RegionSnapshot> getRegionSnapshots() const
        {
            auto counts = populationCountsByRegion();

            std::vector<RegionSnapshot> result;
            result.reserve(static_cast<size_t>(grid_.getWidth()) * grid_.getHeight());
            for (int y = 0; y < grid_.getHeight(); ++y)
            {
                for (int x = 0; x < grid_.getWidth(); ++x)
                {
                    const auto &cell = grid_.at(x, y);
                    RegionSnapshot snap;
                    snap.gridX = x;
                    snap.gridY = y;
                    snap.environmentType = cell.environmentType;
                    const auto *env = environments_.getEnvironment(cell.environmentType);
                    if (env)
                    {
                        snap.environmentName = env->name;
                        snap.temperature = env->climate.temperature;
                        snap.primaryProducers = env->resources.primaryProducers;
                        snap.predationPressure = env->pressures.predationPressure;
                        snap.competitionIntensity = env->pressures.competitionIntensity;
                        snap.climaticStress = env->pressures.climaticStress;
                    }
                    auto it = counts.find(regionKey(x, y));
                    snap.population = (it != counts.end()) ? it->second : 0;
                    result.push_back(std::move(snap));
                }
            }
            return result;
        }

        /// @brief Un instantané par individu vivant réel — position,
        /// espèce, énergie, âge — pour un frontend qui veut afficher chaque
        /// organisme sur la carte plutôt qu'un agrégat par espèce.
        std::vector<IndividualSnapshot> getIndividualSnapshots() const
        {
            std::vector<IndividualSnapshot> result;
            result.reserve(population_.size());
            for (const auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;
                IndividualSnapshot snap;
                snap.id = organism.getId();
                snap.species = organism.getSpecies();
                snap.x = organism.getX();
                snap.y = organism.getY();
                snap.energy = organism.getEnergy();
                snap.age = organism.getAge();
                result.push_back(std::move(snap));
            }
            return result;
        }

    private:
        WorldSimulationParameters params_;
        Spatial::RegionGrid grid_;
        Environment::SerinaEnvironmentManager environments_;
        Taxonomy::EcosystemTaxonomy taxonomy_;
        Ecology::EcologicalInteractionManager interactions_;
        Evolution::SerinaEvolutionaryConstraints constraints_;

        std::vector<Evolution::Organism> population_;
        std::unordered_map<std::string, Taxonomy::BiologicalType> biologicalTypeOf_;
        std::unordered_map<std::string, uint32_t> divergentStreak_; ///< par espèce
        std::unordered_map<std::string, LineageBrain> brains_;      ///< un cerveau NEAT par espèce vivante
        std::vector<SpeciationEvent> speciationEvents_;

        uint32_t generation_ = 0;
        mutable std::mt19937 rng_;

        double worldWidth() const { return params_.gridWidth * params_.cellSize; }
        double worldHeight() const { return params_.gridHeight * params_.cellSize; }

        std::pair<int, int> regionOf(const Evolution::Organism &o) const
        {
            return grid_.positionToGrid(o.getX(), o.getY(), worldWidth(), worldHeight());
        }

        void placeInRegion(Evolution::Organism &organism, int gx, int gy)
        {
            std::uniform_real_distribution<double> jitter(0.0, params_.cellSize);
            organism.setPosition(gx * params_.cellSize + jitter(rng_), gy * params_.cellSize + jitter(rng_));
        }

        /// @brief Déplace chaque organisme selon la décision de sa lignée :
        /// le cerveau NEAT de son espèce évalue son environnement local
        /// (énergie, ressources alentour, pression de prédation) et sort
        /// une direction. Un individu sans cerveau enregistré (ne devrait
        /// pas arriver hors tests unitaires isolés) se rabat sur une
        /// marche aléatoire plutôt que de planter.
        void moveOrganisms()
        {
            std::uniform_real_distribution<double> fallback(-params_.cellSize * 0.5, params_.cellSize * 0.5);

            for (auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;

                double dx, dy;
                auto brainIt = brains_.find(organism.getSpecies());
                if (brainIt != brains_.end())
                {
                    auto inputs = buildBrainInputs(organism);
                    auto outputs = brainIt->second.brain.evaluate(inputs);
                    // Les neurones de sortie de NEATGenome utilisent
                    // l'activation SIGMOID par défaut (image [0,1]) ; on
                    // remet à l'échelle [-1,1] nous-mêmes plutôt que de
                    // modifier NEAT.hpp pour un besoin propre à cet appelant.
                    double moveX = outputs[0] * 2.0 - 1.0;
                    double moveY = outputs[1] * 2.0 - 1.0;
                    double speed = organism.getGenome().getTrait(Genetics::TraitType::SPEED);
                    dx = moveX * params_.cellSize * speed;
                    dy = moveY * params_.cellSize * speed;
                }
                else
                {
                    dx = fallback(rng_);
                    dy = fallback(rng_);
                }

                double nx = std::clamp(organism.getX() + dx, 0.0, worldWidth() - 1e-6);
                double ny = std::clamp(organism.getY() + dy, 0.0, worldHeight() - 1e-6);
                organism.setPosition(nx, ny);
            }
        }

        /// @brief Construit les entrées sensorielles d'un organisme pour
        /// son cerveau de lignée : énergie propre, ressources locales et
        /// des quatre régions voisines (le signal dont le réseau a besoin
        /// pour apprendre "aller vers plus de ressources"), pression de
        /// prédation locale. Toutes normalisées dans [0,1].
        std::vector<double> buildBrainInputs(const Evolution::Organism &organism) const
        {
            auto [gx, gy] = regionOf(organism);
            const auto *localEnv = environments_.getEnvironment(grid_.at(gx, gy).environmentType);
            double localResource = localEnv ? localEnv->resources.primaryProducers : 0.5;
            double localPredation = localEnv ? localEnv->pressures.predationPressure : 0.3;

            // N, S, E, W — retombe sur la ressource locale (gradient nul)
            // si la région est en bord de carte.
            std::array<double, 4> neighborResources = {localResource, localResource, localResource, localResource};
            const std::array<std::pair<int, int>, 4> offsets = {{{0, -1}, {0, 1}, {1, 0}, {-1, 0}}};
            for (size_t i = 0; i < offsets.size(); ++i)
            {
                int nx = gx + offsets[i].first;
                int ny = gy + offsets[i].second;
                if (nx < 0 || nx >= grid_.getWidth() || ny < 0 || ny >= grid_.getHeight())
                    continue;
                const auto *neighborEnv = environments_.getEnvironment(grid_.at(nx, ny).environmentType);
                if (neighborEnv)
                    neighborResources[i] = neighborEnv->resources.primaryProducers;
            }

            return {
                std::clamp(organism.getEnergy() / 200.0, 0.0, 1.0),
                localResource,
                neighborResources[0], neighborResources[1], neighborResources[2], neighborResources[3],
                localPredation};
        }

        void applySurvivalAndInteractions()
        {
            // Compte la population de chaque espèce par région, pour que
            // les interactions écologiques (prédation, compétition...)
            // réagissent à qui est réellement présent localement plutôt
            // qu'à un total global.
            std::unordered_map<long long, std::unordered_map<std::string, uint32_t>> regionSpeciesCounts;
            for (const auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;
                auto [gx, gy] = regionOf(organism);
                regionSpeciesCounts[regionKey(gx, gy)][organism.getSpecies()]++;
            }

            for (auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;

                organism.update(1.0); // métabolisme, âge — logique existante d'Organism

                auto [gx, gy] = regionOf(organism);
                auto environmentType = grid_.at(gx, gy).environmentType;
                const auto &localCounts = regionSpeciesCounts[regionKey(gx, gy)];

                double energyDelta = 0.0;
                for (const auto &interaction : interactions_.getSpeciesInteractions(organism.getSpecies()))
                {
                    const std::string &partner =
                        (interaction.speciesA == organism.getSpecies()) ? interaction.speciesB : interaction.speciesA;
                    auto it = localCounts.find(partner);
                    uint32_t partnerPopulation = (it != localCounts.end()) ? it->second : 0;
                    if (partnerPopulation == 0)
                        continue;

                    energyDelta += interactions_.calculatePopulationImpact(interaction, environmentType, partnerPopulation) * 10.0;
                }

                if (energyDelta != 0.0)
                    organism.setEnergy(organism.getEnergy() + energyDelta);
            }
        }

        void removeDead()
        {
            population_.erase(
                std::remove_if(population_.begin(), population_.end(),
                                [](const Evolution::Organism &o) { return !o.isAlive(); }),
                population_.end());
        }

        void reproduce()
        {
            // Regroupe les reproducteurs potentiels par (région, espèce) :
            // seuls des individus de la même espèce, dans la même région,
            // se reproduisent ensemble.
            std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> candidates;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                if (!population_[i].canReproduce())
                    continue;
                auto [gx, gy] = regionOf(population_[i]);
                candidates[regionKey(gx, gy)][population_[i].getSpecies()].push_back(i);
            }

            std::vector<Evolution::Organism> offspring;
            std::uniform_real_distribution<double> crossoverChance(0.0, 1.0);

            for (auto &[key, bySpecies] : candidates)
            {
                for (auto &[species, indices] : bySpecies)
                {
                    if (indices.size() < 2)
                        continue;
                    std::shuffle(indices.begin(), indices.end(), rng_);

                    for (size_t i = 0; i + 1 < indices.size(); i += 2)
                    {
                        if (crossoverChance(rng_) > params_.crossover.crossoverRate)
                            continue;

                        auto &parent1 = population_[indices[i]];
                        auto &parent2 = population_[indices[i + 1]];

                        auto child = tryReproduce(parent1, parent2, species);
                        if (child)
                        {
                            parent1.setEnergy(parent1.getEnergy() - 30.0);
                            parent2.setEnergy(parent2.getEnergy() - 30.0);
                            offspring.push_back(std::move(*child));
                        }
                    }
                }
            }

            for (auto &child : offspring)
                population_.push_back(std::move(child));
        }

        /// @brief Croise et mute deux parents, en re-tirant la mutation si
        /// elle viole les contraintes biologiques du groupe (jusqu'à
        /// params_.maxAttemptsPerConstraintRetry fois), plutôt que
        /// d'accepter silencieusement une descendance biologiquement
        /// implausible.
        std::optional<Evolution::Organism> tryReproduce(const Evolution::Organism &parent1,
                                                          const Evolution::Organism &parent2,
                                                          const std::string &species)
        {
            auto typeIt = biologicalTypeOf_.find(species);
            Taxonomy::BiologicalType biologicalType =
                (typeIt != biologicalTypeOf_.end()) ? typeIt->second : Taxonomy::BiologicalType::BIRD;

            auto originalTraits = toTraitValues(parent1.getGenome());

            for (uint32_t attempt = 0; attempt < params_.maxAttemptsPerConstraintRetry; ++attempt)
            {
                auto childGenome = std::make_unique<Genetics::AdvancedGenome>(
                    parent1.getGenome().crossover(parent2.getGenome(), params_.crossover));
                childGenome->mutate(params_.mutation);

                auto mutatedTraits = toTraitValues(*childGenome);
                if (constraints_.validateMutation(species, originalTraits, mutatedTraits, biologicalType))
                {
                    Evolution::Organism child(std::move(childGenome), species);
                    double midX = (parent1.getX() + parent2.getX()) * 0.5;
                    double midY = (parent1.getY() + parent2.getY()) * 0.5;
                    child.setPosition(midX, midY);
                    child.setEnergy(40.0);
                    return child;
                }
            }
            return std::nullopt; // toutes les tentatives ont violé les contraintes : pas de descendance ce tour-ci
        }

        /// @brief Vérifie, pour chaque espèce présente dans plusieurs
        /// régions, si ses deux plus grands sous-groupes régionaux ont
        /// divergé génétiquement au-delà du seuil de façon soutenue — et
        /// scinde une nouvelle espèce le cas échéant, avec un vrai nom
        /// taxonomique.
        void checkSpeciation()
        {
            auto byRegionAndSpecies = groupByRegionAndSpecies();

            for (auto &[species, regionGroups] : bySpeciesRegionIndex(byRegionAndSpecies))
            {
                if (regionGroups.size() < 2)
                {
                    divergentStreak_[species] = 0;
                    continue;
                }

                // Les deux plus grands sous-groupes régionaux.
                std::vector<std::pair<long long, std::vector<size_t>>> sorted(regionGroups.begin(), regionGroups.end());
                std::sort(sorted.begin(), sorted.end(),
                          [](const auto &a, const auto &b) { return a.second.size() > b.second.size(); });

                const auto &groupA = sorted[0].second;
                const auto &groupB = sorted[1].second;
                if (groupA.size() < 3 || groupB.size() < 3)
                {
                    divergentStreak_[species] = 0;
                    continue;
                }

                double distance = averageInterGroupDistance(groupA, groupB);

                if (distance >= params_.speciationDistanceThreshold)
                    divergentStreak_[species]++;
                else
                    divergentStreak_[species] = 0;

                if (divergentStreak_[species] >= params_.speciationIsolationGenerations)
                {
                    performSpeciation(species, groupB, distance);
                    divergentStreak_[species] = 0;
                }
            }
        }

        void performSpeciation(const std::string &parentSpecies, const std::vector<size_t> &splittingGroup, double distance)
        {
            auto typeIt = biologicalTypeOf_.find(parentSpecies);
            Taxonomy::BiologicalType biologicalType =
                (typeIt != biologicalTypeOf_.end()) ? typeIt->second : Taxonomy::BiologicalType::BIRD;

            std::string newName = taxonomy_.registerNewSpecies(biologicalType, {}, "", parentSpecies);
            biologicalTypeOf_[newName] = biologicalType;

            for (size_t idx : splittingGroup)
                population_[idx].setSpecies(newName);

            interactions_.evolveInteractions(parentSpecies, newName);

            // Le comportement diverge en même temps que le génome : la
            // nouvelle lignée hérite du cerveau (stable, éprouvé) du
            // parent, puis mute — pas un cerveau neuf au hasard.
            auto parentBrainIt = brains_.find(parentSpecies);
            if (parentBrainIt != brains_.end())
            {
                LineageBrain newBrain(parentBrainIt->second.stableBrain);
                newBrain.brain.mutateWeights(params_.neat);
                brains_.emplace(newName, std::move(newBrain));
            }
            else
            {
                ensureBrain(newName);
            }

            speciationEvents_.push_back({parentSpecies, newName, generation_, distance});
        }

        void checkExtinction()
        {
            auto counts = populationCountsBySpecies();
            for (auto it = brains_.begin(); it != brains_.end();)
            {
                if (counts.find(it->first) == counts.end())
                {
                    divergentStreak_.erase(it->first);
                    it = brains_.erase(it);
                }
                else
                {
                    ++it;
                }
            }
        }

        void ensureBrain(const std::string &species)
        {
            if (brains_.find(species) != brains_.end())
                return;
            NEAT::NEATGenome genome(WorldSimulationParameters::brainInputCount,
                                     WorldSimulationParameters::brainOutputCount,
                                     static_cast<uint32_t>(rng_()));
            brains_.emplace(species, LineageBrain(std::move(genome)));
        }

        /// @brief Réévalue chaque cerveau de lignée tous les
        /// params_.brainEvolutionInterval générations : une évolution
        /// (1+1) sur le génome NEAT, avec la fitness réellement mesurée de
        /// la lignée comme seul juge. Le candidat à l'essai (`brain`) est
        /// gardé s'il n'a pas fait baisser la fitness depuis le dernier
        /// point de contrôle, sinon on revient à la dernière version
        /// stable — puis un nouveau candidat est proposé pour la fenêtre
        /// suivante.
        void evolveBrains()
        {
            auto snapshots = buildSnapshots();
            std::unordered_map<std::string, double> fitnessBySpecies;
            for (const auto &snap : snapshots)
                fitnessBySpecies[snap.speciesName] = snap.averageFitness;

            std::uniform_real_distribution<double> chance(0.0, 1.0);

            for (auto &[species, lineageBrain] : brains_)
            {
                auto fitnessIt = fitnessBySpecies.find(species);
                if (fitnessIt == fitnessBySpecies.end())
                    continue; // espèce sans individus ce tour-ci (rare, entre reproduce() et le prochain step)
                double currentFitness = fitnessIt->second;

                if (lineageBrain.hasCheckpoint && currentFitness < lineageBrain.fitnessAtCheckpoint)
                {
                    // Le candidat a fait moins bien : on revient à la version stable.
                    lineageBrain.brain = lineageBrain.stableBrain;
                }
                else
                {
                    // Le candidat a tenu (ou amélioré) la fitness : il devient la nouvelle référence.
                    lineageBrain.stableBrain = lineageBrain.brain;
                }

                lineageBrain.fitnessAtCheckpoint = currentFitness;
                lineageBrain.hasCheckpoint = true;

                // Nouveau candidat pour la prochaine fenêtre : toujours une
                // perturbation de poids, rarement un changement structurel
                // (taux définis par params_.neat, pas de constante dupliquée
                // ici).
                lineageBrain.brain.mutateWeights(params_.neat);
                if (chance(rng_) < params_.neat.addConnectionMutationRate)
                    lineageBrain.brain.addConnection(params_.neat);
                if (chance(rng_) < params_.neat.addNodeMutationRate)
                    lineageBrain.brain.addNode(params_.neat);
            }
        }

        // --- Regroupements utilitaires (recalculés depuis population_, jamais mis en cache séparément) ---

        long long regionKey(int gx, int gy) const { return static_cast<long long>(gx) * 100000 + gy; }

        std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> groupByRegionAndSpecies() const
        {
            std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> result;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                auto [gx, gy] = regionOf(population_[i]);
                result[regionKey(gx, gy)][population_[i].getSpecies()].push_back(i);
            }
            return result;
        }

        std::unordered_map<std::string, std::unordered_map<long long, std::vector<size_t>>>
        bySpeciesRegionIndex(const std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> &byRegion) const
        {
            std::unordered_map<std::string, std::unordered_map<long long, std::vector<size_t>>> result;
            for (const auto &[region, bySpecies] : byRegion)
                for (const auto &[species, indices] : bySpecies)
                    result[species][region] = indices;
            return result;
        }

        double averageInterGroupDistance(const std::vector<size_t> &groupA, const std::vector<size_t> &groupB) const
        {
            double total = 0.0;
            size_t comparisons = 0;
            // Échantillonne pour rester borné même si les groupes sont grands.
            size_t sampleA = std::min<size_t>(groupA.size(), 15);
            size_t sampleB = std::min<size_t>(groupB.size(), 15);
            for (size_t i = 0; i < sampleA; ++i)
            {
                for (size_t j = 0; j < sampleB; ++j)
                {
                    total += population_[groupA[i]].getGenome().geneticDistance(population_[groupB[j]].getGenome());
                    comparisons++;
                }
            }
            return comparisons > 0 ? total / comparisons : 0.0;
        }

        std::unordered_map<std::string, uint32_t> populationCountsBySpecies() const
        {
            std::unordered_map<std::string, uint32_t> counts;
            for (const auto &organism : population_)
                counts[organism.getSpecies()]++;
            return counts;
        }

        std::unordered_map<long long, uint32_t> populationCountsByRegion() const
        {
            std::unordered_map<long long, uint32_t> counts;
            for (const auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;
                auto [gx, gy] = regionOf(organism);
                counts[regionKey(gx, gy)]++;
            }
            return counts;
        }

        std::vector<LineageSnapshot> buildSnapshots() const
        {
            std::unordered_map<std::string, std::vector<size_t>> bySpecies;
            for (size_t i = 0; i < population_.size(); ++i)
                bySpecies[population_[i].getSpecies()].push_back(i);

            std::vector<LineageSnapshot> snapshots;
            snapshots.reserve(bySpecies.size());

            for (const auto &[species, indices] : bySpecies)
            {
                LineageSnapshot snap;
                snap.speciesName = species;
                auto typeIt = biologicalTypeOf_.find(species);
                snap.biologicalType = (typeIt != biologicalTypeOf_.end()) ? typeIt->second : Taxonomy::BiologicalType::BIRD;
                snap.population = static_cast<uint32_t>(indices.size());

                double fitnessSum = 0.0;
                for (size_t idx : indices)
                    fitnessSum += population_[idx].calculateFitness();
                snap.averageFitness = indices.empty() ? 0.0 : fitnessSum / indices.size();

                // Diversité génétique réelle : distance moyenne échantillonnée
                // entre paires d'individus de cette espèce.
                double distanceSum = 0.0;
                size_t comparisons = 0;
                size_t sampleSize = std::min<size_t>(indices.size(), 20);
                for (size_t i = 0; i < sampleSize; ++i)
                {
                    for (size_t j = i + 1; j < sampleSize; ++j)
                    {
                        distanceSum += population_[indices[i]].getGenome().geneticDistance(population_[indices[j]].getGenome());
                        comparisons++;
                    }
                }
                snap.geneticDiversity = comparisons > 0 ? distanceSum / comparisons : 0.0;

                std::unordered_map<long long, bool> regions;
                for (size_t idx : indices)
                {
                    auto [gx, gy] = regionOf(population_[idx]);
                    regions[regionKey(gx, gy)] = true;
                }
                snap.regionsOccupied = static_cast<uint32_t>(regions.size());

                snapshots.push_back(std::move(snap));
            }

            return snapshots;
        }

        static Genetics::AdvancedTraitValues toTraitValues(const Genetics::AdvancedGenome &genome)
        {
            Genetics::AdvancedTraitValues values;
            values.size = genome.getTrait(Genetics::TraitType::SIZE);
            values.speed = genome.getTrait(Genetics::TraitType::SPEED);
            values.energyEfficiency = genome.getTrait(Genetics::TraitType::ENERGY_EFFICIENCY);
            values.reproductionRate = genome.getTrait(Genetics::TraitType::REPRODUCTION_RATE);
            values.aggression = genome.getTrait(Genetics::TraitType::AGGRESSION);
            values.intelligence = genome.getTrait(Genetics::TraitType::INTELLIGENCE);
            values.longevity = genome.getTrait(Genetics::TraitType::LONGEVITY);
            values.resistance = genome.getTrait(Genetics::TraitType::RESISTANCE);
            values.visionRange = genome.getTrait(Genetics::TraitType::VISION_RANGE);
            values.hearingAcuity = genome.getTrait(Genetics::TraitType::HEARING_ACUITY);
            values.camouflage = genome.getTrait(Genetics::TraitType::CAMOUFLAGE);
            values.socialBehavior = genome.getTrait(Genetics::TraitType::SOCIAL_BEHAVIOR);
            values.fertility = values.reproductionRate;
            values.neuralComplexity = values.intelligence;
            values.sensoryAcuity = values.hearingAcuity;
            return values;
        }
    };

} // namespace Serina::Simulation
