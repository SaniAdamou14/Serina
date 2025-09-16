#pragma once

#include <vector>
#include <string>
#include <sstream>
#include <unordered_map>
#include <random>
#include <memory>
#include <optional>
#include <algorithm>
#include <numeric>
#include <cmath>
#include <array>

namespace Serina::Genetics
{

    /// @brief Enum des différents traits génétiques avec leurs propriétés
    enum class TraitType : uint8_t
    {
        SIZE = 0,          ///< Taille de l'organisme [0.1-2.0]
        SPEED,             ///< Vitesse de déplacement [0.1-3.0]
        ENERGY_EFFICIENCY, ///< Efficacité énergétique [0.3-1.0]
        REPRODUCTION_RATE, ///< Taux de reproduction [0.1-1.0]
        AGGRESSION,        ///< Niveau d'agressivité [0.0-1.0]
        INTELLIGENCE,      ///< Capacité cognitive [0.2-1.0]
        LONGEVITY,         ///< Espérance de vie [0.5-2.0]
        RESISTANCE,        ///< Résistance aux maladies [0.1-1.0]
        VISION_RANGE,      ///< Portée de vision [0.5-5.0]
        HEARING_ACUITY,    ///< Acuité auditive [0.1-3.0]
        CAMOUFLAGE,        ///< Capacité de camouflage [0.0-1.0]
        SOCIAL_BEHAVIOR,   ///< Comportement social [0.0-1.0]
        TRAIT_COUNT        ///< Nombre total de traits
    };

    /// @brief Structure simple pour stocker les valeurs de traits
    struct AdvancedTraitValues
    {
        double size = 1.0;
        double speed = 1.0;
        double energyEfficiency = 1.0;
        double reproductionRate = 1.0;
        double aggression = 1.0;
        double intelligence = 1.0;
        double longevity = 1.0;
        double resistance = 1.0;
        double visionRange = 1.0;
        double hearingAcuity = 1.0;
        double camouflage = 1.0;
        double socialBehavior = 1.0;

        // Extensions pour compatibilité avec le simulateur
        double fertility = 1.0;          // Alias pour reproductionRate
        double neuralComplexity = 1.0;   // Alias pour intelligence
        double sensoryAcuity = 1.0;      // Alias pour hearingAcuity
    };

    /// @brief Configuration des bornes pour chaque trait
    struct TraitBounds
    {
        double min, max, defaultValue;
        constexpr TraitBounds(double min, double max, double def)
            : min(min), max(max), defaultValue(def) {}
    };

    /// @brief Carte des bornes pour chaque trait
    constexpr std::array<TraitBounds, static_cast<size_t>(TraitType::TRAIT_COUNT)> TRAIT_BOUNDS = {{
        {0.1, 2.0, 0.8}, // SIZE
        {0.1, 3.0, 1.0}, // SPEED
        {0.3, 1.0, 0.7}, // ENERGY_EFFICIENCY
        {0.1, 1.0, 0.5}, // REPRODUCTION_RATE
        {0.0, 1.0, 0.3}, // AGGRESSION
        {0.2, 1.0, 0.6}, // INTELLIGENCE
        {0.5, 2.0, 1.0}, // LONGEVITY
        {0.1, 1.0, 0.5}, // RESISTANCE
        {0.5, 5.0, 2.0}, // VISION_RANGE
        {0.1, 3.0, 1.0}, // HEARING_ACUITY
        {0.0, 1.0, 0.2}, // CAMOUFLAGE
        {0.0, 1.0, 0.4}  // SOCIAL_BEHAVIOR
    }};

    /// @brief Allèle représentant une version d'un trait
    struct Allele
    {
        double value;        ///< Valeur du trait [0.0-1.0] normalisée
        double dominance;    ///< Niveau de dominance [0.0-1.0]
        bool isDominant;     ///< Marqueur de dominance booléenne
        uint32_t generation; ///< Génération d'apparition de l'allèle

        Allele(double v = 0.5, double d = 0.5, bool dom = false, uint32_t gen = 0)
            : value(std::clamp(v, 0.0, 1.0)), dominance(d), isDominant(dom), generation(gen) {}

        /// @brief Compare deux allèles pour tri par dominance
        bool operator>(const Allele &other) const
        {
            return dominance > other.dominance;
        }
    };

    /// @brief Trait génétique avec paire d'allèles (diploïde)
    struct GeneticTrait
    {
        TraitType type;
        std::pair<Allele, Allele> alleles; ///< Paire d'allèles (maternel, paternel)

        GeneticTrait(TraitType t = TraitType::SIZE) : type(t)
        {
            const auto &bounds = TRAIT_BOUNDS[static_cast<size_t>(t)];
            double normalizedDefault = (bounds.defaultValue - bounds.min) / (bounds.max - bounds.min);
            alleles.first = Allele(normalizedDefault);
            alleles.second = Allele(normalizedDefault);
        }

