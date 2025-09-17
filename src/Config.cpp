#include "Serina/Config.hpp"
#include <fstream>
#include <iostream>
#include <sstream>
#include <thread>

namespace Serina
{

    Config &Config::instance()
    {
        static Config instance;
        return instance;
    }

    void Config::loadDefaults()
    {
        // World parameters
        worldWidth_ = 1920;
        worldHeight_ = 1080;

        // Evolution parameters
        mutationRate_ = 0.05;
        crossoverRate_ = 0.7;
        initialPopulation_ = 100;
        maxPopulation_ = 10000;

        // Simulation parameters
        simulationSpeed_ = 1.0;
        enableVisualization_ = true;
        autoSaveInterval_ = 1000; // Save every 1000 generations

        // Performance parameters
        enableSIMD_ = true;
        enableOpenMP_ = true;
        maxThreads_ = std::thread::hardware_concurrency();

        // Environment parameters
        resourceRegenerationRate_ = 0.1;
        environmentalPressure_ = 0.5;
    }

    void Config::load(const std::string &filename)
    {
        std::ifstream file(filename);
        if (!file.is_open())
        {
            std::cerr << "Warning: Could not open config file '" << filename 
                      << "'. Using default values." << std::endl;
            loadDefaults();
            return;
        }

        try
        {
            std::unordered_map<std::string, std::string> configData;
            std::string line;
            std::string currentSection;

            while (std::getline(file, line))
            {
                // Skip empty lines and comments
                if (line.empty() || line[0] == '#' || line[0] == ';')
                    continue;

                // Handle sections [section_name]
                if (line[0] == '[' && line.back() == ']')
                {
                    currentSection = line.substr(1, line.length() - 2);
                    continue;
                }

                // Parse key=value pairs
                size_t equalPos = line.find('=');
                if (equalPos != std::string::npos)
                {
                    std::string key = line.substr(0, equalPos);
                    std::string value = line.substr(equalPos + 1);

                    // Trim whitespace
                    key.erase(0, key.find_first_not_of(" \t"));
                    key.erase(key.find_last_not_of(" \t") + 1);
                    value.erase(0, value.find_first_not_of(" \t"));
                    value.erase(value.find_last_not_of(" \t") + 1);

                    configData[currentSection + "." + key] = value;
                }
            }

            // Parse different sections
            parseGeneralSettings(configData);
            parseEvolutionSettings(configData);
            parseSimulationSettings(configData);
            parsePerformanceSettings(configData);
            parseEnvironmentSettings(configData);

            if (!validate())
            {
                std::cerr << "Warning: Invalid configuration detected. Using safe defaults." << std::endl;
                loadDefaults();
            }
        }
        catch (const std::exception &e)
        {
            std::cerr << "Error parsing config file: " << e.what() << std::endl;
            loadDefaults();
        }
    }

    void Config::save(const std::string &filename) const
    {
        std::ofstream file(filename);
        if (!file.is_open())
        {
            throw std::runtime_error("Could not open config file for writing: " + filename);
        }

        file << "# Serina Evolution Simulation Configuration\n";
        file << "# Generated automatically - modify with care\n\n";

        file << "[general]\n";
        file << "world_width=" << worldWidth_ << "\n";
        file << "world_height=" << worldHeight_ << "\n\n";

        file << "[evolution]\n";
        file << "mutation_rate=" << mutationRate_ << "\n";
        file << "crossover_rate=" << crossoverRate_ << "\n";
        file << "initial_population=" << initialPopulation_ << "\n";
        file << "max_population=" << maxPopulation_ << "\n\n";

        file << "[simulation]\n";
        file << "simulation_speed=" << simulationSpeed_ << "\n";
        file << "enable_visualization=" << (enableVisualization_ ? "true" : "false") << "\n";
        file << "auto_save_interval=" << autoSaveInterval_ << "\n\n";

        file << "[performance]\n";
        file << "enable_simd=" << (enableSIMD_ ? "true" : "false") << "\n";
        file << "enable_openmp=" << (enableOpenMP_ ? "true" : "false") << "\n";
        file << "max_threads=" << maxThreads_ << "\n\n";

        file << "[environment]\n";
        file << "resource_regeneration_rate=" << resourceRegenerationRate_ << "\n";
        file << "environmental_pressure=" << environmentalPressure_ << "\n";
    }

    bool Config::validate() const
    {
        // Validate world parameters
        if (worldWidth_ <= 0 || worldHeight_ <= 0)
            return false;

        // Validate evolution parameters
        if (mutationRate_ < 0.0 || mutationRate_ > 1.0)
            return false;
        if (crossoverRate_ < 0.0 || crossoverRate_ > 1.0)
            return false;
        if (initialPopulation_ <= 0 || maxPopulation_ <= 0)
            return false;
        if (initialPopulation_ > maxPopulation_)
            return false;

        // Validate simulation parameters
        if (simulationSpeed_ <= 0.0)
            return false;
        if (autoSaveInterval_ <= 0)
            return false;

        // Validate performance parameters
        if (maxThreads_ <= 0)
            return false;

        // Validate environment parameters
        if (resourceRegenerationRate_ < 0.0 || resourceRegenerationRate_ > 1.0)
            return false;
        if (environmentalPressure_ < 0.0 || environmentalPressure_ > 1.0)
            return false;

        return true;
    }

    void Config::parseGeneralSettings(const std::unordered_map<std::string, std::string> &data)
    {
        auto it = data.find("general.world_width");
        if (it != data.end())
            worldWidth_ = std::stoi(it->second);

        it = data.find("general.world_height");
        if (it != data.end())
            worldHeight_ = std::stoi(it->second);
    }

    void Config::parseEvolutionSettings(const std::unordered_map<std::string, std::string> &data)
    {
        auto it = data.find("evolution.mutation_rate");
        if (it != data.end())
            mutationRate_ = std::stod(it->second);

        it = data.find("evolution.crossover_rate");
        if (it != data.end())
            crossoverRate_ = std::stod(it->second);

        it = data.find("evolution.initial_population");
        if (it != data.end())
            initialPopulation_ = std::stoi(it->second);

        it = data.find("evolution.max_population");
        if (it != data.end())
            maxPopulation_ = std::stoi(it->second);
    }

    void Config::parseSimulationSettings(const std::unordered_map<std::string, std::string> &data)
    {
        auto it = data.find("simulation.simulation_speed");
        if (it != data.end())
            simulationSpeed_ = std::stod(it->second);

        it = data.find("simulation.enable_visualization");
        if (it != data.end())
            enableVisualization_ = (it->second == "true" || it->second == "1");

        it = data.find("simulation.auto_save_interval");
        if (it != data.end())
            autoSaveInterval_ = std::stoi(it->second);
    }

    void Config::parsePerformanceSettings(const std::unordered_map<std::string, std::string> &data)
    {
        auto it = data.find("performance.enable_simd");
        if (it != data.end())
            enableSIMD_ = (it->second == "true" || it->second == "1");

        it = data.find("performance.enable_openmp");
        if (it != data.end())
            enableOpenMP_ = (it->second == "true" || it->second == "1");

        it = data.find("performance.max_threads");
        if (it != data.end())
            maxThreads_ = std::stoi(it->second);
    }

    void Config::parseEnvironmentSettings(const std::unordered_map<std::string, std::string> &data)
    {
        auto it = data.find("environment.resource_regeneration_rate");
        if (it != data.end())
            resourceRegenerationRate_ = std::stod(it->second);

        it = data.find("environment.environmental_pressure");
        if (it != data.end())
            environmentalPressure_ = std::stod(it->second);
    }

} // namespace Serina