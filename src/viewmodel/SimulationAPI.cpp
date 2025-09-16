#include "Serina/SimulationAPI.hpp"
#include <iostream>

namespace Serina {

SimulationAPI::SimulationAPI(int worldWidth, int worldHeight)
    : world_(worldWidth, worldHeight), running_(false), speed_(1.0) {}

void SimulationAPI::initialize() {
    // TODO: Create initial species
    Genome baseGenome({1.0, 1.0, 100.0});  // size, speed, energy
    Species canary("Canary", baseGenome);
    species_.push_back(canary);
    std::cout << "Simulation initialized." << std::endl;
}

void SimulationAPI::step() {
    world_.update();
    // TODO: Update species: movement, feeding, reproduction
    for (auto& s : species_) {
        s.setEnergy(s.getEnergy() - 1.0);  // Consume energy
        if (!s.survives(0.0)) {
            // TODO: Remove dead species
        }
    }
    std::cout << "Simulation step completed." << std::endl;
}

void SimulationAPI::start() {
    running_ = true;
    // TODO: Start loop in separate thread
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
    // TODO: Serialize species data
    return "{\"populations\": \"placeholder\"}";
}

std::string SimulationAPI::getWorldState() const {
    return world_.toJson();
}

void SimulationAPI::addSpecies(const Species& species) {
    species_.push_back(species);
}

} // namespace Serina