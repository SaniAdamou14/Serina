#pragma once

#include <vector>
#include <string>
#include <map>
#include <memory>
#include "Serina/PhysicsEngine.hpp"

namespace Serina
{
    enum class TerrainType {
        LAND,
        WATER,
        MOUNTAIN,
        FOREST,
        DESERT
    };

    enum class ClimateZone {
        TROPICAL,
        TEMPERATE,
        ARCTIC,
        DESERT,
        OCEANIC
    };

    struct Cell {
        std::map<std::string, double> resources;  // plants, water, energy, food
        TerrainType terrain;
        ClimateZone climate;
        double temperature;     // Current temperature
        double humidity;        // Current humidity
        double elevation;       // Height for terrain effects
        
        Cell() : terrain(TerrainType::LAND), climate(ClimateZone::TEMPERATE), 
                temperature(20.0), humidity(0.5), elevation(0.0) {
            resources["plants"] = 50.0;
            resources["water"] = 100.0;
            resources["energy"] = 100.0;
            resources["food"] = 10.0;
        }
    };

    struct TimeState {
        double currentTime;     // Total elapsed time
        double dayLength;       // Length of a day in simulation time
        double seasonLength;    // Length of a season in days
        int currentDay;
        int currentSeason;      // 0=Spring, 1=Summer, 2=Fall, 3=Winter
        
        TimeState() : currentTime(0.0), dayLength(24.0), seasonLength(90.0), 
                     currentDay(0), currentSeason(0) {}
        
        double getDayProgress() const { return (currentTime / dayLength) - currentDay; }
        bool isDay() const { return getDayProgress() > 0.25 && getDayProgress() < 0.75; }
        bool isNight() const { return !isDay(); }
    };

    class World
    {
    public:
        World(int width, int height);
        ~World() = default;

        // Core simulation
        void update(double deltaTime);
        
        // Resource management
        void addResource(int x, int y, const std::string &type, double amount);
        double getResource(int x, int y, const std::string &type) const;
        bool consumeResource(int x, int y, const std::string &type, double amount);
        
        // Terrain and climate
        void setTerrain(int x, int y, TerrainType terrain);
        TerrainType getTerrain(int x, int y) const;
        void setClimate(int x, int y, ClimateZone climate);
        ClimateZone getClimate(int x, int y) const;
        
        // Environmental effects
        void updateEnvironment(double deltaTime);
        void updateResources(double deltaTime);
        void updateWeather(double deltaTime);
        void simulateSeasons();
        
        // Temperature and weather
        double getTemperature(int x, int y) const;
        double getHumidity(int x, int y) const;
        void setTemperature(int x, int y, double temp);
        void setHumidity(int x, int y, double humidity);
        
        // Physics integration
        void setPhysicsEngine(std::shared_ptr<PhysicsEngine> physics) { physics_ = physics; }
        std::shared_ptr<PhysicsEngine> getPhysicsEngine() const { return physics_; }
        
        // Time management
        const TimeState& getTimeState() const { return timeState_; }
        bool isDay() const { return timeState_.isDay(); }
        bool isNight() const { return timeState_.isNight(); }
        int getCurrentSeason() const { return timeState_.currentSeason; }
        
        // Spatial queries
        std::vector<std::pair<int, int>> findResourceSources(const std::string& type, double minAmount = 0.0) const;
        std::vector<std::pair<int, int>> getNeighbors(int x, int y, int radius = 1) const;
        double getResourceDensity(int x, int y, int radius, const std::string& type) const;
        
        // World generation
        void generateTerrain();
        void generateClimate();
        void seedResources();
        
        // Export/Import
        std::string toJson() const;
        void fromJson(const std::string& jsonStr);

        // Getters
        int getWidth() const { return width_; }
        int getHeight() const { return height_; }
        const Cell& getCell(int x, int y) const;
        Cell& getCell(int x, int y);

    private:
        int width_, height_;
        std::vector<std::vector<Cell>> grid_;
        TimeState timeState_;
        std::shared_ptr<PhysicsEngine> physics_;
        
        // Environmental parameters
        double globalTemperature_;
        double temperatureVariation_;
        double humidityVariation_;
        
        // Helper methods
        bool isValidCoordinate(int x, int y) const;
        double calculateSeasonalEffect() const;
        double calculateDayNightEffect() const;
        void spreadResources(int x, int y, const std::string& type, double amount, int radius = 1);
    };

} // namespace Serina