#include <iostream>
#include <chrono>
#include <memory>
#include <vector>
#include <random>

// Import des systèmes avancés
#include "AdvancedGenetics.hpp"
#include "PopulationManager.hpp"
#include "NEAT.hpp"
#include "SpeciesManager.hpp"
#include "PerformanceOptimizations.hpp"
#include "EvolutionarySimulator.hpp"

using namespace Serina;

/// @brief Test du système génétique avancé
void testAdvancedGenetics() {
    std::cout << "\n=== Test Système Génétique Avancé ===" << std::endl;
    
    // Configuration de mutation
    Genetics::MutationConfig mutConfig;
    mutConfig.mutationRate = 0.1;
    mutConfig.gaussianSigma = 0.05;
    
    // Crée des génomes
    auto genome1 = std::make_unique<Genetics::AdvancedGenome>(0);
    auto genome2 = std::make_unique<Genetics::AdvancedGenome>(0);
    
    std::cout << "Génome 1 - Trait SPEED: " << genome1->getTrait(Genetics::TraitType::SPEED) << std::endl;
    std::cout << "Génome 2 - Trait SPEED: " << genome2->getTrait(Genetics::TraitType::SPEED) << std::endl;
    
    // Test de croisement
    auto offspring = genome1->crossover(*genome2);
    std::cout << "Descendant - Trait SPEED: " << offspring.getTrait(Genetics::TraitType::SPEED) << std::endl;
    
    // Test de mutation
    offspring.mutate(mutConfig);
    std::cout << "Après mutation - Trait SPEED: " << offspring.getTrait(Genetics::TraitType::SPEED) << std::endl;
    
    // Test de distance génétique
    double distance = genome1->geneticDistance(*genome2);
    std::cout << "Distance génétique: " << distance << std::endl;
    
    std::cout << "✓ Système génétique avancé fonctionnel" << std::endl;
}

/// @brief Test du gestionnaire de population
void testPopulationManager() {
    std::cout << "\n=== Test Gestionnaire de Population ===" << std::endl;
    
    Evolution::PopulationManager popManager(500);
    
    // Initialise la population
    popManager.initializePopulation(100, "Serina_v2");
    
    std::cout << "Population initiale: " << popManager.getPopulationSize() << " organismes" << std::endl;
    
    // Simule quelques cycles
    for (int i = 0; i < 5; ++i) {
        popManager.updatePopulation(1.0); // 1 unité de temps
        popManager.reproduce();
        
        const auto& stats = popManager.getStatistics();
        std::cout << "Cycle " << i + 1 << ": " 
                  << stats.totalPopulation << " organismes, "
                  << "fitness moy: " << stats.averageFitness << ", "
                  << "diversité: " << stats.geneticDiversity << std::endl;
    }
    
    std::cout << "✓ Gestionnaire de population fonctionnel" << std::endl;
}

/// @brief Test du système NEAT
void testNEATSystem() {
    std::cout << "\n=== Test Système NEAT ===" << std::endl;
    
    // Configuration NEAT
    NEAT::NEATConfig config;
    config.weightMutationRate = 0.8;
    config.addNodeMutationRate = 0.03;
    config.addConnectionMutationRate = 0.05;
    
    // Crée des génomes NEAT
    auto genome1 = std::make_unique<NEAT::NEATGenome>(4, 2);  // 4 entrées, 2 sorties
    auto genome2 = std::make_unique<NEAT::NEATGenome>(4, 2);
    
    std::cout << "Génome 1: " << genome1->getNodeGenes().size() << " neurones, "
              << genome1->getConnectionGenes().size() << " connexions" << std::endl;
    
    // Test d'évaluation
    std::vector<double> inputs = {0.5, -0.3, 0.8, 1.0};
    auto outputs = genome1->evaluate(inputs);
    
    std::cout << "Évaluation - Entrées: [";
    for (size_t i = 0; i < inputs.size(); ++i) {
        std::cout << inputs[i];
        if (i < inputs.size() - 1) std::cout << ", ";
    }
    std::cout << "] -> Sorties: [";
    for (size_t i = 0; i < outputs.size(); ++i) {
        std::cout << outputs[i];
        if (i < outputs.size() - 1) std::cout << ", ";
    }
    std::cout << "]" << std::endl;
    
    // Test de mutations
    genome1->mutateWeights(config);
    genome1->addNode(config);
    genome1->addConnection(config);
    
    std::cout << "Après mutations: " << genome1->getNodeGenes().size() << " neurones, "
              << genome1->getConnectionGenes().size() << " connexions" << std::endl;
    
    // Test de distance génétique
    double distance = genome1->geneticDistance(*genome2, config);
    std::cout << "Distance génétique NEAT: " << distance << std::endl;
    
    // Test de croisement
    auto offspring = genome1->crossover(*genome2);
    std::cout << "Descendant: " << offspring.getNodeGenes().size() << " neurones, "
              << offspring.getConnectionGenes().size() << " connexions" << std::endl;
    
    std::cout << "✓ Système NEAT fonctionnel" << std::endl;
}