        GeneticTrait(TraitType t, const Allele &maternal, const Allele &paternal)
            : type(t), alleles(maternal, paternal) {}

        /// @brief Calcule la valeur phénotypique en tenant compte de la dominance
        double getPhenotype() const
        {
            const auto &[maternal, paternal] = alleles;

            // Dominance simple : l'allèle le plus dominant l'emporte
            if (std::abs(maternal.dominance - paternal.dominance) > 0.1)
            {
                return maternal.dominance > paternal.dominance ? maternal.value : paternal.value;
            }

            // Co-dominance : moyenne pondérée
            double totalDominance = maternal.dominance + paternal.dominance;
            if (totalDominance > 0.0)
            {
                return (maternal.value * maternal.dominance + paternal.value * paternal.dominance) / totalDominance;
            }

            return (maternal.value + paternal.value) * 0.5;
        }

        /// @brief Convertit la valeur normalisée en valeur réelle selon les bornes du trait
        double getRealValue() const
        {
            const auto &bounds = TRAIT_BOUNDS[static_cast<size_t>(type)];
            double phenotype = getPhenotype();
            return bounds.min + phenotype * (bounds.max - bounds.min);
        }
    };

    /// @brief Configuration des paramètres de mutation
    struct MutationConfig
    {
        double mutationRate = 0.02;          ///< Taux de mutation global (2%)
        double gaussianStdDev = 0.05;        ///< Écart-type pour mutations gaussiennes
        double dominanceMutationRate = 0.01; ///< Taux de mutation de dominance
        double newAlleleProbability = 0.001; ///< Probabilité d'apparition nouvel allèle
        double lethalMutationRate = 0.0001;  ///< Taux de mutations létales
    };

    /// @brief Configuration pour sélection naturelle
    struct SelectionConfig
    {
        enum class Method
        {
            ROULETTE_WHEEL,
            TOURNAMENT,
            RANK_BASED,
            ELITIST
        };

        Method selectionMethod = Method::TOURNAMENT;
        size_t tournamentSize = 3;      ///< Taille tournoi pour sélection
        double elitismRate = 0.05;      ///< Pourcentage d'élite à conserver
        double fitnessScaling = 1.0;    ///< Facteur d'échelle fitness
        bool useFitnessSharing = false; ///< Partage de fitness pour diversité
    };

    /// @brief Configuration pour croisement génétique
    struct CrossoverConfig
    {
        enum class Method
        {
            ONE_POINT,
            TWO_POINT,
            UNIFORM,
            BLEND_ALPHA,
            SIMULATED_BINARY
        };

        Method crossoverMethod = Method::BLEND_ALPHA;
        double crossoverRate = 0.8;      ///< Probabilité de croisement
        double blendAlpha = 0.5;         ///< Paramètre α pour BLX-α
        double distributionIndex = 20.0; ///< Index pour SBX
    };

    /// @brief Génome complet d'un organisme
    class AdvancedGenome
    {
    private:
        std::vector<GeneticTrait> traits_;
        uint32_t generation_;
        std::string lineageId_;
        double fitness_;
        mutable std::optional<std::unordered_map<TraitType, double>> phenotypeCache_;

        static std::mt19937 &getRandomEngine()
        {
            thread_local std::mt19937 engine(std::random_device{}());
            return engine;
        }

    public:
        /// @brief Constructeur par défaut avec traits aléatoires
        AdvancedGenome(uint32_t generation = 0) : generation_(generation), fitness_(0.0)
        {
            initializeRandomTraits();
            generateLineageId();
        }

        /// @brief Constructeur avec traits spécifiques
        AdvancedGenome(const std::vector<GeneticTrait> &traits, uint32_t generation = 0)
            : traits_(traits), generation_(generation), fitness_(0.0)
        {
            ensureAllTraits();
            generateLineageId();
        }

        /// @brief Initialise tous les traits avec des valeurs aléatoires
        void initializeRandomTraits()
        {
            traits_.clear();
            traits_.reserve(static_cast<size_t>(TraitType::TRAIT_COUNT));

            auto &rng = getRandomEngine();
            std::uniform_real_distribution<double> valueDist(0.0, 1.0);
            std::uniform_real_distribution<double> dominanceDist(0.0, 1.0);

            for (size_t i = 0; i < static_cast<size_t>(TraitType::TRAIT_COUNT); ++i)
            {
                TraitType type = static_cast<TraitType>(i);

                Allele maternal(valueDist(rng), dominanceDist(rng), false, generation_);
                Allele paternal(valueDist(rng), dominanceDist(rng), false, generation_);

                traits_.emplace_back(type, maternal, paternal);
            }
        }

