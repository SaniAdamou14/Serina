#include <catch2/catch_test_macros.hpp>
#include "Serina/WorldSimulation.hpp"
#include <algorithm>
#include <unordered_map>

using namespace Serina::Simulation;
using namespace Serina;

TEST_CASE("RegionGrid generates a coherent, non-uniform biome map", "[worldsim][region]") {
    Spatial::RegionGrid grid(12, 9, 1234);

    REQUIRE(grid.getWidth() == 12);
    REQUIRE(grid.getHeight() == 9);

    // A real Voronoi biome assignment should produce more than one biome
    // across a 12x9 grid — a single global constant would not.
    std::vector<Ecosystem::EnvironmentType> seen;
    for (int y = 0; y < grid.getHeight(); ++y) {
        for (int x = 0; x < grid.getWidth(); ++x) {
            auto type = grid.at(x, y).environmentType;
            if (std::find(seen.begin(), seen.end(), type) == seen.end())
                seen.push_back(type);
        }
    }
    REQUIRE(seen.size() > 1);

    // URBAN is explicitly excluded from procedural generation (Serina is a
    // world without humans).
    for (const auto &type : seen)
        REQUIRE(type != Ecosystem::EnvironmentType::URBAN);
}

TEST_CASE("every biome RegionGrid can generate has a real, non-null environment definition", "[worldsim][region]") {
    // Region.hpp's Voronoi generator can assign any of these types to a
    // cell; EnvironmentalAdaptation.hpp used to only define six of the
    // nine, so a region landing on DESERT/ARCTIC/TROPICAL would silently
    // get a null environment (zero-valued climate/resources/pressures on
    // any real map). Guards against that regression.
    static constexpr Ecosystem::EnvironmentType generatableBiomes[] = {
        Ecosystem::EnvironmentType::GRASSLAND, Ecosystem::EnvironmentType::FOREST,
        Ecosystem::EnvironmentType::FRESHWATER, Ecosystem::EnvironmentType::OCEAN,
        Ecosystem::EnvironmentType::WETLAND, Ecosystem::EnvironmentType::MOUNTAIN,
        Ecosystem::EnvironmentType::DESERT, Ecosystem::EnvironmentType::ARCTIC,
        Ecosystem::EnvironmentType::TROPICAL};

    Environment::SerinaEnvironmentManager environments(1);
    for (const auto &biome : generatableBiomes) {
        const auto *env = environments.getEnvironment(biome);
        REQUIRE(env != nullptr);
        REQUIRE_FALSE(env->name.empty());
    }
}

TEST_CASE("positionToGrid maps continuous coordinates into grid bounds", "[worldsim][region]") {
    Spatial::RegionGrid grid(10, 10, 1);
    auto [gx, gy] = grid.positionToGrid(55.0, 55.0, 100.0, 100.0);
    REQUIRE(gx >= 0);
    REQUIRE(gx < 10);
    REQUIRE(gy >= 0);
    REQUIRE(gy < 10);
}

TEST_CASE("seedFounderSpecies places real individuals with real diploid genomes", "[worldsim]") {
    UnifiedWorldSimulator sim({}, 42);
    sim.seedFounderSpecies(10);

    REQUIRE(sim.getPopulationCount() == 50); // 5 founders x 10 individuals
    REQUIRE(sim.getGeneration() == 0);

    auto snapshots = sim.getLineageSnapshots();
    REQUIRE(snapshots.size() == 5);

    for (const auto &snap : snapshots) {
        REQUIRE(snap.population == 10);
        REQUIRE(snap.averageFitness >= 0.0);
    }
}

