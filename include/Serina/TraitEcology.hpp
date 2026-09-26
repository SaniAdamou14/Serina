#pragma once

// Classification écologique calculée à partir des vrais profils de traits
// moyens par espèce et par région (Chantier F) -- remplace la dépendance de
// UnifiedWorldSimulator (WorldSimulation.hpp) à
// Ecology::EcologicalInteractionManager (EcologicalInteractions.hpp), dont
// le catalogue est câblé sur des noms d'espèces qui n'existent pas dans ce
// moteur (ex. "Serinus canaria domestica" contre le vrai fondateur "Serinus
// canaria") et jamais initialisé pour ce pipeline de toute façon
// (initializeBasicInteractions() n'est appelé que par l'ancien
// SerinaSimulator.hpp/SimplifiedSerinaSimulator.hpp) -- une boucle morte
// depuis le début.
//
// Fonctionne automatiquement pour toute nouvelle espèce née par spéciation,
// sans jamais coder un nom en dur : la classification ne dépend que des
// traits réels moyens des individus présents, recalculés chaque génération.
//
// Toutes les fonctions ci-dessous sont pures (aucun état, aucun aléatoire) --
// testables directement sur des valeurs numériques simples, voir
// tests/test_trait_ecology.cpp.

#include <algorithm>
#include <cstdint>

namespace Serina::Ecology
{
    /// @brief Profil agrégé réel d'une espèce dans une région donnée à une
    /// génération donnée. Les cinq traits sont déjà normalisés [0,1] (mêmes
    /// bornes que Genetics::TRAIT_BOUNDS) par l'appelant -- ce header ne
    /// connaît rien des bornes biologiques réelles, seulement des nombres
    /// comparables entre eux.
    struct RegionalSpeciesProfile
    {
        uint32_t population = 0;
        double avgSize = 0.0;
        double avgAggression = 0.0;
        double avgVision = 0.0;
        double avgSpeed = 0.0;
        double avgResistance = 0.0;
    };

    enum class EcologicalRelation
    {
        NEUTRAL,
        COMPETITION,
        A_PREYS_ON_B,
        B_PREYS_ON_A
    };

    struct RelationClassification
    {
        EcologicalRelation relation = EcologicalRelation::NEUTRAL;
        /// Magnitude réelle de l'écart de dominance ayant motivé la
        /// classification (toujours >= 0) -- utilisée pour moduler
        /// l'intensité de la prédation/compétition en aval, jamais une
        /// seconde formule indépendante.
        double dominanceGap = 0.0;
    };

    /// Seuil au-delà duquel un écart de dominance devient une prédation à
    /// sens unique plutôt qu'une simple compétition : au-dessus de cette
    /// valeur, une espèce est nettement mieux armée pour chasser l'autre que
    /// l'inverse ne l'est pour se défendre.
    inline constexpr double PREDATION_THRESHOLD = 0.20;
    /// Bande étroite autour de zéro où deux espèces sont trop proches en
    /// armement prédateur/défenseur pour qu'aucune ne domine l'autre --
    /// c'est alors une compétition pour la même niche, pas une prédation.
    inline constexpr double COMPETITION_BAND = 0.06;

    /// Population locale au-delà de laquelle la prédation/compétition ne
    /// s'intensifie plus proportionnellement (satiété/ressource déjà
    /// abondante) -- un plafond réel, pas une croissance sans borne.
    inline constexpr double DEFAULT_SATURATION_POPULATION = 30.0;
    /// Probabilité maximale, par génération et par individu prédateur, de
    /// réussir une chasse -- jamais un drain garanti à chaque tick.
    inline constexpr double MAX_PREDATION_PROBABILITY = 0.35;
    /// Énergie transférée par événement de prédation réussi : LA MÊME
    /// constante sert au gain du prédateur et à la perte de la proie (voir
    /// applySurvivalAndInteractions() dans WorldSimulation.hpp, qui appairse
    /// chaque événement à un prédateur et une proie précis plutôt que de
    /// tirer les deux côtés indépendamment) -- un transfert à somme
    /// exactement nulle par construction, pas seulement "en moyenne".
    inline constexpr double PREDATION_ENERGY_TRANSFER = 6.0;
    /// Réduction maximale de l'efficacité de recherche de nourriture
    /// (foragingIncome) infligée par une compétition directe la plus intense
    /// possible (écart de dominance nul, densité de rival saturée).
    inline constexpr double MAX_COMPETITION_PENALTY = 0.5;

    namespace detail
    {
        inline constexpr double PREDATOR_AGGRESSION_WEIGHT = 0.45;
        inline constexpr double PREDATOR_SIZE_WEIGHT = 0.30;
        inline constexpr double PREDATOR_VISION_WEIGHT = 0.25;
        inline constexpr double PREY_SPEED_WEIGHT = 0.55;
        inline constexpr double PREY_RESISTANCE_WEIGHT = 0.45;

