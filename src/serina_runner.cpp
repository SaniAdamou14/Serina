#include <iostream>
#include <fstream>
#include <chrono>
#include <csignal>
#include <thread>
#include <atomic>
#include <string>
#include <filesystem>
#include <ctime>

// Serina headers
#include "Serina/SimulationAPI.hpp"
#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"

namespace fs = std::filesystem;

/// @brief Runner autonome pour simulations Serina évolutionnaires longues
class SerinaEvolutionRunner {
private:
    std::unique_ptr<Serina::SimulationAPI> simulation_;
    std::atomic<bool> should_stop_{false};

    // Configuration
    size_t max_generations_;
    size_t snapshot_interval_;
    size_t log_interval_;
    std::string output_dir_;
    bool advanced_mode_;
    size_t population_size_;

    // État
    size_t current_generation_;
    std::chrono::steady_clock::time_point start_time_;

    // Fichiers de sortie
    std::ofstream log_file_;
    std::ofstream stats_file_;

public:
    SerinaEvolutionRunner(size_t max_gen = 0, size_t snap_interval = 100,
                         size_t log_interval = 10, const std::string& output_dir = "output",
                         bool advanced = true, size_t pop_size = 1000)
        : max_generations_(max_gen), snapshot_interval_(snap_interval),
          log_interval_(log_interval), output_dir_(output_dir),
          advanced_mode_(advanced), population_size_(pop_size),
          current_generation_(0) {

        // Créer répertoire de sortie
        fs::create_directories(output_dir_);

        // Initialiser simulation (le monde 100x100 est généré et peuplé
        // automatiquement par World lui-même : terrain, climat, ressources).
        simulation_ = std::make_unique<Serina::SimulationAPI>(100, 100);
        simulation_->initialize();

        // Espèces initiales inspirées de Serina
        initializeSpecies();

        // Mode avancé si demandé : bascule sur PopulationManager
        // (individus distincts) au lieu des espèces agrégées simples.
        if (advanced_mode_) {
            simulation_->enableAdvancedPopulation(true, population_size_);
            std::cout << "Mode evolution avancee active (population: " << population_size_ << ")\n";
        }

        // Fichiers de log
        std::string timestamp = getCurrentTimestamp();
        log_file_.open(output_dir_ + "/evolution_log_" + timestamp + ".txt");
        stats_file_.open(output_dir_ + "/evolution_stats_" + timestamp + ".jsonl");

        if (!log_file_.is_open() || !stats_file_.is_open()) {
            throw std::runtime_error("Impossible de creer les fichiers de log");
        }

        start_time_ = std::chrono::steady_clock::now();

        // Gestion signaux
        std::signal(SIGINT, signalHandler);
        std::signal(SIGTERM, signalHandler);

        instance_ = this;
    }

    ~SerinaEvolutionRunner() {
        if (log_file_.is_open()) log_file_.close();
        if (stats_file_.is_open()) stats_file_.close();
        instance_ = nullptr;
    }

    /// @brief Lance la simulation évolutionnaire
    void run() {
        std::cout << "Demarrage simulation evolutionnaire Serina\n";
        std::cout << "Sortie: " << output_dir_ << "\n";
        std::cout << "Configuration: ";
        if (max_generations_ == 0) {
            std::cout << "generations illimitees";
        } else {
            std::cout << max_generations_ << " generations max";
        }
        std::cout << ", snapshots/" << snapshot_interval_ << ", logs/" << log_interval_ << "\n";
        std::cout << "Ctrl+C pour arret gracieux\n\n";

        logEvent("Simulation demarree");
        writeSnapshot(true); // Snapshot initial

        while (!should_stop_ && (max_generations_ == 0 || current_generation_ < max_generations_)) {
            // Étape simulation
            simulation_->step();
            current_generation_++;

            // Logs périodiques
            if (current_generation_ % log_interval_ == 0) {
                logProgress();
                writeStats();
            }

            // Snapshots périodiques
            if (current_generation_ % snapshot_interval_ == 0) {
                writeSnapshot();
            }

            // Petite pause pour éviter 100% CPU
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }

        // Rapport final
        generateFinalReport();
        std::cout << "\nSimulation terminee apres " << current_generation_ << " generations\n";
    }

