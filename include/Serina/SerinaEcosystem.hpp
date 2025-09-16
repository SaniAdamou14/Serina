#pragma once

#include "EcosystemTaxonomy.hpp"
#include "AdvancedGenetics.hpp"
#include <memory>
#include <vector>
#include <unordered_map>
#include <string>
#include <random>
#include <algorithm>
#include <iostream>

namespace Serina::Ecosystem
{

    /// @brief Types d'environnement disponibles sur Serina
    enum class EnvironmentType
    {
        GRASSLAND,      ///< Prairies (environnement principal)
        FOREST,         ///< Forêts
        FRESHWATER,     ///< Lacs et rivières
        OCEAN,          ///< Océans
        WETLAND,        ///< Zones humides
        MOUNTAIN,       ///< Montagnes
        DESERT,         ///< Déserts (émergents)
        ARCTIC,         ///< Zones arctiques
        TROPICAL,       ///< Zones tropicales
        URBAN           ///< Zones urbaines abandonnées
    };

    /// @brief Types de régime alimentaire
    enum class DietType
    {
        HERBIVORE,      ///< Mange les plantes
        CARNIVORE,      ///< Mange d'autres animaux
        OMNIVORE,       ///< Mange plantes et animaux
        DETRITIVORE,    ///< Mange la matière en décomposition
        FILTER_FEEDER,  ///< Filtre la nourriture de l'eau
        PARASITE,       ///< Parasite d'autres organismes
        PHOTOSYNTHETIC  ///< Photosynthèse (plantes)
    };

    /// @brief Niches écologiques spécialisées
    enum class EcologicalNiche
    {
        GROUND_FORAGER,    ///< Fouille au sol
        AERIAL_HUNTER,     ///< Chasse en vol
        AQUATIC_SWIMMER,   ///< Nage dans l'eau
        TREE_DWELLER,      ///< Vit dans les arbres
        UNDERGROUND,       ///< Vit sous terre
        SURFACE_WALKER,    ///< Marche en surface
        CANOPY_CLIMBER,    ///< Grimpe dans la canopée
        DEEP_DIVER,        ///< Plonge profondément
        POLLINATOR,        ///< Pollinise les plantes
        DECOMPOSER         ///< Décompose la matière organique
    };

    /// @brief Caractéristiques spécifiques d'une espèce
    struct SpeciesCharacteristics
    {
        std::string scientificName;
        std::string commonName;
        Taxonomy::BiologicalType biologicalType;
        
        // Écologie
        std::vector<EnvironmentType> preferredEnvironments;
        DietType diet;
        EcologicalNiche niche;
        
        // Traits physiques de base
        double baseSize;           ///< Taille de base (mètres)
        double baseSpeed;          ///< Vitesse de base (m/s)
        double baseLifespan;       ///< Espérance de vie (années)
        double baseReproductionRate; ///< Taux de reproduction
        
        // Adaptations spéciales
        std::vector<std::string> specialTraits;
        
        // Relations écologiques
        std::vector<std::string> predators;     ///< Prédateurs
        std::vector<std::string> prey;          ///< Proies
        std::vector<std::string> competitors;   ///< Concurrents
        std::vector<std::string> symbionts;     ///< Symbiontes
        
        // Contraintes évolutives
        double mutationRate;
        double adaptationFlexibility;  ///< Capacité d'adaptation [0-1]
        bool canFly;
        bool canSwim;
        bool canBurrow;
        
        // Besoins en ressources
        double energyRequirement;     ///< Besoins énergétiques quotidiens
        double territorySize;          ///< Taille du territoire (m²)
        
        // Paramètres de reproduction
        double maturityAge;            ///< Âge de maturité sexuelle
        uint32_t offspringCount;       ///< Nombre de descendants par reproduction
        double parentalCare;           ///< Niveau de soins parentaux [0-1]
    };

    /// @brief Gestionnaire des espèces de l'écosystème Serina
    class SerinaEcosystem
    {
    private:
        std::unique_ptr<Taxonomy::EcosystemTaxonomy> taxonomy_;
        std::unordered_map<std::string, SpeciesCharacteristics> speciesDatabase_;
        std::unordered_map<EnvironmentType, std::vector<std::string>> environmentSpecies_;
        std::mt19937 rng_;

