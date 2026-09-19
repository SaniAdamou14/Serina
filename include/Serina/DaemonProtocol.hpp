#pragma once

// Le protocole du daemon (voir docs/SERINA_DAEMON_PROTOCOL.md) : un registre
// thread-safe de UnifiedWorldSimulator vivants, et le dispatch de commandes
// JSON qui les pilote. Extrait dans un header (plutôt que gardé dans
// serina_daemon.cpp) pour que Catch2 puisse tester handleCommand()
// directement, sans ouvrir de vraie socket. N'est inclus que par
// serina_daemon.cpp et ses tests — jamais par les headers de simulation
// principaux — pour ne pas leur ajouter la dépendance nlohmann/json.

#include "WorldSimulation.hpp"
#include <nlohmann/json.hpp>

#include <atomic>
#include <chrono>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace Serina::Daemon
{
    using json = nlohmann::json;

    inline json errorJson(const std::string &msg)
    {
        json j;
        j["status"] = "error";
        j["error"] = msg;
        return j;
    }

    inline json successJson()
    {
        json j;
        j["status"] = "success";
        return j;
    }

    inline json regionToJson(const Simulation::RegionSnapshot &r)
    {
        return {
            {"gridX", r.gridX},
            {"gridY", r.gridY},
            {"environmentType", static_cast<int>(r.environmentType)},
            {"environmentName", r.environmentName},
            {"temperature", r.temperature},
            {"primaryProducers", r.primaryProducers},
            {"predationPressure", r.predationPressure},
            {"competitionIntensity", r.competitionIntensity},
            {"climaticStress", r.climaticStress},
            {"population", r.population}};
    }

    inline json individualToJson(const Simulation::IndividualSnapshot &ind)
    {
        return {
            {"id", ind.id},
            {"species", ind.species},
            {"x", ind.x},
            {"y", ind.y},
            {"energy", ind.energy},
            {"age", ind.age}};
    }

    inline json lineageToJson(const Simulation::LineageSnapshot &l, const Simulation::UnifiedWorldSimulator &sim)
    {
        return {
            {"speciesName", l.speciesName},
            {"biologicalType", static_cast<int>(l.biologicalType)},
            {"population", l.population},
            {"averageFitness", l.averageFitness},
            {"geneticDiversity", l.geneticDiversity},
            {"regionsOccupied", l.regionsOccupied},
            {"adaptations", l.adaptations},
            {"innovations", l.innovations},
            {"hasBrain", sim.hasBrain(l.speciesName)},
            {"brainComplexity", sim.getBrainComplexity(l.speciesName)}};
    }

    inline json speciationEventToJson(const Simulation::SpeciationEvent &e)
    {
        return {
            {"parentSpecies", e.parentSpecies},
            {"newSpecies", e.newSpecies},
            {"generation", e.generation},
            {"geneticDistanceAtSplit", e.geneticDistanceAtSplit}};
    }

    /// @brief Une simulation vivante gérée par le daemon : son état réel,
    /// un mutex propre (le fil de tick et les fils de requête client y
    /// accèdent concurremment) et le rythme auquel elle avance seule quand
    /// elle est en lecture ("play").
    struct ManagedSimulation
    {
        std::unique_ptr<Simulation::UnifiedWorldSimulator> sim;
        std::mutex mutex;
        std::atomic<bool> running{false};
        std::atomic<int> tickIntervalMs{500};
        std::chrono::steady_clock::time_point lastTick{std::chrono::steady_clock::now()};
    };

    /// @brief Registre thread-safe des simulations actives. Deux niveaux de
    /// verrouillage : `registryMutex_` protège la table elle-même (création/
    /// destruction/liste), le mutex propre à chaque `ManagedSimulation`
    /// protège son état pendant qu'on la fait avancer ou qu'on la lit.
    class SimulationRegistry
    {
    public:
        json create(const std::string &id, uint32_t founderCount, bool hasSeed, uint32_t seed)
        {
            std::lock_guard<std::mutex> lock(registryMutex_);
            if (sims_.count(id))
                return errorJson("simulation '" + id + "' already exists");

            auto managed = std::make_unique<ManagedSimulation>();
            Simulation::WorldSimulationParameters params{};
            managed->sim = hasSeed
                               ? std::make_unique<Simulation::UnifiedWorldSimulator>(params, seed)
                               : std::make_unique<Simulation::UnifiedWorldSimulator>(params);
            managed->sim->seedFounderSpecies(founderCount);

            json result = successJson();
            result["simulationId"] = id;
            result["generation"] = managed->sim->getGeneration();
            result["population"] = managed->sim->getPopulationCount();
            sims_.emplace(id, std::move(managed));
            return result;
        }

        json destroy(const std::string &id)
        {
            std::lock_guard<std::mutex> lock(registryMutex_);
            auto it = sims_.find(id);
            if (it == sims_.end())
                return errorJson("simulation '" + id + "' not found");
            sims_.erase(it);
            return successJson();
        }

        json list()
        {
            std::lock_guard<std::mutex> lock(registryMutex_);
            json result = successJson();
            result["simulations"] = json::array();
            for (auto &[id, managed] : sims_)
            {
                std::lock_guard<std::mutex> simLock(managed->mutex);
                result["simulations"].push_back({{"id", id},
                                                   {"running", managed->running.load()},
                                                   {"generation", managed->sim->getGeneration()},
                                                   {"population", managed->sim->getPopulationCount()}});
            }
            return result;
        }

        /// @brief Localise, verrouille et opère sur une simulation ; sinon
        /// une erreur JSON claire plutôt qu'un plantage.
        template <typename Fn>
        json withSimulation(const std::string &id, Fn &&fn)
        {
            ManagedSimulation *managed = nullptr;
            {
                std::lock_guard<std::mutex> lock(registryMutex_);
                auto it = sims_.find(id);
                if (it == sims_.end())
                    return errorJson("simulation '" + id + "' not found");
                managed = it->second.get();
            }
            std::lock_guard<std::mutex> simLock(managed->mutex);
            return fn(*managed);
        }

        /// @brief Appelé en boucle par le fil planificateur : fait avancer
        /// chaque simulation en lecture dont l'intervalle configuré s'est
        /// écoulé — une vraie boucle temps réel, pas seulement un pas par
        /// requête client.
        void tickAll()
        {
            std::vector<ManagedSimulation *> candidates;
            {
                std::lock_guard<std::mutex> lock(registryMutex_);
                for (auto &[id, managed] : sims_)
                    if (managed->running.load())
                        candidates.push_back(managed.get());
            }

            auto now = std::chrono::steady_clock::now();
            for (auto *managed : candidates)
            {
                std::lock_guard<std::mutex> simLock(managed->mutex);
                if (!managed->running.load())
                    continue;
                auto elapsedMs = std::chrono::duration_cast<std::chrono::milliseconds>(now - managed->lastTick).count();
                if (elapsedMs >= managed->tickIntervalMs.load())
                {
                    managed->sim->step();
                    managed->lastTick = now;
                }
            }
        }

        size_t count() const
        {
            std::lock_guard<std::mutex> lock(registryMutex_);
            return sims_.size();
        }

    private:
        mutable std::mutex registryMutex_;
        std::unordered_map<std::string, std::unique_ptr<ManagedSimulation>> sims_;
    };

    /// @brief Traite une requête JSON-lines déjà parsée et renvoie la
    /// réponse — fonction pure testable sans ouvrir de socket réelle.
    inline json handleCommand(SimulationRegistry &registry, const json &request)
    {
        json response;
        response["id"] = request.value("id", 0);

        std::string command = request.value("command", "");
        std::string simulationId = request.value("simulationId", "");

        json result;
        if (command == "create")
        {
            uint32_t founderCount = request.value("founderCount", 40u);
            bool hasSeed = request.contains("seed");
            uint32_t seed = hasSeed ? request.at("seed").get<uint32_t>() : 0u;
            result = registry.create(simulationId, founderCount, hasSeed, seed);
        }
        else if (command == "destroy")
        {
            result = registry.destroy(simulationId);
        }
        else if (command == "list")
        {
            result = registry.list();
        }
        else if (command == "play")
        {
            int ticksPerSecond = request.value("ticksPerSecond", 2);
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                m.tickIntervalMs = std::max(10, 1000 / std::max(1, ticksPerSecond));
                m.running = true;
                return successJson(); });
        }
        else if (command == "pause")
        {
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                m.running = false;
                return successJson(); });
        }
        else if (command == "step")
        {
            uint32_t count = request.value("count", 1u);
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                for (uint32_t i = 0; i < count; ++i)
                    m.sim->step();
                json r = successJson();
                r["generation"] = m.sim->getGeneration();
                return r; });
        }
        else if (command == "status")
        {
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                json r = successJson();
                r["generation"] = m.sim->getGeneration();
                r["population"] = m.sim->getPopulationCount();
                r["running"] = m.running.load();
                auto lineages = m.sim->getLineageSnapshots();
                r["speciesCount"] = lineages.size();
                r["lineages"] = json::array();
                for (const auto &l : lineages)
                    r["lineages"].push_back(lineageToJson(l, *m.sim));
                // Un compte, pas la liste complète (voir la commande
                // "lineages" pour l'historique détaillé) -- nommé
                // différemment pour ne pas faire porter deux formes
                // différentes (nombre ici, tableau là-bas) au même nom de
                // champ dans le protocole.
                r["speciationEventCount"] = m.sim->getSpeciationEvents().size();
                return r; });
        }
        else if (command == "regions")
        {
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                json r = successJson();
                r["gridWidth"] = m.sim->getGrid().getWidth();
                r["gridHeight"] = m.sim->getGrid().getHeight();
                r["regions"] = json::array();
                for (const auto &region : m.sim->getRegionSnapshots())
                    r["regions"].push_back(regionToJson(region));
                return r; });
        }
        else if (command == "individuals")
        {
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                json r = successJson();
                r["individuals"] = json::array();
                for (const auto &ind : m.sim->getIndividualSnapshots())
                    r["individuals"].push_back(individualToJson(ind));
                return r; });
        }
        else if (command == "lineages")
        {
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                json r = successJson();
                r["lineages"] = json::array();
                for (const auto &l : m.sim->getLineageSnapshots())
                    r["lineages"].push_back(lineageToJson(l, *m.sim));
                r["speciationEvents"] = json::array();
                for (const auto &e : m.sim->getSpeciationEvents())
                    r["speciationEvents"].push_back(speciationEventToJson(e));
                return r; });
        }
        else if (command == "ping")
        {
            result = successJson();
        }
        else
        {
            result = errorJson("unknown command '" + command + "'");
        }

        for (auto it = result.begin(); it != result.end(); ++it)
            response[it.key()] = it.value();
        return response;
    }

} // namespace Serina::Daemon
