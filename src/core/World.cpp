#include "Serina/World.hpp"
#include <iostream>
#include <random>
#include <cmath>
#include <algorithm>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace Serina {

World::World(int width, int height) 
    : width_(width), height_(height), globalTemperature_(20.0), 
      temperatureVariation_(10.0), humidityVariation_(0.3) {
    
    grid_.resize(height_, std::vector<Cell>(width_));
    
    // Initialize world
    generateTerrain();
    generateClimate();
    seedResources();
    
    std::cout << "World created: " << width_ << "x" << height_ << std::endl;
}

bool World::isValidCoordinate(int x, int y) const {
    return x >= 0 && x < width_ && y >= 0 && y < height_;
}

const Cell& World::getCell(int x, int y) const {
    static Cell defaultCell;
    if (!isValidCoordinate(x, y)) return defaultCell;
    return grid_[y][x];
}

Cell& World::getCell(int x, int y) {
    static Cell defaultCell;
    if (!isValidCoordinate(x, y)) return defaultCell;
    return grid_[y][x];
}

void World::update(double deltaTime) {
    timeState_.currentTime += deltaTime;
    
    // Update time tracking
    int newDay = static_cast<int>(timeState_.currentTime / timeState_.dayLength);
    if (newDay > timeState_.currentDay) {
        timeState_.currentDay = newDay;
        std::cout << "New day: " << timeState_.currentDay << std::endl;
    }
    
    // Update seasons
    simulateSeasons();
    
    // Update environmental systems
    updateEnvironment(deltaTime);
    updateResources(deltaTime);
    updateWeather(deltaTime);
    
    std::cout << "World updated - Day " << timeState_.currentDay 
              << ", Season " << timeState_.currentSeason << std::endl;
}

void World::updateEnvironment(double deltaTime) {
    double seasonalEffect = calculateSeasonalEffect();
    double dayNightEffect = calculateDayNightEffect();
    
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            Cell& cell = grid_[y][x];
            
            // Update temperature based on season, day/night, and terrain
            double baseTemp = globalTemperature_;
            
            // Seasonal variation
            baseTemp += seasonalEffect;
            
            // Day/night variation
            baseTemp += dayNightEffect * 5.0; // ±5°C variation
            
            // Terrain effects
            switch (cell.terrain) {
                case TerrainType::WATER:
                    baseTemp += 2.0; // Water moderates temperature
                    break;
                case TerrainType::MOUNTAIN:
                    baseTemp -= cell.elevation * 0.1; // Altitude cooling
                    break;
                case TerrainType::DESERT:
                    baseTemp += 10.0; // Hot during day
                    if (timeState_.isNight()) baseTemp -= 15.0; // Cold at night
                    break;
                case TerrainType::FOREST:
                    baseTemp -= 2.0; // Forest cooling
                    break;
                default:
                    break;
            }
            
            cell.temperature = baseTemp;
        }
    }
}

void World::updateResources(double deltaTime) {
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            Cell& cell = grid_[y][x];
            
            // Plant growth depends on temperature, water, and season
            double plantGrowth = 1.0;
            if (cell.temperature >= 10.0 && cell.temperature <= 30.0) {
                plantGrowth = 1.02; // Optimal growing conditions
            } else if (cell.temperature < 0.0 || cell.temperature > 40.0) {
                plantGrowth = 0.98; // Harsh conditions
            }
            
            // Seasonal effects on plant growth
            if (timeState_.currentSeason == 0 || timeState_.currentSeason == 1) { // Spring/Summer
                plantGrowth *= 1.01;
            } else if (timeState_.currentSeason == 3) { // Winter
                plantGrowth *= 0.95;
            }
            
            // Water availability affects plant growth
            if (cell.resources["water"] > 50.0) {
                plantGrowth *= 1.005;
            } else if (cell.resources["water"] < 20.0) {
                plantGrowth *= 0.99;
            }
            
            cell.resources["plants"] = std::max(0.0, cell.resources["plants"] * plantGrowth);
            
            // Water dynamics
            double waterChange = 1.0;
            
            // Evaporation (faster in hot weather)
            if (cell.temperature > 25.0) {
                waterChange = 0.995;
            } else if (cell.temperature < 10.0) {
                waterChange = 0.999; // Less evaporation when cold
            }
            
            // Terrain effects on water retention
            switch (cell.terrain) {
                case TerrainType::WATER:
                    waterChange = 1.0; // Water bodies don't lose water
                    break;
                case TerrainType::DESERT:
                    waterChange *= 0.98; // Rapid water loss
                    break;
                case TerrainType::FOREST:
                    waterChange *= 1.001; // Forests retain moisture
                    break;
                default:
                    break;
            }
            
            cell.resources["water"] = std::max(0.0, cell.resources["water"] * waterChange);
            
            // Food production from plants
            if (cell.resources["plants"] > 100.0) {
                cell.resources["food"] += (cell.resources["plants"] - 100.0) * 0.01;
            }
            
            // Energy decay
            cell.resources["energy"] = std::max(0.0, cell.resources["energy"] * 0.999);
        }
    }
}

