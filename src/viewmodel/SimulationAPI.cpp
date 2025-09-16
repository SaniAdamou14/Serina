#include "Serina/SimulationAPI.hpp"
#include "Serina/Genome.hpp"
#include <iostream>
#include <sstream>
#include <algorithm>

namespace Serina {

SimulationAPI::SimulationAPI(int worldWidth, int worldHeight)
    : world_(worldWidth, worldHeight), running_(false), speed_(1.0) {}

void SimulationAPI::initialize() {
    // Créer des espèces initiales avec le nouveau système de génome
    
    // Canary - bon équilibre général
    Genome canaryGenome;
    canaryGenome.setTrait(TraitType::SIZE, 0.6);
    canaryGenome.setTrait(TraitType::SPEED, 0.8);
    canaryGenome.setTrait(TraitType::ENERGY_EFFICIENCY, 0.7);
    canaryGenome.setTrait(TraitType::REPRODUCTION_RATE, 0.6);
    canaryGenome.setTrait(TraitType::INTELLIGENCE, 0.7);
    Species canary("Canary", canaryGenome);
    species_.push_back(canary);

    // Insect - petit, rapide, efficace
    Genome insectGenome;
    insectGenome.setTrait(TraitType::SIZE, 0.2);
    insectGenome.setTrait(TraitType::SPEED, 0.9);
    insectGenome.setTrait(TraitType::ENERGY_EFFICIENCY, 0.8);
    insectGenome.setTrait(TraitType::REPRODUCTION_RATE, 0.9);
    insectGenome.setTrait(TraitType::INTELLIGENCE, 0.3);
    Species insect("Insect", insectGenome);
    species_.push_back(insect);

    // Fish - gros, lent, résistant
    Genome fishGenome;
    fishGenome.setTrait(TraitType::SIZE, 0.8);
    fishGenome.setTrait(TraitType::SPEED, 0.4);
    fishGenome.setTrait(TraitType::ENERGY_EFFICIENCY, 0.6);
    fishGenome.setTrait(TraitType::REPRODUCTION_RATE, 0.4);
    fishGenome.setTrait(TraitType::RESISTANCE, 0.8);
    Species fish("Fish", fishGenome);
    species_.push_back(fish);

    std::cout << "Simulation initialized with " << species_.size() << " species." << std::endl;
}

void SimulationAPI::step() {
    double deltaTime = 1.0 / 60.0; // Simulation à 60 FPS
    world_.update(deltaTime);
    
    // Simulation basique de l'évolution
    for (auto& s : species_) {
        // Consommation d'énergie basée sur les traits
        double energyCost = 1.0 + s.getTrait(TraitType::SIZE) * 0.5 + s.getTrait(TraitType::SPEED) * 0.3;
        double efficiency = s.getTrait(TraitType::ENERGY_EFFICIENCY);
        energyCost *= (1.0 - efficiency * 0.5); // L'efficacité réduit les coûts
        
        s.setEnergy(s.getEnergy() - energyCost);
        
        // Récupération d'énergie depuis l'environnement
        double foraging = s.getTrait(TraitType::INTELLIGENCE) * 2.0;
        s.setEnergy(s.getEnergy() + foraging);
        
        // Mutation occasionnelle
        if (s.getEnergy() > 50.0) {
            s.mutate(0.01); // 1% de chance de mutation
        }
    }
    
    // Reproduction si suffisamment d'énergie
    std::vector<Species> newOffspring;
    for (size_t i = 0; i < species_.size(); ++i) {
        if (species_[i].getEnergy() > 80.0) {
            for (size_t j = i + 1; j < species_.size(); ++j) {
                if (species_[j].getEnergy() > 80.0) {
                    Species offspring = species_[i].reproduce(species_[j]);
                    offspring.setEnergy(40.0); // Énergie initiale de l'offspring
                    newOffspring.push_back(offspring);
                    
                    // Coût de reproduction
                    species_[i].setEnergy(species_[i].getEnergy() - 20.0);
                    species_[j].setEnergy(species_[j].getEnergy() - 20.0);
                    break; // Une reproduction par step maximum
                }
            }
        }
    }
    
    // Ajouter les nouveaux individus
    for (const auto& offspring : newOffspring) {
        species_.push_back(offspring);
    }
    
    // Éliminer les individus morts
    species_.erase(
        std::remove_if(species_.begin(), species_.end(),
            [](const Species& s) { return !s.survives(0.0); }),
        species_.end()
    );
    
    std::cout << "Simulation step completed. Population: " << species_.size() << std::endl;
}

void SimulationAPI::start() {
    running_ = true;
    std::cout << "Simulation started." << std::endl;
}

void SimulationAPI::pause() {
    running_ = false;
    std::cout << "Simulation paused." << std::endl;
}

void SimulationAPI::setSpeed(double speed) {
    speed_ = speed;
}

std::string SimulationAPI::getPopulationData() const {
    std::ostringstream oss;
    oss << "{\"population_count\":" << species_.size() << ",\"species\":[";
    
    bool first = true;
    for (const auto& s : species_) {
        if (!first) oss << ",";
        oss << "{\"name\":\"" << s.getName() << "\",";
        oss << "\"energy\":" << s.getEnergy() << ",";
        oss << "\"traits\":{";
        oss << "\"size\":" << s.getTrait(TraitType::SIZE) << ",";
        oss << "\"speed\":" << s.getTrait(TraitType::SPEED) << ",";
        oss << "\"energy_efficiency\":" << s.getTrait(TraitType::ENERGY_EFFICIENCY) << ",";
        oss << "\"reproduction_rate\":" << s.getTrait(TraitType::REPRODUCTION_RATE) << ",";
        oss << "\"intelligence\":" << s.getTrait(TraitType::INTELLIGENCE);
        oss << "}}";
        first = false;
    }
    
    oss << "]}";
    return oss.str();
}

std::string SimulationAPI::getWorldState() const {
    return world_.toJson();
}

void SimulationAPI::addSpecies(const Species& species) {
    species_.push_back(species);
}

} // namespace Serina