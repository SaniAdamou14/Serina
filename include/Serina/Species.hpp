#pragma once

#include <string>
#include <vector>
#include "Genome.hpp" // Include for complete type

namespace Serina
{

    class Species
    {
    public:
        Species(const std::string &name, const Genome &genome);
        ~Species() = default;

        // Phenotype expression and genetic implementation
        void expressPhenotypeFromGenome();
        void applyGeneticConstraints();

        // Physiology and metabolism
        double getMetabolicRate() const;
        double getReproductionThreshold() const;
        bool canReproduce() const;
        void updatePhysiology(double deltaTime);

        void mutate(double mutationRate);
        Species reproduce(const Species &other) const;

        // Survival and environmental interaction
        bool survives(double energyThreshold) const;

        const std::string &getName() const { return name_; }
        double getEnergy() const { return energy_; }
        void setEnergy(double e) { energy_ = e; }

        // Accès aux traits du génome
        double getTrait(TraitType type) const { return genome_.getTrait(type); }

        // JSON serialization avec informations complètes
        std::string toJson() const;

    private:
        std::string name_;
        Genome genome_;
        double energy_; // Current energy level

        // Phenotype attributes expressed from genome
        double size_;             // Physical size (affects energy consumption)
        double speed_;            // Movement speed (affects hunting/escaping)
        double metabolism_;       // Metabolic rate (energy consumption)
        double reproductionCost_; // Energy cost for reproduction
    };

} // namespace Serina