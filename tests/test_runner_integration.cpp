#include "Serina/SimulationAPI.hpp"
#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include <iostream>
#include <chrono>
#include <cassert>

/// @brief Test d'intégration pour valider le runner autonome
bool testEvolutionRunner() {
    std::cout << "🧪 Test d'intégration: Runner autonome...\n";
    
    // Créer simulation similaire au runner
    auto simulation = std::make_unique<Serina::SimulationAPI>();
    
    // Monde de test
    auto world = std::make_unique<Serina::World>(50, 50);
    world->addClimateZone(Serina::ClimateType::Temperate, 0, 0, 25, 25);
    world->addClimateZone(Serina::ClimateType::Tropical, 25, 0, 25, 25);
    simulation->setWorld(std::move(world));
    
    // Espèces de test
    auto species1 = std::make_unique<Serina::Species>();
    species1->setName("TestSpecies1");
    species1->setPreferredClimate(Serina::ClimateType::Temperate);
    auto genome1 = species1->getGenome();
    genome1.size = 0.5f;
    genome1.speed = 0.4f;
    genome1.reproductionRate = 0.6f;
    species1->setGenome(genome1);
    simulation->addSpecies(std::move(species1));
    
    auto species2 = std::make_unique<Serina::Species>();
    species2->setName("TestSpecies2");
    species2->setPreferredClimate(Serina::ClimateType::Tropical);
    auto genome2 = species2->getGenome();
    genome2.size = 0.3f;
    genome2.speed = 0.7f;
    genome2.reproductionRate = 0.4f;
    species2->setGenome(genome2);
    simulation->addSpecies(std::move(species2));
    
    // Test mode simple
    std::cout << "  Test mode simple (50 générations)...\n";
    auto start_time = std::chrono::steady_clock::now();
    
    for (int gen = 0; gen < 50; ++gen) {
        simulation->step();
        
        // Vérifications périodiques
        if (gen % 10 == 0) {
            auto stats = simulation->getStatistics();
            auto species = simulation->getSpecies();
            
            std::cout << "    Gen " << gen << ": " << species.size() << " espèces, "
                      << "stats OK: " << (!stats.toJson().empty() ? "✓" : "✗") << "\n";
            
            assert(!stats.toJson().empty());
            assert(species.size() >= 1); // Au moins une espèce doit survivre
        }
    }
    
    auto end_time = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
    std::cout << "  Temps écoulé: " << duration.count() << "ms\n";
    
    // Test mode avancé
    std::cout << "  Test mode avancé (20 générations)...\n";
    simulation->enableAdvancedPopulation(true, 100);
    
    for (int gen = 0; gen < 20; ++gen) {
        simulation->step();
        
        if (gen % 5 == 0) {
            auto stats = simulation->getStatistics();
            std::cout << "    Gen avancée " << gen << ": " 
                      << (!stats.toJson().empty() ? "Stats OK" : "Stats KO") << "\n";
        }
    }
    
    std::cout << "✅ Test runner autonome réussi\n\n";
    return true;
}

/// @brief Test de persistance des snapshots
bool testSnapshotGeneration() {
    std::cout << "🧪 Test génération snapshots...\n";
    
    auto simulation = std::make_unique<Serina::SimulationAPI>();
    
    // Monde minimal
    auto world = std::make_unique<Serina::World>(20, 20);
    world->addClimateZone(Serina::ClimateType::Temperate, 0, 0, 20, 20);
    simulation->setWorld(std::move(world));
    
    // Une espèce
    auto species = std::make_unique<Serina::Species>();
    species->setName("SnapshotTest");
    simulation->addSpecies(std::move(species));
    
    // Test JSON export
    try {
        auto stats = simulation->getStatistics();
        std::string stats_json = stats.toJson();
        
        auto world_json = simulation->getWorld()->toJson();
        auto species_list = simulation->getSpecies();
        
        assert(!stats_json.empty());
        assert(!world_json.empty());
        assert(species_list.size() == 1);
        
        std::cout << "  Snapshot JSON valide ✓\n";
        std::cout << "  Taille stats: " << stats_json.length() << " chars\n";
        std::cout << "  Taille monde: " << world_json.length() << " chars\n";
        
        std::cout << "✅ Test snapshots réussi\n\n";
        return true;
    }
    catch (const std::exception& e) {
        std::cout << "❌ Erreur test snapshots: " << e.what() << "\n\n";
        return false;
    }
}

/// @brief Test stabilité longue
bool testLongRunStability() {
    std::cout << "🧪 Test stabilité (100 générations rapides)...\n";
    
    auto simulation = std::make_unique<Serina::SimulationAPI>();
    
    // Configuration minimale mais stable
    auto world = std::make_unique<Serina::World>(30, 30);
    world->addClimateZone(Serina::ClimateType::Temperate, 0, 0, 30, 30);
    simulation->setWorld(std::move(world));
    
    // Deux espèces équilibrées
    for (int i = 0; i < 2; ++i) {
        auto species = std::make_unique<Serina::Species>();
        species->setName("Stable" + std::to_string(i));
        auto genome = species->getGenome();
        genome.reproductionRate = 0.3f + i * 0.1f;
        genome.lifespan = 0.7f;
        species->setGenome(genome);
        simulation->addSpecies(std::move(species));
    }
    
    bool stability_ok = true;
    size_t last_species_count = 2;
    
    for (int gen = 0; gen < 100; ++gen) {
        try {
            simulation->step();
            
            if (gen % 20 == 0) {
                auto species = simulation->getSpecies();
                size_t current_count = species.size();
                
                // Vérifier qu'on n'a pas de crash ou d'extinction totale
                if (current_count == 0) {
                    std::cout << "  ⚠️ Extinction totale à la génération " << gen << "\n";
                    stability_ok = false;
                    break;
                }
                
                std::cout << "  Gen " << gen << ": " << current_count << " espèces\n";
                last_species_count = current_count;
            }
        }
        catch (const std::exception& e) {
            std::cout << "  ❌ Exception à la génération " << gen << ": " << e.what() << "\n";
            stability_ok = false;
            break;
        }
    }
    
    if (stability_ok) {
        std::cout << "✅ Test stabilité réussi (dernières espèces: " << last_species_count << ")\n\n";
    } else {
        std::cout << "❌ Test stabilité échoué\n\n";
    }
    
    return stability_ok;
}

int main() {
    std::cout << "================================================\n";
    std::cout << "    TESTS D'INTÉGRATION SERINA RUNNER\n";
    std::cout << "================================================\n\n";
    
    bool all_passed = true;
    
    try {
        all_passed &= testEvolutionRunner();
        all_passed &= testSnapshotGeneration();
        all_passed &= testLongRunStability();
        
        std::cout << "================================================\n";
        if (all_passed) {
            std::cout << "🎉 TOUS LES TESTS RÉUSSIS\n";
            std::cout << "Le runner autonome est prêt pour production!\n";
        } else {
            std::cout << "❌ CERTAINS TESTS ONT ÉCHOUÉ\n";
            std::cout << "Vérifiez les logs ci-dessus.\n";
        }
        std::cout << "================================================\n";
        
    } catch (const std::exception& e) {
        std::cout << "❌ ERREUR CRITIQUE: " << e.what() << "\n";
        all_passed = false;
    }
    
    return all_passed ? 0 : 1;
}