        /// @brief S'assure que tous les traits sont présents
        void ensureAllTraits()
        {
            std::vector<bool> present(static_cast<size_t>(TraitType::TRAIT_COUNT), false);

            for (const auto &trait : traits_)
            {
                present[static_cast<size_t>(trait.type)] = true;
            }

            auto &rng = getRandomEngine();
            std::uniform_real_distribution<double> dist(0.0, 1.0);

            for (size_t i = 0; i < present.size(); ++i)
            {
                if (!present[i])
                {
                    TraitType type = static_cast<TraitType>(i);
                    const auto &bounds = TRAIT_BOUNDS[i];
                    double normalizedDefault = (bounds.defaultValue - bounds.min) / (bounds.max - bounds.min);

                    Allele allele1(normalizedDefault + dist(rng) * 0.1 - 0.05);
                    Allele allele2(normalizedDefault + dist(rng) * 0.1 - 0.05);

                    traits_.emplace_back(type, allele1, allele2);
                }
            }
        }

        /// @brief Génère un identifiant unique pour le lignage
        void generateLineageId()
        {
            auto &rng = getRandomEngine();
            std::uniform_int_distribution<uint32_t> dist(0, 0xFFFFFFFF);

            std::stringstream ss;
            ss << std::hex << dist(rng) << "_G" << generation_;
            lineageId_ = ss.str();
        }

        /// @brief Obtient la valeur d'un trait spécifique
        double getTrait(TraitType type) const
        {
            auto it = std::find_if(traits_.begin(), traits_.end(),
                                   [type](const GeneticTrait &trait)
                                   { return trait.type == type; });

            if (it != traits_.end())
            {
                return it->getRealValue();
            }

            // Valeur par défaut si trait non trouvé
            const auto &bounds = TRAIT_BOUNDS[static_cast<size_t>(type)];
            return bounds.defaultValue;
        }

        /// @brief Cache et retourne tous les phénotypes
        const std::unordered_map<TraitType, double> &getPhenotypes() const
        {
            if (!phenotypeCache_)
            {
                phenotypeCache_ = std::unordered_map<TraitType, double>();
                for (const auto &trait : traits_)
                {
                    (*phenotypeCache_)[trait.type] = trait.getRealValue();
                }
            }
            return *phenotypeCache_;
        }

        /// @brief Invalide le cache des phénotypes
        void invalidateCache() { phenotypeCache_.reset(); }

        /// @brief Applique une mutation selon la configuration
        void mutate(const MutationConfig &config)
        {
            auto &rng = getRandomEngine();
            std::uniform_real_distribution<double> probDist(0.0, 1.0);
            std::normal_distribution<double> gaussianDist(0.0, config.gaussianStdDev);

            bool mutated = false;

            for (auto &trait : traits_)
            {
                // Mutation des allèles
                if (probDist(rng) < config.mutationRate)
                {
                    // Muter l'allèle maternel
                    trait.alleles.first.value = std::clamp(
                        trait.alleles.first.value + gaussianDist(rng), 0.0, 1.0);
                    mutated = true;
                }

                if (probDist(rng) < config.mutationRate)
                {
                    // Muter l'allèle paternel
                    trait.alleles.second.value = std::clamp(
                        trait.alleles.second.value + gaussianDist(rng), 0.0, 1.0);
                    mutated = true;
                }

                // Mutation de dominance
                if (probDist(rng) < config.dominanceMutationRate)
                {
                    trait.alleles.first.dominance = std::clamp(
                        trait.alleles.first.dominance + gaussianDist(rng) * 0.1, 0.0, 1.0);
                    mutated = true;
                }

                if (probDist(rng) < config.dominanceMutationRate)
                {
                    trait.alleles.second.dominance = std::clamp(
                        trait.alleles.second.dominance + gaussianDist(rng) * 0.1, 0.0, 1.0);
                    mutated = true;
                }
            }

            if (mutated)
            {
                invalidateCache();
                generation_++;
                generateLineageId();
            }
        }

