#include <catch2/catch_test_macros.hpp>
#include "Serina/SimulationAPI.hpp"
#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"

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

TEST_CASE("SimulationAPI survives 50 simple-mode generations then switches to advanced mode", "[runner][integration]") {
    SimulationAPI simulation(50, 50);
    simulation.addSpecies(makeSpecies("TestSpecies1", 0.5, 0.4, 0.6));
    simulation.addSpecies(makeSpecies("TestSpecies2", 0.3, 0.7, 0.4));

    for (int gen = 0; gen < 50; ++gen) {
        simulation.step();

        if (gen % 10 == 0) {
            auto stats = simulation.getStatistics();
            const auto& species = simulation.getSpecies();

            REQUIRE_FALSE(stats.toJson().empty());
            REQUIRE(species.size() >= 1); // Au moins une espèce doit survivre
        }
    }

    simulation.enableAdvancedPopulation(true, 100);
    REQUIRE(simulation.isAdvancedMode());

    for (int gen = 0; gen < 20; ++gen) {
        simulation.step();

        if (gen % 5 == 0) {
            REQUIRE_FALSE(simulation.getStatistics().toJson().empty());
        }
    }
}

TEST_CASE("Simulation state exports as non-empty JSON snapshots", "[runner][snapshot]") {
    SimulationAPI simulation(20, 20);
    simulation.addSpecies(makeSpecies("SnapshotTest", 0.5, 0.5, 0.5));

    auto stats = simulation.getStatistics();
    std::string stats_json = stats.toJson();
    std::string world_json = simulation.getWorldState();
    const auto& species_list = simulation.getSpecies();

    REQUIRE_FALSE(stats_json.empty());
    REQUIRE_FALSE(world_json.empty());
    REQUIRE(species_list.size() == 1);
}

TEST_CASE("Two balanced species survive 100 generations without crashing or total extinction", "[runner][stability]") {
    SimulationAPI simulation(30, 30);

    for (int i = 0; i < 2; ++i) {
        simulation.addSpecies(makeSpecies("Stable" + std::to_string(i), 0.5, 0.5, 0.3 + i * 0.1));
    }

    for (int gen = 0; gen < 100; ++gen) {
        simulation.step();

        if (gen % 20 == 0) {
            REQUIRE(simulation.getSpecies().size() > 0);
        }
    }
}
