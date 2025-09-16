#pragma once

#include <vector>
#include <unordered_map>
#include <memory>
#include <random>
#include <algorithm>
#include <functional>
#include <stdexcept>

namespace Serina::NEAT
{

    /// @brief Types d'activation pour les neurones
    enum class ActivationType
    {
        SIGMOID,
        TANH,
        RELU,
        LEAKY_RELU,
        LINEAR,
        STEP
    };

    /// @brief Type de neurone dans le réseau
    enum class NodeType
    {
        INPUT,  ///< Neurone d'entrée
        HIDDEN, ///< Neurone caché
        OUTPUT  ///< Neurone de sortie
    };

    /// @brief Fonction d'activation
    class ActivationFunction
    {
    public:
        static double activate(double x, ActivationType type)
        {
            switch (type)
            {
            case ActivationType::SIGMOID:
                return 1.0 / (1.0 + std::exp(-4.9 * x));
            case ActivationType::TANH:
                return std::tanh(x);
            case ActivationType::RELU:
                return std::max(0.0, x);
            case ActivationType::LEAKY_RELU:
                return x > 0.0 ? x : 0.01 * x;
            case ActivationType::LINEAR:
                return x;
            case ActivationType::STEP:
                return x > 0.0 ? 1.0 : 0.0;
            default:
                return x;
            }
        }

        static double derivative(double x, ActivationType type)
        {
            switch (type)
            {
            case ActivationType::SIGMOID:
            {
                double sigmoid = activate(x, type);
                return sigmoid * (1.0 - sigmoid);
            }
            case ActivationType::TANH:
            {
                double tanh_val = std::tanh(x);
                return 1.0 - tanh_val * tanh_val;
            }
            case ActivationType::RELU:
                return x > 0.0 ? 1.0 : 0.0;
            case ActivationType::LEAKY_RELU:
                return x > 0.0 ? 1.0 : 0.01;
            case ActivationType::LINEAR:
                return 1.0;
            case ActivationType::STEP:
                return 0.0; // Non-dérivable
            default:
                return 1.0;
            }
        }
    };

    /// @brief Gene de connexion dans NEAT
    struct ConnectionGene
    {
        uint32_t inNode;     ///< ID du neurone d'entrée
        uint32_t outNode;    ///< ID du neurone de sortie
        double weight;       ///< Poids de la connexion
        bool enabled;        ///< Connexion active ou non
        uint32_t innovation; ///< Numéro d'innovation global

        ConnectionGene(uint32_t in, uint32_t out, double w, uint32_t innov)
            : inNode(in), outNode(out), weight(w), enabled(true), innovation(innov) {}
    };

    /// @brief Gene de neurone dans NEAT
    struct NodeGene
    {
        uint32_t nodeId;           ///< ID unique du neurone
        NodeType type;             ///< Type du neurone
        ActivationType activation; ///< Fonction d'activation
        double bias;               ///< Biais du neurone
        int layer;                 ///< Couche du neurone (pour l'ordre d'évaluation)

        NodeGene(uint32_t id, NodeType t, ActivationType act = ActivationType::SIGMOID)
            : nodeId(id), type(t), activation(act), bias(0.0), layer(0) {}
    };

    /// @brief Compteur global d'innovation pour NEAT
    class InnovationCounter
    {
    private:
        static uint32_t nextInnovation_;
        static std::unordered_map<std::pair<uint32_t, uint32_t>, uint32_t,
                                  std::function<size_t(const std::pair<uint32_t, uint32_t> &)>>
            connectionInnovations_;

    public:
        /// @brief Obtient le numéro d'innovation pour une nouvelle connexion
        static uint32_t getConnectionInnovation(uint32_t inNode, uint32_t outNode)
        {
            auto key = std::make_pair(inNode, outNode);
            auto it = connectionInnovations_.find(key);

            if (it != connectionInnovations_.end())
            {
                return it->second;
            }

            uint32_t innovation = nextInnovation_++;
            connectionInnovations_[key] = innovation;
            return innovation;
        }

        /// @brief Obtient le prochain numéro d'innovation pour un nouveau neurone
        static uint32_t getNodeInnovation()
        {
            return nextInnovation_++;
        }

        /// @brief Réinitialise le compteur (pour tests)
        static void reset()
        {
            nextInnovation_ = 1;
            connectionInnovations_.clear();
        }
    };

