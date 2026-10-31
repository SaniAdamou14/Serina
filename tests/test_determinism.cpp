#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "Serina/WorldSimulation.hpp"

#include <bit>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <random>
#include <string>
#include <vector>

using namespace Serina;
using Simulation::UnifiedWorldSimulator;

namespace
{
    // FNV-1a sur les octets exacts : la moindre différence d'arrondi change le résultat.
    struct Fnv1a
    {
        uint64_t value = 14695981039346656037ULL;

        void addByte(uint8_t byte)
        {
            value ^= byte;
            value *= 1099511628211ULL;
        }
        void add(uint64_t v)
        {
            for (int i = 0; i < 8; ++i)
                addByte(static_cast<uint8_t>(v >> (i * 8)));
        }
        void add(double v) { add(std::bit_cast<uint64_t>(v)); }
        void add(const std::string &s)
        {
            for (char c : s)
                addByte(static_cast<uint8_t>(c));
        }
    };

    // Les ids d'organismes viennent d'un compteur global au process : ils sont
    // exclus pour que le résultat ne dépende pas des tests déjà exécutés.
    uint64_t worldHash(const UnifiedWorldSimulator &sim)
    {
        Fnv1a h;
        h.add(static_cast<uint64_t>(sim.getGeneration()));
        for (const auto &ind : sim.getIndividualSnapshots())
        {
            h.add(ind.species);
            h.add(ind.x);
            h.add(ind.y);
            h.add(ind.energy);
            h.add(ind.age);
            h.add(ind.sizeScale);
        }
        for (const auto &event : sim.getSpeciationEvents())
        {
            h.add(event.newSpecies);
            h.add(static_cast<uint64_t>(event.generation));
            h.add(event.geneticDistanceAtSplit);
        }
        return h.value;
    }

    uint64_t runWorld(uint32_t seed, int steps)
    {
        UnifiedWorldSimulator sim({}, seed);
        sim.seedFounderSpecies(30);
        for (int i = 0; i < steps; ++i)
            sim.step();
        return worldHash(sim);
    }
}

TEST_CASE("Det math functions match the standard library closely", "[determinism]")
{
    for (double x = -30.0; x <= 30.0; x += 0.37)
    {
        CHECK(Det::exp(x) == Catch::Approx(std::exp(x)).epsilon(1e-13));
        CHECK(Det::tanh(x) == Catch::Approx(std::tanh(x)).epsilon(1e-13));
    }
    for (double x : {1e-300, 1e-9, 0.001, 0.5, 0.75, 1.0, 1.5, 2.0, 10.0, 12345.678, 1e300})
        CHECK(Det::log(x) == Catch::Approx(std::log(x)).margin(1e-12));

    CHECK(Det::exp(0.0) == 1.0);
    CHECK(Det::log(1.0) == 0.0);
    CHECK(std::isinf(Det::exp(1000.0)));
    CHECK(Det::exp(-1000.0) == 0.0);
}

TEST_CASE("Det distributions have the expected statistics and bounds", "[determinism]")
{
    std::mt19937 rng(42);
    constexpr int n = 200000;

    double sum = 0.0, sumSquares = 0.0;
    Det::Normal normal(2.0, 3.0);
    for (int i = 0; i < n; ++i)
    {
        double v = normal(rng);
        sum += v;
        sumSquares += v * v;
    }
    double mean = sum / n;
    CHECK(mean == Catch::Approx(2.0).margin(0.03));
    CHECK(std::sqrt(sumSquares / n - mean * mean) == Catch::Approx(3.0).margin(0.03));

    Det::UniformReal real(-1.0, 3.0);
    double realSum = 0.0;
    for (int i = 0; i < n; ++i)
    {
        double v = real(rng);
        REQUIRE(v >= -1.0);
        REQUIRE(v < 3.0);
        realSum += v;
    }
    CHECK(realSum / n == Catch::Approx(1.0).margin(0.02));

    Det::UniformInt<int> die(1, 6);
    int counts[7] = {};
    for (int i = 0; i < n; ++i)
    {
        int v = die(rng);
        REQUIRE(v >= 1);
        REQUIRE(v <= 6);
        counts[v]++;
    }
    for (int face = 1; face <= 6; ++face)
        CHECK(counts[face] == Catch::Approx(n / 6.0).margin(n * 0.01));

    CHECK(Det::UniformInt<size_t>(5, 5)(rng) == 5);
    uint32_t full = Det::UniformInt<uint32_t>(0, 0xFFFFFFFF)(rng);
    (void)full;
}

TEST_CASE("Det::shuffle keeps every element and moves them", "[determinism]")
{
    std::mt19937 rng(7);
    std::vector<int> values(100);
    for (int i = 0; i < 100; ++i)
        values[i] = i;
    auto shuffled = values;
    Det::shuffle(shuffled.begin(), shuffled.end(), rng);
    CHECK(shuffled != values);
    std::sort(shuffled.begin(), shuffled.end());
    CHECK(shuffled == values);
}

TEST_CASE("Det draws are identical on every compiler", "[determinism]")
{
    std::mt19937 rng(42);
    Fnv1a h;
    Det::UniformReal real(0.0, 1.0);
    Det::Normal normal(0.0, 1.0);
    Det::UniformInt<size_t> integer(0, 999);
    for (int i = 0; i < 1000; ++i)
    {
        h.add(real(rng));
        h.add(normal(rng));
        h.add(static_cast<uint64_t>(integer(rng)));
        h.add(Det::exp(normal(rng)));
        h.add(Det::tanh(normal(rng)));
    }
    CHECK(h.value == 0x989602ecbc8ab48fULL);
}

TEST_CASE("a seed produces the same world on every compiler", "[determinism]")
{
    // Si cette valeur change sans changement voulu du modèle, le moteur a perdu
    // son déterminisme (ordre d'une table de hachage, tri instable, libm...).
    // Si le modèle change exprès, mettre la nouvelle valeur à jour dans le
    // même commit, après avoir vérifié qu'elle est la même sous Linux et Windows.
    uint64_t hash = runWorld(20261030, 400);
    if (hash != 0x202fbf2481de8652ULL)
        std::printf("world hash: 0x%llxULL\n", static_cast<unsigned long long>(hash));
    CHECK(hash == 0x202fbf2481de8652ULL);
}

TEST_CASE("running other simulations first does not change a world", "[determinism]")
{
    // Les compteurs d'id et d'innovation NEAT sont globaux au process.
    uint64_t first = runWorld(11, 300);
    runWorld(22, 150);
    uint64_t again = runWorld(11, 300);
    CHECK(first == again);
}
