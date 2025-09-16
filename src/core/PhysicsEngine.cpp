#include "Serina/PhysicsEngine.hpp"
#include <iostream>

namespace Serina {

// Placeholder Entity struct
struct Entity {
    double x, y, vx, vy;
};

PhysicsEngine::PhysicsEngine(double gravity) : gravity_(gravity) {}

void PhysicsEngine::update(std::vector<Entity>& entities, double deltaTime) {
    // TODO: Apply gravity, update positions
    for (auto& e : entities) {
        e.vy += gravity_ * deltaTime;
        e.x += e.vx * deltaTime;
        e.y += e.vy * deltaTime;
        // TODO: Boundary checks
    }
    std::cout << "Physics updated for " << entities.size() << " entities." << std::endl;
}

bool PhysicsEngine::checkCollision(const Entity& a, const Entity& b) const {
    // TODO: Implement proper collision
    return false;
}

} // namespace Serina