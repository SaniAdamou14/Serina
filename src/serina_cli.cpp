#include "SerinaSimulator.hpp"
#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <chrono>
#include <nlohmann/json.hpp>

using namespace Serina;
using json = nlohmann::json;

namespace {

int64_t nowMs()
{
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

json speciesStatsToJson(const Simulation::SpeciesSimulationStats &s)
{
    json j;
    j["totalPopulation"] = s.totalPopulation;
    j["averageFitness"] = s.averageFitness;
    j["geneticDiversity"] = s.geneticDiversity;
    j["occupiedEnvironments"] = json::array();
    for (auto e : s.occupiedEnvironments)
        j["occupiedEnvironments"].push_back(static_cast<int>(e));
    j["acquiredAdaptations"] = s.acquiredAdaptations;
    j["evolutionaryInnovations"] = s.evolutionaryInnovations;
    j["generationsSinceLastInnovation"] = s.generationsSinceLastInnovation;
    j["extinctionRisk"] = s.extinctionRisk;
    return j;
}

Simulation::SpeciesSimulationStats speciesStatsFromJson(const std::string &name, const json &j)
{
    Simulation::SpeciesSimulationStats s;
    s.species = name;
    s.totalPopulation = j.value("totalPopulation", 0u);
    s.averageFitness = j.value("averageFitness", 0.0);
    s.geneticDiversity = j.value("geneticDiversity", 0.0);
    if (j.contains("occupiedEnvironments"))
    {
        for (const auto &e : j.at("occupiedEnvironments"))
            s.occupiedEnvironments.push_back(static_cast<Ecosystem::EnvironmentType>(e.get<int>()));
    }
    s.acquiredAdaptations = j.value("acquiredAdaptations", std::vector<std::string>{});
    s.evolutionaryInnovations = j.value("evolutionaryInnovations", std::vector<std::string>{});
    s.generationsSinceLastInnovation = j.value("generationsSinceLastInnovation", 0u);
    s.extinctionRisk = j.value("extinctionRisk", 0.0);
    return s;
}

} // namespace

/// @brief CLI interface pour la simulation Serina, utilisée par le backend web.
/// Chaque invocation est un processus indépendant (pas de démon) : l'état de
/// la simulation est donc persisté dans un fichier JSON entre les appels, de
/// sorte que `status`/`world`/`genetics` rapportent l'évolution réelle
/// accumulée par les appels `init`/`run` précédents plutôt que des données
/// figées.
class SerinaCLI
{
private:
    std::unique_ptr<Simulation::SerinaEcosystemSimulator> simulator_;
    std::string statePath_;
    bool verbose_;

public:
    SerinaCLI(std::string statePath, bool verbose)
        : simulator_(std::make_unique<Simulation::SerinaEcosystemSimulator>()),
          statePath_(std::move(statePath)), verbose_(verbose)
    {
        loadState();
    }

    bool hasPopulations() const { return !simulator_->getSpeciesStats().empty(); }

    bool loadState()
    {
        std::ifstream in(statePath_);
        if (!in.is_open())
            return false;

        try
        {
            json j;
            in >> j;

            std::unordered_map<std::string, Simulation::SpeciesSimulationStats> stats;
            if (j.contains("speciesStats"))
            {
                for (auto it = j.at("speciesStats").begin(); it != j.at("speciesStats").end(); ++it)
                    stats[it.key()] = speciesStatsFromJson(it.key(), it.value());
            }

            simulator_->restoreState(
                j.value("generation", 0u), std::move(stats),
                j.value("totalBiodiversity", 0.0), j.value("ecosystemStability", 1.0),
                j.value("totalSpeciations", 0u), j.value("totalExtinctions", 0u));
            return true;
        }
        catch (const std::exception &e)
        {
            if (verbose_)
                std::cerr << "Impossible de charger l'etat depuis " << statePath_ << ": " << e.what() << std::endl;
            return false;
        }
    }

    void saveState() const
    {
        json j;
        j["generation"] = simulator_->getCurrentGeneration();
        j["totalBiodiversity"] = simulator_->getTotalBiodiversity();
        j["ecosystemStability"] = simulator_->getEcosystemStability();
        j["totalSpeciations"] = simulator_->getTotalSpeciationsEvents();
        j["totalExtinctions"] = simulator_->getTotalExtinctionEvents();

        json statsJson = json::object();
        for (const auto &[name, stats] : simulator_->getSpeciesStats())
            statsJson[name] = speciesStatsToJson(stats);
        j["speciesStats"] = statsJson;

        std::ofstream out(statePath_);
        out << j.dump(2);
    }

