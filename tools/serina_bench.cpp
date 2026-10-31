// Banc scientifique : fait tourner un monde et imprime ses indicateurs sur une
// ligne JSON. tools/science.js le lance sur de nombreuses graines et agrège.
//
//   serina_bench <graine> <ticks> [cle=valeur ...]
#include "Serina/WorldSimulation.hpp"

#include <cstdio>
#include <cstdlib>
#include <map>
#include <string>

using namespace Serina;

namespace
{
    bool isWater(Ecosystem::EnvironmentType t)
    {
        return t == Ecosystem::EnvironmentType::FRESHWATER || t == Ecosystem::EnvironmentType::OCEAN ||
               t == Ecosystem::EnvironmentType::WETLAND;
    }

    void applyOption(Simulation::WorldSimulationParameters &p, const std::string &key, double value)
    {
        if (key == "movementScale")
            p.movementScale = value;
        else if (key == "movementNoise")
            p.movementNoise = value;
        else if (key == "movementCost")
            p.movementCost = value;
        else if (key == "reflectAtBorders")
            p.reflectAtBorders = value != 0.0;
        else
        {
            std::fprintf(stderr, "option inconnue: %s\n", key.c_str());
            std::exit(2);
        }
    }
}

int main(int argc, char **argv)
{
    if (argc < 3)
    {
        std::fprintf(stderr, "usage: serina_bench <graine> <ticks> [cle=valeur ...]\n");
        return 2;
    }
    const uint32_t seed = static_cast<uint32_t>(std::atoi(argv[1]));
    const int ticks = std::atoi(argv[2]);

    Simulation::WorldSimulationParameters params;
    for (int i = 3; i < argc; ++i)
    {
        std::string option = argv[i];
        auto eq = option.find('=');
        if (eq == std::string::npos)
            return 2;
        applyOption(params, option.substr(0, eq), std::atof(option.c_str() + eq + 1));
    }

    Simulation::UnifiedWorldSimulator sim(params, seed);
    sim.seedFounderSpecies(40);
    for (int t = 0; t < ticks; ++t)
        sim.step();

    const auto inds = sim.getIndividualSnapshots();
    const auto regions = sim.getRegionSnapshots();
    const auto lineages = sim.getLineageSnapshots();
    const auto &life = sim.getLifeEventCounters();
    const int W = sim.getGrid().getWidth();
    const int H = sim.getGrid().getHeight();
    const double cs = sim.getCellSize();

    size_t wall = 0, fish = 0, fishDry = 0;
    std::map<Taxonomy::BiologicalType, size_t> byGroup;
    double meanAge = 0.0;
    for (const auto &ind : inds)
    {
        if (ind.x < 0.5 || ind.y < 0.5 || ind.x > W * cs - 0.5 || ind.y > H * cs - 0.5)
            wall++;
        byGroup[ind.biologicalType]++;
        meanAge += ind.age;
        if (ind.biologicalType == Taxonomy::BiologicalType::FISH)
        {
            fish++;
            auto [gx, gy] = sim.getGrid().positionToGrid(ind.x, ind.y, W * cs, H * cs);
            if (!isWater(sim.getGrid().at(gx, gy).environmentType))
                fishDry++;
        }
    }
    const double n = inds.empty() ? 1.0 : static_cast<double>(inds.size());

    int occupied = 0;
    size_t inBorderCells = 0;
    for (const auto &r : regions)
    {
        if (r.population > 0)
            occupied++;
        if (r.gridX == 0 || r.gridY == 0 || r.gridX == W - 1 || r.gridY == H - 1)
            inBorderCells += r.population;
    }

    std::printf("{\"seed\":%u,\"pop\":%zu,\"lineages\":%zu,\"speciations\":%zu,\"occupied\":%d,"
                "\"wallPct\":%.1f,\"borderPct\":%.1f,\"meanAge\":%.0f,"
                "\"bird\":%zu,\"fish\":%zu,\"arthropod\":%zu,\"mollusc\":%zu,\"fishDryPct\":%.1f,"
                "\"births\":%llu,\"starved\":%llu,\"oldAge\":%llu,\"predation\":%llu}\n",
                seed, inds.size(), lineages.size(), sim.getSpeciationEvents().size(), occupied,
                100.0 * wall / n, 100.0 * inBorderCells / n, meanAge / n,
                byGroup[Taxonomy::BiologicalType::BIRD], fish, byGroup[Taxonomy::BiologicalType::ARTHROPOD],
                byGroup[Taxonomy::BiologicalType::MOLLUSC], fish ? 100.0 * fishDry / fish : 0.0,
                static_cast<unsigned long long>(life.births), static_cast<unsigned long long>(life.starvationDeaths),
                static_cast<unsigned long long>(life.oldAgeDeaths), static_cast<unsigned long long>(life.predationTransfers));
    return 0;
}
