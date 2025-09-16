#pragma once

#include <string>
#include <vector>
#include "Serina/Genome.hpp"  // Include for complete type

namespace Serina {

class Species {
public:
    Species(const std::string& name, const Genome& genome);
    ~Species() = default;

    // TODO: Implement phenotype expression from genome (size, speed, energy).
    // TODO: Add physiology (metabolism, reproduction rate).
    // TODO: Add behavior (movement patterns, feeding).

    void mutate(double mutationRate);
    Species reproduce(const Species& other) const;

    // TODO: Survival check based on energy and environment.
    bool survives(double energyThreshold) const;

    const std::string& getName() const { return name_; }
    double getEnergy() const { return energy_; }
    void setEnergy(double e) { energy_ = e; }

    // TODO: Serialize to JSON.
    std::string toJson() const;

private:
    std::string name_;
    Genome genome_;  // TODO: Define Genome class
    double energy_;  // Current energy level
    // TODO: Add phenotype attributes: double size_, speed_;
};

} // namespace Serina