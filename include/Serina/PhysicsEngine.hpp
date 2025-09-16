#pragma once

#include <vector>

namespace Serina
{

    class Entity; // Forward declare

    class PhysicsEngine
    {
    public:
        PhysicsEngine(double gravity);
        ~PhysicsEngine() = default;

        // TODO: Implement physics simulation (movement, collisions, gravity).
        // TODO: Handle entity positions and velocities.

        void update(std::vector<Entity> &entities, double deltaTime);

        // TODO: Add collision detection.
        bool checkCollision(const Entity &a, const Entity &b) const;

    private:
        double gravity_;
    };

} // namespace Serina