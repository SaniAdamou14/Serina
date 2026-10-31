#pragma once

// Où chaque groupe biologique peut vivre. Une table simple et pure, testable sans
// simulation : tant que les plans corporels n'existent pas (voir docs/ROADMAP.md),
// ces limites sont fixes pour tout le groupe, descendants compris.

#include "EcosystemTaxonomy.hpp"
#include "SerinaEcosystem.hpp"

namespace Serina::Habitat
{
    struct Suitability
    {
        /// Un individu peut-il se trouver sur cette case ?
        bool passable = true;
        /// Fraction [0,1] de la ressource de la case à laquelle il a accès.
        double foraging = 1.0;
    };

    inline Suitability suitabilityOf(Taxonomy::BiologicalType group, Ecosystem::EnvironmentType biome)
    {
        using Biome = Ecosystem::EnvironmentType;
        using Group = Taxonomy::BiologicalType;

        const bool openWater = biome == Biome::FRESHWATER || biome == Biome::OCEAN;

        switch (group)
        {
        case Group::FISH:
        case Group::CNIDARIAN:
            if (biome == Biome::FRESHWATER) return {true, 1.0};
            if (biome == Biome::OCEAN) return {true, 0.8};
            if (biome == Biome::WETLAND) return {true, 0.7};
            return {false, 0.0};

        case Group::BIRD:
            // Vole au-dessus de tout, mais ne se nourrit pas en pleine eau.
            switch (biome)
            {
            case Biome::OCEAN: return {true, 0.0};
            case Biome::FRESHWATER: return {true, 0.2};
            case Biome::WETLAND: return {true, 0.8};
            case Biome::MOUNTAIN: return {true, 0.5};
            case Biome::DESERT: return {true, 0.3};
            case Biome::ARCTIC: return {true, 0.2};
            default: return {true, 1.0};
            }

        case Group::MOLLUSC:
            // Escargot terrestre : besoin d'humidité, ne traverse pas l'eau libre.
            if (openWater) return {false, 0.0};
            switch (biome)
            {
            case Biome::GRASSLAND: return {true, 0.7};
            case Biome::MOUNTAIN: return {true, 0.2};
            case Biome::DESERT: return {true, 0.05};
            case Biome::ARCTIC: return {true, 0.05};
            default: return {true, 1.0};
            }

        default:
            // Arthropodes terrestres et autres groupes sans règle dédiée.
            if (openWater) return {false, 0.0};
            switch (biome)
            {
            case Biome::WETLAND: return {true, 0.7};
            case Biome::MOUNTAIN: return {true, 0.4};
            case Biome::DESERT: return {true, 0.4};
            case Biome::ARCTIC: return {true, 0.1};
            default: return {true, 1.0};
            }
        }
    }

} // namespace Serina::Habitat