    // Initialisation des variables statiques
    uint32_t InnovationCounter::nextInnovation_ = 1;
    std::unordered_map<std::pair<uint32_t, uint32_t>, uint32_t,
                       std::function<size_t(const std::pair<uint32_t, uint32_t> &)>>
        InnovationCounter::connectionInnovations_(
            0,
            [](const std::pair<uint32_t, uint32_t> &p) -> size_t
            {
                return std::hash<uint64_t>{}((static_cast<uint64_t>(p.first) << 32) | p.second);
            });

    /// @brief Configuration pour NEAT
    struct NEATConfig
    {
        // Paramètres de mutation
        double weightMutationRate = 0.8;         ///< Probabilité de mutation des poids
        double weightPerturbationRate = 0.9;     ///< Probabilité de perturbation vs remplacement
        double addNodeMutationRate = 0.03;       ///< Probabilité d'ajout de neurone
        double addConnectionMutationRate = 0.05; ///< Probabilité d'ajout de connexion
        double disableConnectionRate = 0.1;      ///< Probabilité de désactivation de connexion

        // Paramètres de perturbation
        double weightPerturbationPower = 2.5; ///< Magnitude de perturbation des poids
        double biasPerturbationPower = 0.5;   ///< Magnitude de perturbation des biais

        // Paramètres de distance génétique
        double excessCoeff = 1.0;            ///< Coefficient pour gènes en excès
        double disjointCoeff = 1.0;          ///< Coefficient pour gènes disjoints
        double weightDiffCoeff = 0.4;        ///< Coefficient pour différence de poids
        double compatibilityThreshold = 3.0; ///< Seuil de compatibilité pour espèces

        // Paramètres de sélection
        double survivalThreshold = 0.2;        ///< Proportion survivante par espèce
        double interspeciesMatingRate = 0.001; ///< Taux de croisement inter-espèces

        // Limites du réseau
        uint32_t maxNodes = 1000;       ///< Nombre max de neurones
        uint32_t maxConnections = 5000; ///< Nombre max de connexions

        // Paramètres d'activation
        std::vector<ActivationType> allowedActivations = {
            ActivationType::SIGMOID,
            ActivationType::TANH,
            ActivationType::RELU};
    };

    /// @brief Génome NEAT avec topologie évolutive
    class NEATGenome
    {
    private:
        std::vector<NodeGene> nodeGenes_;
        std::vector<ConnectionGene> connectionGenes_;
        uint32_t inputCount_;
        uint32_t outputCount_;
        double fitness_;
        uint32_t speciesId_;

        mutable std::mt19937 rng_;

    public:
        NEATGenome(uint32_t inputs, uint32_t outputs, uint32_t seed = std::random_device{}())
            : inputCount_(inputs), outputCount_(outputs), fitness_(0.0), speciesId_(0), rng_(seed)
        {

            // Création des neurones d'entrée
            for (uint32_t i = 0; i < inputCount_; ++i)
            {
                nodeGenes_.emplace_back(i, NodeType::INPUT);
                nodeGenes_.back().layer = 0;
            }

            // Création des neurones de sortie
            for (uint32_t i = 0; i < outputCount_; ++i)
            {
                uint32_t nodeId = inputCount_ + i;
                nodeGenes_.emplace_back(nodeId, NodeType::OUTPUT);
                nodeGenes_.back().layer = 1;
            }

            // Connexions initiales (entrées → sorties)
            std::uniform_real_distribution<double> weightDist(-1.0, 1.0);
            for (uint32_t i = 0; i < inputCount_; ++i)
            {
                for (uint32_t j = 0; j < outputCount_; ++j)
                {
                    uint32_t outNodeId = inputCount_ + j;
                    double weight = weightDist(rng_);
                    uint32_t innovation = InnovationCounter::getConnectionInnovation(i, outNodeId);

                    connectionGenes_.emplace_back(i, outNodeId, weight, innovation);
                }
            }
        }

