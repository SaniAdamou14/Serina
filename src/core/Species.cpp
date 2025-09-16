#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"  // TODO: Create Genome class
#include <random>
#include <iostream>

namespace Serina {

Species::Species(const std::string& name, const Genome& genome)
    : name_(name), genome_(genome), energy_(100.0) {
    // TODO: Express phenotype from genome
}

void Species::mutate(double mutationRate) {
    // TODO: Mutate genome
    std::cout << "Species " << name_ << " mutated." << std::endl;
}

Species Species::reproduce(const Species& other) const {
    // TODO: Combine genomes, apply mutation
    Genome childGenome = genome_;  // Placeholder
    return Species(name_ + "_child", childGenome);
}

bool Species::survives(double energyThreshold) const {
    return energy_ > energyThreshold;
}

std::string Species::toJson() const {
    // TODO: Use nlohmann/json
    return "{\"species\": \"" + name_ + "\"}";
}

} // namespace Serina