TEST_CASE("genetic diversity is computed from real genome distance, not drawn at random", "[worldsim][genetics]") {
    // AdvancedGenome's own RNG (AdvancedGenome::getRandomEngine()) is a
    // thread_local engine seeded from std::random_device — genome content
    // itself can never be made deterministic by seeding
    // UnifiedWorldSimulator (only world/grid generation is actually
    // seeded), so two independently-constructed populations will not
    // produce byte-identical diversity even with "the same seed". What
    // must hold instead: within one simulation, diversity is a stable
    // function of the population's actual genomes, not re-rolled on every
    // read (the bug this replaces was `geneticDiversity = divDist(rng_)`
    // called fresh every generation in SerinaSimulator.hpp).
    UnifiedWorldSimulator sim({}, 777);
    sim.seedFounderSpecies(15);

    auto firstRead = sim.getLineageSnapshots();
    auto secondRead = sim.getLineageSnapshots(); // no step() in between: population is unchanged

    REQUIRE(firstRead.size() == secondRead.size());

    auto findByName = [](const std::vector<LineageSnapshot> &snaps, const std::string &name) -> const LineageSnapshot* {
        for (const auto &s : snaps)
            if (s.speciesName == name)
                return &s;
        return nullptr;
    };

    for (const auto &snap : firstRead) {
        const auto *match = findByName(secondRead, snap.speciesName);
        REQUIRE(match != nullptr);
        REQUIRE(snap.geneticDiversity == match->geneticDiversity);
    }

    // A freshly random population must show non-zero diversity (traits
    // really do vary between individuals).
    for (const auto &snap : firstRead)
        REQUIRE(snap.geneticDiversity > 0.0);
}

TEST_CASE("a population of genetic clones has ~zero diversity, a randomized one does not", "[worldsim][genetics]") {
    // The clearest possible proof that diversity comes from real genome
    // distance: cloning the same genome N times must measure ~0 distance
    // between every pair (identical phenotypes, identical answer every
    // time), while independently-randomized genomes must not.
    Genetics::AdvancedGenome templateGenome(0);

    std::vector<Evolution::Organism> clones;
    for (int i = 0; i < 10; ++i) {
        auto genome = std::make_unique<Genetics::AdvancedGenome>(templateGenome);
        clones.emplace_back(std::move(genome), "Clonus identicus");
    }

    double totalDistance = 0.0;
    size_t comparisons = 0;
    for (size_t i = 0; i < clones.size(); ++i) {
        for (size_t j = i + 1; j < clones.size(); ++j) {
            totalDistance += clones[i].getGenome().geneticDistance(clones[j].getGenome());
            comparisons++;
        }
    }
    double cloneDiversity = comparisons > 0 ? totalDistance / comparisons : 0.0;
    REQUIRE(cloneDiversity < 1e-9);

    // Contrast: a freshly seeded world's founder population (independently
    // randomized genomes) measures real, non-trivial diversity.
    UnifiedWorldSimulator sim({}, 321);
    sim.seedFounderSpecies(15);
    bool anyPositiveDiversity = false;
    for (const auto &snap : sim.getLineageSnapshots())
        if (snap.geneticDiversity > 0.01)
            anyPositiveDiversity = true;
    REQUIRE(anyPositiveDiversity);
}

TEST_CASE("stepping the simulation advances the generation counter and keeps population sane", "[worldsim]") {
    UnifiedWorldSimulator sim({}, 99);
    sim.seedFounderSpecies(20);
    size_t initialPopulation = sim.getPopulationCount();

    for (int i = 0; i < 10; ++i)
        sim.step();

    REQUIRE(sim.getGeneration() == 10);
    // Population shouldn't silently vanish or explode unboundedly over 10
    // generations with modest founder counts.
    REQUIRE(sim.getPopulationCount() > 0);
    REQUIRE(sim.getPopulationCount() < initialPopulation * 10);
}

