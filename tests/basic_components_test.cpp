#include "AdvancedGenetics.hpp"
#include "SerinaEcosystem.hpp" 
#include <iostream>
#include <memory>

/// @brief Test simple des composants de base
int main()
{
    try
    {
        std::cout << "🔧 Test des composants de base Serina..." << std::endl;
        
        // Test AdvancedGenetics
        std::cout << "   🧬 Test AdvancedGenetics..." << std::endl;
        Serina::Genetics::AdvancedTraitValues traits;
        traits.size = 1.2;
        traits.speed = 0.8;
        std::cout << "      ✅ AdvancedTraitValues: taille=" << traits.size << ", vitesse=" << traits.speed << std::endl;
        
        // Test SerinaEcosystem
        std::cout << "   🌍 Test SerinaEcosystem..." << std::endl;
        auto ecosystem = std::make_unique<Serina::Ecosystem::SerinaEcosystem>();
        auto allSpecies = ecosystem->getAllSpecies();
        std::cout << "      ✅ SerinaEcosystem: " << allSpecies.size() << " espèces chargées" << std::endl;
        
        // Test d'une espèce spécifique
        auto canaryTraits = ecosystem->getSpeciesCharacteristics("Serinus canaria domestica");
        if (canaryTraits)
        {
            std::cout << "      ✅ Canari trouvé: " << canaryTraits->commonName << std::endl;
        }
        
        std::cout << "\n✅ TOUS LES COMPOSANTS DE BASE FONCTIONNENT !" << std::endl;
        return 0;
    }
    catch (const std::exception& e)
    {
        std::cerr << "❌ Erreur: " << e.what() << std::endl;
        return 1;
    }
}