        /// @brief Évalue le réseau avec les entrées données
        std::vector<double> evaluate(const std::vector<double> &inputs)
        {
            if (inputs.size() != inputCount_)
            {
                throw std::invalid_argument("Nombre d'entrées incorrect");
            }

            // Map pour stocker les valeurs des neurones
            std::unordered_map<uint32_t, double> nodeValues;

            // Initialise les entrées
            for (uint32_t i = 0; i < inputCount_; ++i)
            {
                nodeValues[i] = inputs[i];
            }

            // Trie les neurones par couche pour évaluation
            auto sortedNodes = nodeGenes_;
            std::sort(sortedNodes.begin(), sortedNodes.end(),
                      [](const NodeGene &a, const NodeGene &b)
                      {
                          return a.layer < b.layer;
                      });

            // Évaluation par propagation avant
            for (const auto &node : sortedNodes)
            {
                if (node.type == NodeType::INPUT)
                    continue;

                double sum = node.bias;

                // Somme pondérée des entrées
                for (const auto &conn : connectionGenes_)
                {
                    if (conn.outNode == node.nodeId && conn.enabled)
                    {
                        auto it = nodeValues.find(conn.inNode);
                        if (it != nodeValues.end())
                        {
                            sum += it->second * conn.weight;
                        }
                    }
                }

                // Application de la fonction d'activation
                nodeValues[node.nodeId] = ActivationFunction::activate(sum, node.activation);
            }

            // Extraction des sorties
            std::vector<double> outputs(outputCount_);
            for (uint32_t i = 0; i < outputCount_; ++i)
            {
                uint32_t nodeId = inputCount_ + i;
                auto it = nodeValues.find(nodeId);
                outputs[i] = (it != nodeValues.end()) ? it->second : 0.0;
            }

            return outputs;
        }

        /// @brief Mutation des poids
        void mutateWeights(const NEATConfig &config)
        {
            std::uniform_real_distribution<double> uniformDist(0.0, 1.0);
            std::normal_distribution<double> perturbDist(0.0, config.weightPerturbationPower);
            std::uniform_real_distribution<double> newWeightDist(-1.0, 1.0);

            for (auto &conn : connectionGenes_)
            {
                if (uniformDist(rng_) < config.weightMutationRate)
                {
                    if (uniformDist(rng_) < config.weightPerturbationRate)
                    {
                        // Perturbation
                        conn.weight += perturbDist(rng_);
                        conn.weight = std::clamp(conn.weight, -10.0, 10.0);
                    }
                    else
                    {
                        // Nouveau poids
                        conn.weight = newWeightDist(rng_);
                    }
                }
            }

            // Mutation des biais
            std::normal_distribution<double> biasPerturbDist(0.0, config.biasPerturbationPower);
            for (auto &node : nodeGenes_)
            {
                if (node.type != NodeType::INPUT && uniformDist(rng_) < config.weightMutationRate)
                {
                    node.bias += biasPerturbDist(rng_);
                    node.bias = std::clamp(node.bias, -10.0, 10.0);
                }
            }
        }

        /// @brief Ajoute un nouveau neurone
        void addNode(const NEATConfig &config)
        {
            if (connectionGenes_.empty() || nodeGenes_.size() >= config.maxNodes)
                return;

            std::uniform_int_distribution<size_t> connDist(0, connectionGenes_.size() - 1);
            size_t connIndex = connDist(rng_);

            auto &oldConn = connectionGenes_[connIndex];
            if (!oldConn.enabled)
                return;

            // Désactive l'ancienne connexion
            oldConn.enabled = false;

            // Trouve les neurones source et destination
            auto inNodeIt = std::find_if(nodeGenes_.begin(), nodeGenes_.end(),
                                         [&](const NodeGene &node)
                                         { return node.nodeId == oldConn.inNode; });
            auto outNodeIt = std::find_if(nodeGenes_.begin(), nodeGenes_.end(),
                                          [&](const NodeGene &node)
                                          { return node.nodeId == oldConn.outNode; });

            if (inNodeIt == nodeGenes_.end() || outNodeIt == nodeGenes_.end())
                return;

            // Crée le nouveau neurone
            uint32_t newNodeId = getNextNodeId();
            int newLayer = inNodeIt->layer + 1;

            // Ajuste les couches si nécessaire
            if (newLayer >= outNodeIt->layer)
            {
                adjustLayers(newLayer);
            }

            // Choisit une fonction d'activation aléatoire
            std::uniform_int_distribution<size_t> actDist(0, config.allowedActivations.size() - 1);
            ActivationType activation = config.allowedActivations[actDist(rng_)];

            nodeGenes_.emplace_back(newNodeId, NodeType::HIDDEN, activation);
            nodeGenes_.back().layer = newLayer;

            // Crée les nouvelles connexions
            uint32_t inInnovation = InnovationCounter::getConnectionInnovation(oldConn.inNode, newNodeId);
            uint32_t outInnovation = InnovationCounter::getConnectionInnovation(newNodeId, oldConn.outNode);

            connectionGenes_.emplace_back(oldConn.inNode, newNodeId, 1.0, inInnovation);
            connectionGenes_.emplace_back(newNodeId, oldConn.outNode, oldConn.weight, outInnovation);
        }

