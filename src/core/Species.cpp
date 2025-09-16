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
    genome_.mutate(mutationRate);
    std::cout << "Species " << name_ << " mutated." << std::endl;
}

Species Species::reproduce(const Species& other) const {
    Genome childGenome = genome_.crossover(other.genome_);
    childGenome.mutate(0.01);  // Small mutation rate for child
    Species child(name_ + "_child", childGenome);
    child.setEnergy(50.0);  // Start with half energy
    return child;
}

bool Species::survives(double energyThreshold) const {
    return energy_ > energyThreshold;
}

std::string Species::toJson() const {
    // TODO: Use nlohmann/json
    return "{\"species\": \"" + name_ + "\"}";
}

} // namespace Serina