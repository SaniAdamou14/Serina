#include <catch2/catch_test_macros.hpp>
#include "Serina/SimulationSerialization.hpp"

using namespace Serina;
using Simulation::UnifiedWorldSimulator;

namespace
{
    /// @brief Compare l'état dynamique de deux simulations (pas leur
    /// adresse mémoire) : génération, population, et chaque individu
    /// (position/énergie/âge/espèce) dans le même ordre. C'est justement
    /// ce qui divergerait au premier pas si un générateur aléatoire
    /// (celui du simulateur ou celui d'un cerveau NEAT) n'était pas
    /// restauré exactement -- une comparaison "ça a l'air pareil" sur les
    /// seuls compteurs agrégés ne le détecterait pas.
    void requireIdenticalState(const UnifiedWorldSimulator &a, const UnifiedWorldSimulator &b)
    {
        REQUIRE(a.getGeneration() == b.getGeneration());
        REQUIRE(a.getPopulationCount() == b.getPopulationCount());

        auto snapsA = a.getIndividualSnapshots();
        auto snapsB = b.getIndividualSnapshots();
        REQUIRE(snapsA.size() == snapsB.size());
        for (size_t i = 0; i < snapsA.size(); ++i)
        {
            INFO("individu #" << i);
            REQUIRE(snapsA[i].id == snapsB[i].id);
            REQUIRE(snapsA[i].species == snapsB[i].species);
            REQUIRE(snapsA[i].x == snapsB[i].x);
            REQUIRE(snapsA[i].y == snapsB[i].y);
            REQUIRE(snapsA[i].energy == snapsB[i].energy);
            REQUIRE(snapsA[i].age == snapsB[i].age);
        }
    }

    /// @brief Même comparaison que requireIdenticalState(), SAUF l'id --
    /// réservée à la comparaison entre deux simulateurs INDÉPENDANTS
    /// construits séparément dans le même process. Organism::nextId_ est un
    /// compteur global PARTAGÉ par tout le process (voir PopulationManager.hpp) :
    /// deux simulateurs construits l'un après l'autre consomment donc des
    /// plages d'id différentes même avec un comportement par ailleurs
    /// parfaitement déterministe -- ce n'est pas une divergence réelle,
    /// juste une conséquence attendue du compteur partagé.
    void requireIdenticalStateIgnoringId(const UnifiedWorldSimulator &a, const UnifiedWorldSimulator &b)
    {
        REQUIRE(a.getGeneration() == b.getGeneration());
        REQUIRE(a.getPopulationCount() == b.getPopulationCount());

        auto snapsA = a.getIndividualSnapshots();
        auto snapsB = b.getIndividualSnapshots();
        REQUIRE(snapsA.size() == snapsB.size());
        for (size_t i = 0; i < snapsA.size(); ++i)
        {
            INFO("individu #" << i);
            REQUIRE(snapsA[i].species == snapsB[i].species);
            REQUIRE(snapsA[i].x == snapsB[i].x);
            REQUIRE(snapsA[i].y == snapsB[i].y);
            REQUIRE(snapsA[i].energy == snapsB[i].energy);
            REQUIRE(snapsA[i].age == snapsB[i].age);
        }
    }
}

TEST_CASE("deserializing a saved simulation reproduces its exact state", "[serialization]")
{
    UnifiedWorldSimulator original(Simulation::WorldSimulationParameters{}, /*seed=*/12345);
    original.seedFounderSpecies(15);
    for (int i = 0; i < 20; ++i)
        original.step();

    REQUIRE(original.getPopulationCount() > 0);

    auto blob = original.toJson();
    auto restored = UnifiedWorldSimulator::fromJson(blob);

    REQUIRE(restored->getSeed() == original.getSeed());
    requireIdenticalState(original, *restored);
}

TEST_CASE("a restored simulation continues bit-identically to a reference that was never saved", "[serialization]")
{
    // Renforce un test auparavant volontairement plus faible : la note
    // d'origine documentait qu'un déterminisme bit-à-bit après reprise
    // était IMPOSSIBLE, à cause d'un générateur aléatoire partagé au niveau
    // du fil d'exécution utilisé par AdvancedGenome::mutate()/crossover()
    // (AdvancedGenetics.hpp) et d'une graine non déterministe sur
    // EcosystemTaxonomy/SerinaEvolutionaryConstraints (membres taxonomy_/
    // constraints_ de UnifiedWorldSimulator). Les deux ont depuis été
    // corrigés (voir le test dédié dans test_world_simulation.cpp qui les a
    // révélés) -- ce test prouve maintenant que la reprise est VRAIMENT
    // transparente : une simulation jamais interrompue et une simulation
    // sauvegardée puis rechargée à mi-parcours, toutes deux construites
    // avec la même graine, produisent un état identique à la génération
    // finale -- pas seulement "ça continue sans planter".
    UnifiedWorldSimulator original(Simulation::WorldSimulationParameters{}, /*seed=*/54321);
    original.seedFounderSpecies(15);
    for (int i = 0; i < 25; ++i)
        original.step();

    uint32_t generationAtSave = original.getGeneration();
    auto blob = original.toJson();
    auto restored = UnifiedWorldSimulator::fromJson(blob);

    // Référence indépendante : jamais sauvegardée/rechargée, mais construite
    // avec exactement la même graine et avancée du même nombre total de pas.
    UnifiedWorldSimulator reference(Simulation::WorldSimulationParameters{}, /*seed=*/54321);
    reference.seedFounderSpecies(15);
    for (int i = 0; i < 25 + 15; ++i)
        reference.step();

    for (int i = 0; i < 15; ++i)
        restored->step();

    REQUIRE(restored->getGeneration() == generationAtSave + 15);
    REQUIRE(restored->getGeneration() == reference.getGeneration());
    requireIdenticalStateIgnoringId(*restored, reference);
}

TEST_CASE("the two global counters (organism id, NEAT innovation) only ever advance on restore, never regress", "[serialization]")
{
    UnifiedWorldSimulator seedRun(Simulation::WorldSimulationParameters{}, /*seed=*/999);
    seedRun.seedFounderSpecies(10);
    for (int i = 0; i < 15; ++i)
        seedRun.step();

    uint64_t nextIdBeforeRestore = Evolution::Organism::getNextId();
    uint32_t nextInnovationBeforeRestore = NEAT::InnovationCounter::getNext();

    auto blob = seedRun.toJson();
    auto restored = UnifiedWorldSimulator::fromJson(blob);

    // Les compteurs ne doivent jamais reculer après une reprise (ils sont
    // partagés par toutes les simulations du process) : au minimum ce
    // qu'ils étaient déjà avant.
    REQUIRE(Evolution::Organism::getNextId() >= nextIdBeforeRestore);
    REQUIRE(NEAT::InnovationCounter::getNext() >= nextInnovationBeforeRestore);

    // Un nouvel organisme créé après la reprise ne doit jamais entrer en
    // collision avec un id restauré.
    for (const auto &snap : restored->getIndividualSnapshots())
        REQUIRE(snap.id < Evolution::Organism::getNextId());
}