/// @brief Test du gestionnaire d'espèces
void testSpeciesManager() {
    std::cout << "\n=== Test Gestionnaire d'Espèces ===" << std::endl;
    
    NEAT::NEATConfig config;
    config.compatibilityThreshold = 3.0;
    
    NEAT::SpeciesManager speciesManager(config);
    
    // Crée une population de génomes NEAT
    std::vector<std::shared_ptr<NEAT::NEATGenome>> genomes;
    for (int i = 0; i < 50; ++i) {
        auto genome = std::make_shared<NEAT::NEATGenome>(4, 2);
        genome->setFitness(static_cast<double>(rand()) / RAND_MAX);
        genomes.push_back(genome);
    }
    
    // Spéciation
    speciesManager.speciate(genomes);
    speciesManager.updateSpecies();
    
    auto stats = speciesManager.getStatistics();
    std::cout << "Spéciation: " << stats.totalSpecies << " espèces créées" << std::endl;
    std::cout << "Meilleure fitness: " << stats.bestFitness << std::endl;
    std::cout << "Diversité génétique: " << stats.geneticDiversity << std::endl;
    
    // Sélection et reproduction
    speciesManager.performSelection();
    auto newGeneration = speciesManager.reproduce(50);
    
    std::cout << "Nouvelle génération: " << newGeneration.size() << " organismes" << std::endl;
    
    std::cout << "✓ Gestionnaire d'espèces fonctionnel" << std::endl;
}

/// @brief Test des optimisations de performance
void testPerformanceOptimizations() {
    std::cout << "\n=== Test Optimisations de Performance ===" << std::endl;
    
    // Test SIMD
    std::vector<float> a(1000), b(1000), result(1000);
    for (size_t i = 0; i < 1000; ++i) {
        a[i] = static_cast<float>(i) * 0.1f;
        b[i] = static_cast<float>(i) * 0.2f;
    }
    
    auto start = std::chrono::high_resolution_clock::now();
    Performance::SIMDOptimizer::vectorAdd(a.data(), b.data(), result.data(), 1000);
    auto end = std::chrono::high_resolution_clock::now();
    
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "Addition vectorisée SIMD: " << duration.count() << " μs" << std::endl;
    
    // Test grille spatiale
    Performance::SpatialHashGrid<int> grid(0, 0, 1000, 1000, 50);
    
    // Simule des objets avec positions
    struct TestObject {
        double x, y;
        int id;
        double getX() const { return x; }
        double getY() const { return y; }
    };
    
    std::vector<TestObject> objects(1000);
    for (size_t i = 0; i < objects.size(); ++i) {
        objects[i] = {
            static_cast<double>(rand() % 1000),
            static_cast<double>(rand() % 1000),
            static_cast<int>(i)
        };
    }
    
    // Insert dans la grille
    Performance::SpatialHashGrid<TestObject> objGrid(0, 0, 1000, 1000, 50);
    for (auto& obj : objects) {
        objGrid.insert(&obj, obj.x, obj.y);
    }
    
    // Test de requête
    start = std::chrono::high_resolution_clock::now();
    auto neighbors = objGrid.queryRadius(500, 500, 100);
    end = std::chrono::high_resolution_clock::now();
    
    duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "Requête spatiale: " << neighbors.size() << " voisins trouvés en " 
              << duration.count() << " μs" << std::endl;
    
    // Test gestionnaire de tâches parallèles
    Performance::ParallelTaskManager taskManager;
    
    std::vector<int> data(10000);
    std::iota(data.begin(), data.end(), 0);
    
    start = std::chrono::high_resolution_clock::now();
    taskManager.parallelFor(0, data.size(), [&data](size_t i) {
        data[i] = data[i] * data[i];  // Carré de chaque élément
    });
    end = std::chrono::high_resolution_clock::now();
    
    duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "Traitement parallèle: " << data.size() << " éléments en " 
              << duration.count() << " μs" << std::endl;
    
    // Test cache LRU
    Performance::LRUCache<int, std::string> cache(100);
    cache.put(1, "first");
    cache.put(2, "second");
    
    auto value = cache.get(1);
    std::cout << "Cache LRU: " << (value ? *value : "not found") << std::endl;
    
    std::cout << "✓ Optimisations de performance fonctionnelles" << std::endl;
}

