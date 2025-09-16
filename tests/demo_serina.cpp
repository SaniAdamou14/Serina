#include "SimplifiedSerinaSimulator.hpp"
#include <iostream>

int main()
{
    std::cout << "🌍 === DÉMONSTRATION DE L'ÉCOSYSTÈME SERINA ===" << std::endl;
    std::cout << "🎯 Simulation évolutionnaire avancée inspirée de 'Serina - World of Birds'" << std::endl;
    std::cout << "===============================================================" << std::endl;
    
    try
    {
        // Configuration d'une simulation longue et détaillée
        std::cout << "\n🧬 Initialisation du simulateur..." << std::endl;
        auto simulator = std::make_unique<Serina::Simulation::SimplifiedSerinaSimulator>(42);
        
        // Paramètres pour une simulation intéressante
        Serina::Simulation::SerinaSimulationParameters params;
        params.totalGenerations = 100;     // Plus de générations
        params.populationSize = 1000;      // Plus d'individus
        params.mutationRate = 0.05;        // Taux de mutation élevé
        params.migrationRate = 0.02;       // Migration active
        params.enableSpeciation = true;    // Permettre la spéciation
        params.enableExtinction = true;    // Permettre l'extinction
        params.enableEnvironmentalChange = true;  // Changements environnementaux
        params.enableEcologicalInteractions = true; // Interactions actives
        params.adaptationThreshold = 0.6;  // Seuil d'adaptation plus bas
        params.innovationThreshold = 0.7;  // Seuil d'innovation plus bas
        params.reportInterval = 20;        // Rapport toutes les 20 générations
        
        std::cout << "📊 Paramètres de simulation:" << std::endl;
        std::cout << "   🔄 Générations: " << params.totalGenerations << std::endl;
        std::cout << "   👥 Population initiale: " << params.populationSize << std::endl;
        std::cout << "   🧬 Taux de mutation: " << (params.mutationRate * 100) << "%" << std::endl;
        std::cout << "   🗺️ Taux de migration: " << (params.migrationRate * 100) << "%" << std::endl;
        
        std::cout << "\n🚀 === DÉBUT DE LA SIMULATION ÉVOLUTIONNAIRE ===" << std::endl;
        std::cout << "⏰ Préparez-vous à observer l'évolution en action...\n" << std::endl;
        
        // Lancer la simulation complète
        simulator->runSimulation(params);
        
        std::cout << "\n🎉 === SIMULATION TERMINÉE AVEC SUCCÈS ===" << std::endl;
        std::cout << "🔬 Résultats de l'évolution observés dans le monde de Serina !" << std::endl;
        
    }
    catch (const std::exception& e)
    {
        std::cerr << "❌ Erreur dans la simulation: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}