void World::updateWeather(double deltaTime) {
    // Simple weather simulation - could be much more complex
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> dis(0.0, 1.0);
    
    // Random weather events
    if (dis(gen) < 0.01) { // 1% chance per update
        // Rain event
        int rainX = static_cast<int>(dis(gen) * width_);
        int rainY = static_cast<int>(dis(gen) * height_);
        spreadResources(rainX, rainY, "water", 50.0, 3);
        std::cout << "Rain at (" << rainX << ", " << rainY << ")" << std::endl;
    }
}

void World::simulateSeasons() {
    int seasonDay = timeState_.currentDay % static_cast<int>(timeState_.seasonLength * 4);
    int newSeason = seasonDay / static_cast<int>(timeState_.seasonLength);
    
    if (newSeason != timeState_.currentSeason) {
        timeState_.currentSeason = newSeason;
        std::cout << "Season changed to: " << newSeason << std::endl;
    }
}

double World::calculateSeasonalEffect() const {
    // Sinusoidal temperature variation based on season
    double seasonProgress = (timeState_.currentDay % static_cast<int>(timeState_.seasonLength * 4)) / (timeState_.seasonLength * 4);
    return temperatureVariation_ * std::sin(seasonProgress * 2 * M_PI);
}

double World::calculateDayNightEffect() const {
    // Sinusoidal temperature variation based on time of day
    double dayProgress = timeState_.getDayProgress();
    return std::sin(dayProgress * 2 * M_PI);
}

void World::addResource(int x, int y, const std::string& type, double amount) {
    if (isValidCoordinate(x, y)) {
        grid_[y][x].resources[type] += amount;
    }
}

double World::getResource(int x, int y, const std::string& type) const {
    if (!isValidCoordinate(x, y)) return 0.0;
    
    auto it = grid_[y][x].resources.find(type);
    return (it != grid_[y][x].resources.end()) ? it->second : 0.0;
}

bool World::consumeResource(int x, int y, const std::string& type, double amount) {
    if (!isValidCoordinate(x, y)) return false;
    
    auto& resources = grid_[y][x].resources;
    auto it = resources.find(type);
    
    if (it != resources.end() && it->second >= amount) {
        it->second -= amount;
        return true;
    }
    return false;
}

void World::setTerrain(int x, int y, TerrainType terrain) {
    if (isValidCoordinate(x, y)) {
        grid_[y][x].terrain = terrain;
    }
}

TerrainType World::getTerrain(int x, int y) const {
    if (!isValidCoordinate(x, y)) return TerrainType::LAND;
    return grid_[y][x].terrain;
}

void World::setClimate(int x, int y, ClimateZone climate) {
    if (isValidCoordinate(x, y)) {
        grid_[y][x].climate = climate;
    }
}

ClimateZone World::getClimate(int x, int y) const {
    if (!isValidCoordinate(x, y)) return ClimateZone::TEMPERATE;
    return grid_[y][x].climate;
}

double World::getTemperature(int x, int y) const {
    if (!isValidCoordinate(x, y)) return globalTemperature_;
    return grid_[y][x].temperature;
}

double World::getHumidity(int x, int y) const {
    if (!isValidCoordinate(x, y)) return 0.5;
    return grid_[y][x].humidity;
}

void World::setTemperature(int x, int y, double temp) {
    if (isValidCoordinate(x, y)) {
        grid_[y][x].temperature = temp;
    }
}

void World::setHumidity(int x, int y, double humidity) {
    if (isValidCoordinate(x, y)) {
        grid_[y][x].humidity = std::max(0.0, std::min(1.0, humidity));
    }
}