    public:
        SerinaEcosystem(uint32_t seed = std::random_device{}())
            : taxonomy_(std::make_unique<Taxonomy::EcosystemTaxonomy>(seed)), rng_(seed)
        {
            initializeOriginalSpecies();
        }

        /// @brief Initialise toutes les espèces originales de Serina
        void initializeOriginalSpecies()
        {
            // === OISEAUX (PRIMARY FOCUS) ===
            registerOriginalSpecies("Serinus canaria domestica", "Domestic Canary", 
                                   Taxonomy::BiologicalType::BIRD,
                                   {EnvironmentType::GRASSLAND, EnvironmentType::FOREST},
                                   DietType::OMNIVORE, EcologicalNiche::AERIAL_HUNTER,
                                   0.125, 8.0, 10.0, 0.7,
                                   {"vocal_communication", "flight", "seed_cracking"},
                                   0.05, 0.9);

            // === POISSONS ===
            // Platies
            registerOriginalSpecies("Xiphophorus maculatus", "Southern Platyfish",
                                   Taxonomy::BiologicalType::FISH,
                                   {EnvironmentType::FRESHWATER},
                                   DietType::OMNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.06, 3.0, 3.0, 0.9,
                                   {"live_bearing", "schooling", "algae_eating"},
                                   0.08, 0.7);

            registerOriginalSpecies("Xiphophorus hellerii", "Green Swordtail",
                                   Taxonomy::BiologicalType::FISH,
                                   {EnvironmentType::FRESHWATER},
                                   DietType::OMNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.12, 5.0, 4.0, 0.8,
                                   {"sword_tail", "jumping", "territorial"},
                                   0.07, 0.8);

            // Guppies et Mollies
            registerOriginalSpecies("Poecilia reticulata", "Guppy",
                                   Taxonomy::BiologicalType::FISH,
                                   {EnvironmentType::FRESHWATER},
                                   DietType::OMNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.05, 4.0, 2.0, 1.0,
                                   {"colorful_males", "rapid_reproduction", "disease_resistance"},
                                   0.12, 0.9);

            registerOriginalSpecies("Poecilia sphenops", "Short-finned Molly",
                                   Taxonomy::BiologicalType::FISH,
                                   {EnvironmentType::FRESHWATER, EnvironmentType::WETLAND},
                                   DietType::OMNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.08, 4.0, 5.0, 0.7,
                                   {"algae_scraping", "salt_tolerance", "surface_feeding"},
                                   0.06, 0.8);

            // === ARTHROPODES ===
            // Fourmis (destinées à de grandes choses)
            registerOriginalSpecies("Atta cephalotes", "Leafcutter Ant",
                                   Taxonomy::BiologicalType::ARTHROPOD,
                                   {EnvironmentType::FOREST, EnvironmentType::GRASSLAND},
                                   DietType::HERBIVORE, EcologicalNiche::UNDERGROUND,
                                   0.015, 0.05, 0.3, 0.8,
                                   {"fungus_farming", "leaf_cutting", "colonial", "caste_system"},
                                   0.03, 0.6);

            registerOriginalSpecies("Solenopsis invicta", "Fire Ant",
                                   Taxonomy::BiologicalType::ARTHROPOD,
                                   {EnvironmentType::GRASSLAND, EnvironmentType::WETLAND},
                                   DietType::OMNIVORE, EcologicalNiche::SURFACE_WALKER,
                                   0.005, 0.03, 0.2, 0.9,
                                   {"aggressive", "stinging", "rafting", "invasive"},
                                   0.04, 0.8);

            // Criquets
            registerOriginalSpecies("Gryllus bimaculatus", "Field Cricket",
                                   Taxonomy::BiologicalType::ARTHROPOD,
                                   {EnvironmentType::GRASSLAND},
                                   DietType::OMNIVORE, EcologicalNiche::GROUND_FORAGER,
                                   0.025, 0.5, 0.5, 0.6,
                                   {"chirping", "jumping", "omnivorous"},
                                   0.06, 0.7);

            // Collemboles
            registerOriginalSpecies("Folsomia candida", "Springtail",
                                   Taxonomy::BiologicalType::ARTHROPOD,
                                   {EnvironmentType::FOREST, EnvironmentType::WETLAND},
                                   DietType::DETRITIVORE, EcologicalNiche::DECOMPOSER,
                                   0.002, 0.01, 0.1, 0.9,
                                   {"jumping", "moisture_dependent", "soil_aeration"},
                                   0.08, 0.5);

            // Coccinelles
            registerOriginalSpecies("Coccinella septempunctata", "Seven-spot Ladybird",
                                   Taxonomy::BiologicalType::ARTHROPOD,
                                   {EnvironmentType::GRASSLAND, EnvironmentType::FOREST},
                                   DietType::CARNIVORE, EcologicalNiche::AERIAL_HUNTER,
                                   0.008, 0.2, 1.0, 0.4,
                                   {"aphid_predator", "hibernation", "warning_coloration"},
                                   0.05, 0.6);

            // === MOLLUSQUES ===
            // Escargots géants africains
            registerOriginalSpecies("Achatina fulica", "Giant African Land Snail",
                                   Taxonomy::BiologicalType::MOLLUSC,
                                   {EnvironmentType::FOREST, EnvironmentType::WETLAND},
                                   DietType::HERBIVORE, EcologicalNiche::GROUND_FORAGER,
                                   0.20, 0.006, 10.0, 0.3,
                                   {"shell", "mucus_trail", "hermaphroditic", "calcium_needs"},
                                   0.04, 0.7);

            // Limaces
            registerOriginalSpecies("Limax maximus", "Leopard Slug",
                                   Taxonomy::BiologicalType::MOLLUSC,
                                   {EnvironmentType::FOREST, EnvironmentType::WETLAND},
                                   DietType::DETRITIVORE, EcologicalNiche::GROUND_FORAGER,
                                   0.15, 0.003, 3.0, 0.4,
                                   {"no_shell", "mating_ritual", "nocturnal"},
                                   0.06, 0.8);

            // Escargots d'eau douce
            registerOriginalSpecies("Lymnaea stagnalis", "Great Pond Snail",
                                   Taxonomy::BiologicalType::MOLLUSC,
                                   {EnvironmentType::FRESHWATER, EnvironmentType::WETLAND},
                                   DietType::HERBIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.05, 0.01, 2.0, 0.6,
                                   {"air_breathing", "algae_grazing", "egg_masses"},
                                   0.07, 0.6);

            // === CNIDAIRES ===
            // Hydres
            registerOriginalSpecies("Hydra vulgaris", "Common Hydra",
                                   Taxonomy::BiologicalType::CNIDARIAN,
                                   {EnvironmentType::FRESHWATER},
                                   DietType::CARNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.01, 0.0, -1.0, 0.8,  // Immortel potentiel
                                   {"regeneration", "asexual_reproduction", "stinging_cells"},
                                   0.02, 0.4);

            // Méduses
            registerOriginalSpecies("Aurelia aurita", "Moon Jelly",
                                   Taxonomy::BiologicalType::CNIDARIAN,
                                   {EnvironmentType::OCEAN},
                                   DietType::CARNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.4, 1.0, 1.0, 0.7,
                                   {"transparency", "pulsation", "plankton_feeding"},
                                   0.05, 0.5);

            // === ANNÉLIDES ===
            // Vers de terre
            registerOriginalSpecies("Lumbricus terrestris", "Common Earthworm",
                                   Taxonomy::BiologicalType::ANNELID,
                                   {EnvironmentType::GRASSLAND, EnvironmentType::FOREST},
                                   DietType::DETRITIVORE, EcologicalNiche::UNDERGROUND,
                                   0.30, 0.001, 10.0, 0.5,
                                   {"soil_aeration", "organic_processing", "hermaphroditic"},
                                   0.03, 0.6);

            // === CRUSTACÉS ===
            // Écrevisses parthénogénétiques
            registerOriginalSpecies("Procambarus fallax", "Marbled Crayfish",
                                   Taxonomy::BiologicalType::CRUSTACEAN,
                                   {EnvironmentType::FRESHWATER},
                                   DietType::OMNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.12, 0.5, 3.0, 0.8,
                                   {"parthenogenesis", "clonal_reproduction", "burrowing"},
                                   0.04, 0.8);

            // Crevettes cerises
            registerOriginalSpecies("Neocaridina davidi", "Cherry Shrimp",
                                   Taxonomy::BiologicalType::CRUSTACEAN,
                                   {EnvironmentType::FRESHWATER},
                                   DietType::DETRITIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.03, 0.2, 2.0, 0.9,
                                   {"algae_cleaning", "color_morphs", "peaceful"},
                                   0.06, 0.7);

            // Triops
            registerOriginalSpecies("Triops longicaudatus", "American Tadpole Shrimp",
                                   Taxonomy::BiologicalType::CRUSTACEAN,
                                   {EnvironmentType::WETLAND},
                                   DietType::OMNIVORE, EcologicalNiche::AQUATIC_SWIMMER,
                                   0.06, 2.0, 0.3, 0.7,
                                   {"living_fossil", "drought_resistance", "rapid_development"},
                                   0.05, 0.6);

            // Bernards-l'ermite
            registerOriginalSpecies("Pagurus bernhardus", "Common Hermit Crab",
                                   Taxonomy::BiologicalType::CRUSTACEAN,
                                   {EnvironmentType::OCEAN},
                                   DietType::OMNIVORE, EcologicalNiche::SURFACE_WALKER,
                                   0.08, 0.1, 5.0, 0.5,
                                   {"shell_carrying", "social_behavior", "scavenging"},
                                   0.04, 0.7);

            std::cout << "🌍 Écosystème Serina initialisé avec " << speciesDatabase_.size() 
                      << " espèces originales" << std::endl;
        }

