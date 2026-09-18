#include "Serina/SimulationAPI.hpp"
#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"
#include <iostream>
#include <chrono>
#include <cassert>

using Serina::Genome;
using Serina::Species;
using Serina::SimulationAPI;
using Serina::TraitType;

namespace {

Species makeSpecies(const std::string& name, double size, double speed, double reproductionRate)
{
    Genome genome;
    genome.setTrait(TraitType::SIZE, size);
    genome.setTrait(TraitType::SPEED, speed);
    genome.setTrait(TraitType::REPRODUCTION_RATE, reproductionRate);
    return Species(name, genome);
}

} // namespace

/// @brief Test d'intégration pour valider le runner autonome
bool testEvolutionRunner() {
    std::cout << "Test d'integration: Runner autonome...\n";

    SimulationAPI simulation(50, 50);
    simulation.addSpecies(makeSpecies("TestSpecies1", 0.5, 0.4, 0.6));
    simulation.addSpecies(makeSpecies("TestSpecies2", 0.3, 0.7, 0.4));

    // Test mode simple
    std::cout << "  Test mode simple (50 generations)...\n";
    auto start_time = std::chrono::steady_clock::now();

    for (int gen = 0; gen < 50; ++gen) {
        simulation.step();

        // Vérifications périodiques
        if (gen % 10 == 0) {
            auto stats = simulation.getStatistics();
            const auto& species = simulation.getSpecies();

            std::cout << "    Gen " << gen << ": " << species.size() << " especes, "
                      << "stats OK: " << (!stats.toJson().empty() ? "oui" : "non") << "\n";

            assert(!stats.toJson().empty());
            assert(species.size() >= 1); // Au moins une espèce doit survivre
        }
    }

    auto end_time = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
    std::cout << "  Temps ecoule: " << duration.count() << "ms\n";

    // Test mode avancé
    std::cout << "  Test mode avance (20 generations)...\n";
    simulation.enableAdvancedPopulation(true, 100);
    assert(simulation.isAdvancedMode());

    for (int gen = 0; gen < 20; ++gen) {
        simulation.step();

        if (gen % 5 == 0) {
            auto stats = simulation.getStatistics();
            std::cout << "    Gen avancee " << gen << ": "
                      << (!stats.toJson().empty() ? "Stats OK" : "Stats KO") << "\n";
            assert(!stats.toJson().empty());
        }
    }

    std::cout << "Test runner autonome reussi\n\n";
    return true;
}

/// @brief Test de persistance des snapshots
bool testSnapshotGeneration() {
    std::cout << "Test generation snapshots...\n";

    SimulationAPI simulation(20, 20);
    simulation.addSpecies(makeSpecies("SnapshotTest", 0.5, 0.5, 0.5));

    // Test JSON export
    try {
        auto stats = simulation.getStatistics();
        std::string stats_json = stats.toJson();

        auto world_json = simulation.getWorldState();
        const auto& species_list = simulation.getSpecies();

        assert(!stats_json.empty());
        assert(!world_json.empty());
        assert(species_list.size() == 1);

        std::cout << "  Snapshot JSON valide\n";
        std::cout << "  Taille stats: " << stats_json.length() << " chars\n";
        std::cout << "  Taille monde: " << world_json.length() << " chars\n";

        std::cout << "Test snapshots reussi\n\n";
        return true;
    }
    catch (const std::exception& e) {
        std::cout << "Erreur test snapshots: " << e.what() << "\n\n";
        return false;
    }
}

/// @brief Test stabilité longue
bool testLongRunStability() {
    std::cout << "Test stabilite (100 generations rapides)...\n";

    SimulationAPI simulation(30, 30);

    // Deux espèces équilibrées
    for (int i = 0; i < 2; ++i) {
        simulation.addSpecies(makeSpecies("Stable" + std::to_string(i), 0.5, 0.5, 0.3 + i * 0.1));
    }

    bool stability_ok = true;
    size_t last_species_count = 2;

    for (int gen = 0; gen < 100; ++gen) {
        try {
            simulation.step();

            if (gen % 20 == 0) {
                const auto& species = simulation.getSpecies();
                size_t current_count = species.size();

                // Vérifier qu'on n'a pas de crash ou d'extinction totale
                if (current_count == 0) {
                    std::cout << "  Extinction totale a la generation " << gen << "\n";
                    stability_ok = false;
                    break;
                }

                std::cout << "  Gen " << gen << ": " << current_count << " especes\n";
                last_species_count = current_count;
            }
        }
        catch (const std::exception& e) {
            std::cout << "  Exception a la generation " << gen << ": " << e.what() << "\n";
            stability_ok = false;
            break;
        }
    }

    if (stability_ok) {
        std::cout << "Test stabilite reussi (dernieres especes: " << last_species_count << ")\n\n";
    } else {
        std::cout << "Test stabilite echoue\n\n";
    }

    return stability_ok;
}

int main() {
    std::cout << "================================================\n";
    std::cout << "    TESTS D'INTEGRATION SERINA RUNNER\n";
    std::cout << "================================================\n\n";

    bool all_passed = true;

    try {
        all_passed &= testEvolutionRunner();
        all_passed &= testSnapshotGeneration();
        all_passed &= testLongRunStability();

        std::cout << "================================================\n";
        if (all_passed) {
            std::cout << "TOUS LES TESTS REUSSIS\n";
        } else {
            std::cout << "CERTAINS TESTS ONT ECHOUE\n";
            std::cout << "Verifiez les logs ci-dessus.\n";
        }
        std::cout << "================================================\n";

    } catch (const std::exception& e) {
        std::cout << "ERREUR CRITIQUE: " << e.what() << "\n";
        all_passed = false;
    }

    return all_passed ? 0 : 1;
}
