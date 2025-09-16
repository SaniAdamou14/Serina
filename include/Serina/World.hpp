#pragma once

#include <vector>
#include <string>

namespace Serina {

class World {
public:
    World(int width, int height);
    ~World() = default;

    // TODO: Implement 2D grid for resources (plants, water, food), climate zones, gravity effects.
    // TODO: Add time management (ticks, day/night cycles).
    // TODO: Integrate physics engine for entity movements.

    void update();  // Simulate one tick
    void addResource(int x, int y, const std::string& type, double amount);
    double getResource(int x, int y, const std::string& type) const;

    // TODO: Serialize world state to JSON for export.
    std::string toJson() const;

    int getWidth() const { return width_; }
    int getHeight() const { return height_; }

private:
    int width_, height_;
    // TODO: Use a 2D vector or map for grid: std::vector<std::vector<std::map<std::string, double>>> grid_;
    // Placeholder for now
    std::vector<std::vector<double>> energyGrid_;  // Simplified for MVP
};

} // namespace Serina