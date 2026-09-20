#pragma once

// Le protocole du daemon (voir docs/SERINA_DAEMON_PROTOCOL.md) : un registre
// thread-safe de UnifiedWorldSimulator vivants, et le dispatch de commandes
// JSON qui les pilote. Extrait dans un header (plutôt que gardé dans
// serina_daemon.cpp) pour que Catch2 puisse tester handleCommand()
// directement, sans ouvrir de vraie socket. N'est inclus que par
// serina_daemon.cpp et ses tests — jamais par les headers de simulation
// principaux — pour ne pas leur ajouter la dépendance nlohmann/json.

#include "NetSocket.hpp"
#include "WorldSimulation.hpp"
#include "SimulationSerialization.hpp"
#include <nlohmann/json.hpp>

#include <atomic>
#include <chrono>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
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
            {"age", ind.age},
            {"biologicalType", static_cast<int>(ind.biologicalType)},
            {"sizeScale", ind.sizeScale},
            {"elongation", ind.elongation},
            {"camouflage", ind.camouflage},
            {"ornamentTier", ind.ornamentTier},
            {"sensoryProminence", ind.sensoryProminence},
            {"patternTier", ind.patternTier}};
    }

    inline json lineageToJson(const Simulation::LineageSnapshot &l, const Simulation::UnifiedWorldSimulator &sim)
    {
        const auto &t = l.averageTraits;
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
            {"brainComplexity", sim.getBrainComplexity(l.speciesName)},
            // Moyenne réelle des 12 traits diploïdes sur tous les individus
            // vivants de cette lignée (valeurs réelles bornées, voir
            // Genetics::TRAIT_BOUNDS -- pas [0,1]) -- pour une fiche
            // d'espèce complète, pas seulement les quelques traits déjà
            // utilisés pour le rendu visuel des individus sur la carte.
            {"averageTraits", {{"size", t.size},
                                {"speed", t.speed},
                                {"energyEfficiency", t.energyEfficiency},
                                {"reproductionRate", t.reproductionRate},
                                {"aggression", t.aggression},
                                {"intelligence", t.intelligence},
                                {"longevity", t.longevity},
                                {"resistance", t.resistance},
                                {"visionRange", t.visionRange},
                                {"hearingAcuity", t.hearingAcuity},
                                {"camouflage", t.camouflage},
                                {"socialBehavior", t.socialBehavior}}}};
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

            auto managed = std::make_shared<ManagedSimulation>();
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

        /// @brief Reconstruit une simulation vivante à partir d'un instantané
        /// JSON complet produit par `save` (voir
        /// UnifiedWorldSimulator::toJson()/fromJson(),
        /// SimulationSerialization.hpp) -- pour reprendre une simulation
        /// sauvegardée après un arrêt ou un redémarrage du daemon.
        json load(const std::string &id, const json &snapshot)
        {
            std::lock_guard<std::mutex> lock(registryMutex_);
            if (sims_.count(id))
                return errorJson("simulation '" + id + "' already exists");

            auto managed = std::make_shared<ManagedSimulation>();
            managed->sim = Simulation::UnifiedWorldSimulator::fromJson(snapshot);

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
            std::shared_ptr<ManagedSimulation> managed;
            {
                std::lock_guard<std::mutex> lock(registryMutex_);
                auto it = sims_.find(id);
                if (it == sims_.end())
                    return errorJson("simulation '" + id + "' not found");
                managed = it->second; // copie : garde l'objet vivant même si destroy() retire l'entrée entre-temps
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
            std::vector<std::shared_ptr<ManagedSimulation>> candidates;
            {
                std::lock_guard<std::mutex> lock(registryMutex_);
                for (auto &[id, managed] : sims_)
                    if (managed->running.load())
                        candidates.push_back(managed); // copie : voir le commentaire sur sims_
            }

            auto now = std::chrono::steady_clock::now();
            for (auto &managed : candidates)
            {
                std::lock_guard<std::mutex> simLock(managed->mutex);
                if (!managed->running.load())
                    continue;
                auto elapsedMs = std::chrono::duration_cast<std::chrono::milliseconds>(now - managed->lastTick).count();
                if (elapsedMs >= managed->tickIntervalMs.load())
                {
                    managed->sim->step();
                    managed->lastTick = now;
                    // Extinction totale : rien à faire avancer. Sans ça,
                    // `step()` continue d'incrémenter la génération sur un
                    // monde vide indéfiniment (observé en production :
                    // ~4200 générations "avancées" pour rien après une
                    // vraie extinction, jusqu'à un arrêt manuel). La mise
                    // en pause automatique est visible côté client dès le
                    // prochain sondage (`status.running`, voir
                    // SimulationContext.tsx).
                    if (managed->sim->getPopulationCount() == 0)
                        managed->running = false;
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
        // shared_ptr, pas unique_ptr : withSimulation() et tickAll() relâchent
        // registryMutex_ avant d'utiliser l'entrée (pour ne jamais bloquer tout
        // le registre pendant qu'une simulation avance), donc destroy() peut
        // retirer une entrée de la table pendant qu'un autre fil la tient déjà
        // en main. Avec un unique_ptr, ce retrait détruisait l'objet (mutex
        // compris) sous les pieds de l'autre fil -- use-after-free réel observé
        // en production (crash du daemon, code de sortie 0xC0000005) quand deux
        // `stop` arrivaient à quelques millisecondes d'écart. Une copie du
        // shared_ptr, prise sous registryMutex_ avant de le relâcher, garde
        // l'objet vivant tant que ce fil s'en sert, quoi que fasse destroy().
        std::unordered_map<std::string, std::shared_ptr<ManagedSimulation>> sims_;
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
        else if (command == "save")
        {
            result = registry.withSimulation(simulationId, [&](ManagedSimulation &m)
                                              {
                json r = successJson();
                r["snapshot"] = m.sim->toJson();
                return r; });
        }
        else if (command == "load")
        {
            if (!request.contains("snapshot"))
                result = errorJson("load requires a 'snapshot' field");
            else
                result = registry.load(simulationId, request.at("snapshot"));
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
                {
                    m.sim->step();
                    // Extinction totale : inutile de continuer à avancer un
                    // monde vide sur le reste du compte demandé (voir le
                    // même garde-fou dans tickAll()).
                    if (m.sim->getPopulationCount() == 0)
                    {
                        m.running = false;
                        break;
                    }
                }
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
                r["cellSize"] = m.sim->getCellSize();
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

    /// @brief Une connexion partagée entre le fil qui la lit (une ligne à
    /// la fois, jamais concurrent avec lui-même) et les fils qui y écrivent
    /// une réponse (protégés par writeMutex, jamais deux écritures
    /// entrelacées). recv()/send() sur un même socket depuis des fils
    /// différents est sûr côté OS ; seule l'écriture doit être sérialisée
    /// pour ne jamais mélanger deux lignes JSON.
    struct SharedConnection
    {
        Net::TcpConnection conn;
        std::mutex writeMutex;
        explicit SharedConnection(Net::TcpConnection c) : conn(std::move(c)) {}
    };

    /// @brief Traite une ligne déjà lue sur son propre fil, pour qu'une
    /// commande lente sur une simulation (un step() qui met du temps à
    /// cause d'une population nombreuse, par exemple) ne bloque jamais la
    /// lecture de la ligne suivante -- l'ancien design traitait chaque
    /// requête en série sur le fil de lecture, si bien qu'une seule
    /// simulation lente ou bloquée pouvait affamer toutes les autres, y
    /// compris une nouvelle commande "create" (bug réel observé : deux
    /// simulations abandonnées ont fini par empêcher toute nouvelle
    /// simulation de démarrer).
    inline void handleLine(SimulationRegistry &registry, std::shared_ptr<SharedConnection> shared, std::string line)
    {
        json response;
        try
        {
            json request = json::parse(line);
            response = handleCommand(registry, request);
        }
        catch (const std::exception &e)
        {
            response = errorJson(std::string("malformed request: ") + e.what());
        }

        std::lock_guard<std::mutex> lock(shared->writeMutex);
        shared->conn.writeLine(response.dump());
    }

    /// @brief Boucle de connexion réelle : lit une ligne, dispatch son
    /// traitement sur un fil détaché, boucle immédiatement sur la ligne
    /// suivante sans attendre la réponse. Utilisée par serina_daemon.cpp ET
    /// par les tests, pour que les tests exercent exactement le code qui
    /// tourne réellement plutôt qu'une version simplifiée dupliquée.
    inline void handleConnection(SimulationRegistry &registry, Net::TcpConnection connection)
    {
        auto shared = std::make_shared<SharedConnection>(std::move(connection));
        std::string line;
        while (shared->conn.readLine(line))
        {
            if (line.empty())
                continue;
            std::thread(handleLine, std::ref(registry), shared, line).detach();
        }
    }

} // namespace Serina::Daemon