        /// @brief Enregistre une espèce originale
        void registerOriginalSpecies(const std::string& scientificName, const std::string& commonName,
                                    Taxonomy::BiologicalType type, 
                                    const std::vector<EnvironmentType>& environments,
                                    DietType diet, EcologicalNiche niche,
                                    double size, double speed, double lifespan, double reproRate,
                                    const std::vector<std::string>& traits,
                                    double mutRate, double adaptability)
        {
            SpeciesCharacteristics spec;
            spec.scientificName = scientificName;
            spec.commonName = commonName;
            spec.biologicalType = type;
            spec.preferredEnvironments = environments;
            spec.diet = diet;
            spec.niche = niche;
            spec.baseSize = size;
            spec.baseSpeed = speed;
            spec.baseLifespan = lifespan;
            spec.baseReproductionRate = reproRate;
            spec.specialTraits = traits;
            spec.mutationRate = mutRate;
            spec.adaptationFlexibility = adaptability;

            // Configuration automatique basée sur le type
            configureBiologicalConstraints(spec);

            speciesDatabase_[scientificName] = spec;

            // Ajouter aux environnements
            for (auto env : environments)
            {
                environmentSpecies_[env].push_back(scientificName);
            }

            // Enregistrer dans la taxonomie
            taxonomy_->registerNewSpecies(type, traits);
        }

