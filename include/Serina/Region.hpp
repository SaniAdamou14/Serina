#pragma once

#include "SerinaEcosystem.hpp"
#include <vector>
#include <random>
#include <cmath>
#include <utility>
#include <algorithm>
#include <limits>

namespace Serina::Spatial
{
    /// @brief Une case de la grille du monde : juste ses coordonnées et son
    /// biome. Les valeurs de climat/ressources/pressions ne sont pas
    /// dupliquées ici : elles se récupèrent via
    /// Environment::SerinaEnvironmentManager::getEnvironment(environmentType),
    /// qui possède déjà un modèle réel par type de biome
    /// (EnvironmentalAdaptation.hpp). Une région n'est qu'une référence à
    /// "quel biome, où" ; deux régions du même biome partagent le même
    /// modèle climatique de base.
    struct RegionState
    {
        int gridX = 0;
        int gridY = 0;
        Ecosystem::EnvironmentType environmentType = Ecosystem::EnvironmentType::GRASSLAND;
    };

    /// @brief Grille de régions couvrant le monde, avec génération
    /// procédurale de biomes par diagramme de Voronoï : on place quelques
    /// centres de biomes au hasard, puis chaque case rejoint le biome de
    /// son centre le plus proche. Ça produit de vraies plaques
    /// biogéographiques cohérentes (comme de vrais continents divisés en
    /// régions), pas du bruit case par case.
    class RegionGrid
    {
    public:
        RegionGrid(int width, int height, uint32_t seed = std::random_device{}())
            : width_(width), height_(height), cells_(static_cast<size_t>(width) * height)
        {
            generateBiomes(seed);
        }

        int getWidth() const { return width_; }
        int getHeight() const { return height_; }

        const RegionState &at(int x, int y) const { return cells_[index(clampX(x), clampY(y))]; }
        RegionState &at(int x, int y) { return cells_[index(clampX(x), clampY(y))]; }

        /// @brief Convertit une position continue (monde) en coordonnées de grille.
        std::pair<int, int> positionToGrid(double x, double y, double worldWidth, double worldHeight) const
        {
            int gx = static_cast<int>((x / worldWidth) * width_);
            int gy = static_cast<int>((y / worldHeight) * height_);
            return {clampX(gx), clampY(gy)};
        }

        /// @brief Les 4 voisins orthogonaux (bords exclus).
        std::vector<std::pair<int, int>> neighbors(int x, int y) const
        {
            std::vector<std::pair<int, int>> result;
            const int dx[] = {-1, 1, 0, 0};
            const int dy[] = {0, 0, -1, 1};
            for (int i = 0; i < 4; ++i)
            {
                int nx = x + dx[i];
                int ny = y + dy[i];
                if (nx >= 0 && nx < width_ && ny >= 0 && ny < height_)
                    result.emplace_back(nx, ny);
            }
            return result;
        }

        /// @brief Toutes les régions ayant un biome donné.
        std::vector<std::pair<int, int>> regionsOfType(Ecosystem::EnvironmentType type) const
        {
            std::vector<std::pair<int, int>> result;
            for (int y = 0; y < height_; ++y)
                for (int x = 0; x < width_; ++x)
                    if (at(x, y).environmentType == type)
                        result.emplace_back(x, y);
            return result;
        }

    private:
        int width_, height_;
        std::vector<RegionState> cells_;

        size_t index(int x, int y) const { return static_cast<size_t>(y) * width_ + x; }
        int clampX(int x) const { return std::clamp(x, 0, width_ - 1); }
        int clampY(int y) const { return std::clamp(y, 0, height_ - 1); }

        void generateBiomes(uint32_t seed)
        {
            // Serina est un monde sans humains : URBAIN est exclu de la
            // génération procédurale (réservé, jamais assigné).
            static constexpr Ecosystem::EnvironmentType kBiomes[] = {
                Ecosystem::EnvironmentType::GRASSLAND, Ecosystem::EnvironmentType::FOREST,
                Ecosystem::EnvironmentType::FRESHWATER, Ecosystem::EnvironmentType::OCEAN,
                Ecosystem::EnvironmentType::WETLAND, Ecosystem::EnvironmentType::MOUNTAIN,
                Ecosystem::EnvironmentType::DESERT, Ecosystem::EnvironmentType::ARCTIC,
                Ecosystem::EnvironmentType::TROPICAL};
            static constexpr int kBiomeCount = sizeof(kBiomes) / sizeof(kBiomes[0]);

            std::mt19937 rng(seed);
            int centerCount = std::max(3, std::min(kBiomeCount, (width_ * height_) / 12));

            std::uniform_int_distribution<int> xDist(0, width_ - 1);
            std::uniform_int_distribution<int> yDist(0, height_ - 1);
            std::uniform_int_distribution<int> biomeDist(0, kBiomeCount - 1);

            struct Center { int x, y; Ecosystem::EnvironmentType type; };
            std::vector<Center> centers;
            centers.reserve(centerCount);
            for (int i = 0; i < centerCount; ++i)
                centers.push_back({xDist(rng), yDist(rng), kBiomes[biomeDist(rng)]});

            for (int y = 0; y < height_; ++y)
            {
                for (int x = 0; x < width_; ++x)
                {
                    int bestDist = std::numeric_limits<int>::max();
                    Ecosystem::EnvironmentType bestType = Ecosystem::EnvironmentType::GRASSLAND;
                    for (const auto &c : centers)
                    {
                        int dx = c.x - x;
                        int dy = c.y - y;
                        int d2 = dx * dx + dy * dy;
                        if (d2 < bestDist)
                        {
                            bestDist = d2;
                            bestType = c.type;
                        }
                    }
                    cells_[index(x, y)] = RegionState{x, y, bestType};
                }
            }
        }
    };

} // namespace Serina::Spatial
