#include "Serina/Genome.hpp"
#include <random>
#include <algorithm>
#include <iostream>
#include <cmath>
#include <sstream>

namespace Serina {

// Générateur aléatoire statique
std::mt19937 Genome::random_generator_(std::random_device{}());

Genome::Genome() {
    // Initialisation avec des traits par défaut
    traits_[TraitType::SIZE] = GeneticTrait(TraitType::SIZE, 0.5, 0.5);
    traits_[TraitType::SPEED] = GeneticTrait(TraitType::SPEED, 0.5, 0.5);
    traits_[TraitType::ENERGY_EFFICIENCY] = GeneticTrait(TraitType::ENERGY_EFFICIENCY, 0.5, 0.5);
    traits_[TraitType::REPRODUCTION_RATE] = GeneticTrait(TraitType::REPRODUCTION_RATE, 0.5, 0.5);
    traits_[TraitType::AGGRESSION] = GeneticTrait(TraitType::AGGRESSION, 0.5, 0.5);
}

Genome::Genome(const std::vector<GeneticTrait>& traits) {
    for (const auto& trait : traits) {
        traits_[trait.type] = trait;
    }
}

void Genome::mutate(double mutationRate, double mutationStrength) {
    std::uniform_real_distribution<double> rate_dist(0.0, 1.0);
    std::normal_distribution<double> mutation_dist(0.0, mutationStrength);

    for (auto& [type, trait] : traits_) {
        if (rate_dist(random_generator_) < mutationRate) {
            // Mutation de la valeur
            trait.value += mutation_dist(random_generator_);
            trait.value = clamp(trait.value);
            
            // Mutation occasionnelle de la dominance
            if (rate_dist(random_generator_) < mutationRate * 0.1) {
                trait.dominance += mutation_dist(random_generator_) * 0.5;
                trait.dominance = clamp(trait.dominance);
            }
        }
    }
}

Genome Genome::crossover(const Genome& other) const {
    Genome offspring;
    std::uniform_real_distribution<double> dist(0.0, 1.0);

    // Pour chaque trait, choisir l'allèle selon la dominance
    for (const auto& [type, trait] : traits_) {
        if (other.traits_.find(type) != other.traits_.end()) {
            const auto& other_trait = other.traits_.at(type);
            
            // Sélection basée sur la dominance
            double total_dominance = trait.dominance + other_trait.dominance;
            double selection_threshold = trait.dominance / total_dominance;
            
            if (dist(random_generator_) < selection_threshold) {
                offspring.traits_[type] = trait;
            } else {
                offspring.traits_[type] = other_trait;
            }
            
            // Légère variation du trait sélectionné
            std::normal_distribution<double> variation_dist(0.0, 0.05);
            offspring.traits_[type].value += variation_dist(random_generator_);
            offspring.traits_[type].value = clamp(offspring.traits_[type].value);
        } else {
            // Si l'autre parent n'a pas ce trait, on garde le nôtre
            offspring.traits_[type] = trait;
        }
    }
    
    // Ajouter les traits que seul l'autre parent possède
    for (const auto& [type, trait] : other.traits_) {
        if (traits_.find(type) == traits_.end()) {
            offspring.traits_[type] = trait;
        }
    }

    return offspring;
}

double Genome::getTrait(TraitType type) const {
    auto it = traits_.find(type);
    if (it != traits_.end()) {
        return it->second.value;
    }
    return 0.5; // Valeur par défaut
}

void Genome::setTrait(TraitType type, double value, double dominance) {
    traits_[type] = GeneticTrait(type, clamp(value), clamp(dominance));
}

const std::unordered_map<TraitType, GeneticTrait>& Genome::getTraits() const {
    return traits_;
}

double Genome::calculateFitness() const {
    double fitness = 0.0;
    
    // Calcul de fitness basé sur l'équilibre des traits
    double size = getTrait(TraitType::SIZE);
    double speed = getTrait(TraitType::SPEED);
    double energy_efficiency = getTrait(TraitType::ENERGY_EFFICIENCY);
    double reproduction_rate = getTrait(TraitType::REPRODUCTION_RATE);
    double intelligence = getTrait(TraitType::INTELLIGENCE);
    
    // Fitness basée sur l'équilibre et l'adaptation
    fitness += energy_efficiency * 0.3;  // L'efficacité énergétique est cruciale
    fitness += (size * speed) * 0.2;     // Équilibre taille/vitesse
    fitness += reproduction_rate * 0.2;   // Capacité de reproduction
    fitness += intelligence * 0.15;      // Intelligence
    
    // Pénalité pour les extrêmes (sélection stabilisante)
    for (const auto& [type, trait] : traits_) {
        double deviation = std::abs(trait.value - 0.5);
        fitness -= deviation * 0.1;
    }
    
    return std::max(0.0, fitness);
}

std::string Genome::toJson() const {
    std::ostringstream oss;
    oss << "{\"traits\":{";
    
    bool first = true;
    for (const auto& [type, trait] : traits_) {
        if (!first) oss << ",";
        oss << "\"" << static_cast<int>(type) << "\":{";
        oss << "\"value\":" << trait.value << ",";
        oss << "\"dominance\":" << trait.dominance;
        oss << "}";
        first = false;
    }
    
    oss << "},\"fitness\":" << calculateFitness() << "}";
    return oss.str();
}

Genome Genome::generateRandom() {
    Genome genome;
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    
    // Générer des traits aléatoires pour tous les types
    std::vector<TraitType> all_traits = {
        TraitType::SIZE, TraitType::SPEED, TraitType::ENERGY_EFFICIENCY,
        TraitType::REPRODUCTION_RATE, TraitType::AGGRESSION, 
        TraitType::INTELLIGENCE, TraitType::LONGEVITY, TraitType::RESISTANCE
    };
    
    for (TraitType type : all_traits) {
        double value = dist(random_generator_);
        double dominance = dist(random_generator_);
        genome.setTrait(type, value, dominance);
    }
    
    return genome;
}

double Genome::clamp(double value, double min, double max) const {
    return std::max(min, std::min(max, value));
}

} // namespace Serina