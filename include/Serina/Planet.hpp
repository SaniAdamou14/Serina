#pragma once

#include "DeterministicRandom.hpp"
#include "SerinaEcosystem.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <map>
#include <queue>
#include <set>
#include <vector>

/// @file Planet.hpp
/// La planète entière, découpée en tuiles comme dans RimWorld : des hexagones et douze
/// pentagones qui pavent la sphère. Voir docs/PLANET_DESIGN.md, étape 1.
///
/// Tout est entier ou IEEE : pas de trigonométrie, dont le résultat change d'un compilateur à
/// l'autre. La latitude est portée par la coordonnée verticale (son sinus), pas par un angle.

namespace Serina::Planet
{
    using Vec3 = std::array<double, 3>;

    struct Settings
    {
        /// Rang de la grille géodésique : 10 × rang² + 2 tuiles (2562 au rang 16).
        int frequency = 16;
        /// Part des tuiles émergées.
        double landFraction = 0.35;
        /// Température moyenne au niveau de la mer à l'équateur et aux pôles, en °C.
        double equatorTemperature = 27.0;
        double poleTemperature = -12.0;
        /// Refroidissement avec l'altitude, en °C par kilomètre.
        double lapseRate = 6.5;
        /// Altitude des plus hauts sommets, en kilomètres.
        double maxElevationKm = 5.0;
    };

    struct Tile
    {
        Vec3 center{};            ///< point sur la sphère de rayon 1
        std::vector<int> neighbors;
        double elevationKm = 0.0; ///< négative sous la mer
        bool water = false;
        double temperature = 0.0; ///< moyenne annuelle, °C
        double rainfall = 0.0;    ///< mm par an
        Ecosystem::EnvironmentType biome = Ecosystem::EnvironmentType::GRASSLAND;
    };

    /// @brief La planète générée depuis une graine : grille, relief, climat et biomes.
    class Planet
    {
    public:
        Planet(uint32_t seed, const Settings &settings = {}) : settings_(settings), seed_(seed)
        {
            buildGrid(std::max(1, settings.frequency));
            generateTerrain();
            generateClimate();
            assignBiomes();
        }

        const std::vector<Tile> &tiles() const { return tiles_; }
        /// Triangles de la grille, en indices de tuiles : chacun a pour centre un sommet d'hexagone.
        const std::vector<std::array<int, 3>> &triangles() const { return triangles_; }
        const Settings &settings() const { return settings_; }

        /// @brief Tuile la plus proche d'un point de la sphère.
        int nearestTile(const Vec3 &p) const
        {
            int best = 0;
            double bestDot = -2.0;
            for (size_t i = 0; i < tiles_.size(); ++i)
            {
                const double d = dot(tiles_[i].center, p);
                if (d > bestDot)
                {
                    bestDot = d;
                    best = static_cast<int>(i);
                }
            }
            return best;
        }

        double landShare() const
        {
            size_t land = 0;
            for (const auto &t : tiles_)
                land += t.water ? 0 : 1;
            return tiles_.empty() ? 0.0 : static_cast<double>(land) / tiles_.size();
        }

    private:
        Settings settings_;
        uint32_t seed_;
        std::vector<Tile> tiles_;
        std::vector<std::array<int, 3>> triangles_;

