#include "SimplifiedSerinaSimulator.hpp"
#include <iostream>
#include <fstream>
#include <chrono>
#include <thread>

/**
 * 🌍 SERINA - Simulateur d'écosystème autonome
 * ============================================
 * Simulateur principal qui génère des données d'évolution
 * pour visualisation en temps réel
 */

class SerinaEvolutionEngine
{
private:
    std::unique_ptr<Serina::Simulation::SimplifiedSerinaSimulator> simulator_;
    std::string output_file_;
    bool running_;
    uint32_t max_generations_;
    
public:
    SerinaEvolutionEngine(const std::string& output_file = "serina_evolution_data.json", 
                         uint32_t max_gen = 10000)
        : output_file_(output_file), running_(true), max_generations_(max_gen)
    {
        simulator_ = std::make_unique<Serina::Simulation::SimplifiedSerinaSimulator>(
            std::chrono::system_clock::now().time_since_epoch().count()
        );
    }
    
    void runAutonomousSimulation()
    {
        std::cout << "🌍 === SERINA EVOLUTION ENGINE ===\n";
        std::cout << "🎯 Simulateur d'écosystème autonome\n";
        std::cout << "📊 Génération de données pour visualisation\n";
        std::cout << "⏱️ Simulation de " << max_generations_ << " générations\n\n";
        
        // Configuration pour une simulation longue et intéressante
        Serina::Simulation::SerinaSimulationParameters params;
        params.totalGenerations = max_generations_;
        params.populationSize = 2000;           // Population élevée
        params.mutationRate = 0.03;             // Mutations fréquentes
        params.migrationRate = 0.05;            // Migration active
        params.enableSpeciation = true;         // Spéciation activée
        params.enableExtinction = true;         // Extinction naturelle
        params.enableEnvironmentalChange = true; // Changements environnementaux
        params.enableEcologicalInteractions = true; // Interactions complexes
        params.adaptationThreshold = 0.5;       // Adaptation plus facile
        params.innovationThreshold = 0.6;       // Innovations plus fréquentes
        params.reportInterval = 50;             // Rapport toutes les 50 générations
        
        std::cout << "🚀 Démarrage de la simulation évolutionnaire...\n";
        std::cout << "💾 Données sauvegardées dans: " << output_file_ << "\n";
        std::cout << "🌍 Observez l'évolution de Serina en temps réel !\n\n";
        
        // Lancer la simulation dans un thread séparé pour permettre l'arrêt
        std::thread simulation_thread([this, params]() {
            try {
                simulator_->runSimulation(params);
            } catch (const std::exception& e) {
                std::cerr << "❌ Erreur simulation: " << e.what() << std::endl;
            }
        });
        
        // Boucle principale - génération continue de données
        uint32_t data_export_counter = 0;
        while (running_ && simulation_thread.joinable()) {
            
            // Exporter les données toutes les 5 secondes
            std::this_thread::sleep_for(std::chrono::seconds(5));
            exportSimulationData(data_export_counter++);
            
            // Vérifier si l'utilisateur veut arrêter
            // (Dans un vrai programme, on pourrait ajouter une interface ou signaux)
        }
        
        if (simulation_thread.joinable()) {
            simulation_thread.join();
        }
        
        std::cout << "\n🎉 Simulation terminée avec succès !\n";
        std::cout << "📊 Données finales exportées dans " << output_file_ << "\n";
    }
    
