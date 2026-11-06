#include <catch2/catch_test_macros.hpp>
#include "Serina/Planet.hpp"
#include <map>
#include <set>

using namespace Serina;

TEST_CASE("the planet is tiled by hexagons and twelve pentagons", "[planet]") {
    Planet::Settings settings;
    settings.frequency = 8;
    Planet::Planet planet(42, settings);
    const auto &tiles = planet.tiles();
    REQUIRE(tiles.size() == static_cast<size_t>(10 * 8 * 8 + 2));

    int pentagons = 0;
    for (size_t i = 0; i < tiles.size(); ++i) {
        const auto &t = tiles[i];
        CHECK((t.neighbors.size() == 5 || t.neighbors.size() == 6));
        pentagons += t.neighbors.size() == 5 ? 1 : 0;
        // Les voisinages sont réciproques.
        for (int n : t.neighbors) {
            const auto &back = tiles[n].neighbors;
            CHECK(std::find(back.begin(), back.end(), static_cast<int>(i)) != back.end());
        }
        const double len2 = t.center[0] * t.center[0] + t.center[1] * t.center[1] + t.center[2] * t.center[2];
        CHECK(std::abs(len2 - 1.0) < 1e-9);
    }
    CHECK(pentagons == 12);
}

TEST_CASE("a seed always gives the same planet, another seed another one", "[planet]") {
    Planet::Planet a(7), b(7), c(8);
    REQUIRE(a.tiles().size() == b.tiles().size());
    bool sameAsOther = true;
    for (size_t i = 0; i < a.tiles().size(); ++i) {
        CHECK(a.tiles()[i].biome == b.tiles()[i].biome);
        CHECK(a.tiles()[i].elevationKm == b.tiles()[i].elevationKm);
        sameAsOther = sameAsOther && a.tiles()[i].water == c.tiles()[i].water;
    }
    CHECK_FALSE(sameAsOther);
}

TEST_CASE("land, climate and biomes follow the physics of a world", "[planet]") {
    Planet::Planet planet(3);
    CHECK(std::abs(planet.landShare() - planet.settings().landFraction) < 0.02);

    double equator = 0.0, pole = 0.0;
    int equatorN = 0, poleN = 0;
    std::set<Ecosystem::EnvironmentType> biomes;
    for (const auto &t : planet.tiles()) {
        biomes.insert(t.biome);
        if (t.water)
            continue;
        if (std::abs(t.center[1]) < 0.2) { equator += t.temperature; equatorN++; }
        if (std::abs(t.center[1]) > 0.85) { pole += t.temperature; poleN++; }
        // Un désert est sec, une forêt tropicale chaude et humide.
        if (t.biome == Ecosystem::EnvironmentType::DESERT)
            CHECK(t.rainfall < 320.0);
        if (t.biome == Ecosystem::EnvironmentType::TROPICAL) {
            CHECK(t.temperature > 20.0);
            CHECK(t.rainfall > 1500.0);
        }
    }
    if (equatorN > 0 && poleN > 0)
        CHECK(equator / equatorN > pole / poleN);
    CHECK(biomes.count(Ecosystem::EnvironmentType::OCEAN) == 1);
    CHECK(biomes.size() >= 5);
}

TEST_CASE("nearest tile finds the tile under a point", "[planet]") {
    Planet::Planet planet(5);
    for (size_t i = 0; i < planet.tiles().size(); i += 97)
        CHECK(planet.nearestTile(planet.tiles()[i].center) == static_cast<int>(i));
}
