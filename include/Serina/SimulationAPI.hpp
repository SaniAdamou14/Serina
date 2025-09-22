#pragma once

#include "World.hpp"
#include "Species.hpp"
#include "PopulationManager.hpp" // Pour mode avancé (PopulationManager optionnel)
#include <vector>
#include <string>
#include <optional>
#include <chrono>

namespace Serina
{
    /// \brief Statistiques unifiées retournées par la simulation
    struct SimulationStatistics
    {
        // Métadonnées
        uint64_t tick = 0;                 ///< Compteur interne de steps
        uint32_t generation = 0;           ///< Génération logique (mode avancé ou dérivée du temps)
        uint64_t timestampMs = 0;          ///< Epoch millis capture

        // Population agrégée
        uint32_t speciesCount = 0;
        uint64_t totalPopulation = 0;      ///< Estimation population (ou individus réels si PopulationManager)

        // Fitness (mode avancé sinon estimée)
        double averageFitness = 0.0;
        double maxFitness = 0.0;
        double minFitness = 0.0;
        double geneticDiversity = 0.0;     ///< Diversité (distance génétique moyenne)

        // Événements (mode avancé)
        uint64_t births = 0;
        uint64_t deaths = 0;

        // Sérialisation simple JSON (sans dépendance nlohmann ici)
        std::string toJson() const;
    };

    class SimulationAPI
    {
    public:
        SimulationAPI(int worldWidth, int worldHeight);
        ~SimulationAPI() = default;

        // Simulation control
        void initialize();
        void step();
        void start();
        void pause();
        void setSpeed(double speed);

        // Data access for visualization
        std::string getPopulationData() const; // JSON (legacy)
        std::string getWorldState() const;     // JSON
        SimulationStatistics getStatistics() const; // Statistiques structurées

        // Species management
        void addSpecies(const Species &species);

        // Advanced population mode (toggle)
        void enableAdvancedPopulation(bool enable, size_t initialSize = 200);
        bool isAdvancedMode() const { return static_cast<bool>(populationManager_); }

        // Getters
        bool isRunning() const { return running_; }
        double getSpeed() const { return speed_; }
        const World &getWorld() const { return world_; }
        const std::vector<Species> &getSpecies() const { return species_; }

    private:
        World world_;
        std::vector<Species> species_;
        bool running_;
        double speed_;
        mutable uint64_t tickCounter_ = 0;

        // Advanced mode
        std::unique_ptr<Evolution::PopulationManager> populationManager_;
        Evolution::PopulationStats lastPopulationStats_{}; // Cache
        void updateAdvanced(double deltaTime);
    };

} // namespace Serina