#include <catch2/catch_test_macros.hpp>
#include "Serina/NEAT.hpp"
#include <cstdlib>
#include <cstring>
#include <new>
#include <vector>

#ifdef _WIN32
#include <malloc.h>
#define SERINA_USABLE_SIZE _msize
#else
#include <malloc.h>
#define SERINA_USABLE_SIZE malloc_usable_size
#endif

// Allocateur global qui ECRASE toute memoire liberee (0xDD) -- propre a ce
// binaire de test. Sans lui, un use-after-free passe inapercu : la memoire
// liberee garde en general ses anciennes valeurs, et le code fautif semble
// marcher. Volontairement sans en-tete (malloc/free nus, taille relue par
// _msize/malloc_usable_size) : sous Windows, libstdc++ est une DLL qui
// garde son propre operator new, et un bloc alloue d'un cote peut etre
// libere de l'autre -- les deux doivent rester de simples malloc/free.
namespace
{
    void *poisonedAlloc(std::size_t size)
    {
        void *ptr = std::malloc(size ? size : 1);
        if (!ptr)
            throw std::bad_alloc();
        return ptr;
    }

    void poisonedFree(void *ptr) noexcept
    {
        if (!ptr)
            return;
        std::memset(ptr, 0xDD, SERINA_USABLE_SIZE(ptr));
        std::free(ptr);
    }
}

void *operator new(std::size_t size) { return poisonedAlloc(size); }
void *operator new[](std::size_t size) { return poisonedAlloc(size); }
void operator delete(void *ptr) noexcept { poisonedFree(ptr); }
void operator delete[](void *ptr) noexcept { poisonedFree(ptr); }
void operator delete(void *ptr, std::size_t) noexcept { poisonedFree(ptr); }
void operator delete[](void *ptr, std::size_t) noexcept { poisonedFree(ptr); }

using namespace Serina;

TEST_CASE("NEAT addNode splits the chosen connection faithfully, even when the connection vector reallocates", "[neat][memory]")
{
    // Regression d'un vrai use-after-free : addNode() gardait une reference
    // dans connectionGenes_ et la relisait apres un emplace_back qui peut
    // reallouer le vecteur -- la seconde nouvelle connexion recevait alors un
    // poids (~1e-311 observe) et un noeud de sortie pris dans de la memoire
    // liberee. Trouve parce que le simple fait d'appeler
    // getLineageSnapshots() a chaque generation changeait l'issue d'une
    // simulation (contenu du tas different).
    NEAT::NEATConfig config;
    NEAT::NEATGenome genome(10, 5, /*seed=*/4242);

    int splits = 0;
    for (int call = 0; call < 200; ++call)
    {
        std::vector<NEAT::ConnectionGene> before = genome.getConnectionGenes();
        genome.addNode(config);
        const auto &after = genome.getConnectionGenes();
        if (after.size() == before.size())
            continue; // connexion tiree deja desactivee : pas de scission cette fois

        REQUIRE(after.size() == before.size() + 2);
        size_t splitIndex = before.size();
        for (size_t i = 0; i < before.size(); ++i)
            if (before[i].enabled && !after[i].enabled)
                splitIndex = i;
        REQUIRE(splitIndex < before.size());

        const auto &original = before[splitIndex];
        const auto &incoming = after[after.size() - 2];
        const auto &outgoing = after[after.size() - 1];
        INFO("addNode call #" << call);
        REQUIRE(incoming.inNode == original.inNode);
        REQUIRE(incoming.weight == 1.0);
        REQUIRE(outgoing.inNode == incoming.outNode);
        REQUIRE(outgoing.outNode == original.outNode);
        REQUIRE(outgoing.weight == original.weight);
        ++splits;
    }
    // Assez de scissions pour franchir plusieurs reallocations du vecteur
    // (50 connexions de depart, +2 par scission).
    REQUIRE(splits >= 20);
}