TEST_CASE("population survives a long run instead of guaranteed total extinction from starvation", "[worldsim][energy]") {
    // Regression test for a real bug found by actually running the
    // simulation for a long time (reported after ~2000 generations at 20x
    // speed in the web UI): applySurvivalAndInteractions() drained energy
    // via metabolism every generation but had no positive energy income
    // mechanic at all -- the only "income" path was ecological interactions
    // that could never fire (species-name mismatches with the legacy
    // interaction catalog, and referenced partner species that don't exist
    // in this engine's population). Every organism was on a one-way path to
    // starvation: total collapse was mathematically guaranteed by whatever
    // generation metabolism alone drained a typical founder's starting
    // energy to zero (~2000 generations for the observed default trait/
    // environment values), independent of genetics or environment quality.
    // A short-horizon test (like the one above, 10 generations) could not
    // catch this -- the fix is a real foraging income term
    // (WorldSimulationParameters::foragingRate), so this test runs long
    // enough to have hit total extinction under the old code.
    UnifiedWorldSimulator sim({}, 2024);
    sim.seedFounderSpecies(10);
    size_t initialPopulation = sim.getPopulationCount();

    for (int i = 0; i < 2000; ++i)
        sim.step();

    REQUIRE(sim.getGeneration() == 2000);
    REQUIRE(sim.getPopulationCount() > 0);
    // The fix should produce a real equilibrium (observed in a scratch run:
    // population settles around 1.5-1.7x its start and oscillates there for
    // the full 2000 generations), not just "barely nonzero" -- and not
    // unbounded growth either now that there's a real energy income.
    REQUIRE(sim.getPopulationCount() < initialPopulation * 5);
}

TEST_CASE("reproduction respects biological constraints instead of producing arbitrary offspring", "[worldsim][constraints]") {
    UnifiedWorldSimulator sim({}, 55);
    sim.seedFounderSpecies(25);

    for (int i = 0; i < 5; ++i)
        sim.step();

    // If constraint-checked reproduction is wired correctly, the
    // population should still contain only the founder species or their
    // real registered descendants -- never an empty/garbage species name.
    for (const auto &snap : sim.getLineageSnapshots()) {
        REQUIRE_FALSE(snap.speciesName.empty());
    }
}

TEST_CASE("speciation emerges from measured genetic divergence and sustained geographic separation", "[worldsim][speciation]") {
    WorldSimulationParameters params;
    params.speciationDistanceThreshold = 0.05; // low threshold: speciation should trigger quickly
    params.speciationIsolationGenerations = 3;

    UnifiedWorldSimulator sim(params, 2024);
    sim.seedFounderSpecies(30);

    for (int i = 0; i < 20; ++i)
        sim.step();

    const auto &events = sim.getSpeciationEvents();
    REQUIRE(events.size() > 0);

    for (const auto &event : events) {
        REQUIRE_FALSE(event.parentSpecies.empty());
        REQUIRE_FALSE(event.newSpecies.empty());
        REQUIRE(event.newSpecies != event.parentSpecies);
        REQUIRE(event.geneticDistanceAtSplit >= params.speciationDistanceThreshold);

        // The new species must be a real taxonomic binomial name (genus +
        // species), not a placeholder or a copy of the parent's name.
        REQUIRE(event.newSpecies.find(' ') != std::string::npos);
    }

    // A species that actually split must now be found among the living
    // lineages, tagged as a genuinely distinct species.
    auto snapshots = sim.getLineageSnapshots();
    bool foundNewSpecies = false;
    for (const auto &snap : snapshots) {
        for (const auto &event : events) {
            if (snap.speciesName == event.newSpecies) {
                foundNewSpecies = true;
            }
        }
    }
    REQUIRE(foundNewSpecies);
}

TEST_CASE("a high speciation threshold prevents spurious splits", "[worldsim][speciation]") {
    WorldSimulationParameters params;
    params.speciationDistanceThreshold = 0.99; // effectively unreachable
    params.speciationIsolationGenerations = 3;

    UnifiedWorldSimulator sim(params, 2024);
    sim.seedFounderSpecies(30);

    for (int i = 0; i < 15; ++i)
        sim.step();

    REQUIRE(sim.getSpeciationEvents().empty());
}

