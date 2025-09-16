#include "Serina/Genome.hpp"
#include <random>
#include <algorithm>
#include <iostream>
#include <cmath>

namespace Serina {

Genome::Genome() : traits_(5, 1.0) {}  // Default traits: size, speed, energy, wing_size, beak_length

Genome::Genome(const std::vector<double>& traits) : traits_(traits) {}

void Genome::mutate(double rate) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::normal_distribution<> d(0, rate);

    for (auto& t : traits_) {
        t += d(gen);
        t = std::max(0.1, static_cast<double>(t));  // Clamp to positive
    }
    std::cout << "Genome mutated." << std::endl;
}

Genome Genome::crossover(const Genome& other) const {
    std::vector<double> childTraits = traits_;
    // TODO: Proper crossover
    for (size_t i = 0; i < traits_.size(); ++i) {
        childTraits[i] = (traits_[i] + other.traits_[i]) / 2;
    }
    return Genome(childTraits);
}

double Genome::getTrait(int index) const {
    if (index >= 0 && index < static_cast<int>(traits_.size())) {
        return traits_[index];
    }
    return 0.0;
}

void Genome::setTrait(int index, double value) {
    if (index >= 0 && index < static_cast<int>(traits_.size())) {
        traits_[index] = value;
    }
}

std::string Genome::toJson() const {
    // TODO: Use nlohmann/json
    return "{\"genome\": \"placeholder\"}";
}

} // namespace Serina