#include "SerinaSimulator.hpp"
#include <iostream>
#include <iomanip>
#include <thread>
#include <chrono>

using namespace Serina;

/// @brief Démonstration interactive du système Serina
class SerinaDemo
{
private:
    std::unique_ptr<Simulation::SerinaEcosystemSimulator> simulator_;

public:
    SerinaDemo() : simulator_(std::make_unique<Simulation::SerinaEcosystemSimulator>()) {}

    /// @brief Lance la démonstration complète
    void runDemo()
    {
        printWelcome();
        
        // Menu interactif
        while (true)
        {
            printMenu();
            int choice = getUserChoice();
            
            switch (choice)
            {
            case 1:
                runQuickSimulation();
                break;
            case 2:
                runCustomSimulation();
                break;
            case 3:
                demonstrateFeatures();
                break;
            case 4:
                showEcosystemInfo();
                break;
            case 5:
                std::cout << "🌍 Au revoir ! Merci d'avoir exploré l'écosystème Serina !" << std::endl;
                return;
            default:
                std::cout << "❌ Choix invalide, veuillez réessayer." << std::endl;
            }
            
            std::cout << "\nAppuyez sur Entrée pour continuer...";
            std::cin.ignore();
            std::cin.get();
        }
    }

private:
    void printWelcome()
    {
        std::cout << R"(
╔══════════════════════════════════════════════════════════════════════════╗
║                          🌍 SERINA ECOSYSTEM 🌍                          ║
║                    Simulation Multi-Espèces Évolutionnaire               ║
║                                                                          ║
║  Inspiré de "Serina - The World of Birds" par Dylan Bajda               ║
║  Simulation scientifique d'évolution avec contraintes biologiques       ║
╚══════════════════════════════════════════════════════════════════════════╝
        )" << std::endl;
        