        /// @brief Génère une nouvelle espèce par évolution
        std::string evolveNewSpecies(const std::string& parentSpecies, 
                                   const std::vector<std::string>& adaptationTraits,
                                   EnvironmentType targetEnvironment)
        {
            auto parentIt = speciesDatabase_.find(parentSpecies);
            if (parentIt == speciesDatabase_.end())
                return "";

            const auto& parent = parentIt->second;

            // Générer nom scientifique pour la nouvelle espèce
            std::string newSpeciesName = taxonomy_->registerNewSpecies(
                parent.biologicalType, adaptationTraits, 
                environmentTypeToString(targetEnvironment), parentSpecies);

            // Créer les caractéristiques de la nouvelle espèce
            SpeciesCharacteristics newSpec = parent;
            newSpec.scientificName = newSpeciesName;
            newSpec.commonName = generateEvolutionaryCommonName(parent.commonName, adaptationTraits);

            // Appliquer mutations adaptatives
            applyEvolutionaryChanges(newSpec, adaptationTraits, targetEnvironment);

            speciesDatabase_[newSpeciesName] = newSpec;
            environmentSpecies_[targetEnvironment].push_back(newSpeciesName);

            return newSpeciesName;
        }

        /// @brief Obtient toutes les espèces dans un environnement
        std::vector<std::string> getSpeciesInEnvironment(EnvironmentType env) const
        {
            auto it = environmentSpecies_.find(env);
            return (it != environmentSpecies_.end()) ? it->second : std::vector<std::string>();
        }