        /// @brief Ajoute une nouvelle connexion
        void addConnection(const NEATConfig &config)
        {
            if (connectionGenes_.size() >= config.maxConnections)
                return;

            std::uniform_int_distribution<size_t> nodeDist(0, nodeGenes_.size() - 1);

            // Essaie de trouver une connexion valide
            for (int attempts = 0; attempts < 50; ++attempts)
            {
                uint32_t inNodeId = nodeGenes_[nodeDist(rng_)].nodeId;
                uint32_t outNodeId = nodeGenes_[nodeDist(rng_)].nodeId;

                // Vérifie la validité de la connexion
                if (!isValidConnection(inNodeId, outNodeId))
                    continue;

                // Vérifie si la connexion existe déjà
                bool exists = std::any_of(connectionGenes_.begin(), connectionGenes_.end(),
                                          [&](const ConnectionGene &conn)
                                          {
                                              return conn.inNode == inNodeId && conn.outNode == outNodeId;
                                          });

                if (!exists)
                {
                    std::uniform_real_distribution<double> weightDist(-1.0, 1.0);
                    double weight = weightDist(rng_);
                    uint32_t innovation = InnovationCounter::getConnectionInnovation(inNodeId, outNodeId);

                    connectionGenes_.emplace_back(inNodeId, outNodeId, weight, innovation);
                    break;
                }
            }
        }

        /// @brief Calcule la distance génétique avec un autre génome
        double geneticDistance(const NEATGenome &other, const NEATConfig &config) const
        {
            if (connectionGenes_.empty() && other.connectionGenes_.empty())
                return 0.0;

            // Trouve les innovations max
            uint32_t maxInnovThis = connectionGenes_.empty() ? 0 : std::max_element(connectionGenes_.begin(), connectionGenes_.end(), [](const ConnectionGene &a, const ConnectionGene &b)
                                                                                    { return a.innovation < b.innovation; })
                                                                       ->innovation;

            uint32_t maxInnovOther = other.connectionGenes_.empty() ? 0 : std::max_element(other.connectionGenes_.begin(), other.connectionGenes_.end(), [](const ConnectionGene &a, const ConnectionGene &b)
                                                                                           { return a.innovation < b.innovation; })
                                                                              ->innovation;

            uint32_t maxInnov = std::max(maxInnovThis, maxInnovOther);

            // Compte les gènes excess, disjoint et matching
            uint32_t excess = 0;
            uint32_t disjoint = 0;
            uint32_t matching = 0;
            double weightDiff = 0.0;

            std::unordered_map<uint32_t, const ConnectionGene *> thisGenes;
            std::unordered_map<uint32_t, const ConnectionGene *> otherGenes;

            for (const auto &gene : connectionGenes_)
            {
                thisGenes[gene.innovation] = &gene;
            }

            for (const auto &gene : other.connectionGenes_)
            {
                otherGenes[gene.innovation] = &gene;
            }

            // Analyse des gènes
            for (uint32_t i = 1; i <= maxInnov; ++i)
            {
                auto thisIt = thisGenes.find(i);
                auto otherIt = otherGenes.find(i);

                bool thisHas = thisIt != thisGenes.end();
                bool otherHas = otherIt != otherGenes.end();

                if (thisHas && otherHas)
                {
                    // Gène matching
                    matching++;
                    weightDiff += std::abs(thisIt->second->weight - otherIt->second->weight);
                }
                else if (thisHas || otherHas)
                {
                    // Détermine si c'est excess ou disjoint
                    if (i > std::min(maxInnovThis, maxInnovOther))
                    {
                        excess++;
                    }
                    else
                    {
                        disjoint++;
                    }
                }
            }

            // Calcule la distance
            size_t N = std::max(connectionGenes_.size(), other.connectionGenes_.size());
            if (N < 20)
                N = 1; // Pour petits génomes

            double avgWeightDiff = matching > 0 ? weightDiff / matching : 0.0;

            return (config.excessCoeff * excess) / N +
                   (config.disjointCoeff * disjoint) / N +
                   config.weightDiffCoeff * avgWeightDiff;
        }