        /// À quel point une espèce est équipée pour chasser (agressivité,
        /// taille, vision) -- dans [0,1] si les traits d'entrée le sont.
        inline double predatorScore(const RegionalSpeciesProfile &p)
        {
            return p.avgAggression * PREDATOR_AGGRESSION_WEIGHT +
                   p.avgSize * PREDATOR_SIZE_WEIGHT +
                   p.avgVision * PREDATOR_VISION_WEIGHT;
        }

        /// À quel point une espèce est équipée pour échapper à un prédateur
        /// (vitesse de fuite, résistance) -- dans [0,1] si les traits
        /// d'entrée le sont.
        inline double preyDefenseScore(const RegionalSpeciesProfile &p)
        {
            return p.avgSpeed * PREY_SPEED_WEIGHT + p.avgResistance * PREY_RESISTANCE_WEIGHT;
        }
    }

    /// @brief Classifie la relation écologique entre deux espèces cohabitant
    /// une même région, à partir de leurs profils de traits réels moyens.
    /// Fonction pure, sans état ni aléatoire.
    ///
    /// Calcule un score de dominance dans chaque sens (A chassant B, B
    /// chassant A) puis compare leur écart :
    /// - un grand écart positif => A chasse B (prédation à sens unique) ;
    /// - un grand écart négatif => B chasse A ;
    /// - un écart proche de zéro (bande étroite) => aucune n'a d'avantage
    ///   prédateur net sur l'autre : c'est une compétition pour la même
    ///   niche plutôt qu'une prédation ;
    /// - le reste (la zone la plus large) => neutre, cas le plus fréquent en
    ///   pratique puisque la plupart des paires d'espèces de Serina
    ///   n'occupent jamais vraiment le même créneau écologique.
    inline RelationClassification classifyRelation(const RegionalSpeciesProfile &a, const RegionalSpeciesProfile &b)
    {
        const double aOverB = detail::predatorScore(a) - detail::preyDefenseScore(b);
        const double bOverA = detail::predatorScore(b) - detail::preyDefenseScore(a);
        const double gap = aOverB - bOverA;

        RelationClassification result;
        if (gap > PREDATION_THRESHOLD)
        {
            result.relation = EcologicalRelation::A_PREYS_ON_B;
            result.dominanceGap = gap;
        }
        else if (gap < -PREDATION_THRESHOLD)
        {
            result.relation = EcologicalRelation::B_PREYS_ON_A;
            result.dominanceGap = -gap;
        }
        else if (std::abs(gap) <= COMPETITION_BAND)
        {
            result.relation = EcologicalRelation::COMPETITION;
            result.dominanceGap = std::abs(gap);
        }
        else
        {
            result.relation = EcologicalRelation::NEUTRAL;
            result.dominanceGap = 0.0;
        }
        return result;
    }

    /// @brief Facteur de saturation de densité [0,1] : une population locale
    /// au-delà de `saturationPopulation` ne rend pas l'effet
    /// proportionnellement plus intense -- une vraie abondance locale limite
    /// l'usure par individu (satiété/ressource déjà partagée), pas un
    /// multiplicateur qui grandit sans borne.
    inline double densitySaturation(uint32_t population, double saturationPopulation = DEFAULT_SATURATION_POPULATION)
    {
        if (saturationPopulation <= 0.0)
            return 1.0;
        return std::min(1.0, static_cast<double>(population) / saturationPopulation);
    }

    /// @brief Intensité [0,1] d'une classification de prédation, dérivée du
    /// même écart de dominance que classifyRelation a déjà calculé -- jamais
    /// une seconde formule indépendante.
    inline double predationIntensity(double dominanceGap)
    {
        return std::clamp(dominanceGap / (PREDATION_THRESHOLD * 3.0), 0.0, 1.0);
    }

    /// @brief Probabilité, par génération et PAR INDIVIDU PRÉDATEUR, de
    /// réussir une chasse sur cette espèce proie -- jamais un drain continu
    /// garanti à chaque tick (garde-fou impératif du Chantier F, en écho à
    /// l'incident de famine réel corrigé précédemment). Bornée par la
    /// densité réelle de proies disponibles localement.
    inline double predationEncounterProbability(double dominanceGap, uint32_t preyPopulation)
    {
        return predationIntensity(dominanceGap) * densitySaturation(preyPopulation) * MAX_PREDATION_PROBABILITY;
    }

    /// @brief Fraction [0,1) par laquelle la compétition réduit l'efficacité
    /// de recherche de nourriture (foragingIncome) d'un individu -- jamais
    /// une soustraction directe d'énergie, toujours un facteur multiplicatif
    /// sur le terme déjà validé comme sûr. Maximale quand les deux espèces
    /// sont à égalité parfaite (dominanceGap = 0, centre de la bande de
    /// compétition) et que le rival est localement abondant.
    inline double competitionForagingPenalty(double dominanceGap, uint32_t rivalPopulation)
    {
        double closeness = COMPETITION_BAND > 0.0
                                ? std::clamp(1.0 - dominanceGap / COMPETITION_BAND, 0.0, 1.0)
                                : 0.0;
        return MAX_COMPETITION_PENALTY * closeness * densitySaturation(rivalPopulation);
    }

} // namespace Serina::Ecology
