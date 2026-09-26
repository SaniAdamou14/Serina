#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "Serina/EvolutionaryConvergence.hpp"

using namespace Serina::Ecology;
using namespace Serina::Genetics;
using Catch::Approx;

static AdvancedTraitValues makeTraits(double size, double speed, double aggression, double resistance) {
    AdvancedTraitValues t{};
    t.size = size;
    t.speed = speed;
    t.energyEfficiency = 0.7;
    t.reproductionRate = 0.5;
    t.aggression = aggression;
    t.intelligence = 0.6;
    t.longevity = 1.0;
    t.resistance = resistance;
    t.visionRange = 2.0;
    t.hearingAcuity = 1.0;
    t.camouflage = 0.2;
    t.socialBehavior = 0.4;
    return t;
}

TEST_CASE("normalizedTraitDistance is zero for identical profiles", "[convergence]")
{
    auto t = makeTraits(0.8, 1.0, 0.3, 0.5);
    REQUIRE(normalizedTraitDistance(t, t) == Approx(0.0).margin(1e-9));
}

TEST_CASE("normalizedTraitDistance is symmetric and positive for different profiles", "[convergence]")
{
    auto a = makeTraits(0.8, 1.0, 0.3, 0.5);
    auto b = makeTraits(1.8, 0.2, 0.9, 0.1); // aux bornes opposees sur plusieurs traits

    double distAB = normalizedTraitDistance(a, b);
    double distBA = normalizedTraitDistance(b, a);
    REQUIRE(distAB > 0.0);
    REQUIRE(distAB == Approx(distBA));
    REQUIRE(distAB <= 1.0); // RMS de differences normalisees [0,1] -- jamais au-dela de 1.0
}

TEST_CASE("normalizedTraitDistance ignores alias fields (fertility/neuralComplexity/sensoryAcuity)", "[convergence]")
{
    auto a = makeTraits(0.8, 1.0, 0.3, 0.5);
    auto b = a;
    // Changer uniquement les alias (jamais lus par reproductionRate/intelligence/hearingAcuity
    // eux-memes) ne doit strictement rien changer a la distance mesuree.
    b.fertility = 0.01;
    b.neuralComplexity = 0.02;
    b.sensoryAcuity = 0.03;
    REQUIRE(normalizedTraitDistance(a, b) == Approx(0.0).margin(1e-9));
}

TEST_CASE("evaluateConvergenceTrend flags only trait-distance-down + genetic-distance-up", "[convergence]")
{
    ConvergenceSample previous{100, /*traitDistance*/ 0.5, /*geneticDistance*/ 0.4};

    // Motif exact de convergence : traits se rapprochent, genes s'eloignent.
    ConvergenceSample convergent{150, 0.3, 0.5};
    auto signal = evaluateConvergenceTrend(previous, convergent);
    REQUIRE(signal.isCandidate);
    REQUIRE(signal.traitDistanceDelta == Approx(-0.2));
    REQUIRE(signal.geneticDistanceDelta == Approx(0.1));

    // Les deux distances augmentent : pas une convergence (les traits ne se
    // rapprochent pas).
    ConvergenceSample divergentBoth{150, 0.6, 0.5};
    REQUIRE_FALSE(evaluateConvergenceTrend(previous, divergentBoth).isCandidate);

    // Les traits se rapprochent MAIS les genes aussi (une simple relation de
    // parente pas encore bien separee, pas une convergence) : pas candidat.
    ConvergenceSample bothCloser{150, 0.3, 0.3};
    REQUIRE_FALSE(evaluateConvergenceTrend(previous, bothCloser).isCandidate);

    // Rien ne change : pas de tendance a signaler.
    ConvergenceSample unchanged{150, 0.5, 0.4};
    auto flatSignal = evaluateConvergenceTrend(previous, unchanged);
    REQUIRE_FALSE(flatSignal.isCandidate);
    REQUIRE(flatSignal.traitDistanceDelta == Approx(0.0));
    REQUIRE(flatSignal.geneticDistanceDelta == Approx(0.0));
}
