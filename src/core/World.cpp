#include "Serina/World.hpp"
#include <iostream>  // For debug output

namespace Serina {

World::World(int width, int height) : width_(width), height_(height) {
    // TODO: Initialize grid with default resources
    energyGrid_.resize(height_, std::vector<double>(width_, 100.0));  // Default energy
}

void World::update() {
    // TODO: Update resources, climate, etc.
    // For now, just decay energy slightly
    for (auto& row : energyGrid_) {
        for (auto& cell : row) {
            cell *= 0.99;  // Simple decay
        }
    }
    std::cout << "World updated." << std::endl;
}

void World::addResource(int x, int y, const std::string& type, double amount) {
    // TODO: Implement based on type
    if (type == "energy") {
        if (x >= 0 && x < width_ && y >= 0 && y < height_) {
            energyGrid_[y][x] += amount;
        }
    }
}

double World::getResource(int x, int y, const std::string& type) const {
    // TODO: Implement based on type
    if (type == "energy" && x >= 0 && x < width_ && y >= 0 && y < height_) {
        return energyGrid_[y][x];
    }
    return 0.0;
}

std::string World::toJson() const {
    // TODO: Use nlohmann/json for proper serialization
    return "{\"world\": \"placeholder\"}";
}

} // namespace Serina