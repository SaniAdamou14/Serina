#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "Serina/TraitEcology.hpp"

using namespace Serina::Ecology;
using Catch::Approx;

TEST_CASE("a decisive predator profile classifies as one-way predation", "[traitecology]")
{
    // Grand, agressif, bonne vue -- face à une proie lente et fragile.
    RegionalSpeciesProfile predator{20, /*size*/ 0.9, /*aggression*/ 0.9, /*vision*/ 0.9, /*speed*/ 0.2, /*resistance*/ 0.2};
    RegionalSpeciesProfile prey{20, /*size*/ 0.2, /*aggression*/ 0.1, /*vision*/ 0.2, /*speed*/ 0.2, /*resistance*/ 0.2};

    auto result = classifyRelation(predator, prey);
    REQUIRE(result.relation == EcologicalRelation::A_PREYS_ON_B);
    REQUIRE(result.dominanceGap > 0.0);

    // Symétrique si on inverse l'ordre des arguments.
    auto swapped = classifyRelation(prey, predator);
    REQUIRE(swapped.relation == EcologicalRelation::B_PREYS_ON_A);
    REQUIRE(swapped.dominanceGap == result.dominanceGap);
}

TEST_CASE("two closely matched profiles classify as competition, not predation", "[traitecology]")
{
    RegionalSpeciesProfile a{15, 0.5, 0.5, 0.5, 0.5, 0.5};
    RegionalSpeciesProfile b{15, 0.5, 0.5, 0.5, 0.5, 0.5};

    auto result = classifyRelation(a, b);
    REQUIRE(result.relation == EcologicalRelation::COMPETITION);
    REQUIRE(result.dominanceGap == 0.0);
}

TEST_CASE("a moderate mismatch that is neither decisive nor a tie is neutral, the most common case", "[traitecology]")
{
    // Choisi pour tomber précisément entre les deux bandes (écart de
    // dominance calculé à la main = 0.1225, entre COMPETITION_BAND=0.06 et
    // PREDATION_THRESHOLD=0.20) -- ni assez net pour une prédation à sens
    // unique, ni assez proche de zéro pour une compétition directe.
    RegionalSpeciesProfile a{10, /*size*/ 0.5, /*aggression*/ 0.55, /*vision*/ 0.5, /*speed*/ 0.5, /*resistance*/ 0.5};
    RegionalSpeciesProfile b{10, /*size*/ 0.4, /*aggression*/ 0.4, /*vision*/ 0.4, /*speed*/ 0.5, /*resistance*/ 0.5};

    auto result = classifyRelation(a, b);
    REQUIRE(result.relation == EcologicalRelation::NEUTRAL);
    REQUIRE(result.dominanceGap == 0.0);
}

TEST_CASE("densitySaturation stays within [0,1] and saturates at the configured population", "[traitecology]")
{
    REQUIRE(densitySaturation(0) == 0.0);
    REQUIRE(densitySaturation(15, 30.0) == Approx(0.5));
    REQUIRE(densitySaturation(30, 30.0) == 1.0);
    // Une population bien au-delà du seuil ne dépasse jamais 1.0 -- pas de
    // croissance sans borne.
    REQUIRE(densitySaturation(10000, 30.0) == 1.0);
}

TEST_CASE("predationEncounterProbability is bounded, zero below threshold, and grows with dominance", "[traitecology]")
{
    // Écart nul (ou sous le seuil) : aucune prédation, probabilité nulle.
    REQUIRE(predationEncounterProbability(0.0, 20) == 0.0);

    double weakGap = predationEncounterProbability(PREDATION_THRESHOLD + 0.01, 20);
    double strongGap = predationEncounterProbability(PREDATION_THRESHOLD * 2.0, 20);
    REQUIRE(weakGap > 0.0);
    REQUIRE(strongGap > weakGap);

    // Jamais au-dessus du plafond configuré, même avec un écart énorme et
    // une population de proies très abondante.
    double extreme = predationEncounterProbability(10.0, 100000);
    REQUIRE(extreme <= MAX_PREDATION_PROBABILITY);
    REQUIRE(extreme > 0.0);

    // Une population de proies nulle localement ne doit jamais produire de
    // probabilité positive (rien à chasser).
    REQUIRE(predationEncounterProbability(1.0, 0) == 0.0);
}

TEST_CASE("competitionForagingPenalty peaks at zero dominance gap and fades toward the band edge", "[traitecology]")
{
    double atCenter = competitionForagingPenalty(0.0, 30);
    double atEdge = competitionForagingPenalty(COMPETITION_BAND, 30);
    double beyondBandStillClamped = competitionForagingPenalty(COMPETITION_BAND * 10.0, 30);

    REQUIRE(atCenter == Approx(MAX_COMPETITION_PENALTY));
    REQUIRE(atEdge == Approx(0.0).margin(1e-9));
    // La fonction est pure et ne connaît pas la bande de classifyRelation --
    // un appelant qui lui passerait un écart hors bande par erreur ne doit
    // jamais obtenir une pénalité négative ou supérieure au plafond.
    REQUIRE(beyondBandStillClamped >= 0.0);
    REQUIRE(beyondBandStillClamped <= MAX_COMPETITION_PENALTY);

    // Jamais négatif, jamais au-dessus du plafond configuré.
    REQUIRE(atCenter <= MAX_COMPETITION_PENALTY);
    REQUIRE(atCenter >= 0.0);

    // Une population de rival nulle localement ne doit infliger aucune pénalité.
    REQUIRE(competitionForagingPenalty(0.0, 0) == 0.0);
}
