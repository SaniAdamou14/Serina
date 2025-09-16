#pragma once

#include <vector>
#include <string>
#include <unordered_map>
#include <random>

namespace Serina
{

    // Définit les différents traits génétiques possibles
    enum class TraitType
    {
        SIZE,              // Taille de l'organisme
        SPEED,             // Vitesse de déplacement
        ENERGY_EFFICIENCY, // Efficacité énergétique
        REPRODUCTION_RATE, // Taux de reproduction
        AGGRESSION,        // Niveau d'agressivité
        INTELLIGENCE,      // Capacité cognitive
        LONGEVITY,         // Espérance de vie
        RESISTANCE         // Résistance aux maladies
    };

    // Structure pour stocker un trait génétique
    struct GeneticTrait
    {
        TraitType type;
        double value;     // Valeur du trait (0.0 - 1.0)
        double dominance; // Dominance du trait (0.0 - 1.0)

        // Constructeur par défaut
        GeneticTrait() : type(TraitType::SIZE), value(0.5), dominance(0.5) {}

        GeneticTrait(TraitType t, double v, double d = 0.5)
            : type(t), value(v), dominance(d) {}
    };

    class Genome
    {
    public:
        // Constructeurs
        Genome();
        Genome(const std::vector<GeneticTrait> &traits);

        // Destructor
        ~Genome() = default;

        // Copy constructor et assignment operator
        Genome(const Genome &other) = default;
        Genome &operator=(const Genome &other) = default;

        // Mutation du génome
        void mutate(double mutationRate, double mutationStrength = 0.1);

        // Croisement génétique avec un autre génome
        Genome crossover(const Genome &other) const;

        // Accesseurs pour les traits
        double getTrait(TraitType type) const;
        void setTrait(TraitType type, double value, double dominance = 0.5);

        // Obtenir tous les traits
        const std::unordered_map<TraitType, GeneticTrait> &getTraits() const;

        // Calcul de la fitness globale
        double calculateFitness() const;

        // Sérialisation
        std::string toJson() const;

        // Génération d'un génome aléatoire
        static Genome generateRandom();

    private:
        std::unordered_map<TraitType, GeneticTrait> traits_;
        static std::mt19937 random_generator_;

        // Fonction utilitaire pour clamp les valeurs
        double clamp(double value, double min = 0.0, double max = 1.0) const;
    };

} // namespace Serina
