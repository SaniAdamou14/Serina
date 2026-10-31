// Banc scientifique : fait tourner un monde et imprime ses indicateurs sur une
// ligne JSON. tools/science.js le lance sur de nombreuses graines et agrège.
//
//   serina_bench <graine> <ticks> [cle=valeur ...]
#include "Serina/WorldSimulation.hpp"

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <map>
#include <string>

using namespace Serina;

namespace
{
    /// Corrélation de Pearson entre un trait et une valeur du milieu.
    struct Correlation
    {
        double n = 0, x = 0, y = 0, xx = 0, yy = 0, xy = 0;
        void add(double a, double b)
        {
            n += 1;
            x += a;
            y += b;
            xx += a * a;
            yy += b * b;
            xy += a * b;
        }
        double value() const
        {
            if (n < 2)
                return 0.0;
            const double vx = xx / n - (x / n) * (x / n);
            const double vy = yy / n - (y / n) * (y / n);
            return vx > 1e-9 && vy > 1e-9 ? (xy / n - (x / n) * (y / n)) / std::sqrt(vx * vy) : 0.0;
        }
    };

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
        else if (key == "thermalCostRate")
            p.thermalCostRate = value;
        else if (key == "climateCostRate")
            p.climateCostRate = value;
        else if (key == "speciationIsolation")
            p.speciationIsolationGenerations = static_cast<uint32_t>(value);
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
    size_t forbidden = 0;
    // Corrélation entre la résistance d'un individu et le stress climatique de sa case.
    double sumR = 0.0, sumS = 0.0, sumRR = 0.0, sumSS = 0.0, sumRS = 0.0;
    Correlation insulationVsClimate;
    // Par espèce : une corrélation globale reflète aussi quel groupe vit où. Seule une
    // corrélation à l'intérieur d'une espèce montre une adaptation locale.
    std::map<std::string, Correlation> insulationBySpecies, resistanceBySpecies;
    double meanInsulationGap = 0.0;
    // Moyenne d'isolation idéale de chaque espèce, pour comparer chaque individu à sa
    // case et à ce qu'exigerait le climat moyen de son espèce.
    std::map<std::string, std::pair<double, size_t>> idealBySpecies;
    for (const auto &ind : inds)
    {
        auto [cx, cy] = sim.getGrid().positionToGrid(ind.x, ind.y, W * cs, H * cs);
        auto &entry = idealBySpecies[ind.species];
        entry.first += Habitat::idealInsulation(regions[static_cast<size_t>(cy) * W + cx].temperature);
        entry.second++;
    }
    double gapToSpeciesMean = 0.0;
    double spreadOfIdeal = 0.0;
    for (const auto &ind : inds)
    {
        auto [cellX, cellY] = sim.getGrid().positionToGrid(ind.x, ind.y, W * cs, H * cs);
        if (!Habitat::suitabilityOf(ind.biologicalType, sim.getGrid().at(cellX, cellY).environmentType).passable)
            forbidden++;
        const double stress = regions[static_cast<size_t>(cellY) * W + cellX].climaticStress;
        sumR += ind.resistance;
        sumS += stress;
        sumRR += ind.resistance * ind.resistance;
        sumSS += stress * stress;
        sumRS += ind.resistance * stress;
        const auto &region = regions[static_cast<size_t>(cellY) * W + cellX];
        insulationVsClimate.add(ind.insulation, Habitat::idealInsulation(region.temperature));
        insulationBySpecies[ind.species].add(ind.insulation, Habitat::idealInsulation(region.temperature));
        resistanceBySpecies[ind.species].add(ind.resistance, stress);
        meanInsulationGap += std::abs(ind.insulation - Habitat::idealInsulation(region.temperature));
        const auto &speciesIdeal = idealBySpecies[ind.species];
        const double speciesMean = speciesIdeal.first / static_cast<double>(speciesIdeal.second);
        gapToSpeciesMean += std::abs(ind.insulation - speciesMean);
        spreadOfIdeal += std::abs(Habitat::idealInsulation(region.temperature) - speciesMean);
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
    const auto withinSpecies = [](const std::map<std::string, Correlation> &bySpecies) {
        double sum = 0.0, weight = 0.0;
        for (const auto &[name, c] : bySpecies)
        {
            if (c.n < 50)
                continue;
            sum += c.value() * c.n;
            weight += c.n;
        }
        return weight > 0.0 ? sum / weight : 0.0;
    };
    const double varR = sumRR / n - (sumR / n) * (sumR / n);
    const double varS = sumSS / n - (sumS / n) * (sumS / n);
    const double climateCorrelation = varR > 1e-9 && varS > 1e-9 ? (sumRS / n - (sumR / n) * (sumS / n)) / std::sqrt(varR * varS) : 0.0;

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
                "\"forbiddenPct\":%.2f,\"climateCorrelation\":%.3f,\"insulationCorrelation\":%.3f,\"insulationWithin\":%.3f,\"resistanceWithin\":%.3f,\"insulationGap\":%.3f,\"localAdvantage\":%.3f,\"climateSpread\":%.3f,\"births\":%llu,\"starved\":%llu,\"oldAge\":%llu,\"predation\":%llu}\n",
                seed, inds.size(), lineages.size(), sim.getSpeciationEvents().size(), occupied,
                100.0 * wall / n, 100.0 * inBorderCells / n, meanAge / n,
                byGroup[Taxonomy::BiologicalType::BIRD], fish, byGroup[Taxonomy::BiologicalType::ARTHROPOD],
                byGroup[Taxonomy::BiologicalType::MOLLUSC], fish ? 100.0 * fishDry / fish : 0.0,
                100.0 * forbidden / n, climateCorrelation, insulationVsClimate.value(),
                withinSpecies(insulationBySpecies), withinSpecies(resistanceBySpecies), meanInsulationGap / n, (gapToSpeciesMean - meanInsulationGap) / n, spreadOfIdeal / n,
                static_cast<unsigned long long>(life.births), static_cast<unsigned long long>(life.starvationDeaths),
                static_cast<unsigned long long>(life.oldAgeDeaths), static_cast<unsigned long long>(life.predationTransfers));
    return 0;
}