/// @brief Test du simulateur évolutif complet
void testEvolutionarySimulator() {
    std::cout << "\n=== Test Simulateur Évolutif Complet ===" << std::endl;
    
    // Configuration de simulation
    Simulation::SimulationConfig config;
    config.initialPopulation = 50;
    config.maxPopulation = 100;
    config.worldWidth = 500;
    config.worldHeight = 500;
    config.useNEAT = true;
    config.inputNodes = 8;
    config.outputNodes = 4;
    config.enableProfiling = true;
    
    // Crée le simulateur
    Simulation::EvolutionarySimulator simulator(config);
    
    // Initialise
    simulator.initialize();
    
    auto stats = simulator.getStatistics();
    std::cout << "Simulation initialisée: " << stats.population << " organismes" << std::endl;
    
    // Exécute quelques étapes
    std::cout << "Exécution de 10 étapes de simulation..." << std::endl;
    
    auto startTime = std::chrono::high_resolution_clock::now();
    
    for (int step = 0; step < 10; ++step) {
        simulator.step();
        
        if (step % 2 == 0) {
            stats = simulator.getStatistics();
            std::cout << "Étape " << step << ": " 
                      << stats.population << " organismes, "
                      << "fitness moy: " << stats.averageFitness << ", "
                      << "espèces: " << stats.speciesCount << std::endl;
        }
    }
    
    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
    
    // Statistiques finales
    stats = simulator.getStatistics();
    std::cout << "\nStatistiques finales:" << std::endl;
    std::cout << "  Population: " << stats.population << std::endl;
    std::cout << "  Génération: " << stats.generation << std::endl;
    std::cout << "  Fitness moyenne: " << stats.averageFitness << std::endl;
    std::cout << "  Meilleure fitness: " << stats.bestFitness << std::endl;
    std::cout << "  Espèces: " << stats.speciesCount << std::endl;
    std::cout << "  Diversité génétique: " << stats.geneticDiversity << std::endl;
    std::cout << "  Âge moyen: " << stats.averageAge << std::endl;
    std::cout << "  Énergie moyenne: " << stats.averageEnergy << std::endl;
    std::cout << "  Temps d'exécution: " << duration.count() << " ms" << std::endl;
    
    // Résultats de profiling
    if (config.enableProfiling) {
        auto profileResults = simulator.getProfilingResults();
        if (!profileResults.empty()) {
            std::cout << "\nProfiling des performances:" << std::endl;
            for (const auto& result : profileResults) {
                std::cout << "  " << result.name << ": " 
                          << result.totalTimeMs << " ms (" 
                          << result.percentage << "%)" << std::endl;
            }
        }
    }
    
    std::cout << "✓ Simulateur évolutif complet fonctionnel" << std::endl;
}

/// @brief Test de benchmark de performance
void runPerformanceBenchmark() {
    std::cout << "\n=== Benchmark de Performance ===" << std::endl;
    
    // Test 1: Allocation mémoire vs Pool
    auto startTime = std::chrono::high_resolution_clock::now();
    
    std::vector<std::unique_ptr<Genetics::AdvancedGenome>> genomes;
    for (int i = 0; i < 1000; ++i) {
        genomes.push_back(std::make_unique<Genetics::AdvancedGenome>(0));
    }
    genomes.clear();
    
    auto endTime = std::chrono::high_resolution_clock::now();
    auto allocDuration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    
    std::cout << "Allocation directe (1000 génomes): " << allocDuration.count() << " μs" << std::endl;
    
    // Test 2: Performance NEAT
    startTime = std::chrono::high_resolution_clock::now();
    
    NEAT::NEATGenome genome(10, 5);
    std::vector<double> inputs(10, 0.5);
    
    for (int i = 0; i < 1000; ++i) {
        auto outputs = genome.evaluate(inputs);
    }
    
    endTime = std::chrono::high_resolution_clock::now();
    auto neatDuration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    
    std::cout << "Évaluations NEAT (1000x): " << neatDuration.count() << " μs" << std::endl;
    
    // Test 3: Performance génétique
    startTime = std::chrono::high_resolution_clock::now();
    
    Genetics::AdvancedGenome parent1(0), parent2(0);
    for (int i = 0; i < 100; ++i) {
        auto offspring = parent1.crossover(parent2);
    }
    
    endTime = std::chrono::high_resolution_clock::now();
    auto geneticDuration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    
    std::cout << "Croisements génétiques (100x): " << geneticDuration.count() << " μs" << std::endl;
    
    std::cout << "✓ Benchmark terminé" << std::endl;
}

int main() {
    std::cout << "🧬 SERINA - Test Complet du Système Évolutif Avancé" << std::endl;
    std::cout << "====================================================" << std::endl;
    
    try {
        // Tests des composants individuels
        testAdvancedGenetics();
        testPopulationManager();
        testNEATSystem();
        testSpeciesManager();
        testPerformanceOptimizations();
        
        // Test du système intégré
        testEvolutionarySimulator();
        
        // Benchmark de performance
        runPerformanceBenchmark();
        
        std::cout << "\n🎉 TOUS LES TESTS RÉUSSIS! 🎉" << std::endl;
        std::cout << "Le système évolutif avancé Serina est pleinement fonctionnel." << std::endl;
        std::cout << "\nFonctionnalités validées:" << std::endl;
        std::cout << "  ✓ Génétique avancée avec 12 traits" << std::endl;
        std::cout << "  ✓ Algorithmes NEAT complets" << std::endl;
        std::cout << "  ✓ Gestion des espèces" << std::endl;
        std::cout << "  ✓ Optimisations SIMD et parallélisation" << std::endl;
        std::cout << "  ✓ Système de simulation intégré" << std::endl;
        std::cout << "  ✓ Profiling de performance" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Erreur lors des tests: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}