    /// @brief Initialise (ou reprend) la simulation et persiste l'état.
    json initializeSimulation()
    {
        json result;
        result["status"] = "success";
        result["action"] = "initialize";

        try
        {
            bool resumed = hasPopulations();
            if (!resumed)
                simulator_->seedInitialPopulations();

            saveState();

            result["resumed"] = resumed;
            result["speciesCount"] = simulator_->getSpeciesStats().size();
            result["generation"] = simulator_->getCurrentGeneration();
            result["timestamp"] = nowMs();
        }
        catch (const std::exception &e)
        {
            result["status"] = "error";
            result["error"] = e.what();
        }

        return result;
    }

    /// @brief Avance la simulation de N générations réelles et persiste l'état.
    json runSimulation(uint32_t steps)
    {
        json result;
        result["status"] = "success";
        result["action"] = "simulate";

        try
        {
            if (!hasPopulations())
                simulator_->seedInitialPopulations();

            auto startTime = std::chrono::high_resolution_clock::now();
            for (uint32_t i = 0; i < steps; ++i)
                simulator_->simulateGeneration();
            auto endTime = std::chrono::high_resolution_clock::now();

            saveState();

            result["steps_completed"] = steps;
            result["generation"] = simulator_->getCurrentGeneration();
            result["species_count"] = simulator_->getSpeciesStats().size();
            result["execution_time_ms"] = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count();
            result["timestamp"] = nowMs();
        }
        catch (const std::exception &e)
        {
            result["status"] = "error";
            result["error"] = e.what();
        }

        return result;
    }

    /// @brief Rapporte l'état réel de l'écosystème (population, espèces, stabilité).
    json getEcosystemStatus()
    {
        json result;
        result["status"] = "success";
        result["action"] = "status";

        try
        {
            const auto &speciesStats = simulator_->getSpeciesStats();

            uint64_t totalPopulation = 0;
            for (const auto &[name, s] : speciesStats)
                totalPopulation += s.totalPopulation;

            result["ecosystem"] = {
                {"generation", simulator_->getCurrentGeneration()},
                {"total_species", speciesStats.size()},
                {"total_population", totalPopulation},
                {"biodiversity_index", simulator_->getTotalBiodiversity()},
                {"ecosystem_stability", simulator_->getEcosystemStability()},
                {"total_speciations", simulator_->getTotalSpeciationsEvents()},
                {"total_extinctions", simulator_->getTotalExtinctionEvents()}};

            result["species"] = json::array();
            for (const auto &[name, s] : speciesStats)
            {
                json sp;
                sp["name"] = name;
                sp["population"] = s.totalPopulation;
                sp["fitness"] = s.averageFitness;
                sp["geneticDiversity"] = s.geneticDiversity;
                sp["extinctionRisk"] = s.extinctionRisk;
                sp["adaptations"] = s.acquiredAdaptations;
                sp["innovations"] = s.evolutionaryInnovations;
                result["species"].push_back(sp);
            }

            result["timestamp"] = nowMs();
        }
        catch (const std::exception &e)
        {
            result["status"] = "error";
            result["error"] = e.what();
        }

        return result;
    }

    /// @brief Rapporte les paramètres réels de l'environnement de départ
    /// (prairie, où toutes les espèces d'origine sont placées) plutôt que
    /// des constantes inventées.
    json getWorldData()
    {
        json result;
        result["status"] = "success";
        result["action"] = "world_data";

        try
        {
            const auto *env = simulator_->getEnvironments().getEnvironment(Ecosystem::EnvironmentType::GRASSLAND);

            if (env)
            {
                result["world"] = {
                    {"primaryEnvironment", env->name},
                    {"description", env->description},
                    {"climate", {{"temperature", env->climate.temperature},
                                 {"humidity", env->climate.humidity},
                                 {"precipitation", env->climate.precipitation},
                                 {"windSpeed", env->climate.windSpeed},
                                 {"sunlightIntensity", env->climate.sunlightIntensity}}},
                    {"resources", {{"primaryProducers", env->resources.primaryProducers},
                                   {"smallPrey", env->resources.smallPrey},
                                   {"waterQuality", env->resources.waterQuality},
                                   {"shelter", env->resources.shelter}}},
                    {"pressures", {{"predationPressure", env->pressures.predationPressure},
                                   {"competitionIntensity", env->pressures.competitionIntensity},
                                   {"resourceScarcity", env->pressures.resourceScarcity},
                                   {"climaticStress", env->pressures.climaticStress}}},
                    {"carryingCapacity", env->carryingCapacity}};
            }
            else
            {
                result["world"] = json::object();
            }

            result["generation"] = simulator_->getCurrentGeneration();
            result["timestamp"] = nowMs();
        }
        catch (const std::exception &e)
        {
            result["status"] = "error";
            result["error"] = e.what();
        }

        return result;
    }