        /// @brief Obtient les caractéristiques d'une espèce
        const SpeciesCharacteristics* getSpeciesCharacteristics(const std::string& species) const
        {
            auto it = speciesDatabase_.find(species);
            return (it != speciesDatabase_.end()) ? &it->second : nullptr;
        }

        /// @brief Obtient toutes les espèces enregistrées
        const std::unordered_map<std::string, SpeciesCharacteristics>& getAllSpecies() const
        {
            return speciesDatabase_;
        }

        /// @brief Obtient le gestionnaire de taxonomie
        const Taxonomy::EcosystemTaxonomy& getTaxonomy() const
        {
            return *taxonomy_;
        }

        /// @brief Avance à la génération suivante
        void nextGeneration()
        {
            taxonomy_->nextGeneration();
        }

    private:
        void configureBiologicalConstraints(SpeciesCharacteristics& spec)
        {
            // Configuration basée sur le type biologique
            switch (spec.biologicalType)
            {
            case Taxonomy::BiologicalType::BIRD:
                spec.canFly = true;
                spec.canSwim = false;
                spec.canBurrow = false;
                spec.energyRequirement = spec.baseSize * 50.0; // Métabolisme élevé
                spec.territorySize = spec.baseSize * 1000.0;
                spec.maturityAge = spec.baseLifespan * 0.2;
                spec.offspringCount = 4;
                spec.parentalCare = 0.8;
                break;

            case Taxonomy::BiologicalType::FISH:
                spec.canFly = false;
                spec.canSwim = true;
                spec.canBurrow = false;
                spec.energyRequirement = spec.baseSize * 20.0;
                spec.territorySize = spec.baseSize * 500.0;
                spec.maturityAge = spec.baseLifespan * 0.3;
                spec.offspringCount = 20;
                spec.parentalCare = 0.3;
                break;

            case Taxonomy::BiologicalType::ARTHROPOD:
                spec.canFly = (spec.specialTraits.end() != 
                             std::find(spec.specialTraits.begin(), spec.specialTraits.end(), "flight"));
                spec.canSwim = false;
                spec.canBurrow = (spec.niche == EcologicalNiche::UNDERGROUND);
                spec.energyRequirement = spec.baseSize * 10.0;
                spec.territorySize = spec.baseSize * 100.0;
                spec.maturityAge = spec.baseLifespan * 0.1;
                spec.offspringCount = 100;
                spec.parentalCare = 0.1;
                break;

            case Taxonomy::BiologicalType::MOLLUSC:
                spec.canFly = false;
                spec.canSwim = (spec.niche == EcologicalNiche::AQUATIC_SWIMMER);
                spec.canBurrow = false;
                spec.energyRequirement = spec.baseSize * 5.0;
                spec.territorySize = spec.baseSize * 50.0;
                spec.maturityAge = spec.baseLifespan * 0.4;
                spec.offspringCount = 50;
                spec.parentalCare = 0.0;
                break;

            case Taxonomy::BiologicalType::CNIDARIAN:
                spec.canFly = false;
                spec.canSwim = true;
                spec.canBurrow = false;
                spec.energyRequirement = spec.baseSize * 2.0;
                spec.territorySize = spec.baseSize * 10.0;
                spec.maturityAge = spec.baseLifespan * 0.1;
                spec.offspringCount = 1000;
                spec.parentalCare = 0.0;
                break;

            case Taxonomy::BiologicalType::ANNELID:
                spec.canFly = false;
                spec.canSwim = false;
                spec.canBurrow = true;
                spec.energyRequirement = spec.baseSize * 3.0;
                spec.territorySize = spec.baseSize * 25.0;
                spec.maturityAge = spec.baseLifespan * 0.3;
                spec.offspringCount = 20;
                spec.parentalCare = 0.0;
                break;

            case Taxonomy::BiologicalType::CRUSTACEAN:
                spec.canFly = false;
                spec.canSwim = true;
                spec.canBurrow = (spec.specialTraits.end() != 
                                std::find(spec.specialTraits.begin(), spec.specialTraits.end(), "burrowing"));
                spec.energyRequirement = spec.baseSize * 15.0;
                spec.territorySize = spec.baseSize * 200.0;
                spec.maturityAge = spec.baseLifespan * 0.2;
                spec.offspringCount = 30;
                spec.parentalCare = 0.2;
                break;

            case Taxonomy::BiologicalType::PLANT:
                spec.canFly = false;
                spec.canSwim = false;
                spec.canBurrow = false;
                spec.energyRequirement = 0.0; // Photosynthèse
                spec.territorySize = spec.baseSize * spec.baseSize * 10.0;
                spec.maturityAge = spec.baseLifespan * 0.1;
                spec.offspringCount = 1000;
                spec.parentalCare = 0.0;
                break;
            }
        }