        /// @brief Applique une mutation et retourne les nouveaux traits
        AdvancedTraitValues mutate(const AdvancedTraitValues& originalTraits, double mutationRate) const
        {
            AdvancedTraitValues mutatedTraits = originalTraits;
            auto &rng = const_cast<std::mt19937&>(getRandomEngine());
            std::uniform_real_distribution<double> probDist(0.0, 1.0);
            std::normal_distribution<double> gaussianDist(0.0, 0.1); // 10% de déviation standard

            // Muter chaque trait avec la probabilité donnée
            if (probDist(rng) < mutationRate) mutatedTraits.size += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.speed += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.energyEfficiency += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.intelligence += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.visionRange += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.socialBehavior += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.resistance += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.aggression += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.fertility += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.longevity += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.neuralComplexity += gaussianDist(rng);
            if (probDist(rng) < mutationRate) mutatedTraits.sensoryAcuity += gaussianDist(rng);

            // Appliquer des limites raisonnables
            auto clamp = [](double& value, double min = 0.1, double max = 3.0) {
                value = std::clamp(value, min, max);
            };

            clamp(mutatedTraits.size);
            clamp(mutatedTraits.speed);
            clamp(mutatedTraits.energyEfficiency);
            clamp(mutatedTraits.intelligence);
            clamp(mutatedTraits.visionRange);
            clamp(mutatedTraits.socialBehavior);
            clamp(mutatedTraits.resistance);
            clamp(mutatedTraits.aggression);
            clamp(mutatedTraits.fertility);
            clamp(mutatedTraits.longevity);
            clamp(mutatedTraits.neuralComplexity);
            clamp(mutatedTraits.sensoryAcuity);

            return mutatedTraits;
        }

        // Getters/Setters
        uint32_t getGeneration() const { return generation_; }
        const std::string &getLineageId() const { return lineageId_; }
        double getFitness() const { return fitness_; }
        void setFitness(double fitness) { fitness_ = fitness; }
        const std::vector<GeneticTrait> &getTraits() const { return traits_; }

        /// @brief Calcule la distance génétique avec un autre génome
        double geneticDistance(const AdvancedGenome &other) const
        {
            double totalDistance = 0.0;
            size_t comparedTraits = 0;

            for (const auto &trait : traits_)
            {
                auto otherTrait = std::find_if(other.traits_.begin(), other.traits_.end(),
                                               [&trait](const GeneticTrait &t)
                                               { return t.type == trait.type; });

                if (otherTrait != other.traits_.end())
                {
                    double phenotypeDiff = std::abs(trait.getPhenotype() - otherTrait->getPhenotype());
                    totalDistance += phenotypeDiff * phenotypeDiff;
                    comparedTraits++;
                }
            }

            return comparedTraits > 0 ? std::sqrt(totalDistance / comparedTraits) : 1.0;
        }

        /// @brief Crée un descendant par croisement avec un autre génome
        AdvancedGenome crossover(const AdvancedGenome &other, const CrossoverConfig &config = CrossoverConfig{}) const
        {
            std::vector<GeneticTrait> offspringTraits;
            offspringTraits.reserve(traits_.size());

            auto &rng = getRandomEngine();
            std::uniform_real_distribution<double> uniform(0.0, 1.0);

            for (size_t i = 0; i < traits_.size(); ++i)
            {
                TraitType type = traits_[i].type;

                // Trouve le trait correspondant dans l'autre parent
                auto otherTraitIt = std::find_if(other.traits_.begin(), other.traits_.end(),
                                                 [type](const GeneticTrait &t)
                                                 { return t.type == type; });

                if (otherTraitIt != other.traits_.end())
                {
                    // Croisement BLX-α
                    const auto &trait1 = traits_[i];
                    const auto &trait2 = *otherTraitIt;

                    // Croisement des allèles maternels
                    double alpha = config.blendAlpha;
                    double val1 = trait1.alleles.first.value;
                    double val2 = trait2.alleles.first.value;
                    double min_val = std::min(val1, val2);
                    double max_val = std::max(val1, val2);
                    double range = max_val - min_val;

                    double new_maternal = uniform(rng) * (range + 2 * alpha * range) +
                                          (min_val - alpha * range);
                    new_maternal = std::clamp(new_maternal, 0.0, 1.0);

                    // Croisement des allèles paternels
                    val1 = trait1.alleles.second.value;
                    val2 = trait2.alleles.second.value;
                    min_val = std::min(val1, val2);
                    max_val = std::max(val1, val2);
                    range = max_val - min_val;

                    double new_paternal = uniform(rng) * (range + 2 * alpha * range) +
                                          (min_val - alpha * range);
                    new_paternal = std::clamp(new_paternal, 0.0, 1.0);

                    // Dominance héritée
                    double dominance1 = (trait1.alleles.first.dominance + trait1.alleles.second.dominance) * 0.5;
                    double dominance2 = (trait2.alleles.first.dominance + trait2.alleles.second.dominance) * 0.5;
                    double new_dominance = (dominance1 + dominance2) * 0.5;

                    Allele maternal(new_maternal, new_dominance, false, generation_ + 1);
                    Allele paternal(new_paternal, new_dominance, false, generation_ + 1);

                    offspringTraits.emplace_back(type, maternal, paternal);
                }
                else
                {
                    // Si le trait n'existe pas chez l'autre parent, copie le sien
                    offspringTraits.push_back(traits_[i]);
                }
            }

            return AdvancedGenome(offspringTraits, generation_ + 1);
        }
    };

} // namespace Serina::Genetics
