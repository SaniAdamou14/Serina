#pragma once

#include <string>
#include <unordered_map>
#include <vector>
#include <fstream>
#include <stdexcept>

namespace Serina
{

    class Config
    {
    public:
        static Config &instance();

        // Configuration loading from JSON file
        void load(const std::string &filename);
        void save(const std::string &filename) const;
        void loadDefaults();

        // World parameters
        int getWorldWidth() const { return worldWidth_; }
        int getWorldHeight() const { return worldHeight_; }
        void setWorldSize(int width, int height) { worldWidth_ = width; worldHeight_ = height; }

        // Evolution parameters
        double getMutationRate() const { return mutationRate_; }
        void setMutationRate(double rate) { mutationRate_ = rate; }
        
        double getCrossoverRate() const { return crossoverRate_; }
        void setCrossoverRate(double rate) { crossoverRate_ = rate; }
        
        int getInitialPopulation() const { return initialPopulation_; }
        void setInitialPopulation(int pop) { initialPopulation_ = pop; }
        
        int getMaxPopulation() const { return maxPopulation_; }
        void setMaxPopulation(int pop) { maxPopulation_ = pop; }

        // Simulation parameters
        double getSimulationSpeed() const { return simulationSpeed_; }
        void setSimulationSpeed(double speed) { simulationSpeed_ = speed; }
        
        bool getEnableVisualization() const { return enableVisualization_; }
        void setEnableVisualization(bool enable) { enableVisualization_ = enable; }
        
        int getAutoSaveInterval() const { return autoSaveInterval_; }
        void setAutoSaveInterval(int interval) { autoSaveInterval_ = interval; }

        // Performance parameters
        bool getEnableSIMD() const { return enableSIMD_; }
        void setEnableSIMD(bool enable) { enableSIMD_ = enable; }
        
        bool getEnableOpenMP() const { return enableOpenMP_; }
        void setEnableOpenMP(bool enable) { enableOpenMP_ = enable; }
        
        int getMaxThreads() const { return maxThreads_; }
        void setMaxThreads(int threads) { maxThreads_ = threads; }

        // Environment parameters
        double getResourceRegenerationRate() const { return resourceRegenerationRate_; }
        void setResourceRegenerationRate(double rate) { resourceRegenerationRate_ = rate; }
        
        double getEnvironmentalPressure() const { return environmentalPressure_; }
        void setEnvironmentalPressure(double pressure) { environmentalPressure_ = pressure; }

        // Validation
        bool validate() const;

    private:
        Config() { loadDefaults(); }
        ~Config() = default;
        Config(const Config &) = delete;
        Config &operator=(const Config &) = delete;

        // World parameters
        int worldWidth_;
        int worldHeight_;

        // Evolution parameters
        double mutationRate_;
        double crossoverRate_;
        int initialPopulation_;
        int maxPopulation_;

        // Simulation parameters
        double simulationSpeed_;
        bool enableVisualization_;
        int autoSaveInterval_;

        // Performance parameters
        bool enableSIMD_;
        bool enableOpenMP_;
        int maxThreads_;

        // Environment parameters
        double resourceRegenerationRate_;
        double environmentalPressure_;

        // Helper methods for JSON parsing
        void parseGeneralSettings(const std::unordered_map<std::string, std::string> &data);
        void parseEvolutionSettings(const std::unordered_map<std::string, std::string> &data);
        void parseSimulationSettings(const std::unordered_map<std::string, std::string> &data);
        void parsePerformanceSettings(const std::unordered_map<std::string, std::string> &data);
        void parseEnvironmentSettings(const std::unordered_map<std::string, std::string> &data);
    };

} // namespace Serina