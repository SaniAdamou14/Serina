#include "SerinaSimulator.hpp"
#include <iostream>

int main()
{
    std::cout << "🧬 Test SerinaSimulator.hpp corrigé..." << std::endl;
    
    try
    {
        // Test de création du simulateur principal
        auto simulator = std::make_unique<Serina::Simulation::SerinaEcosystemSimulator>(12345);
        std::cout << "✅ SerinaEcosystemSimulator créé avec succès" << std::endl;
        
        // Test de simulation très courte
        Serina::Simulation::SerinaSimulationParameters params;
        params.totalGenerations = 2;
        params.populationSize = 50;
        params.reportInterval = 1;
        
        std::cout << "🚀 Test de simulation courte..." << std::endl;
        simulator->runSimulation(params);
        
        std::cout << "✅ SerinaSimulator.hpp - Compilation et exécution réussies !" << std::endl;
    }
    catch (const std::exception& e)
    {
        std::cerr << "❌ Erreur: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}