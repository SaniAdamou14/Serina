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
        
        // Initialiser simulation
        simulation_ = std::make_unique<Serina::SimulationAPI>();
        
        // Configuration monde
        auto world = std::make_unique<Serina::World>(100, 100); // Grille 100x100
        world->addClimateZone(Serina::ClimateType::Temperate, 0, 0, 50, 50);
        world->addClimateZone(Serina::ClimateType::Tropical, 50, 0, 50, 50);
        world->addClimateZone(Serina::ClimateType::Desert, 0, 50, 50, 50);
        world->addClimateZone(Serina::ClimateType::Arctic, 50, 50, 50, 50);
        
        simulation_->setWorld(std::move(world));
        
        // Espèces initiales
        initializeSpecies();
        
        // Mode avancé si demandé
        if (advanced_mode_) {
            simulation_->enableAdvancedPopulation(true, population_size_);
            std::cout << "🧬 Mode évolution avancée activé (population: " << population_size_ << ")\n";
        }
        
        // Fichiers de log
        std::string timestamp = getCurrentTimestamp();
        log_file_.open(output_dir_ + "/evolution_log_" + timestamp + ".txt");
        stats_file_.open(output_dir_ + "/evolution_stats_" + timestamp + ".jsonl");
        
        if (!log_file_.is_open() || !stats_file_.is_open()) {
            throw std::runtime_error("Impossible de créer les fichiers de log");
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
    }
    
    /// @brief Lance la simulation évolutionnaire
    void run() {
        std::cout << "🌍 Démarrage simulation évolutionnaire Serina\n";
        std::cout << "📁 Sortie: " << output_dir_ << "\n";
        std::cout << "⚙️ Configuration: ";
        if (max_generations_ == 0) {
            std::cout << "∞ générations";
        } else {
            std::cout << max_generations_ << " générations max";
        }
        std::cout << ", snapshots/" << snapshot_interval_ << ", logs/" << log_interval_ << "\n";
        std::cout << "🚀 Ctrl+C pour arrêt gracieux\n\n";
        
        logEvent("Simulation démarrée");
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
        std::cout << "\n🎯 Simulation terminée après " << current_generation_ << " générations\n";
    }
    
    void stop() { 
        should_stop_ = true; 
        logEvent("Arrêt demandé par signal");
    }

private:
    void initializeSpecies() {
        // Espèces de base inspirées de Serina
        std::vector<std::pair<std::string, Serina::ClimateType>> base_species = {
            {"Canary_Ancestor", Serina::ClimateType::Temperate},
            {"Finch_Ground", Serina::ClimateType::Desert},
            {"Finch_Tree", Serina::ClimateType::Tropical},
            {"Seed_Cracker", Serina::ClimateType::Temperate}
        };
        
        for (const auto& [name, climate] : base_species) {
            auto species = std::make_unique<Serina::Species>();
            species->setName(name);
            species->setPreferredClimate(climate);
            
            // Génome initial équilibré
            auto genome = species->getGenome();
            genome.size = 0.5f;
            genome.speed = 0.5f;
            genome.strength = 0.5f;
            genome.intelligence = 0.5f;
            genome.socialness = 0.3f;
            genome.aggressiveness = 0.2f;
            genome.reproductionRate = 0.4f;
            genome.lifespan = 0.6f;
            species->setGenome(genome);
            
            simulation_->addSpecies(std::move(species));
        }
    }
    
    void logProgress() {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::minutes>(now - start_time_).count();
        
        auto species = simulation_->getSpecies();
        size_t total_population = 0;
        for (const auto& sp : species) {
            total_population += sp->getPopulation();
        }
        
        std::cout << "Gen " << current_generation_ << " | " 
                  << species.size() << " espèces | "
                  << total_population << " individus | "
                  << elapsed << "min\n";
        
        log_file_ << getCurrentTimestamp() << " - Gen " << current_generation_ 
                  << " - " << species.size() << " espèces, " 
                  << total_population << " individus" << std::endl;
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
            snapshot_file << "  \"world\": " << simulation_->getWorld()->toJson() << ",\n";
            snapshot_file << "  \"species\": [\n";
            
            auto species = simulation_->getSpecies();
            for (size_t i = 0; i < species.size(); ++i) {
                snapshot_file << "    " << species[i]->toJson();
                if (i < species.size() - 1) snapshot_file << ",";
                snapshot_file << "\n";
            }
            
            snapshot_file << "  ],\n";
            snapshot_file << "  \"statistics\": " << simulation_->getStatistics().toJson() << "\n";
            snapshot_file << "}\n";
            
            snapshot_file.close();
            
            if (is_initial) {
                std::cout << "📸 Snapshot initial sauvé: " << filename << "\n";
            } else if (current_generation_ % (snapshot_interval_ * 10) == 0) {
                std::cout << "📸 Snapshot gen " << current_generation_ << " sauvé\n";
            }
        }
    }
    
    void generateFinalReport() {
        logEvent("Génération rapport final");
        
        auto end_time = std::chrono::steady_clock::now();
        auto total_duration = std::chrono::duration_cast<std::chrono::minutes>(end_time - start_time_);
        
        std::string report_file = output_dir_ + "/final_report.txt";
        std::ofstream report(report_file);
        
        auto species = simulation_->getSpecies();
        size_t total_population = 0;
        for (const auto& sp : species) {
            total_population += sp->getPopulation();
        }
        
        report << "RAPPORT FINAL SIMULATION SERINA\n";
        report << "================================\n\n";
        report << "Durée totale: " << total_duration.count() << " minutes\n";
        report << "Générations: " << current_generation_ << "\n";
        report << "Espèces finales: " << species.size() << "\n";
        report << "Population totale: " << total_population << "\n\n";
        
        report << "ESPÈCES SURVIVANTES:\n";
        for (const auto& sp : species) {
            if (sp->getPopulation() > 0) {
                report << "- " << sp->getName() << " (" << sp->getPopulation() << " individus)\n";
                auto genome = sp->getGenome();
                report << "  Taille: " << genome.size << ", Vitesse: " << genome.speed 
                       << ", Intelligence: " << genome.intelligence << "\n";
            }
        }
        
        report.close();
        
        // Snapshot final
        writeSnapshot();
        
        std::cout << "📋 Rapport final: " << report_file << "\n";
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
        std::cout << "\n🛑 Signal " << signal << " reçu, arrêt en cours...\n";
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
    std::cout << "  -g, --generations N     Nombre maximum de générations (0 = infini)\n";
    std::cout << "  -s, --snapshot N        Intervalle snapshots (défaut: 100)\n";
    std::cout << "  -l, --log N             Intervalle logs (défaut: 10)\n";
    std::cout << "  -o, --output DIR        Répertoire sortie (défaut: output)\n";
    std::cout << "  -p, --population N      Taille population mode avancé (défaut: 1000)\n";
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
        std::cerr << "❌ Erreur: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
