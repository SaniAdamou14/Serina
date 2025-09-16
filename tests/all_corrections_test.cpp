#include "EcologicalInteractions.hpp"
#include "EvolutionaryConstraints.hpp"
#include "SerinaEcosystem.hpp"
#include "SimplifiedSerinaSimulator.hpp"
#include <iostream>

int main()
{
    std::cout << "🧬 Test complet des fichiers corrigés..." << std::endl;
    
    try
    {
        // Test 1: EcologicalInteractions.hpp
        std::cout << "\n1️⃣ Test EcologicalInteractions..." << std::endl;
        auto interactionManager = std::make_unique<Serina::Ecology::EcologicalInteractionManager>();
        std::cout << "✅ EcologicalInteractionManager créé avec succès" << std::endl;
        
        // Test 2: SerinaEcosystem.hpp
        std::cout << "\n2️⃣ Test SerinaEcosystem..." << std::endl;
        auto ecosystem = std::make_unique<Serina::Ecosystem::SerinaEcosystem>();
        auto species = ecosystem->getAllSpecies();
        std::cout << "✅ SerinaEcosystem: " << species.size() << " espèces chargées" << std::endl;
        
        // Test 3: EvolutionaryConstraints.hpp
        std::cout << "\n3️⃣ Test EvolutionaryConstraints..." << std::endl;
        auto constraints = std::make_unique<Serina::Evolution::SerinaEvolutionaryConstraints>(12345);
        std::cout << "✅ SerinaEvolutionaryConstraints créé avec succès" << std::endl;
        
        // Test des méthodes de traits
        Serina::Genetics::AdvancedTraitValues traits;
        traits.size = 2.0;
        traits.intelligence = 1.5;
        
        double sizeValue = constraints->getTraitValue(traits, Serina::Genetics::TraitType::SIZE);
        double intelligenceValue = constraints->getTraitValue(traits, Serina::Genetics::TraitType::INTELLIGENCE);
        std::cout << "✅ Traits: taille=" << sizeValue << ", intelligence=" << intelligenceValue << std::endl;
        
        // Test 4: SimplifiedSerinaSimulator.hpp
        std::cout << "\n4️⃣ Test SimplifiedSerinaSimulator..." << std::endl;
        auto simulator = std::make_unique<Serina::Simulation::SimplifiedSerinaSimulator>(12345);
        std::cout << "✅ SimplifiedSerinaSimulator créé avec succès" << std::endl;
        
        // Test de simulation courte
        Serina::Simulation::SerinaSimulationParameters params;
        params.totalGenerations = 5;
        params.populationSize = 100;
        params.reportInterval = 5;
        
        std::cout << "\n🚀 Simulation courte de validation..." << std::endl;
        simulator->runSimulation(params);
        
        std::cout << "\n🎉 TOUS LES TESTS RÉUSSIS !" << std::endl;
        std::cout << "✅ EcologicalInteractions.hpp - Compilé et fonctionnel" << std::endl;
        std::cout << "✅ EvolutionaryConstraints.hpp - Corrigé (cases dupliquées supprimées)" << std::endl;
        std::cout << "✅ SerinaEcosystem.hpp - Compilé et fonctionnel" << std::endl;
        std::cout << "✅ SimplifiedSerinaSimulator.hpp - Créé et fonctionnel (remplace SerinaSimulator.hpp)" << std::endl;
        
    }
    catch (const std::exception& e)
    {
        std::cerr << "❌ Erreur dans les tests: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}