        void applyEvolutionaryChanges(SpeciesCharacteristics& spec, 
                                    const std::vector<std::string>& traits,
                                    EnvironmentType environment)
        {
            // Mutations adaptatives basées sur l'environnement
            std::uniform_real_distribution<double> mutationDist(-0.2, 0.2);

            for (const auto& trait : traits)
            {
                if (trait == "larger") spec.baseSize *= (1.0 + std::abs(mutationDist(rng_)));
                else if (trait == "smaller") spec.baseSize *= (1.0 - std::abs(mutationDist(rng_)));
                else if (trait == "faster") spec.baseSpeed *= (1.0 + std::abs(mutationDist(rng_)));
                else if (trait == "longer_lived") spec.baseLifespan *= (1.0 + std::abs(mutationDist(rng_)));
                else if (trait == "more_fertile") spec.baseReproductionRate *= (1.0 + std::abs(mutationDist(rng_)));
            }

            // Adaptations environnementales
            switch (environment)
            {
            case EnvironmentType::ARCTIC:
                spec.specialTraits.push_back("cold_resistance");
                spec.baseSize *= 1.2; // Loi de Bergmann
                break;
            case EnvironmentType::DESERT:
                spec.specialTraits.push_back("water_conservation");
                spec.energyRequirement *= 0.8;
                break;
            case EnvironmentType::OCEAN:
                spec.specialTraits.push_back("salt_tolerance");
                spec.canSwim = true;
                break;
            case EnvironmentType::MOUNTAIN:
                spec.specialTraits.push_back("altitude_adaptation");
                spec.baseSpeed *= 0.9;
                break;
            }
        }

        std::string environmentTypeToString(EnvironmentType env)
        {
            switch (env)
            {
            case EnvironmentType::GRASSLAND: return "grassland";
            case EnvironmentType::FOREST: return "forest";
            case EnvironmentType::FRESHWATER: return "freshwater";
            case EnvironmentType::OCEAN: return "ocean";
            case EnvironmentType::WETLAND: return "wetland";
            case EnvironmentType::MOUNTAIN: return "mountain";
            case EnvironmentType::DESERT: return "desert";
            case EnvironmentType::ARCTIC: return "arctic";
            case EnvironmentType::TROPICAL: return "tropical";
            case EnvironmentType::URBAN: return "urban";
            default: return "unknown";
            }
        }

        std::string generateEvolutionaryCommonName(const std::string& parentName, 
                                                 const std::vector<std::string>& traits)
        {
            std::string newName = parentName;
            if (!traits.empty())
            {
                std::string trait = traits[rng_() % traits.size()];
                newName = trait + " " + parentName;
            }
            return newName;
        }
    };

} // namespace Serina::Ecosystem
