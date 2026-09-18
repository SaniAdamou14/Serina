#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"
#include <random>
#include <iostream>
#include <sstream>
#include <iomanip>

namespace Serina {

Species::Species(const std::string& name, const Genome& genome)
    : name_(name), genome_(genome), energy_(100.0) {
    // Express phenotype from genome - Convert genetic traits to physical characteristics
    expressPhenotypeFromGenome();
}

void Species::expressPhenotypeFromGenome() {
    // Extract physical traits from genetic information
    // Size affects energy consumption and movement
    double sizeMultiplier = genome_.getTrait(TraitType::SIZE);
    
    // Speed affects hunting and escape abilities  
    double speedMultiplier = genome_.getTrait(TraitType::SPEED);
    
    // Energy efficiency affects survival duration
    double efficiencyMultiplier = genome_.getTrait(TraitType::ENERGY_EFFICIENCY);
    
    // Adjust base energy based on genetic efficiency
    energy_ *= (0.5 + efficiencyMultiplier * 0.5);
    
    // Size impacts energy consumption (larger = more energy needed)
    energy_ *= (2.0 - sizeMultiplier * 0.5);
    
    // Intelligence affects learning and adaptation
    double intelligence = genome_.getTrait(TraitType::INTELLIGENCE);
    
    // Resistance affects disease and environmental stress survival
    double resistance = genome_.getTrait(TraitType::RESISTANCE);
    
    // Apply genetic constraints to ensure biological realism
    applyGeneticConstraints();
}

void Species::applyGeneticConstraints() {
    // Ensure energy levels are within biological limits
    if (energy_ < 10.0) energy_ = 10.0;
    if (energy_ > 200.0) energy_ = 200.0;
    
    // Apply trait correlations (pleiotropy effects)
    double size = genome_.getTrait(TraitType::SIZE);
    double speed = genome_.getTrait(TraitType::SPEED);
    
    // Large organisms typically slower (biological constraint)
    if (size > 0.8 && speed > 0.8) {
        // Reduce speed if too large and fast (unrealistic)
        genome_.setTrait(TraitType::SPEED, speed * 0.7);
    }
    
    // High intelligence requires more energy
    double intelligence = genome_.getTrait(TraitType::INTELLIGENCE);
    if (intelligence > 0.8) {
        energy_ *= 0.9; // Brain tissue is expensive energetically
    }
}

double Species::getMetabolicRate() const {
    double baseRate = 1.0;
    double size = genome_.getTrait(TraitType::SIZE);
    double efficiency = genome_.getTrait(TraitType::ENERGY_EFFICIENCY);
    
    // Larger organisms have higher metabolic rates
    double sizeEffect = 0.5 + size * 0.8;
    
    // Efficiency reduces metabolic cost
    double efficiencyEffect = 2.0 - efficiency;
    
    return baseRate * sizeEffect * efficiencyEffect;
}

double Species::getReproductionThreshold() const {
    double baseThreshold = 80.0;
    double reproductionRate = genome_.getTrait(TraitType::REPRODUCTION_RATE);
    
    // Higher reproduction rate = lower energy threshold needed
    return baseThreshold * (1.5 - reproductionRate * 0.5);
}

bool Species::canReproduce() const {
    return energy_ >= getReproductionThreshold();
}

void Species::updatePhysiology(double deltaTime) {
    // Metabolic energy consumption
    double metabolicCost = getMetabolicRate() * deltaTime;
    energy_ -= metabolicCost;
    
    // Age effects (organisms get less efficient over time)
    // This would require adding age tracking
    
    // Ensure minimum energy for survival
    if (energy_ < 0.1) energy_ = 0.1;
}

void Species::mutate(double mutationRate) {
    genome_.mutate(mutationRate);
    
    // Re-express phenotype after mutation
    expressPhenotypeFromGenome();
}

Species Species::reproduce(const Species& other) const {
    if (!canReproduce() || !other.canReproduce()) {
        // Return copy of stronger parent if reproduction not possible
        return energy_ > other.energy_ ? *this : other;
    }
    
    Genome childGenome = genome_.crossover(other.genome_);
    childGenome.mutate(0.01);  // Small mutation rate for child
    Species child(name_ + "_child", childGenome);
    
    // Child inherits average energy from parents
    double parentalEnergyAverage = (energy_ + other.energy_) / 2.0;
    child.setEnergy(parentalEnergyAverage * 0.6); // Children start with less energy
    
    return child;
}

bool Species::survives(double energyThreshold) const {
    return energy_ > energyThreshold;
}

std::string Species::toJson() const {
    std::ostringstream json;
    json << std::fixed << std::setprecision(3);
    
    json << "{\n";
    json << "  \"name\": \"" << name_ << "\",\n";
    json << "  \"energy\": " << energy_ << ",\n";
    json << "  \"metabolicRate\": " << getMetabolicRate() << ",\n";
    json << "  \"reproductionThreshold\": " << getReproductionThreshold() << ",\n";
    json << "  \"canReproduce\": " << (canReproduce() ? "true" : "false") << ",\n";
    json << "  \"traits\": {\n";
    json << "    \"size\": " << genome_.getTrait(TraitType::SIZE) << ",\n";
    json << "    \"speed\": " << genome_.getTrait(TraitType::SPEED) << ",\n";
    json << "    \"energyEfficiency\": " << genome_.getTrait(TraitType::ENERGY_EFFICIENCY) << ",\n";
    json << "    \"reproductionRate\": " << genome_.getTrait(TraitType::REPRODUCTION_RATE) << ",\n";
    json << "    \"intelligence\": " << genome_.getTrait(TraitType::INTELLIGENCE) << ",\n";
    json << "    \"resistance\": " << genome_.getTrait(TraitType::RESISTANCE) << "\n";
    json << "  }\n";
    json << "}";
    
    return json.str();
}

} // namespace Serina