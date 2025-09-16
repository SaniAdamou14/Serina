#pragma once

#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include <vector>
#include <string>

namespace Serina {

class SimulationAPI {
public:
    SimulationAPI(int worldWidth, int worldHeight);
    ~SimulationAPI() = default;

    // TODO: Initialize world and species.
    void initialize();

    // TODO: Run simulation for one tick.
    void step();

    // TODO: Start/pause simulation loop.
    void start();
    void pause();
    void setSpeed(double speed);

    // TODO: Get data for visualization (populations, etc.).
    std::string getPopulationData() const;  // JSON
    std::string getWorldState() const;      // JSON

    // TODO: Add/remove species.
    void addSpecies(const Species& species);

private:
    World world_;
    std::vector<Species> species_;
    bool running_;
    double speed_;
    // TODO: Add PhysicsEngine instance.
};

} // namespace Serina