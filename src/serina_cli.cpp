#include "SerinaSimulator.hpp"
#include <iostream>
#include <iomanip>
#include <string>
#include <sstream>
#include <chrono>
#include <nlohmann/json.hpp>

using namespace Serina;
using json = nlohmann::json;

/// @brief CLI interface for Serina simulation for web backend integration
class SerinaCLI
{
private:
    std::unique_ptr<Simulation::SerinaEcosystemSimulator> simulator_;
    bool verboseOutput_;

public:
    SerinaCLI(bool verbose = false) 
        : simulator_(std::make_unique<Simulation::SerinaEcosystemSimulator>())
        , verboseOutput_(verbose) {}

    /// @brief Initialize simulation with given parameters
    json initializeSimulation(int worldSize = 100, int initialSpecies = 5, int steps = 1000)
    {
        json result;
        result["status"] = "success";
        result["action"] = "initialize";
        
        try {
            // Redirect cout to stderr during initialization to capture verbose messages
            std::streambuf* orig_cout = std::cout.rdbuf();
            std::cout.rdbuf(std::cerr.rdbuf());
            
            // Create and initialize the simulator (this will output verbose messages to stderr now)
            auto simulator = std::make_unique<Serina::Simulation::SerinaEcosystemSimulator>();
            auto ecosystem = std::make_unique<Serina::Ecosystem::SerinaEcosystem>();
            
            // Restore cout for JSON output
            std::cout.rdbuf(orig_cout);
            
            if (verboseOutput_) {
                std::cerr << "✅ Serina CLI initialization completed" << std::endl;
            }
            
            result["parameters"] = {
                {"worldSize", worldSize},
                {"initialSpecies", initialSpecies},
                {"simulationSteps", steps}
            };
            
            result["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count();
            
        } catch (const std::exception& e) {
            result["status"] = "error";
            result["error"] = e.what();
        }
        
        return result;
    }

    /// @brief Run simulation for specified number of steps
    json runSimulation(int steps = 100)
    {
        json result;
        result["status"] = "success";
        result["action"] = "simulate";
        
        try {
            if (verboseOutput_) {
                std::cerr << "Running simulation for " << steps << " steps..." << std::endl;
            }
            
            auto startTime = std::chrono::high_resolution_clock::now();
            
            // Run the simulation (placeholder - actual simulation logic)
            for (int i = 0; i < steps; ++i) {
                // Simulation step logic would go here
                if (verboseOutput_ && i % (steps / 10) == 0) {
                    std::cerr << "Progress: " << (i * 100 / steps) << "%" << std::endl;
                }
            }
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            result["steps_completed"] = steps;
            result["execution_time_ms"] = duration.count();
            result["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count();
            
        } catch (const std::exception& e) {
            result["status"] = "error";
            result["error"] = e.what();
        }
        
        return result;
    }

    /// @brief Get current ecosystem status
    json getEcosystemStatus()
    {
        json result;
        result["status"] = "success";
        result["action"] = "status";
        
        try {
            // Get ecosystem data (placeholder - would use actual simulator data)
            result["ecosystem"] = {
                {"total_species", 12},
                {"total_population", 2547},
                {"world_time", 15230},
                {"environment_health", 0.85},
                {"biodiversity_index", 0.73}
            };
            
            result["species"] = json::array();
            
            // Add sample species data
            for (int i = 0; i < 5; ++i) {
                json species;
                species["id"] = i + 1;
                species["name"] = "Species_" + std::to_string(i + 1);
                species["population"] = 200 + (i * 150);
                species["health"] = 0.8 + (i * 0.05);
                species["diet_type"] = (i % 3 == 0) ? "herbivore" : ((i % 3 == 1) ? "carnivore" : "omnivore");
                result["species"].push_back(species);
            }
            
            result["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count();
            
        } catch (const std::exception& e) {
            result["status"] = "error";
            result["error"] = e.what();
        }
        
        return result;
    }

    /// @brief Get detailed world data
    json getWorldData()
    {
        json result;
        result["status"] = "success";
        result["action"] = "world_data";
        
        try {
            // Get world environmental data
            result["world"] = {
                {"size", {{"width", 100}, {"height", 100}}},
                {"climate", {
                    {"temperature", 22.5},
                    {"humidity", 0.65},
                    {"precipitation", 0.8}
                }},
                {"terrain", {
                    {"forest_coverage", 0.45},
                    {"water_coverage", 0.25},
                    {"mountain_coverage", 0.15},
                    {"plains_coverage", 0.15}
                }}
            };
            
            result["resources"] = {
                {"food_availability", 0.78},
                {"water_quality", 0.92},
                {"shelter_capacity", 0.67}
            };
            
            result["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count();
            
        } catch (const std::exception& e) {
            result["status"] = "error";
            result["error"] = e.what();
        }
        
        return result;
    }

    /// @brief Get genetic diversity data
    json getGeneticData()
    {
        json result;
        result["status"] = "success";
        result["action"] = "genetics";
        
        try {
            result["genetic_diversity"] = {
                {"overall_diversity", 0.82},
                {"mutation_rate", 0.001},
                {"selection_pressure", 0.35}
            };
            
            result["traits"] = json::array();
            
            // Sample trait data
            std::vector<std::string> traitNames = {
                "Body Size", "Speed", "Intelligence", "Camouflage", "Social Behavior"
            };
            
            for (size_t i = 0; i < traitNames.size(); ++i) {
                json trait;
                trait["name"] = traitNames[i];
                trait["variance"] = 0.15 + (i * 0.1);
                trait["heritability"] = 0.6 + (i * 0.05);
                trait["selection_coefficient"] = -0.1 + (i * 0.05);
                result["traits"].push_back(trait);
            }
            
            result["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count();
            
        } catch (const std::exception& e) {
            result["status"] = "error";
            result["error"] = e.what();
        }
        
        return result;
    }
};

void printUsage(const char* programName)
{
    std::cout << "Usage: " << programName << " [OPTIONS] COMMAND [ARGS...]\n\n";
    std::cout << "Commands:\n";
    std::cout << "  init [world_size] [species_count] [steps]  Initialize simulation\n";
    std::cout << "  run [steps]                                Run simulation for N steps\n";
    std::cout << "  status                                     Get ecosystem status\n";
    std::cout << "  world                                      Get world data\n";
    std::cout << "  genetics                                   Get genetic diversity data\n";
    std::cout << "\nOptions:\n";
    std::cout << "  -v, --verbose                              Enable verbose output to stderr\n";
    std::cout << "  -h, --help                                 Show this help message\n";
    std::cout << "\nExamples:\n";
    std::cout << "  " << programName << " init 50 3 500\n";
    std::cout << "  " << programName << " run 100\n";
    std::cout << "  " << programName << " status\n";
}

int main(int argc, char* argv[])
{
    try {
        bool verbose = false;
        int argIndex = 1;
        
        // Parse options
        while (argIndex < argc && argv[argIndex][0] == '-') {
            std::string arg = argv[argIndex];
            if (arg == "-v" || arg == "--verbose") {
                verbose = true;
            } else if (arg == "-h" || arg == "--help") {
                printUsage(argv[0]);
                return 0;
            } else {
                std::cerr << "Unknown option: " << arg << std::endl;
                printUsage(argv[0]);
                return 1;
            }
            argIndex++;
        }
        
        if (argIndex >= argc) {
            std::cerr << "Error: No command specified" << std::endl;
            printUsage(argv[0]);
            return 1;
        }
        
        SerinaCLI cli(verbose);
        std::string command = argv[argIndex++];
        json result;
        
        if (command == "init") {
            int worldSize = (argIndex < argc) ? std::stoi(argv[argIndex++]) : 100;
            int speciesCount = (argIndex < argc) ? std::stoi(argv[argIndex++]) : 5;
            int steps = (argIndex < argc) ? std::stoi(argv[argIndex++]) : 1000;
            result = cli.initializeSimulation(worldSize, speciesCount, steps);
            
        } else if (command == "run") {
            int steps = (argIndex < argc) ? std::stoi(argv[argIndex++]) : 100;
            result = cli.runSimulation(steps);
            
        } else if (command == "status") {
            result = cli.getEcosystemStatus();
            
        } else if (command == "world") {
            result = cli.getWorldData();
            
        } else if (command == "genetics") {
            result = cli.getGeneticData();
            
        } else {
            std::cerr << "Error: Unknown command '" << command << "'" << std::endl;
            printUsage(argv[0]);
            return 1;
        }
        
        // Output JSON result to stdout
        std::cout << result.dump(2) << std::endl;
        
    } catch (const std::exception& e) {
        json error;
        error["status"] = "error";
        error["error"] = e.what();
        std::cout << error.dump(2) << std::endl;
        return 1;
    }
    
    return 0;
}