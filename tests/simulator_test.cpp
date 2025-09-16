#include "SimplifiedSerinaSimulator.hpp"
#include <iostream>

int main()
{
    std::cout << "🧬 Test du simulateur Serina simplifié..." << std::endl;
    
    try
    {
        // Créer le simulateur
        auto simulator = std::make_unique<Serina::Simulation::SimplifiedSerinaSimulator>(12345);
        
        // Configurer la simulation (courte pour le test)
        Serina::Simulation::SerinaSimulationParameters params;
        params.totalGenerations = 20;
        params.populationSize = 500;
        params.reportInterval = 5;
        
        // Lancer la simulation
        std::cout << "🚀 Démarrage de la simulation..." << std::endl;
        simulator->runSimulation(params);
        
        std::cout << "✅ Test du simulateur réussi !" << std::endl;
    }
    catch (const std::exception& e)
    {
        std::cerr << "❌ Erreur dans le simulateur: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}