    /// @brief Rapporte la diversité génétique réelle par espèce, calculée
    /// par le simulateur, plutôt qu'un tableau de traits inventé.
    json getGeneticData()
    {
        json result;
        result["status"] = "success";
        result["action"] = "genetics";

        try
        {
            const auto &speciesStats = simulator_->getSpeciesStats();

            double totalDiversity = 0.0;
            double totalFitness = 0.0;
            for (const auto &[name, s] : speciesStats)
            {
                totalDiversity += s.geneticDiversity;
                totalFitness += s.averageFitness;
            }
            size_t n = speciesStats.size();

            result["genetic_diversity"] = {
                {"overall_diversity", n ? totalDiversity / n : 0.0},
                {"average_fitness", n ? totalFitness / n : 0.0},
                {"species_count", n}};

            result["species"] = json::array();
            for (const auto &[name, s] : speciesStats)
            {
                json sp;
                sp["name"] = name;
                sp["geneticDiversity"] = s.geneticDiversity;
                sp["averageFitness"] = s.averageFitness;
                sp["generationsSinceLastInnovation"] = s.generationsSinceLastInnovation;
                result["species"].push_back(sp);
            }

            result["timestamp"] = nowMs();
        }
        catch (const std::exception &e)
        {
            result["status"] = "error";
            result["error"] = e.what();
        }

        return result;
    }
};

void printUsage(const char *programName)
{
    std::cout << "Usage: " << programName << " [OPTIONS] COMMAND [ARGS...]\n\n";
    std::cout << "Commands:\n";
    std::cout << "  init                                        Initialize (or resume) the simulation\n";
    std::cout << "  run [generations]                          Advance the simulation by N generations (default 1)\n";
    std::cout << "  status                                      Get real ecosystem status\n";
    std::cout << "  world                                       Get real environment data\n";
    std::cout << "  genetics                                    Get real genetic diversity data\n";
    std::cout << "\nOptions:\n";
    std::cout << "  --state-file PATH                          Persisted simulation state (default: serina_state.json)\n";
    std::cout << "  -v, --verbose                              Enable verbose output to stderr\n";
    std::cout << "  -h, --help                                 Show this help message\n";
    std::cout << "\nExamples:\n";
    std::cout << "  " << programName << " init\n";
    std::cout << "  " << programName << " run 50\n";
    std::cout << "  " << programName << " status\n";
}

int main(int argc, char *argv[])
{
    try
    {
        bool verbose = false;
        std::string statePath = "serina_state.json";
        int argIndex = 1;

        // Parse options (n'importe où avant ou après la commande)
        std::vector<std::string> args(argv + 1, argv + argc);
        std::vector<std::string> positional;
        for (size_t i = 0; i < args.size(); ++i)
        {
            const auto &arg = args[i];
            if (arg == "-v" || arg == "--verbose")
            {
                verbose = true;
            }
            else if (arg == "-h" || arg == "--help")
            {
                printUsage(argv[0]);
                return 0;
            }
            else if (arg == "--state-file" && i + 1 < args.size())
            {
                statePath = args[++i];
            }
            else
            {
                positional.push_back(arg);
            }
        }
        (void)argIndex;

        if (positional.empty())
        {
            std::cerr << "Error: No command specified" << std::endl;
            printUsage(argv[0]);
            return 1;
        }

        SerinaCLI cli(statePath, verbose);
        const std::string &command = positional[0];
        json result;

        if (command == "init")
        {
            result = cli.initializeSimulation();
        }
        else if (command == "run")
        {
            uint32_t steps = positional.size() > 1 ? static_cast<uint32_t>(std::stoul(positional[1])) : 1;
            result = cli.runSimulation(steps);
        }
        else if (command == "status")
        {
            result = cli.getEcosystemStatus();
        }
        else if (command == "world")
        {
            result = cli.getWorldData();
        }
        else if (command == "genetics")
        {
            result = cli.getGeneticData();
        }
        else
        {
            std::cerr << "Error: Unknown command '" << command << "'" << std::endl;
            printUsage(argv[0]);
            return 1;
        }

        // Output JSON result to stdout (the only thing consumers should parse)
        std::cout << result.dump(2) << std::endl;
    }
    catch (const std::exception &e)
    {
        json error;
        error["status"] = "error";
        error["error"] = e.what();
        std::cout << error.dump(2) << std::endl;
        return 1;
    }

    return 0;
}