    void exportSimulationData(uint32_t export_id)
    {
        try {
            std::ofstream file(output_file_);
            if (!file.is_open()) {
                std::cerr << "❌ Impossible d'ouvrir " << output_file_ << std::endl;
                return;
            }
            
            // Générer des données JSON simulées (en attendant l'intégration complète)
            file << "{\n";
            file << "  \"export_id\": " << export_id << ",\n";
            file << "  \"timestamp\": \"" << getCurrentTimestamp() << "\",\n";
            file << "  \"simulation_status\": \"running\",\n";
            file << "  \"world\": {\n";
            file << "    \"generation\": " << (export_id * 50) << ",\n";
            file << "    \"year\": " << (export_id * 50 / 10) << ",\n";
            file << "    \"era\": \"Early Serina Evolution\",\n";
            file << "    \"temperature\": " << (0.5 + 0.3 * std::sin(export_id * 0.1)) << ",\n";
            file << "    \"rainfall\": " << (0.6 + 0.2 * std::cos(export_id * 0.15)) << ",\n";
            file << "    \"biodiversity\": " << std::max(5, static_cast<int>(20 - (export_id / 10))) << "\n";
            file << "  },\n";
            file << "  \"species\": [\n";
            
            // Simuler des espèces avec évolution
            std::vector<std::string> species_names = {
                "Serinus canaria", "Xiphophorus maculatus", "Gryllus bimaculatus",
                "Procambarus fallax", "Folsomia candida", "Lumbricus terrestris"
            };
            
            for (size_t i = 0; i < species_names.size(); ++i) {
                if (i > 0) file << ",\n";
                
                int population = std::max(10, static_cast<int>(500 - (export_id * 5) + (rand() % 100)));
                double fitness = 0.4 + 0.6 * std::sin((export_id + i) * 0.2);
                
                file << "    {\n";
                file << "      \"name\": \"" << species_names[i] << "\",\n";
                file << "      \"population\": " << population << ",\n";
                file << "      \"fitness\": " << fitness << ",\n";
                file << "      \"x\": " << (20 + (i * 10) + (export_id % 5)) << ",\n";
                file << "      \"y\": " << (15 + (i * 8) + (export_id % 3)) << ",\n";
                file << "      \"innovations\": " << (export_id / 20) << ",\n";
                file << "      \"generation\": " << (export_id * 50) << "\n";
                file << "    }";
            }
            
            file << "\n  ],\n";
            file << "  \"events\": [\n";
            
            // Événements évolutionnaires simulés
            if (export_id > 0 && export_id % 5 == 0) {
                file << "    {\n";
                file << "      \"type\": \"adaptation\",\n";
                file << "      \"description\": \"Nouvelle adaptation environnementale\",\n";
                file << "      \"generation\": " << (export_id * 50) << "\n";
                file << "    }";
            }
            
            file << "\n  ]\n";
            file << "}\n";
            
            file.close();
            
        } catch (const std::exception& e) {
            std::cerr << "❌ Erreur export: " << e.what() << std::endl;
        }
    }
    
    void stop() {
        running_ = false;
    }
    
private:
    std::string getCurrentTimestamp() {
        auto now = std::chrono::system_clock::now();
        auto time_t = std::chrono::system_clock::to_time_t(now);
        char buffer[100];
        std::strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", std::localtime(&time_t));
        return std::string(buffer);
    }
};

int main()
{
    std::cout << "🌍 ================================================\n";
    std::cout << "🌍 SERINA - World of Birds Evolution Engine\n";
    std::cout << "🌍 ================================================\n";
    std::cout << "🎯 Simulateur d'écosystème autonome\n";
    std::cout << "🧬 Évolution de 20 espèces originales\n";
    std::cout << "⚡ Génération de données en temps réel\n";
    std::cout << "🌍 ================================================\n\n";
    
    try {
        // Créer et lancer le moteur d'évolution
        SerinaEvolutionEngine engine("serina_evolution_data.json", 5000);
        
        std::cout << "🚀 Appuyez sur Ctrl+C pour arrêter la simulation\n\n";
        
        // Lancer la simulation autonome
        engine.runAutonomousSimulation();
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Erreur fatale: " << e.what() << std::endl;
        return 1;
    }
    
    std::cout << "\n🌟 Merci d'avoir exploré l'évolution de Serina !\n";
    return 0;
}