std::vector<std::pair<int, int>> World::findResourceSources(const std::string& type, double minAmount) const {
    std::vector<std::pair<int, int>> sources;
    
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            if (getResource(x, y, type) >= minAmount) {
                sources.emplace_back(x, y);
            }
        }
    }
    
    return sources;
}

std::vector<std::pair<int, int>> World::getNeighbors(int x, int y, int radius) const {
    std::vector<std::pair<int, int>> neighbors;
    
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            if (dx == 0 && dy == 0) continue; // Skip center
            
            int nx = x + dx;
            int ny = y + dy;
            
            if (isValidCoordinate(nx, ny)) {
                neighbors.emplace_back(nx, ny);
            }
        }
    }
    
    return neighbors;
}

double World::getResourceDensity(int x, int y, int radius, const std::string& type) const {
    double total = 0.0;
    int count = 0;
    
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            int nx = x + dx;
            int ny = y + dy;
            
            if (isValidCoordinate(nx, ny)) {
                total += getResource(nx, ny, type);
                count++;
            }
        }
    }
    
    return count > 0 ? total / count : 0.0;
}

void World::generateTerrain() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> dis(0.0, 1.0);
    
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            Cell& cell = grid_[y][x];
            
            // Simple noise-based terrain generation
            double noise = dis(gen);
            cell.elevation = noise * 100.0; // 0-100m elevation
            
            if (noise < 0.2) {
                cell.terrain = TerrainType::WATER;
            } else if (noise < 0.4) {
                cell.terrain = TerrainType::LAND;
            } else if (noise < 0.6) {
                cell.terrain = TerrainType::FOREST;
            } else if (noise < 0.8) {
                cell.terrain = TerrainType::MOUNTAIN;
            } else {
                cell.terrain = TerrainType::DESERT;
            }
        }
    }
}

void World::generateClimate() {
    // Simple climate zones based on position
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            Cell& cell = grid_[y][x];
            
            // Climate based on latitude (y position)
            double latitudeFactor = static_cast<double>(y) / height_;
            
            if (latitudeFactor < 0.2 || latitudeFactor > 0.8) {
                cell.climate = ClimateZone::ARCTIC;
            } else if (latitudeFactor < 0.4 || latitudeFactor > 0.6) {
                cell.climate = ClimateZone::TEMPERATE;
            } else {
                cell.climate = ClimateZone::TROPICAL;
            }
            
            // Modify climate based on terrain
            if (cell.terrain == TerrainType::DESERT) {
                cell.climate = ClimateZone::DESERT;
            } else if (cell.terrain == TerrainType::WATER) {
                cell.climate = ClimateZone::OCEANIC;
            }
        }
    }
}

void World::seedResources() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> dis(0.0, 1.0);
    
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            Cell& cell = grid_[y][x];
            
            // Initial resource distribution based on terrain
            switch (cell.terrain) {
                case TerrainType::WATER:
                    cell.resources["water"] = 500.0;
                    cell.resources["plants"] = 10.0;
                    break;
                case TerrainType::FOREST:
                    cell.resources["plants"] = 200.0;
                    cell.resources["water"] = 150.0;
                    cell.resources["food"] = 50.0;
                    break;
                case TerrainType::DESERT:
                    cell.resources["plants"] = 5.0;
                    cell.resources["water"] = 10.0;
                    break;
                case TerrainType::MOUNTAIN:
                    cell.resources["plants"] = 30.0;
                    cell.resources["water"] = 200.0; // Snow/streams
                    break;
                default: // LAND
                    cell.resources["plants"] = 50.0 + dis(gen) * 50.0;
                    cell.resources["water"] = 100.0 + dis(gen) * 50.0;
                    cell.resources["food"] = 10.0 + dis(gen) * 20.0;
                    break;
            }
        }
    }
}

void World::spreadResources(int x, int y, const std::string& type, double amount, int radius) {
    auto neighbors = getNeighbors(x, y, radius);
    double amountPerCell = amount / (neighbors.size() + 1);
    
    addResource(x, y, type, amountPerCell);
    for (const auto& [nx, ny] : neighbors) {
        addResource(nx, ny, type, amountPerCell);
    }
}

std::string World::toJson() const {
    // TODO: Implement proper JSON serialization with nlohmann/json
    return "{\"world\": \"advanced_implementation_placeholder\"}";
}

void World::fromJson(const std::string& jsonStr) {
    // TODO: Implement JSON deserialization
    std::cout << "Loading world from JSON (not implemented yet)" << std::endl;
}

} // namespace Serina