    void stop() {
        should_stop_ = true;
        logEvent("Arret demande par signal");
    }

private:
    void initializeSpecies() {
        // Espèces de base inspirées de Serina : un canari généraliste et
        // trois lignées de pinsons spécialisées, avec un génome de départ
        // équilibré mais différencié par niche.
        struct BaseSpecies {
            std::string name;
            double size, speed, energyEfficiency, reproductionRate, intelligence;
        };

        std::vector<BaseSpecies> base_species = {
            {"Canary_Ancestor", 0.5, 0.5, 0.6, 0.5, 0.6},
            {"Finch_Ground",    0.55, 0.4, 0.65, 0.55, 0.4},
            {"Finch_Tree",      0.4, 0.7, 0.55, 0.5, 0.5},
            {"Seed_Cracker",    0.6, 0.35, 0.7, 0.45, 0.45},
        };

        for (const auto& bs : base_species) {
            Serina::Genome genome;
            genome.setTrait(Serina::TraitType::SIZE, bs.size);
            genome.setTrait(Serina::TraitType::SPEED, bs.speed);
            genome.setTrait(Serina::TraitType::ENERGY_EFFICIENCY, bs.energyEfficiency);
            genome.setTrait(Serina::TraitType::REPRODUCTION_RATE, bs.reproductionRate);
            genome.setTrait(Serina::TraitType::INTELLIGENCE, bs.intelligence);

            Serina::Species species(bs.name, genome);
            simulation_->addSpecies(species);
        }
    }

    void logProgress() {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::minutes>(now - start_time_).count();

        auto stats = simulation_->getStatistics();

        std::cout << "Gen " << current_generation_ << " | "
                  << stats.speciesCount << " especes | "
                  << stats.totalPopulation << " individus | "
                  << elapsed << "min\n";

        log_file_ << getCurrentTimestamp() << " - Gen " << current_generation_
                  << " - " << stats.speciesCount << " especes, "
                  << stats.totalPopulation << " individus" << std::endl;
        log_file_.flush();
    }

    void writeStats() {
        // Stats JSON par ligne
        auto stats = simulation_->getStatistics();
        stats_file_ << stats.toJson() << std::endl;
        stats_file_.flush();
    }

    void writeSnapshot(bool is_initial = false) {
        std::string prefix = is_initial ? "initial" : "gen_" + std::to_string(current_generation_);
        std::string filename = output_dir_ + "/snapshot_" + prefix + ".json";

        std::ofstream snapshot_file(filename);
        if (snapshot_file.is_open()) {
            // État complet simulation
            snapshot_file << "{\n";
            snapshot_file << "  \"generation\": " << current_generation_ << ",\n";
            snapshot_file << "  \"timestamp\": \"" << getCurrentTimestamp() << "\",\n";
            snapshot_file << "  \"world\": " << simulation_->getWorldState() << ",\n";
            snapshot_file << "  \"species\": [\n";

            const auto& species = simulation_->getSpecies();
            for (size_t i = 0; i < species.size(); ++i) {
                snapshot_file << "    " << species[i].toJson();
                if (i < species.size() - 1) snapshot_file << ",";
                snapshot_file << "\n";
            }

            snapshot_file << "  ],\n";
            snapshot_file << "  \"statistics\": " << simulation_->getStatistics().toJson() << "\n";
            snapshot_file << "}\n";

            snapshot_file.close();

            if (is_initial) {
                std::cout << "Snapshot initial sauve: " << filename << "\n";
            } else if (current_generation_ % (snapshot_interval_ * 10) == 0) {
                std::cout << "Snapshot gen " << current_generation_ << " sauve\n";
            }
        }
    }

