#include "Serina/Config.hpp"
#include <iostream>

namespace Serina {

Config& Config::instance() {
    static Config instance;
    return instance;
}

void Config::loadDefaults() {
    // Set default configuration values
    worldWidth_ = 100;
    worldHeight_ = 100;
    
    // Evolution parameters
    mutationRate_ = 0.02;
    crossoverRate_ = 0.8;
    initialPopulation_ = 1000;
    maxPopulation_ = 2000;
    
    // Simulation parameters
    simulationSpeed_ = 1.0;
    enableVisualization_ = false;
    autoSaveInterval_ = 100;
    
    // Performance parameters
    enableSIMD_ = true;
    enableOpenMP_ = true;
    maxThreads_ = 4;
    
    // Environment parameters
    resourceRegenerationRate_ = 0.05;
    environmentalPressure_ = 0.3;
}

void Config::load(const std::string& filename) {
    // TODO: Parse JSON config file
    std::cout << "Config loaded from " << filename << std::endl;
    // For now, just use defaults
    loadDefaults();
}

bool Config::validate() const {
    // Validate configuration values
    if (worldWidth_ <= 0 || worldHeight_ <= 0) return false;
    if (mutationRate_ < 0.0 || mutationRate_ > 1.0) return false;
    if (crossoverRate_ < 0.0 || crossoverRate_ > 1.0) return false;
    if (initialPopulation_ <= 0) return false;
    if (maxPopulation_ <= 0) return false;
    if (simulationSpeed_ <= 0.0) return false;
    return true;
}

} // namespace Serina