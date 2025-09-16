#include "SerinaSimulator.hpp"
#include "EcosystemTaxonomy.hpp"
#include "SerinaEcosystem.hpp"
#include "EcologicalInteractions.hpp"
#include "EnvironmentalAdaptation.hpp"
#include "EvolutionaryConstraints.hpp"
#include <iostream>

/// @brief Test simple de compilation de tous les headers
int main()
{
    std::cout << "🔧 Test de compilation des headers Serina..." << std::endl;
    
    try
    {
        // Test instantiation des classes principales
        std::cout << "   📦 Création EcosystemTaxonomy..." << std::endl;
        auto taxonomy = std::make_unique<Serina::Taxonomy::EcosystemTaxonomy>();
        
        std::cout << "   🌍 Création SerinaEcosystem..." << std::endl;
        auto ecosystem = std::make_unique<Serina::Ecosystem::SerinaEcosystem>();
        
        std::cout << "   ⚖️ Création EcologicalInteractionManager..." << std::endl;
        auto interactions = std::make_unique<Serina::Ecology::EcologicalInteractionManager>();
        
        std::cout << "   🌐 Création SerinaEnvironmentManager..." << std::endl;
        auto environment = std::make_unique<Serina::Environment::SerinaEnvironmentManager>();
        
        std::cout << "   🧬 Création SerinaEvolutionaryConstraints..." << std::endl;
        auto evolution = std::make_unique<Serina::Evolution::SerinaEvolutionaryConstraints>();
        
        std::cout << "   🎮 Création SerinaEcosystemSimulator..." << std::endl;
        auto simulator = std::make_unique<Serina::Simulation::SerinaEcosystemSimulator>();
        
        std::cout << "\n✅ TOUS LES HEADERS COMPILENT CORRECTEMENT !" << std::endl;
        std::cout << "🔍 Système Serina prêt pour utilisation." << std::endl;
        
        return 0;
    }
    catch (const std::exception& e)
    {
        std::cerr << "❌ Erreur de compilation: " << e.what() << std::endl;
        return 1;
    }
}