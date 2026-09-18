#include <cassert>
#include <iostream>
#include <memory>
#include <vector>
#include <chrono>
#include "Serina/World.hpp"
#include "Serina/Species.hpp"
#include "Serina/Genome.hpp"
#include "Serina/PhysicsEngine.hpp"
#include "Serina/SimulationAPI.hpp"

void testGenome() {
    std::cout << "Testing Genome..." << std::endl;
    
    // Test default constructor
    Serina::Genome genome1;
    
    // Test with proper TraitType enum
    assert(genome1.getTrait(Serina::TraitType::SIZE) >= 0.0);
    assert(genome1.getTrait(Serina::TraitType::SPEED) >= 0.0);
    
    // Test setting traits
    genome1.setTrait(Serina::TraitType::SIZE, 0.8);
    assert(std::abs(genome1.getTrait(Serina::TraitType::SIZE) - 0.8) < 0.001);
    
    // Test mutation
    double originalSize = genome1.getTrait(Serina::TraitType::SIZE);
    genome1.mutate(0.5);  // High mutation rate to ensure change
    // Trait might have changed
    
    // Test crossover with another genome
    Serina::Genome genome2;
    genome2.setTrait(Serina::TraitType::SIZE, 0.6);
    genome2.setTrait(Serina::TraitType::SPEED, 0.9);
    
    Serina::Genome child = genome1.crossover(genome2);
    // Child should have valid traits
    assert(child.getTrait(Serina::TraitType::SIZE) >= 0.0);
    assert(child.getTrait(Serina::TraitType::SIZE) <= 1.0);
    
    // Test fitness calculation
    double fitness = genome1.calculateFitness();
    assert(fitness >= 0.0);
    
    std::cout << "✓ Genome tests passed!" << std::endl;
}

void testSpecies() {
    std::cout << "Testing Species..." << std::endl;
    
    // Create a genome for the species
    Serina::Genome genome;
    genome.setTrait(Serina::TraitType::SIZE, 0.7);
    genome.setTrait(Serina::TraitType::SPEED, 0.8);
    
    // Test constructor
    Serina::Species species("TestSpecies", genome);
    assert(species.getName() == "TestSpecies");
    assert(species.getEnergy() > 0.0);  // Should have positive energy
    
    // Test energy management
    species.setEnergy(75.0);
    assert(species.getEnergy() == 75.0);
    
    // Test survival
    assert(species.survives(50.0) == true);   // 75 > 50
    assert(species.survives(100.0) == false); // 75 < 100
    
    // Test reproduction (both parents need enough energy to clear their
    // reproduction threshold, or reproduce() falls back to returning the
    // fitter parent unchanged instead of producing a child)
    Serina::Genome genome2;
    genome2.setTrait(Serina::TraitType::SIZE, 0.6);
    genome2.setTrait(Serina::TraitType::SPEED, 0.9);
    Serina::Species partner("Partner", genome2);

    species.setEnergy(species.getReproductionThreshold() + 10.0);
    partner.setEnergy(partner.getReproductionThreshold() + 10.0);
    assert(species.canReproduce() && partner.canReproduce());

    Serina::Species child = species.reproduce(partner);
    assert(child.getName().find("TestSpecies") != std::string::npos);
    assert(child.getEnergy() > 0.0);  // Child should have positive energy
    
    std::cout << "✓ Species tests passed!" << std::endl;
}

