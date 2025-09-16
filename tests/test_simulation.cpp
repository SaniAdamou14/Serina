#include <catch2/catch_test_macros.hpp>
#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"

TEST_CASE("World initialization", "[world]") {
    Serina::World world(10, 10);
    REQUIRE(world.getWidth() == 10);
    REQUIRE(world.getHeight() == 10);
}

TEST_CASE("Species creation", "[species]") {
    Serina::Genome genome({1.0, 2.0, 3.0});
    Serina::Species species("Test", genome);
    REQUIRE(species.getName() == "Test");
    REQUIRE(species.getEnergy() == 100.0);
}

TEST_CASE("Genome mutation", "[genome]") {
    Serina::Genome genome({1.0, 1.0, 1.0});
    genome.mutate(0.1);
    // TODO: Check if traits changed
    REQUIRE(genome.getTrait(0) >= 0.1);
}