#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"
#include "Serina/PhysicsEngine.hpp"
#include "Serina/SimulationAPI.hpp"

TEST_CASE("Genome traits, mutation, crossover and fitness", "[genome]") {
    Serina::Genome genome1;

    REQUIRE(genome1.getTrait(Serina::TraitType::SIZE) >= 0.0);
    REQUIRE(genome1.getTrait(Serina::TraitType::SPEED) >= 0.0);

    genome1.setTrait(Serina::TraitType::SIZE, 0.8);
    REQUIRE(std::abs(genome1.getTrait(Serina::TraitType::SIZE) - 0.8) < 0.001);

    genome1.mutate(0.5); // High mutation rate; trait may or may not change, just must stay valid
    REQUIRE(genome1.getTrait(Serina::TraitType::SIZE) >= 0.0);
    REQUIRE(genome1.getTrait(Serina::TraitType::SIZE) <= 1.0);

    Serina::Genome genome2;
    genome2.setTrait(Serina::TraitType::SIZE, 0.6);
    genome2.setTrait(Serina::TraitType::SPEED, 0.9);

    Serina::Genome child = genome1.crossover(genome2);
    REQUIRE(child.getTrait(Serina::TraitType::SIZE) >= 0.0);
    REQUIRE(child.getTrait(Serina::TraitType::SIZE) <= 1.0);

    REQUIRE(genome1.calculateFitness() >= 0.0);
}

TEST_CASE("Species energy, survival and reproduction", "[species]") {
    Serina::Genome genome;
    genome.setTrait(Serina::TraitType::SIZE, 0.7);
    genome.setTrait(Serina::TraitType::SPEED, 0.8);

    Serina::Species species("TestSpecies", genome);
    REQUIRE(species.getName() == "TestSpecies");
    REQUIRE(species.getEnergy() > 0.0);

    species.setEnergy(75.0);
    REQUIRE(species.getEnergy() == 75.0);

    REQUIRE(species.survives(50.0));
    REQUIRE_FALSE(species.survives(100.0));

    SECTION("reproduction requires both parents above their energy threshold") {
        // Below either parent's reproduction threshold, reproduce() falls
        // back to returning the fitter parent unchanged instead of
        // producing a child (see Species::reproduce()).
        Serina::Genome genome2;
        genome2.setTrait(Serina::TraitType::SIZE, 0.6);
        genome2.setTrait(Serina::TraitType::SPEED, 0.9);
        Serina::Species partner("Partner", genome2);

        species.setEnergy(species.getReproductionThreshold() + 10.0);
        partner.setEnergy(partner.getReproductionThreshold() + 10.0);
        REQUIRE(species.canReproduce());
        REQUIRE(partner.canReproduce());

        Serina::Species child = species.reproduce(partner);
        REQUIRE(child.getName().find("TestSpecies") != std::string::npos);
        REQUIRE(child.getEnergy() > 0.0);
    }
}

TEST_CASE("PhysicsEngine gravity, collisions and forces", "[physics]") {
    Serina::WorldBounds bounds(0, 100, 0, 100);
    Serina::PhysicsEngine physics(-9.81, bounds);

    REQUIRE(physics.getGravity() == -9.81);
    REQUIRE(physics.getBounds().maxX == 100);

    SECTION("collision detection treats size as a diameter") {
        // Entities collide when distance < (sizeA + sizeB) * 0.5.
        Serina::Entity entity1(10, 10, 2.0, 1.0, 1);
        Serina::Entity entity2(11, 10, 2.0, 1.0, 2); // distance = 1, threshold = 2.0

        REQUIRE(entity1.x == 10);
        REQUIRE(entity1.alive);
        REQUIRE(entity1.speciesId == 1);

        REQUIRE(physics.checkCollision(entity1, entity2)); // 1 < 2.0

        entity2.x = 20; // distance = 10, well beyond threshold
        REQUIRE_FALSE(physics.checkCollision(entity1, entity2));
    }

    SECTION("gravity pulls entities down over time") {
        Serina::Entity entity(10, 10, 1.0, 1.0, 1);
        entity.vy = 0;
        std::vector<Serina::Entity> entities = {entity};

        physics.update(entities, 1.0); // 1 second

        REQUIRE(entities[0].vy < 0);
        REQUIRE(entities[0].y < 10);
    }

    SECTION("applying a force changes velocity") {
        Serina::Entity entity(10, 10, 1.0, 1.0, 1);
        physics.applyForce(entity, 10.0, 0.0);
        REQUIRE(entity.vx > 0);
    }
}

TEST_CASE("World terrain, resources, climate and time", "[world]") {
    Serina::World world(20, 15);
    REQUIRE(world.getWidth() == 20);
    REQUIRE(world.getHeight() == 15);

    SECTION("resource management") {
        world.addResource(5, 5, "plants", 50.0);
        REQUIRE(world.getResource(5, 5, "plants") >= 50.0);

        REQUIRE(world.consumeResource(5, 5, "plants", 25.0));
        REQUIRE(world.getResource(5, 5, "plants") >= 25.0);
    }

    SECTION("out-of-bounds coordinates report no resources") {
        REQUIRE(world.getResource(-1, -1, "plants") == 0.0);
        REQUIRE(world.getResource(100, 100, "plants") == 0.0);
    }

    SECTION("terrain and climate can be set per-cell") {
        world.setTerrain(10, 10, Serina::TerrainType::FOREST);
        REQUIRE(world.getTerrain(10, 10) == Serina::TerrainType::FOREST);

        world.setClimate(10, 10, Serina::ClimateZone::TROPICAL);
        REQUIRE(world.getClimate(10, 10) == Serina::ClimateZone::TROPICAL);
    }

    SECTION("temperature and humidity") {
        world.setTemperature(5, 5, 25.0);
        REQUIRE(world.getTemperature(5, 5) == 25.0);

        world.setHumidity(5, 5, 0.7);
        REQUIRE(world.getHumidity(5, 5) == 0.7);
    }

    SECTION("time advances on update") {
        double initialTime = world.getTimeState().currentTime;
        world.update(1.0);
        REQUIRE(world.getTimeState().currentTime > initialTime);
    }

    SECTION("spatial queries") {
        auto plantSources = world.findResourceSources("plants", 10.0);
        REQUIRE(plantSources.size() > 0);

        auto neighbors = world.getNeighbors(10, 10, 1);
        REQUIRE(neighbors.size() <= 8);
    }
}

TEST_CASE("SimulationAPI simple and advanced population modes", "[simulation_api]") {
    Serina::SimulationAPI sim(30, 25);
    sim.initialize();

    sim.step();
    sim.step();

    Serina::Genome genome;
    genome.setTrait(Serina::TraitType::SIZE, 0.7);
    genome.setTrait(Serina::TraitType::SPEED, 0.8);
    sim.addSpecies(Serina::Species("TestSpecies", genome));

    REQUIRE_FALSE(sim.getPopulationData().empty());
    REQUIRE_FALSE(sim.getWorldState().empty());

    SECTION("simple mode statistics") {
        auto stats = sim.getStatistics();
        REQUIRE(stats.speciesCount > 0);
    }

    SECTION("advanced population mode") {
        sim.enableAdvancedPopulation(true, 50);
        REQUIRE(sim.isAdvancedMode());

        for (int i = 0; i < 5; ++i) {
            sim.step();
        }

        auto stats = sim.getStatistics();
        REQUIRE(stats.totalPopulation > 0);
    }
}