TEST_CASE("every founder species gets a real NEAT brain at seeding", "[worldsim][neat]") {
    UnifiedWorldSimulator sim({}, 111);
    sim.seedFounderSpecies(10);

    auto snapshots = sim.getLineageSnapshots();
    REQUIRE(snapshots.size() == 5);
    for (const auto &snap : snapshots) {
        REQUIRE(sim.hasBrain(snap.speciesName));
        // A freshly constructed NEAT genome for 7 inputs + 2 outputs has at
        // least that many nodes -- proof this is a real network, not a
        // placeholder value.
        REQUIRE(sim.getBrainComplexity(snap.speciesName) > 0);
    }
}

TEST_CASE("brain-driven movement is a deterministic function of state, replayable from a fixed seed", "[worldsim][neat]") {
    // NEAT::NEATGenome::evaluate() is a pure function of its inputs and
    // weights, so two simulators built from the same seed (same founder
    // genomes, same brains, same RNG stream) must replay identically
    // step-for-step. This would NOT hold if movement still fell back to an
    // independently-drawn random walk per organism per step.
    UnifiedWorldSimulator simA({}, 555);
    simA.seedFounderSpecies(10);
    UnifiedWorldSimulator simB({}, 555);
    simB.seedFounderSpecies(10);

    for (int i = 0; i < 5; ++i) {
        simA.step();
        simB.step();
    }

    auto snapsA = simA.getLineageSnapshots();
    auto snapsB = simB.getLineageSnapshots();
    REQUIRE(snapsA.size() == snapsB.size());
    for (size_t i = 0; i < snapsA.size(); ++i) {
        REQUIRE(snapsA[i].speciesName == snapsB[i].speciesName);
        REQUIRE(snapsA[i].population == snapsB[i].population);
    }
}

TEST_CASE("lineage brains evolve structurally over generations via (1+1)-ES", "[worldsim][neat]") {
    WorldSimulationParameters params;
    params.brainEvolutionInterval = 3; // evolve often enough to observe change in a short test
    // Force a structural mutation attempt on every evolution window, so the
    // only randomness left is the (1+1)-ES's real accept/revert fitness
    // gate -- otherwise this test's pass/fail depends on both the rare
    // addNode/addConnection roll AND the fitness gate lining up within a
    // fixed generation budget, which is exactly what made it flaky across
    // platforms (unordered_map iteration order, and hence which RNG draws
    // land on which lineage, is not portable).
    params.neat.addNodeMutationRate = 1.0;
    params.neat.addConnectionMutationRate = 1.0;

    UnifiedWorldSimulator sim(params, 909);
    sim.seedFounderSpecies(30);

    std::unordered_map<std::string, size_t> initialComplexity;
    for (const auto &snap : sim.getLineageSnapshots())
        initialComplexity[snap.speciesName] = sim.getBrainComplexity(snap.speciesName);

    for (int i = 0; i < 90; ++i)
        sim.step();

    // At least one surviving lineage must show a brain that has actually
    // changed structure (addNode/addConnection accepted by the (1+1)-ES) --
    // proof evolveBrains() is really mutating and really checkpointing, not
    // a no-op.
    bool anyComplexityChanged = false;
    for (const auto &snap : sim.getLineageSnapshots()) {
        auto it = initialComplexity.find(snap.speciesName);
        if (it != initialComplexity.end() && sim.getBrainComplexity(snap.speciesName) != it->second)
            anyComplexityChanged = true;
    }
    REQUIRE(anyComplexityChanged);
}

TEST_CASE("a newly speciated lineage inherits a brain instead of starting blank", "[worldsim][neat][speciation]") {
    WorldSimulationParameters params;
    params.speciationDistanceThreshold = 0.05; // low threshold: speciation should trigger quickly
    params.speciationIsolationGenerations = 3;

    UnifiedWorldSimulator sim(params, 2024);
    sim.seedFounderSpecies(30);

    for (int i = 0; i < 20; ++i)
        sim.step();

    const auto &events = sim.getSpeciationEvents();
    REQUIRE(events.size() > 0);
    for (const auto &event : events) {
        // The new lineage must have a brain the instant it exists -- either
        // inherited (mutated copy of the parent's) or freshly ensured, never
        // absent.
        REQUIRE(sim.hasBrain(event.newSpecies));
    }
}
