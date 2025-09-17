#pragma once

#include "World.hpp"
#include "Species.hpp"
#include <vector>
#include <string>

namespace Serina
{
    class SimulationAPI
    {
    public:
        SimulationAPI(int worldWidth, int worldHeight);
        ~SimulationAPI() = default;

        // Simulation control
        void initialize();
        void step();
        void start();
        void pause();
        void setSpeed(double speed);

        // Data access for visualization
        std::string getPopulationData() const; // JSON
        std::string getWorldState() const;     // JSON

        // Species management
        void addSpecies(const Species &species);

        // Getters
        bool isRunning() const { return running_; }
        double getSpeed() const { return speed_; }
        const World &getWorld() const { return world_; }
        const std::vector<Species> &getSpecies() const { return species_; }

    private:
        World world_;
        std::vector<Species> species_;
        bool running_;
        double speed_;
    };

} // namespace Serina