    void generateFinalReport() {
        logEvent("Generation rapport final");

        auto end_time = std::chrono::steady_clock::now();
        auto total_duration = std::chrono::duration_cast<std::chrono::minutes>(end_time - start_time_);

        std::string report_file = output_dir_ + "/final_report.txt";
        std::ofstream report(report_file);

        const auto& species = simulation_->getSpecies();
        auto stats = simulation_->getStatistics();

        report << "RAPPORT FINAL SIMULATION SERINA\n";
        report << "================================\n\n";
        report << "Duree totale: " << total_duration.count() << " minutes\n";
        report << "Generations: " << current_generation_ << "\n";
        report << "Especes finales: " << stats.speciesCount << "\n";
        report << "Population totale: " << stats.totalPopulation << "\n\n";

        if (!species.empty()) {
            report << "ESPECES (mode simple):\n";
            for (const auto& sp : species) {
                if (sp.survives(0.0)) {
                    report << "- " << sp.getName() << " (energie: " << sp.getEnergy() << ")\n";
                    report << "  Taille: " << sp.getTrait(Serina::TraitType::SIZE)
                           << ", Vitesse: " << sp.getTrait(Serina::TraitType::SPEED)
                           << ", Intelligence: " << sp.getTrait(Serina::TraitType::INTELLIGENCE) << "\n";
                }
            }
        }

        report.close();

        // Snapshot final
        writeSnapshot();

        std::cout << "Rapport final: " << report_file << "\n";
    }

    void logEvent(const std::string& event) {
        log_file_ << getCurrentTimestamp() << " - " << event << std::endl;
        log_file_.flush();
    }

    std::string getCurrentTimestamp() {
        auto now = std::time(nullptr);
        char buffer[32];
        std::strftime(buffer, sizeof(buffer), "%Y%m%d_%H%M%S", std::localtime(&now));
        return std::string(buffer);
    }

    // Gestion signaux
    static SerinaEvolutionRunner* instance_;
    static void signalHandler(int signal) {
        std::cout << "\nSignal " << signal << " recu, arret en cours...\n";
        if (instance_) {
            instance_->stop();
        }
    }
};

// Static instance pour signal handler
SerinaEvolutionRunner* SerinaEvolutionRunner::instance_ = nullptr;

void printUsage(const char* program_name) {
    std::cout << "Usage: " << program_name << " [options]\n\n";
    std::cout << "Options:\n";
    std::cout << "  -g, --generations N     Nombre maximum de generations (0 = infini)\n";
    std::cout << "  -s, --snapshot N        Intervalle snapshots (defaut: 100)\n";
    std::cout << "  -l, --log N             Intervalle logs (defaut: 10)\n";
    std::cout << "  -o, --output DIR        Repertoire sortie (defaut: output)\n";
    std::cout << "  -p, --population N      Taille population mode avance (defaut: 1000)\n";
    std::cout << "  --simple                Mode simple (sans PopulationManager)\n";
    std::cout << "  -h, --help              Affiche cette aide\n\n";
    std::cout << "Exemple:\n";
    std::cout << "  " << program_name << " -g 5000 -s 50 -o results_run1\n";
}

int main(int argc, char* argv[]) {
    // Paramètres par défaut
    size_t max_generations = 0;
    size_t snapshot_interval = 100;
    size_t log_interval = 10;
    std::string output_dir = "output";
    size_t population_size = 1000;
    bool advanced_mode = true;

    // Parse arguments
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "-h" || arg == "--help") {
            printUsage(argv[0]);
            return 0;
        }
        else if ((arg == "-g" || arg == "--generations") && i + 1 < argc) {
            max_generations = std::stoull(argv[++i]);
        }
        else if ((arg == "-s" || arg == "--snapshot") && i + 1 < argc) {
            snapshot_interval = std::stoull(argv[++i]);
        }
        else if ((arg == "-l" || arg == "--log") && i + 1 < argc) {
            log_interval = std::stoull(argv[++i]);
        }
        else if ((arg == "-o" || arg == "--output") && i + 1 < argc) {
            output_dir = argv[++i];
        }
        else if ((arg == "-p" || arg == "--population") && i + 1 < argc) {
            population_size = std::stoull(argv[++i]);
        }
        else if (arg == "--simple") {
            advanced_mode = false;
        }
        else {
            std::cerr << "Argument inconnu: " << arg << std::endl;
            printUsage(argv[0]);
            return 1;
        }
    }

    try {
        SerinaEvolutionRunner runner(max_generations, snapshot_interval,
                                   log_interval, output_dir,
                                   advanced_mode, population_size);
        runner.run();
    }
    catch (const std::exception& e) {
        std::cerr << "Erreur: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