void testPhysicsEngine() {
    std::cout << "Testing PhysicsEngine..." << std::endl;
    
    Serina::WorldBounds bounds(0, 100, 0, 100);
    Serina::PhysicsEngine physics(-9.81, bounds);  // Earth gravity
    
    assert(physics.getGravity() == -9.81);
    assert(physics.getBounds().maxX == 100);
    
    // Test entity creation
    // checkCollision() treats `size` as a diameter: entities collide when
    // distance < (sizeA + sizeB) * 0.5.
    Serina::Entity entity1(10, 10, 2.0, 1.0, 1);  // x, y, size, mass, id
    Serina::Entity entity2(11, 10, 2.0, 1.0, 2);  // distance = 1, threshold = 2.0

    assert(entity1.x == 10);
    assert(entity1.alive == true);
    assert(entity1.speciesId == 1);

    // Test collision detection
    bool collision = physics.checkCollision(entity1, entity2);
    assert(collision == true);  // distance (1) < threshold (2.0)

    // Move entities apart
    entity2.x = 20;  // distance = 10, well beyond threshold
    collision = physics.checkCollision(entity1, entity2);
    assert(collision == false);  // No collision now
    
    // Test physics update
    std::vector<Serina::Entity> entities = {entity1, entity2};
    entity1.vy = 0;  // Start with no vertical velocity
    
    physics.update(entities, 1.0);  // 1 second
    
    // After 1 second with gravity, entity should have fallen
    assert(entities[0].vy < 0);  // Gravity should make it fall
    assert(entities[0].y < 10);  // Y position should decrease
    
    // Test force application
    physics.applyForce(entity1, 10.0, 0.0);  // Apply rightward force
    assert(entity1.vx > 0);  // Should have rightward velocity
    
    std::cout << "✓ PhysicsEngine tests passed!" << std::endl;
}

void testWorld() {
    std::cout << "Testing World..." << std::endl;
    
    Serina::World world(20, 15);
    assert(world.getWidth() == 20);
    assert(world.getHeight() == 15);
    
    // Test resource management
    world.addResource(5, 5, "plants", 50.0);
    assert(world.getResource(5, 5, "plants") >= 50.0);  // Should be at least 50 (initial + added)
    
    // Test resource consumption
    bool consumed = world.consumeResource(5, 5, "plants", 25.0);
    assert(consumed == true);
    
    double remaining = world.getResource(5, 5, "plants");
    assert(remaining >= 25.0);  // Should have at least the added amount minus consumed
    
    // Test invalid coordinates
    assert(world.getResource(-1, -1, "plants") == 0.0);
    assert(world.getResource(100, 100, "plants") == 0.0);
    
    // Test terrain
    world.setTerrain(10, 10, Serina::TerrainType::FOREST);
    assert(world.getTerrain(10, 10) == Serina::TerrainType::FOREST);
    
    // Test climate
    world.setClimate(10, 10, Serina::ClimateZone::TROPICAL);
    assert(world.getClimate(10, 10) == Serina::ClimateZone::TROPICAL);
    
    // Test temperature and humidity
    world.setTemperature(5, 5, 25.0);
    assert(world.getTemperature(5, 5) == 25.0);
    
    world.setHumidity(5, 5, 0.7);
    assert(world.getHumidity(5, 5) == 0.7);
    
    // Test time progression
    double initialTime = world.getTimeState().currentTime;
    world.update(1.0);  // Update by 1 time unit
    assert(world.getTimeState().currentTime > initialTime);
    
    // Test resource finding
    auto plantSources = world.findResourceSources("plants", 10.0);
    assert(plantSources.size() > 0);  // Should find some plant sources
    
    // Test neighbors
    auto neighbors = world.getNeighbors(10, 10, 1);
    assert(neighbors.size() <= 8);  // At most 8 neighbors in a 3x3 grid
    
    std::cout << "✓ World tests passed!" << std::endl;
}

