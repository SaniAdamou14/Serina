#include "Serina/PhysicsEngine.hpp"
#include <iostream>
#include <cmath>
#include <algorithm>  // for std::swap

namespace Serina {

PhysicsEngine::PhysicsEngine(double gravity, const WorldBounds& bounds) 
    : gravity_(gravity), bounds_(bounds), gridWidth_(10), gridHeight_(10), cellSize_(10.0) {
    initializeSpatialGrid();
}

void PhysicsEngine::initializeSpatialGrid(double cellSize) {
    cellSize_ = cellSize;
    gridWidth_ = static_cast<int>((bounds_.maxX - bounds_.minX) / cellSize_) + 1;
    gridHeight_ = static_cast<int>((bounds_.maxY - bounds_.minY) / cellSize_) + 1;
    
    spatialGrid_.resize(gridHeight_);
    for (auto& row : spatialGrid_) {
        row.resize(gridWidth_);
    }
}

std::pair<int, int> PhysicsEngine::worldToGrid(double x, double y) const {
    int gx = static_cast<int>((x - bounds_.minX) / cellSize_);
    int gy = static_cast<int>((y - bounds_.minY) / cellSize_);
    
    gx = std::max(0, std::min(gx, gridWidth_ - 1));
    gy = std::max(0, std::min(gy, gridHeight_ - 1));
    
    return {gx, gy};
}

void PhysicsEngine::updateSpatialGrid(const std::vector<Entity>& entities) {
    // Clear all cells
    for (auto& row : spatialGrid_) {
        for (auto& cell : row) {
            cell.entities.clear();
        }
    }
    
    // Add entities to appropriate cells
    for (const auto& entity : entities) {
        if (entity.alive) {
            auto [gx, gy] = worldToGrid(entity.x, entity.y);
            spatialGrid_[gy][gx].entities.push_back(const_cast<Entity*>(&entity));
        }
    }
}

std::vector<Entity*> PhysicsEngine::getNearbyEntities(const Entity& entity, double radius) {
    std::vector<Entity*> nearby;
    auto [gx, gy] = worldToGrid(entity.x, entity.y);
    
    int cellRadius = static_cast<int>(radius / cellSize_) + 1;
    
    for (int dy = -cellRadius; dy <= cellRadius; ++dy) {
        for (int dx = -cellRadius; dx <= cellRadius; ++dx) {
            int nx = gx + dx;
            int ny = gy + dy;
            
            if (nx >= 0 && nx < gridWidth_ && ny >= 0 && ny < gridHeight_) {
                for (Entity* other : spatialGrid_[ny][nx].entities) {
                    if (other != &entity) {
                        double dist = std::sqrt(std::pow(entity.x - other->x, 2) + 
                                              std::pow(entity.y - other->y, 2));
                        if (dist <= radius) {
                            nearby.push_back(other);
                        }
                    }
                }
            }
        }
    }
    
    return nearby;
}

void PhysicsEngine::update(std::vector<Entity>& entities, double deltaTime) {
    // Update spatial grid for optimized collision detection
    updateSpatialGrid(entities);
    
    // Apply physics to each entity
    for (auto& entity : entities) {
        if (!entity.alive) continue;
        
        // Apply gravity
        applyGravity(entity, deltaTime);
        
        // Apply drag
        applyDrag(entity);
        
        // Update position
        updatePosition(entity, deltaTime);
        
        // Handle boundaries
        handleBoundaries(entity);
    }
    
    // Handle collisions using spatial optimization
    for (size_t i = 0; i < entities.size(); ++i) {
        if (!entities[i].alive) continue;
        
        auto nearby = getNearbyEntities(entities[i], entities[i].size * 3);
        for (Entity* other : nearby) {
            if (other > &entities[i] && other->alive) { // Avoid duplicate checks
                if (checkCollision(entities[i], *other)) {
                    resolveCollision(entities[i], *other);
                }
            }
        }
    }
}

void PhysicsEngine::applyGravity(Entity& entity, double deltaTime) {
    entity.vy += gravity_ * deltaTime;
}

void PhysicsEngine::updatePosition(Entity& entity, double deltaTime) {
    entity.x += entity.vx * deltaTime;
    entity.y += entity.vy * deltaTime;
}

void PhysicsEngine::handleBoundaries(Entity& entity) {
    // Bounce off boundaries with energy loss
    if (entity.x < bounds_.minX) { 
        entity.x = bounds_.minX; 
        entity.vx = -entity.vx * 0.7; // Energy loss on bounce
    }
    if (entity.x > bounds_.maxX) { 
        entity.x = bounds_.maxX; 
        entity.vx = -entity.vx * 0.7; 
    }
    if (entity.y < bounds_.minY) { 
        entity.y = bounds_.minY; 
        entity.vy = -entity.vy * 0.7; 
    }
    if (entity.y > bounds_.maxY) { 
        entity.y = bounds_.maxY; 
        entity.vy = -entity.vy * 0.7; 
    }
}

bool PhysicsEngine::checkCollision(const Entity& a, const Entity& b) const {
    double dx = a.x - b.x;
    double dy = a.y - b.y;
    double distance = std::sqrt(dx * dx + dy * dy);
    return distance < (a.size + b.size) * 0.5;
}

void PhysicsEngine::resolveCollision(Entity& a, Entity& b) {
    // Calculate collision normal
    double dx = b.x - a.x;
    double dy = b.y - a.y;
    double distance = std::sqrt(dx * dx + dy * dy);
    
    if (distance == 0) return; // Avoid division by zero
    
    // Normalize
    dx /= distance;
    dy /= distance;
    
    // Separate entities
    double overlap = (a.size + b.size) * 0.5 - distance;
    if (overlap > 0) {
        double separationA = overlap * (b.mass / (a.mass + b.mass));
        double separationB = overlap * (a.mass / (a.mass + b.mass));
        
        a.x -= dx * separationA;
        a.y -= dy * separationA;
        b.x += dx * separationB;
        b.y += dy * separationB;
    }
    
    // Calculate relative velocity
    double relVelX = b.vx - a.vx;
    double relVelY = b.vy - a.vy;
    
    // Calculate relative velocity normal to collision
    double velAlongNormal = relVelX * dx + relVelY * dy;
    
    // Don't resolve if velocities are separating
    if (velAlongNormal > 0) return;
    
    // Collision restitution (bounciness)
    double restitution = 0.6;
    double impulse = -(1 + restitution) * velAlongNormal / (1/a.mass + 1/b.mass);
    
    // Apply impulse
    a.vx -= impulse * dx / a.mass;
    a.vy -= impulse * dy / a.mass;
    b.vx += impulse * dx / b.mass;
    b.vy += impulse * dy / b.mass;
}

void PhysicsEngine::applyForce(Entity& entity, double fx, double fy) {
    entity.vx += fx / entity.mass;
    entity.vy += fy / entity.mass;
}

void PhysicsEngine::applyDrag(Entity& entity, double dragCoeff) {
    entity.vx *= (1.0 - dragCoeff);
    entity.vy *= (1.0 - dragCoeff);
}

} // namespace Serina