        std::cout << "🧬 Système génétique avancé avec 12 traits évolutionnaires" << std::endl;
        std::cout << "🌐 7 environnements différents avec conditions réalistes" << std::endl;
        std::cout << "🐦 13+ espèces originales avec contraintes biologiques spécifiques" << std::endl;
        std::cout << "⚖️ Interactions écologiques complexes (prédation, compétition, mutualisme)" << std::endl;
        std::cout << "🚀 Innovations évolutionnaires et adaptations environnementales" << std::endl;
        std::cout << "🌱 Spéciation et extinction dynamiques" << std::endl;
        std::cout << "📊 Génération automatique de noms scientifiques" << std::endl << std::endl;
    }

    void printMenu()
    {
        std::cout << "\n┌─────────────────────────────────────────────────────────┐" << std::endl;
        std::cout << "│                    MENU PRINCIPAL                      │" << std::endl;
        std::cout << "├─────────────────────────────────────────────────────────┤" << std::endl;
        std::cout << "│ 1. 🚀 Simulation rapide (1000 générations)             │" << std::endl;
        std::cout << "│ 2. ⚙️  Simulation personnalisée                        │" << std::endl;
        std::cout << "│ 3. 🧪 Démonstration des fonctionnalités               │" << std::endl;
        std::cout << "│ 4. 📋 Informations sur l'écosystème                   │" << std::endl;
        std::cout << "│ 5. 🚪 Quitter                                          │" << std::endl;
        std::cout << "└─────────────────────────────────────────────────────────┘" << std::endl;
        std::cout << "Votre choix: ";
    }

    int getUserChoice()
    {
        int choice;
        if (!(std::cin >> choice))
        {
            std::cin.clear();
            std::cin.ignore(10000, '\n');
            return -1;
        }
        std::cin.ignore(); // Consommer le newline restant
        return choice;
    }

    void runQuickSimulation()
    {
        std::cout << "\n🚀 === SIMULATION RAPIDE ===" << std::endl;
        std::cout << "Lancement d'une simulation de 1000 générations avec paramètres optimisés..." << std::endl;
        
        Simulation::SerinaSimulationParameters params;
        params.totalGenerations = 1000;
        params.populationSize = 500;
        params.mutationRate = 0.02;
        params.migrationRate = 0.01;
        params.enableSpeciation = true;
        params.enableExtinction = true;
        params.enableEnvironmentalChange = true;
        params.enableEcologicalInteractions = true;
        params.reportInterval = 100;
        
        auto start = std::chrono::high_resolution_clock::now();
        simulator_->runSimulation(params);
        auto end = std::chrono::high_resolution_clock::now();
        
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        std::cout << "⏱️ Simulation terminée en " << duration.count() << " ms" << std::endl;
    }

    void runCustomSimulation()
    {
        std::cout << "\n⚙️ === CONFIGURATION PERSONNALISÉE ===" << std::endl;
        
        Simulation::SerinaSimulationParameters params;
        
        std::cout << "Nombre de générations (1-50000): ";
        std::cin >> params.totalGenerations;
        params.totalGenerations = std::clamp(params.totalGenerations, 1u, 50000u);
        
        std::cout << "Taille de population par espèce (50-5000): ";
        std::cin >> params.populationSize;
        params.populationSize = std::clamp(params.populationSize, 50u, 5000u);
        
        std::cout << "Taux de mutation (0.001-0.1): ";
        std::cin >> params.mutationRate;
        params.mutationRate = std::clamp(params.mutationRate, 0.001, 0.1);
        
        std::cout << "Taux de migration (0.001-0.1): ";
        std::cin >> params.migrationRate;
        params.migrationRate = std::clamp(params.migrationRate, 0.001, 0.1);
        
        char choice;
        std::cout << "Activer la spéciation ? (o/n): ";
        std::cin >> choice;
        params.enableSpeciation = (choice == 'o' || choice == 'O');
        
        std::cout << "Activer l'extinction ? (o/n): ";
        std::cin >> choice;
        params.enableExtinction = (choice == 'o' || choice == 'O');
        
        std::cout << "Activer les changements environnementaux ? (o/n): ";
        std::cin >> choice;
        params.enableEnvironmentalChange = (choice == 'o' || choice == 'O');
        
        std::cout << "Intervalle de rapport (générations): ";
        std::cin >> params.reportInterval;
        params.reportInterval = std::clamp(params.reportInterval, 10u, 1000u);
        
        std::cout << "\n🎯 Configuration validée ! Lancement de la simulation..." << std::endl;
        
        auto start = std::chrono::high_resolution_clock::now();
        simulator_->runSimulation(params);
        auto end = std::chrono::high_resolution_clock::now();
        
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        std::cout << "⏱️ Simulation personnalisée terminée en " << duration.count() << " ms" << std::endl;
    }

    void demonstrateFeatures()
    {
        std::cout << "\n🧪 === DÉMONSTRATION DES FONCTIONNALITÉS ===" << std::endl;
        
        // Créer les composants individuels pour démonstration
        auto ecosystem = std::make_unique<Ecosystem::SerinaEcosystem>();
        auto environments = std::make_unique<Environment::SerinaEnvironmentManager>();
        auto constraints = std::make_unique<Evolution::SerinaEvolutionaryConstraints>();
        auto interactions = std::make_unique<Ecology::EcologicalInteractionManager>();
        
        // Démonstration 1: Génération de noms scientifiques
        std::cout << "\n📋 1. GÉNÉRATION AUTOMATIQUE DE NOMS SCIENTIFIQUES:" << std::endl;
        showScientificNaming();
        
        // Démonstration 2: Caractéristiques des espèces
        std::cout << "\n🐦 2. CARACTÉRISTIQUES DES ESPÈCES ORIGINALES:" << std::endl;
        showSpeciesCharacteristics();
        
        // Démonstration 3: Environnements
        std::cout << "\n🌍 3. ENVIRONNEMENTS DISPONIBLES:" << std::endl;
        showEnvironments();
        
        // Démonstration 4: Interactions écologiques
        std::cout << "\n⚖️ 4. INTERACTIONS ÉCOLOGIQUES:" << std::endl;
        showEcologicalInteractions();
        
        // Démonstration 5: Contraintes évolutionnaires
        std::cout << "\n🧬 5. CONTRAINTES ÉVOLUTIONNAIRES:" << std::endl;
        showEvolutionaryConstraints();
    }

    void showScientificNaming()
    {
        auto taxonomy = std::make_unique<Taxonomy::EcosystemTaxonomy>();
        
        std::vector<Taxonomy::BiologicalType> types = {
            Taxonomy::BiologicalType::BIRD,
            Taxonomy::BiologicalType::FISH,
            Taxonomy::BiologicalType::ARTHROPOD,
            Taxonomy::BiologicalType::MOLLUSC
        };
        
        for (auto type : types)
        {
            auto info = taxonomy->generateTaxonomicName(type, "test_species");
            std::cout << "  " << taxonomy->biologicalTypeToString(type) << ": " 
                      << info.genus << " " << info.species << " (" << info.family << ")" << std::endl;
        }
    }

    void showSpeciesCharacteristics()
    {
        auto ecosystem = std::make_unique<Ecosystem::SerinaEcosystem>();
        auto species = ecosystem->getAllSpecies();
        
        int count = 0;
        for (const auto& sp : species)
        {
            if (count >= 5) break; // Montrer seulement les 5 premières
            
            auto characteristics = ecosystem->getSpeciesCharacteristics(sp);
            if (characteristics)
            {
                std::cout << "  🔸 " << sp << std::endl;
                std::cout << "     Type: " << static_cast<int>(characteristics->biologicalType) << std::endl;
                std::cout << "     Régime: " << static_cast<int>(characteristics->diet) << std::endl;
                std::cout << "     Environnements: " << characteristics->preferredEnvironments.size() << std::endl;
                std::cout << "     Peut nager: " << (characteristics->canSwim ? "Oui" : "Non") << std::endl;
                std::cout << "     Peut voler: " << (characteristics->canFly ? "Oui" : "Non") << std::endl;
            }
            count++;
        }
        std::cout << "  ... et " << (species.size() - 5) << " autres espèces" << std::endl;
    }

    void showEnvironments()
    {
        std::vector<std::pair<Ecosystem::EnvironmentType, std::string>> envs = {
            {Ecosystem::EnvironmentType::GRASSLAND, "Prairie (environnement principal)"},
            {Ecosystem::EnvironmentType::FOREST, "Forêt (canopée complexe)"},
            {Ecosystem::EnvironmentType::FRESHWATER, "Eau douce (lacs et rivières)"},
            {Ecosystem::EnvironmentType::OCEAN, "Océan (environnement marin)"},
            {Ecosystem::EnvironmentType::WETLAND, "Zones humides (transition)"},
            {Ecosystem::EnvironmentType::MOUNTAIN, "Montagne (conditions difficiles)"},
            {Ecosystem::EnvironmentType::ARCTIC, "Arctique (froid extrême)"}
        };
        
        for (const auto& [type, desc] : envs)
        {
            std::cout << "  🌐 " << desc << std::endl;
        }
    }

    void showEcologicalInteractions()
    {
        std::vector<std::string> interactions = {
            "🍖 Prédation: Canaris mangent insectes, poissons chassent petites proies",
            "🥊 Compétition: Entre espèces de poissons, entre espèces de fourmis",
            "🤝 Mutualisme: Relations de nettoyage, symbioses",
            "🦠 Parasitisme: Parasites internes et externes",
            "🏠 Commensalisme: Bénéfices unilatéraux",
            "☠️  Amensalisme: Inhibition chimique"
        };
        
        for (const auto& interaction : interactions)
        {
            std::cout << "  " << interaction << std::endl;
        }
    }

    void showEvolutionaryConstraints()
    {
        std::vector<std::string> constraints = {
            "🐦 Oiseaux: Contraintes de vol (taille/vitesse), développement en œuf",
            "🐟 Poissons: Respiration aquatique, efficacité natatoire",
            "🐛 Arthropodes: Limitation d'exosquelette, métamorphose",
            "🐌 Mollusques: Locomotion lente, protection par coquille",
            "🪼 Cnidaires: Symétrie radiale, reproduction par bourgeonnement",
            "🪱 Annélides: Segmentation corporelle, régénération"
        };
        
        for (const auto& constraint : constraints)
        {
            std::cout << "  " << constraint << std::endl;
        }
    }

    void showEcosystemInfo()
    {
        std::cout << "\n📋 === INFORMATIONS SUR L'ÉCOSYSTÈME SERINA ===" << std::endl;
        
        auto ecosystem = std::make_unique<Ecosystem::SerinaEcosystem>();
        auto species = ecosystem->getAllSpecies();
        
        std::cout << "\n📊 STATISTIQUES GÉNÉRALES:" << std::endl;
        std::cout << "  🧬 Espèces originales: " << species.size() << std::endl;
        std::cout << "  🌍 Environnements disponibles: 7" << std::endl;
        std::cout << "  ⚗️ Traits évolutionnaires: 12" << std::endl;
        std::cout << "  🔗 Types d'interactions: 6" << std::endl;
        
        // Compter par type biologique
        std::unordered_map<Taxonomy::BiologicalType, int> typeCounts;
        for (const auto& sp : species)
        {
            auto characteristics = ecosystem->getSpeciesCharacteristics(sp);
            if (characteristics)
            {
                typeCounts[characteristics->biologicalType]++;
            }
        }
        
        std::cout << "\n🏷️ RÉPARTITION PAR GROUPE BIOLOGIQUE:" << std::endl;
        for (const auto& [type, count] : typeCounts)
        {
            std::string typeName;
            switch (type)
            {
            case Taxonomy::BiologicalType::BIRD: typeName = "Oiseaux"; break;
            case Taxonomy::BiologicalType::FISH: typeName = "Poissons"; break;
            case Taxonomy::BiologicalType::ARTHROPOD: typeName = "Arthropodes"; break;
            case Taxonomy::BiologicalType::MOLLUSC: typeName = "Mollusques"; break;
            case Taxonomy::BiologicalType::CNIDARIAN: typeName = "Cnidaires"; break;
            case Taxonomy::BiologicalType::ANNELID: typeName = "Annélides"; break;
            case Taxonomy::BiologicalType::CRUSTACEAN: typeName = "Crustacés"; break;
            default: typeName = "Autres"; break;
            }
            std::cout << "  📋 " << typeName << ": " << count << " espèces" << std::endl;
        }
        
        std::cout << "\n🎯 OBJECTIFS DE LA SIMULATION:" << std::endl;
        std::cout << "  • Étudier l'évolution multi-espèces dans un monde réaliste" << std::endl;
        std::cout << "  • Observer l'émergence de nouvelles adaptations" << std::endl;
        std::cout << "  • Analyser les dynamiques de spéciation et extinction" << std::endl;
        std::cout << "  • Comprendre les interactions écologiques complexes" << std::endl;
        std::cout << "  • Valider les contraintes biologiques réalistes" << std::endl;
        
        std::cout << "\n🔬 MÉTHODOLOGIE SCIENTIFIQUE:" << std::endl;
        std::cout << "  • Nomenclature binomiale automatique" << std::endl;
        std::cout << "  • Contraintes phylogénétiques respectées" << std::endl;
        std::cout << "  • Lois physiques et biologiques appliquées" << std::endl;
        std::cout << "  • Stochasticité environnementale réaliste" << std::endl;
        std::cout << "  • Pressions sélectives multiples" << std::endl;
    }
};

int main()
{
    try
    {
        SerinaDemo demo;
        demo.runDemo();
    }
    catch (const std::exception& e)
    {
        std::cerr << "❌ Erreur critique: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}