void testSimulationAPI() {
    std::cout << "Testing SimulationAPI..." << std::endl;
    
    Serina::SimulationAPI sim(30, 25);
    sim.initialize();
    
    // Test basic stepping (no parameters)
    sim.step();
    sim.step();
    
    // Test species management
    Serina::Genome genome;
    genome.setTrait(Serina::TraitType::SIZE, 0.7);
    genome.setTrait(Serina::TraitType::SPEED, 0.8);
    Serina::Species species("TestSpecies", genome);
    
    sim.addSpecies(species);
    
    // Test data retrieval
    std::string populationData = sim.getPopulationData();
    assert(!populationData.empty());
    
    std::string worldState = sim.getWorldState();
    assert(!worldState.empty());

    // New unified statistics (simple mode)
    auto stats = sim.getStatistics();
    assert(stats.speciesCount > 0);
    assert(stats.totalPopulation >= 0);
    std::cout << "Statistics (simple mode): population=" << stats.totalPopulation
              << " species=" << stats.speciesCount << std::endl;

    // Advanced population mode test
    sim.enableAdvancedPopulation(true, 50);
    for (int i = 0; i < 5; ++i) {
        sim.step();
    }
    auto advStats = sim.getStatistics();
    assert(advStats.totalPopulation > 0);
    std::cout << "Statistics (advanced mode): population=" << advStats.totalPopulation
              << " generation=" << advStats.generation << std::endl;
    
    std::cout << "✓ SimulationAPI tests passed!" << std::endl;
}

void runBenchmarks() {
    std::cout << "\\nRunning performance benchmarks..." << std::endl;
    
    const int WORLD_SIZE = 100;
    const int NUM_ENTITIES = 1000;
    const int NUM_STEPS = 100;
    
    // Benchmark World updates
    auto start = std::chrono::high_resolution_clock::now();
    
    Serina::World world(WORLD_SIZE, WORLD_SIZE);
    for (int i = 0; i < NUM_STEPS; ++i) {
        world.update(0.1);
    }
    
    auto end = std::chrono::high_resolution_clock::now();
    auto worldTime = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    std::cout << "World benchmark (" << WORLD_SIZE << "x" << WORLD_SIZE << ", " << NUM_STEPS << " steps): " 
              << worldTime.count() / 1000.0 << "ms" << std::endl;
    
    // Benchmark Physics Engine
    start = std::chrono::high_resolution_clock::now();
    
    Serina::PhysicsEngine physics(-9.81);
    std::vector<Serina::Entity> entities;
    
    // Create entities
    for (int i = 0; i < NUM_ENTITIES; ++i) {
        entities.emplace_back(i % WORLD_SIZE, (i / WORLD_SIZE) % WORLD_SIZE, 1.0, 1.0, i);
    }
    
    // Run physics simulation
    for (int i = 0; i < NUM_STEPS; ++i) {
        physics.update(entities, 0.016);  // ~60 FPS
    }
    
    end = std::chrono::high_resolution_clock::now();
    auto physicsTime = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    std::cout << "Physics benchmark (" << NUM_ENTITIES << " entities, " << NUM_STEPS << " steps): " 
              << physicsTime.count() / 1000.0 << "ms" << std::endl;
    
    // Performance per step
    double worldStepTime = (worldTime.count() / 1000.0) / NUM_STEPS;
    double physicsStepTime = (physicsTime.count() / 1000.0) / NUM_STEPS;
    
    std::cout << "Performance summary:" << std::endl;
    std::cout << "- World update: " << worldStepTime << "ms per step" << std::endl;
    std::cout << "- Physics update: " << physicsStepTime << "ms per step" << std::endl;
    std::cout << "- Total per frame: " << (worldStepTime + physicsStepTime) << "ms" << std::endl;
    std::cout << "- Estimated FPS: " << 1000.0 / (worldStepTime + physicsStepTime) << std::endl;
}

int main() {
    std::cout << "=== Serina C++ Test Suite ===" << std::endl;
    
    try {
        testGenome();
        testSpecies();
        testPhysicsEngine();
        testWorld();
        testSimulationAPI();
        
        std::cout << "\\n🎉 All tests passed successfully!" << std::endl;
        
        // Run benchmarks
        runBenchmarks();
        
    } catch (const std::exception& e) {
        std::cout << "❌ Test failed with exception: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cout << "❌ Test failed with unknown exception" << std::endl;
        return 1;
    }
    
    return 0;
}