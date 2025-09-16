#pragma once

#include <vector>

namespace Serina
{

    struct Entity {
        double x, y, vx, vy;
        double size;  // For collision
        double mass;  // For physics calculations
        int speciesId; // For species identification
        bool alive;   // For death handling
        
        Entity(double x = 0, double y = 0, double size = 1.0, double mass = 1.0, int id = 0) 
            : x(x), y(y), vx(0), vy(0), size(size), mass(mass), speciesId(id), alive(true) {}
    };

    struct WorldBounds {
        double minX, maxX, minY, maxY;
        WorldBounds(double minX = 0, double maxX = 100, double minY = 0, double maxY = 100)
            : minX(minX), maxX(maxX), minY(minY), maxY(maxY) {}
    };

    class PhysicsEngine
    {
    public:
        PhysicsEngine(double gravity, const WorldBounds& bounds = WorldBounds());
        ~PhysicsEngine() = default;

        // Core physics update
        void update(std::vector<Entity> &entities, double deltaTime);

        // Individual physics calculations
        void applyGravity(Entity& entity, double deltaTime);
        void updatePosition(Entity& entity, double deltaTime);
        void handleBoundaries(Entity& entity);
        
        // Collision detection and response
        bool checkCollision(const Entity &a, const Entity &b) const;
        void resolveCollision(Entity& a, Entity& b);
        
        // Force applications
        void applyForce(Entity& entity, double fx, double fy);
        void applyDrag(Entity& entity, double dragCoeff = 0.01);
        
        // Spatial optimizations
        void updateSpatialGrid(const std::vector<Entity>& entities);
        std::vector<Entity*> getNearbyEntities(const Entity& entity, double radius);
        
        // Getters/Setters
        void setGravity(double gravity) { gravity_ = gravity; }
        double getGravity() const { return gravity_; }
        void setBounds(const WorldBounds& bounds) { bounds_ = bounds; }
        const WorldBounds& getBounds() const { return bounds_; }

    private:
        double gravity_;
        WorldBounds bounds_;
        
        // Spatial partitioning for optimization
        struct SpatialCell {
            std::vector<Entity*> entities;
        };
        std::vector<std::vector<SpatialCell>> spatialGrid_;
        int gridWidth_, gridHeight_;
        double cellSize_;
        
        void initializeSpatialGrid(double cellSize = 10.0);
        std::pair<int, int> worldToGrid(double x, double y) const;
    };

} // namespace Serina