        /// @brief Croisement avec un autre génome
        NEATGenome crossover(const NEATGenome &other) const
        {
            NEATGenome offspring(inputCount_, outputCount_);
            offspring.nodeGenes_.clear();
            offspring.connectionGenes_.clear();

            // Détermine le parent le plus fit
            bool thisFitter = fitness_ >= other.fitness_;
            const NEATGenome &fitterParent = thisFitter ? *this : other;
            const NEATGenome &lessFitParent = thisFitter ? other : *this;

            // Copie tous les neurones du parent le plus fit
            offspring.nodeGenes_ = fitterParent.nodeGenes_;

            // Croisement des connexions
            std::unordered_map<uint32_t, const ConnectionGene *> lessFitGenes;
            for (const auto &gene : lessFitParent.connectionGenes_)
            {
                lessFitGenes[gene.innovation] = &gene;
            }

            std::uniform_real_distribution<double> uniformDist(0.0, 1.0);

            for (const auto &fitterGene : fitterParent.connectionGenes_)
            {
                auto it = lessFitGenes.find(fitterGene.innovation);

                if (it != lessFitGenes.end())
                {
                    // Gène matching - choisit aléatoirement
                    const ConnectionGene &chosenGene = uniformDist(offspring.rng_) < 0.5 ? fitterGene : *it->second;
                    offspring.connectionGenes_.push_back(chosenGene);
                }
                else
                {
                    // Gène excess/disjoint du parent plus fit
                    offspring.connectionGenes_.push_back(fitterGene);
                }
            }

            return offspring;
        }

        // Getters et setters
        double getFitness() const { return fitness_; }
        void setFitness(double fitness) { fitness_ = fitness; }
        uint32_t getSpeciesId() const { return speciesId_; }
        void setSpeciesId(uint32_t id) { speciesId_ = id; }

        const std::vector<NodeGene> &getNodeGenes() const { return nodeGenes_; }
        const std::vector<ConnectionGene> &getConnectionGenes() const { return connectionGenes_; }

        uint32_t getInputCount() const { return inputCount_; }
        uint32_t getOutputCount() const { return outputCount_; }
        size_t getComplexity() const { return nodeGenes_.size() + connectionGenes_.size(); }

    private:
        /// @brief Obtient le prochain ID de neurone disponible
        uint32_t getNextNodeId() const
        {
            uint32_t maxId = 0;
            for (const auto &node : nodeGenes_)
            {
                maxId = std::max(maxId, node.nodeId);
            }
            return maxId + 1;
        }

        /// @brief Vérifie si une connexion est valide (pas de cycles)
        bool isValidConnection(uint32_t inNodeId, uint32_t outNodeId) const
        {
            if (inNodeId == outNodeId)
                return false;

            auto inNodeIt = std::find_if(nodeGenes_.begin(), nodeGenes_.end(),
                                         [&](const NodeGene &node)
                                         { return node.nodeId == inNodeId; });
            auto outNodeIt = std::find_if(nodeGenes_.begin(), nodeGenes_.end(),
                                          [&](const NodeGene &node)
                                          { return node.nodeId == outNodeId; });

            if (inNodeIt == nodeGenes_.end() || outNodeIt == nodeGenes_.end())
                return false;

            // Pas de connexion vers les entrées
            if (outNodeIt->type == NodeType::INPUT)
                return false;

            // Pas de connexion depuis les sorties
            if (inNodeIt->type == NodeType::OUTPUT)
                return false;

            // Vérifie les couches pour éviter les cycles
            return inNodeIt->layer < outNodeIt->layer;
        }

        /// @brief Ajuste les couches après ajout d'un neurone
        void adjustLayers(int insertedLayer)
        {
            for (auto &node : nodeGenes_)
            {
                if (node.layer >= insertedLayer && node.type == NodeType::OUTPUT)
                {
                    node.layer++;
                }
            }
        }
    };

} // namespace Serina::NEAT