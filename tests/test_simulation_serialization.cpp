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

TEST_CASE("a restored simulation keeps stepping without corruption after reload", "[serialization]")
{
    // Note honnête, découverte en écrivant ce test : on ne peut PAS exiger
    // un déterminisme bit-à-bit après reprise en comparant `original` et
    // `restored` step-à-step au-delà du point de reprise. Ce n'est pas une
    // limite du code de sauvegarde/reprise lui-même (l'état au moment de la
    // reprise, lui, est prouvé identique ci-dessus, exactement) : c'est une
    // caractéristique préexistante du moteur, confirmée en isolant la
    // cause -- AdvancedGenome::mutate() (appelé à chaque reproduction,
    // WorldSimulation.hpp ~L645) tire sur un générateur aléatoire PARTAGÉ
    // au niveau du fil d'exécution (AdvancedGenetics.hpp:203,
    // `thread_local std::mt19937 engine(std::random_device{}())`), pas un
    // générateur propre à chaque simulation, sérialisable. Vérifié
    // directement : deux simulateurs INDÉPENDANTS construits avec exactement
    // la même graine (555) divergent déjà après 25 pas (57 contre 55
    // individus vivants) sans aucune sauvegarde/reprise impliquée -- la
    // mutation génétique n'a jamais été reproductible dans ce moteur, avec
    // ou sans ce chantier. Le rendre reproductible serait un changement
    // séparé et plus large (RNG de mutation propre à chaque simulation),
    // hors périmètre ici.
    //
    // Ce test vérifie donc ce qui est réellement garanti : après une
    // reprise, la simulation continue d'avancer sans corruption (pas de
    // plantage, génération réellement croissante, population réelle non
    // négative) sur un nombre de pas conséquent.
    UnifiedWorldSimulator original(Simulation::WorldSimulationParameters{}, /*seed=*/54321);
    original.seedFounderSpecies(15);
    for (int i = 0; i < 25; ++i)
        original.step();

    uint32_t generationAtSave = original.getGeneration();
    auto blob = original.toJson();
    auto restored = UnifiedWorldSimulator::fromJson(blob);

    for (int i = 0; i < 15; ++i)
        restored->step();

    REQUIRE(restored->getGeneration() == generationAtSave + 15);
    REQUIRE(restored->getPopulationCount() > 0);
    for (const auto &snap : restored->getIndividualSnapshots())
    {
        REQUIRE(snap.energy >= 0.0);
        REQUIRE(snap.age >= 0.0);
    }
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