        static double dot(const Vec3 &a, const Vec3 &b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
        static Vec3 normalize(const Vec3 &v)
        {
            const double len = std::sqrt(dot(v, v));
            return {v[0] / len, v[1] / len, v[2] / len};
        }

        /// @brief Icosaèdre subdivisé : chaque sommet de la subdivision est le centre d'une tuile.
        void buildGrid(int k)
        {
            const double phi = (1.0 + std::sqrt(5.0)) / 2.0;
            const Vec3 ico[12] = {{-1, phi, 0}, {1, phi, 0}, {-1, -phi, 0}, {1, -phi, 0},
                                  {0, -1, phi}, {0, 1, phi}, {0, -1, -phi}, {0, 1, -phi},
                                  {phi, 0, -1}, {phi, 0, 1}, {-phi, 0, -1}, {-phi, 0, 1}};
            static const int faces[20][3] = {{0, 11, 5}, {0, 5, 1}, {0, 1, 7}, {0, 7, 10}, {0, 10, 11},
                                             {1, 5, 9}, {5, 11, 4}, {11, 10, 2}, {10, 7, 6}, {7, 1, 8},
                                             {3, 9, 4}, {3, 4, 2}, {3, 2, 6}, {3, 6, 8}, {3, 8, 9},
                                             {4, 9, 5}, {2, 4, 11}, {6, 2, 10}, {8, 6, 7}, {9, 8, 1}};

            // Un sommet partagé par plusieurs faces a la même clé entière exacte : poids par sommet
            // d'origine, triés. Aucune comparaison de flottants pour savoir si deux points se confondent.
            std::map<uint64_t, int> index;
            auto vertex = [&](int a, int b, int c, int wa, int wb, int wc) {
                // Seuls les sommets de poids non nul comptent : sur une arête, le troisième sommet
                // change d'une face à l'autre alors que le point est le même.
                std::vector<std::pair<int, int>> parts;
                for (const auto &part : {std::pair<int, int>{a, wa}, std::pair<int, int>{b, wb}, std::pair<int, int>{c, wc}})
                    if (part.second > 0)
                        parts.push_back(part);
                std::sort(parts.begin(), parts.end());
                uint64_t key = 0;
                for (const auto &[v, w] : parts)
                    key = (key << 16) | (static_cast<uint64_t>(v + 1) << 10 | static_cast<uint64_t>(w));
                auto it = index.find(key);
                if (it != index.end())
                    return it->second;
                Vec3 p{};
                for (int d = 0; d < 3; ++d)
                    p[d] = ico[a][d] * wa + ico[b][d] * wb + ico[c][d] * wc;
                Tile tile;
                tile.center = normalize(p);
                tiles_.push_back(tile);
                const int id = static_cast<int>(tiles_.size()) - 1;
                index.emplace(key, id);
                return id;
            };

            std::vector<std::set<int>> adjacency;
            auto link = [&](int u, int v) {
                if (static_cast<int>(adjacency.size()) <= std::max(u, v))
                    adjacency.resize(std::max(u, v) + 1);
                adjacency[u].insert(v);
                adjacency[v].insert(u);
            };

            for (const auto &f : faces)
            {
                auto at = [&](int i, int j) { return vertex(f[0], f[1], f[2], k - i - j, i, j); };
                for (int i = 0; i < k; ++i)
                {
                    for (int j = 0; i + j < k; ++j)
                    {
                        const int p = at(i, j), q = at(i + 1, j), r = at(i, j + 1);
                        triangles_.push_back({p, q, r});
                        link(p, q);
                        link(q, r);
                        link(r, p);
                        if (i + j < k - 1)
                        {
                            const int s = at(i + 1, j + 1);
                            triangles_.push_back({q, s, r});
                            link(q, s);
                            link(s, r);
                        }
                    }
                }
            }
            for (size_t t = 0; t < tiles_.size(); ++t)
                tiles_[t].neighbors.assign(adjacency[t].begin(), adjacency[t].end());
        }

        /// @brief Bruit de valeur 3D, haché en entiers : identique sur toutes les machines.
        double hashLattice(int64_t x, int64_t y, int64_t z) const
        {
            uint64_t h = static_cast<uint64_t>(x) * 0x9E3779B97F4A7C15ULL ^ static_cast<uint64_t>(y) * 0xC2B2AE3D27D4EB4FULL ^
                         static_cast<uint64_t>(z) * 0x165667B19E3779F9ULL ^ (static_cast<uint64_t>(seed_) << 32);
            h ^= h >> 31;
            h *= 0xBF58476D1CE4E5B9ULL;
            h ^= h >> 29;
            return static_cast<double>(h >> 11) / 9007199254740992.0;
        }
        double valueNoise(const Vec3 &p) const
        {
            const double fx = std::floor(p[0]), fy = std::floor(p[1]), fz = std::floor(p[2]);
            const int64_t x = static_cast<int64_t>(fx), y = static_cast<int64_t>(fy), z = static_cast<int64_t>(fz);
            auto smooth = [](double t) { return t * t * (3.0 - 2.0 * t); };
            const double u = smooth(p[0] - fx), v = smooth(p[1] - fy), w = smooth(p[2] - fz);
            auto lerp = [](double a, double b, double t) { return a + (b - a) * t; };
            const double c00 = lerp(hashLattice(x, y, z), hashLattice(x + 1, y, z), u);
            const double c10 = lerp(hashLattice(x, y + 1, z), hashLattice(x + 1, y + 1, z), u);
            const double c01 = lerp(hashLattice(x, y, z + 1), hashLattice(x + 1, y, z + 1), u);
            const double c11 = lerp(hashLattice(x, y + 1, z + 1), hashLattice(x + 1, y + 1, z + 1), u);
            return lerp(lerp(c00, c10, v), lerp(c01, c11, v), w);
        }
        double fbm(Vec3 p) const
        {
            double sum = 0.0, amplitude = 0.5, norm = 0.0;
            for (int octave = 0; octave < 5; ++octave)
            {
                sum += amplitude * valueNoise(p);
                norm += amplitude;
                p = {p[0] * 2.03 + 17.0, p[1] * 2.03 + 5.0, p[2] * 2.03 + 11.0};
                amplitude *= 0.5;
            }
            return sum / norm;
        }

        Vec3 randomUnit(Det::UniformReal &unit, std::mt19937 &rng) const
        {
            // Rejet dans le cube : une direction uniforme sans trigonométrie.
            for (;;)
            {
                const Vec3 v{unit(rng) * 2.0 - 1.0, unit(rng) * 2.0 - 1.0, unit(rng) * 2.0 - 1.0};
                const double len2 = dot(v, v);
                if (len2 > 0.01 && len2 <= 1.0)
                    return normalize(v);
            }
        }

        /// @brief Un supercontinent en arc, que le bruit découpe en isthmes et en îles.
        void generateTerrain()
        {
            std::mt19937 rng(seed_);
            Det::UniformReal unit(0.0, 1.0);
            const Vec3 arcPole = randomUnit(unit, rng); // le continent suit le grand cercle de ce pôle
            const Vec3 arcMiddle = randomUnit(unit, rng);
            std::vector<double> score(tiles_.size());
            for (size_t i = 0; i < tiles_.size(); ++i)
            {
                const Vec3 &p = tiles_[i].center;
                const double band = 1.0 - std::min(1.0, std::abs(dot(p, arcPole)) / 0.32);
                // Un arc et non un anneau : il s'efface du côté opposé.
                const double arc = band * std::clamp(0.65 + dot(p, arcMiddle), 0.0, 1.0);
                const double noise = fbm({p[0] * 2.2 + 3.0, p[1] * 2.2 + 7.0, p[2] * 2.2 + 1.0});
                const double detail = fbm({p[0] * 6.0, p[1] * 6.0, p[2] * 6.0});
                score[i] = 0.75 * arc + 0.9 * noise + 0.25 * detail;
            }
            // Niveau de la mer choisi pour obtenir la part de terres voulue.
            std::vector<double> sorted = score;
            std::sort(sorted.begin(), sorted.end());
            const size_t seaIndex = std::min(sorted.size() - 1, static_cast<size_t>((1.0 - settings_.landFraction) * sorted.size()));
            const double sea = sorted[seaIndex];
            const double top = sorted.back();
            const double bottom = sorted.front();
            for (size_t i = 0; i < tiles_.size(); ++i)
            {
                Tile &t = tiles_[i];
                t.water = score[i] < sea;
                t.elevationKm = t.water ? -4.0 * (sea - score[i]) / std::max(sea - bottom, 1e-9)
                                        : settings_.maxElevationKm * (score[i] - sea) / std::max(top - sea, 1e-9);
            }
        }

        /// @brief Température par latitude et altitude, pluie par distance à la mer et bandes de latitude.
        void generateClimate()
        {
            // Distance à l'eau, en tuiles, par parcours en largeur : ordre déterministe.
            std::vector<int> distance(tiles_.size(), -1);
            std::queue<int> frontier;
            for (size_t i = 0; i < tiles_.size(); ++i)
                if (tiles_[i].water)
                {
                    distance[i] = 0;
                    frontier.push(static_cast<int>(i));
                }
            while (!frontier.empty())
            {
                const int t = frontier.front();
                frontier.pop();
                for (int n : tiles_[t].neighbors)
                    if (distance[n] < 0)
                    {
                        distance[n] = distance[t] + 1;
                        frontier.push(n);
                    }
            }

            for (size_t i = 0; i < tiles_.size(); ++i)
            {
                Tile &t = tiles_[i];
                const double lat = std::abs(t.center[1]); // sinus de la latitude
                const double cooling = 0.45 * lat + 0.55 * lat * lat;
                t.temperature = settings_.equatorTemperature - (settings_.equatorTemperature - settings_.poleTemperature) * cooling -
                                settings_.lapseRate * std::max(0.0, t.elevationKm);
                // Bandes de pluie de la circulation atmosphérique : humide à l'équateur, sèche vers 30°,
                // de nouveau humide aux latitudes moyennes, sèche aux pôles. Repères en sinus de latitude.
                const double band = lat < 0.25 ? 1.25 - lat : lat < 0.55 ? 1.0 - 1.6 * (lat - 0.25) : lat < 0.85 ? 0.52 + 1.2 * (lat - 0.55) : 0.88 - 2.5 * (lat - 0.85);
                const double inland = distance[i] < 0 ? 1.0 : Det::exp(-distance[i] / 5.0);
                t.rainfall = t.water ? 0.0 : std::max(40.0, 2400.0 * std::max(0.15, band) * (0.35 + 0.65 * inland));
            }
        }

        /// @brief Biome tiré du climat ; une étendue d'eau de 15 tuiles ou moins est un lac (règle de RimWorld).
        void assignBiomes()
        {
            std::vector<int> component(tiles_.size(), -1);
            std::vector<size_t> componentSize;
            for (size_t i = 0; i < tiles_.size(); ++i)
            {
                if (!tiles_[i].water || component[i] >= 0)
                    continue;
                const int id = static_cast<int>(componentSize.size());
                componentSize.push_back(0);
                std::queue<int> frontier;
                frontier.push(static_cast<int>(i));
                component[i] = id;
                while (!frontier.empty())
                {
                    const int t = frontier.front();
                    frontier.pop();
                    componentSize[id]++;
                    for (int n : tiles_[t].neighbors)
                        if (tiles_[n].water && component[n] < 0)
                        {
                            component[n] = id;
                            frontier.push(n);
                        }
                }
            }

            using Biome = Ecosystem::EnvironmentType;
            for (size_t i = 0; i < tiles_.size(); ++i)
            {
                Tile &t = tiles_[i];
                if (t.water)
                {
                    t.biome = componentSize[component[i]] <= 15 ? Biome::FRESHWATER : Biome::OCEAN;
                    continue;
                }
                const bool coastal = std::any_of(t.neighbors.begin(), t.neighbors.end(), [&](int n) { return tiles_[n].water; });
                if (t.temperature < -5.0)
                    t.biome = Biome::ARCTIC;
                else if (t.elevationKm > 2.6)
                    t.biome = Biome::MOUNTAIN;
                else if (t.rainfall < 320.0)
                    t.biome = Biome::DESERT;
                else if (t.temperature > 20.0 && t.rainfall > 1500.0)
                    t.biome = Biome::TROPICAL;
                else if (coastal && t.elevationKm < 0.35 && t.rainfall > 1100.0)
                    t.biome = Biome::WETLAND;
                else if (t.rainfall > 850.0)
                    t.biome = Biome::FOREST;
                else
                    t.biome = Biome::GRASSLAND;
            }
        }
    };

} // namespace Serina::Planet
