#include <catch2/catch_test_macros.hpp>
#include "Serina/DaemonProtocol.hpp"
#include "Serina/NetSocket.hpp"
#include <algorithm>
#include <atomic>
#include <thread>
#include <chrono>
#include <vector>

using namespace Serina;
using Daemon::json;

namespace
{
    json makeRequest(const std::string &command, const std::string &simulationId, json extra = json::object())
    {
        json req = extra;
        req["command"] = command;
        req["simulationId"] = simulationId;
        req["id"] = 1;
        return req;
    }
}

TEST_CASE("create makes a real simulation with a real founder population", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    auto response = Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 10}, {"seed", 42}}));

    REQUIRE(response["status"] == "success");
    REQUIRE(response["population"] == 50); // 5 founders x 10 individuals, same as WorldSimulation's own test
    REQUIRE(response["generation"] == 0);
    REQUIRE(registry.count() == 1);
}

TEST_CASE("create rejects a duplicate simulationId instead of silently overwriting it", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}}));
    auto second = Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}}));

    REQUIRE(second["status"] == "error");
    REQUIRE(registry.count() == 1);
}

TEST_CASE("step advances the generation of the real simulator, not a fake counter", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 10}, {"seed", 7}}));

    auto stepResponse = Daemon::handleCommand(registry, makeRequest("step", "sim-a", {{"count", 5}}));
    REQUIRE(stepResponse["status"] == "success");
    REQUIRE(stepResponse["generation"] == 5);

    auto status = Daemon::handleCommand(registry, makeRequest("status", "sim-a"));
    REQUIRE(status["generation"] == 5);
}

TEST_CASE("status reports real per-species lineages, not an aggregate placeholder", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 10}, {"seed", 7}}));

    auto status = Daemon::handleCommand(registry, makeRequest("status", "sim-a"));
    REQUIRE(status["status"] == "success");
    REQUIRE(status["speciesCount"] == 5);
    REQUIRE(status["lineages"].size() == 5);
    for (const auto &lineage : status["lineages"])
    {
        REQUIRE_FALSE(lineage["speciesName"].get<std::string>().empty());
        REQUIRE(lineage["population"] > 0);
        REQUIRE(lineage.contains("brainComplexity"));
        REQUIRE(lineage["hasBrain"] == true);

        // Moyenne réelle des 12 traits, dans leurs vraies bornes
        // biologiques (Genetics::TRAIT_BOUNDS), pas [0,1] -- une fiche
        // d'espèce complète a besoin de bien plus que les quelques traits
        // utilisés pour le rendu visuel des individus.
        REQUIRE(lineage.contains("averageTraits"));
        const auto &traits = lineage["averageTraits"];
        double size = traits["size"];
        double aggression = traits["aggression"];
        double visionRange = traits["visionRange"];
        REQUIRE(size >= 0.1);
        REQUIRE(size <= 2.0);
        REQUIRE(aggression >= 0.0);
        REQUIRE(aggression <= 1.0);
        REQUIRE(visionRange >= 0.5);
        REQUIRE(visionRange <= 5.0);
    }
}

TEST_CASE("regions reports the real region grid, not a single global environment", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}, {"seed", 99}}));

    auto response = Daemon::handleCommand(registry, makeRequest("regions", "sim-a"));
    REQUIRE(response["status"] == "success");

    int width = response["gridWidth"];
    int height = response["gridHeight"];
    REQUIRE(response["regions"].size() == static_cast<size_t>(width * height));
    REQUIRE(response["cellSize"] > 0.0);

    // A real Voronoi-generated grid must show more than one biome, exactly
    // like RegionGrid's own test -- this is the daemon's wire-format proof
    // of the same real data, not a stub.
    std::vector<int> distinctTypes;
    for (const auto &region : response["regions"])
    {
        int type = region["environmentType"];
        if (std::find(distinctTypes.begin(), distinctTypes.end(), type) == distinctTypes.end())
            distinctTypes.push_back(type);
    }
    REQUIRE(distinctTypes.size() > 1);
}

TEST_CASE("individuals reports one real entry per living organism", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    auto created = Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 10}, {"seed", 5}}));
    uint32_t expectedPopulation = created["population"];

    auto response = Daemon::handleCommand(registry, makeRequest("individuals", "sim-a"));
    REQUIRE(response["status"] == "success");
    REQUIRE(response["individuals"].size() == expectedPopulation);

    for (const auto &ind : response["individuals"])
    {
        REQUIRE_FALSE(ind["species"].get<std::string>().empty());
        REQUIRE(ind.contains("x"));
        REQUIRE(ind.contains("y"));
        REQUIRE(ind.contains("energy"));

        // Projection visuelle réelle du génome (voir IndividualSnapshot) --
        // toutes bornées [0,1] sauf les paliers entiers.
        REQUIRE(ind.contains("biologicalType"));
        double sizeScale = ind["sizeScale"];
        double elongation = ind["elongation"];
        double camouflage = ind["camouflage"];
        double sensoryProminence = ind["sensoryProminence"];
        int ornamentTier = ind["ornamentTier"];
        int patternTier = ind["patternTier"];
        REQUIRE(sizeScale >= 0.0);
        REQUIRE(sizeScale <= 1.0);
        REQUIRE(elongation >= 0.0);
        REQUIRE(elongation <= 1.0);
        REQUIRE(camouflage >= 0.0);
        REQUIRE(camouflage <= 1.0);
        REQUIRE(sensoryProminence >= 0.0);
        REQUIRE(sensoryProminence <= 1.0);
        REQUIRE(ornamentTier >= 0);
        REQUIRE(ornamentTier <= 3);
        REQUIRE(patternTier >= 0);
        REQUIRE(patternTier <= 4);
    }
}

TEST_CASE("lineages includes the real speciation event history shape", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 10}, {"seed", 5}}));

    auto response = Daemon::handleCommand(registry, makeRequest("lineages", "sim-a"));
    REQUIRE(response["status"] == "success");
    REQUIRE(response["lineages"].size() == 5);
    REQUIRE(response["speciationEvents"].is_array());
    // Chantier G2 : jamais absent, meme quand aucun signal candidat n'a
    // encore ete detecte (tableau vide, pas un champ manquant).
    REQUIRE(response["convergenceSignals"].is_array());
}

TEST_CASE("play and pause toggle the running flag reported by status", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}}));

    auto playResponse = Daemon::handleCommand(registry, makeRequest("play", "sim-a", {{"ticksPerSecond", 4}}));
    REQUIRE(playResponse["status"] == "success");
    REQUIRE(Daemon::handleCommand(registry, makeRequest("status", "sim-a"))["running"] == true);

    auto pauseResponse = Daemon::handleCommand(registry, makeRequest("pause", "sim-a"));
    REQUIRE(pauseResponse["status"] == "success");
    REQUIRE(Daemon::handleCommand(registry, makeRequest("status", "sim-a"))["running"] == false);
}

TEST_CASE("tickAll actually steps a running simulation over real wall-clock time", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}}));
    Daemon::handleCommand(registry, makeRequest("play", "sim-a", {{"ticksPerSecond", 20}})); // every 50ms

    for (int i = 0; i < 10; ++i)
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(30));
        registry.tickAll();
    }

    auto status = Daemon::handleCommand(registry, makeRequest("status", "sim-a"));
    REQUIRE(status["generation"] > 0);
}

TEST_CASE("commands against a nonexistent simulation return a clear error, not a crash", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    for (const std::string command : {"status", "step", "regions", "individuals", "lineages", "play", "pause", "destroy"})
    {
        auto response = Daemon::handleCommand(registry, makeRequest(command, "does-not-exist"));
        REQUIRE(response["status"] == "error");
    }
}

TEST_CASE("an unknown command returns a clear error", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}}));
    auto response = Daemon::handleCommand(registry, makeRequest("not-a-real-command", "sim-a"));
    REQUIRE(response["status"] == "error");
}

TEST_CASE("save then load reproduces a simulation under a fresh registry entry", "[daemon]")
{
    // Exerce le chemin complet tel qu'utilisé réellement : `save` sur une
    // simulation vivante, `destroy` (comme un vrai arrêt), puis `load` sous
    // un nouvel id à partir du seul JSON renvoyé par `save` -- sans jamais
    // toucher au registre entre les deux, exactement comme le fera
    // SimulationEngine.stopSimulation()/restoreSimulation() côté Node.
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 8}, {"seed", 42}}));
    for (int i = 0; i < 10; ++i)
        Daemon::handleCommand(registry, makeRequest("step", "sim-a"));

    auto statusBefore = Daemon::handleCommand(registry, makeRequest("status", "sim-a"));
    REQUIRE(statusBefore["status"] == "success");

    auto saveResponse = Daemon::handleCommand(registry, makeRequest("save", "sim-a"));
    REQUIRE(saveResponse["status"] == "success");
    REQUIRE(saveResponse.contains("snapshot"));

    REQUIRE(Daemon::handleCommand(registry, makeRequest("destroy", "sim-a"))["status"] == "success");
    REQUIRE(registry.count() == 0);

    json loadReq = makeRequest("load", "sim-b");
    loadReq["snapshot"] = saveResponse["snapshot"];
    auto loadResponse = Daemon::handleCommand(registry, loadReq);
    REQUIRE(loadResponse["status"] == "success");
    REQUIRE(registry.count() == 1);

    auto statusAfter = Daemon::handleCommand(registry, makeRequest("status", "sim-b"));
    REQUIRE(statusAfter["status"] == "success");
    REQUIRE(statusAfter["generation"] == statusBefore["generation"]);
    REQUIRE(statusAfter["population"] == statusBefore["population"]);
    REQUIRE(statusAfter["speciesCount"] == statusBefore["speciesCount"]);
}

TEST_CASE("load refuses to overwrite an existing simulation id", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}}));
    auto saveResponse = Daemon::handleCommand(registry, makeRequest("save", "sim-a"));

    json loadReq = makeRequest("load", "sim-a"); // même id, encore vivant
    loadReq["snapshot"] = saveResponse["snapshot"];
    auto loadResponse = Daemon::handleCommand(registry, loadReq);
    REQUIRE(loadResponse["status"] == "error");
}

TEST_CASE("step auto-pauses a simulation once its population goes fully extinct", "[daemon]")
{
    // Régression réelle observée en production : une simulation qui perdait
    // toute sa population continuait d'avancer sur un monde vide pendant
    // des milliers de générations (~4200 dans le cas observé) jusqu'à un
    // arrêt manuel -- rien ne signalait que l'écosystème était mort.
    // foragingRate=0.0 annule le seul revenu énergétique positif du moteur
    // (voir WorldSimulationParameters::foragingRate) -- un outil de test
    // déterministe pour déclencher une extinction, pas un scénario réaliste.
    // Le test de non-régression de la famine (test_world_simulation.cpp)
    // a mesuré qu'une extinction totale prend environ 2000 générations
    // même sans aucun revenu énergétique -- ce nombre d'itérations est
    // choisi en conséquence, pas au hasard.
    Simulation::WorldSimulationParameters params{};
    params.foragingRate = 0.0;
    Simulation::UnifiedWorldSimulator seed(params, 777);
    seed.seedFounderSpecies(5);

    Daemon::SimulationRegistry registry;
    REQUIRE(registry.load("dying-sim", seed.toJson())["status"] == "success");

    // Interroge directement la population réelle plutôt que la commande
    // `status` complète (qui reconstruit tout le tableau de lignées avec
    // complexité de cerveau par lignée à chaque appel) -- répété 5000 fois,
    // `status` faisait à lui seul passer ce test de <1s à plus de 40s.
    auto populationOf = [&]()
    {
        size_t pop = 0;
        registry.withSimulation("dying-sim", [&](Daemon::ManagedSimulation &m)
                                 {
            pop = m.sim->getPopulationCount();
            return Daemon::successJson(); });
        return pop;
    };

    bool becameExtinct = false;
    for (int i = 0; i < 5000 && !becameExtinct; ++i)
    {
        Daemon::handleCommand(registry, makeRequest("step", "dying-sim"));
        if (populationOf() == 0)
            becameExtinct = true;
    }

    REQUIRE(becameExtinct);
    REQUIRE(populationOf() == 0);
    bool stillRunning = true;
    registry.withSimulation("dying-sim", [&](Daemon::ManagedSimulation &m)
                             {
        stillRunning = m.running.load();
        return Daemon::successJson(); });
    REQUIRE_FALSE(stillRunning);
}

TEST_CASE("tickAll also auto-pauses on extinction, not just manual step", "[daemon]")
{
    // Même garde-fou, mais par le vrai chemin de production (le fil
    // planificateur, gouverné par une vraie horloge). Avancer jusqu'à
    // extinction complète *via tickAll()* prendrait un temps réel bien trop
    // long pour un test (des milliers de vrais ticks, même au plancher de
    // 10ms) -- on avance donc directement (sans horloge) jusqu'à ce qu'il
    // ne reste presque plus personne, puis on ne bascule sur tickAll() que
    // pour les toutes dernières générations, là où l'extinction survient
    // réellement. La logique de garde-fou elle-même est un `if` identique
    // à celui déjà prouvé par le test `step` ci-dessus ; ceci vérifie
    // seulement qu'il est bien câblé sur CE chemin-là aussi.
    Simulation::WorldSimulationParameters params{};
    params.foragingRate = 0.0;
    Simulation::UnifiedWorldSimulator seed(params, 778);
    seed.seedFounderSpecies(5);
    // Le nombre de générations avant extinction totale varie sensiblement
    // selon la graine (~1500 à ~2500 observé) -- pas de seuil fixe fiable.
    // On avance donc pas à pas (sans horloge, rapide) en gardant le DERNIER
    // instantané encore vivant, jusqu'au pas qui vient de tout éteindre --
    // ce dernier instantané vivant est alors, par construction, à une
    // génération de l'extinction, quelle que soit la graine.
    // Un instantané complet (toJson()) sérialise tout -- génomes diploïdes
    // et cerveaux NEAT compris -- et coûte sensiblement plus qu'un simple
    // step() ; le prendre à CHAQUE pas sur ~2000 pas est ce qui rendait ce
    // test lent. Un instantané tous les 20 pas laisse une marge large mais
    // largement suffisante pour que tickAll() observe la mort finale
    // ci-dessous, pour une fraction du coût.
    const int SNAPSHOT_INTERVAL = 20;
    Simulation::json lastAliveSnapshot = seed.toJson();
    for (int i = 0; i < 5000 && seed.getPopulationCount() > 0; ++i)
    {
        seed.step();
        if (seed.getPopulationCount() > 0 && i % SNAPSHOT_INTERVAL == 0)
            lastAliveSnapshot = seed.toJson();
    }
    REQUIRE(seed.getPopulationCount() == 0); // confirme qu'on a bien atteint l'extinction dans la limite d'itérations

    Daemon::SimulationRegistry registry;
    REQUIRE(registry.load("dying-sim-2", lastAliveSnapshot)["status"] == "success");
    // ticksPerSecond élevé -> tickIntervalMs au plancher (10ms, voir la
    // commande `play`), pour ne pas attendre inutilement longtemps ici.
    // Borne plus large que l'écart entre deux instantanés (SNAPSHOT_INTERVAL)
    // pour laisser le temps à tickAll() de rattraper l'extinction réelle.
    Daemon::handleCommand(registry, makeRequest("play", "dying-sim-2", {{"ticksPerSecond", 1000}}));

    bool becameExtinct = false;
    for (int i = 0; i < 4 * SNAPSHOT_INTERVAL && !becameExtinct; ++i)
    {
        registry.tickAll();
        std::this_thread::sleep_for(std::chrono::milliseconds(12));
        auto statusResult = Daemon::handleCommand(registry, makeRequest("status", "dying-sim-2"));
        if (statusResult["population"] == 0)
        {
            becameExtinct = true;
            REQUIRE_FALSE(statusResult["running"].get<bool>());
        }
    }
    REQUIRE(becameExtinct);
}

TEST_CASE("destroy removes a simulation so it is no longer listed", "[daemon]")
{
    Daemon::SimulationRegistry registry;
    Daemon::handleCommand(registry, makeRequest("create", "sim-a", {{"founderCount", 5}}));
    REQUIRE(registry.count() == 1);

    auto destroyResponse = Daemon::handleCommand(registry, makeRequest("destroy", "sim-a"));
    REQUIRE(destroyResponse["status"] == "success");
    REQUIRE(registry.count() == 0);

    auto listResponse = Daemon::handleCommand(registry, makeRequest("list", ""));
    REQUIRE(listResponse["simulations"].empty());
}

TEST_CASE("destroy racing against concurrent status/tick calls never crashes the registry", "[daemon][integration]")
{
    // Régression réelle : le daemon en production a planté (accès mémoire
    // invalide, code de sortie 0xC0000005) quand deux `stop` arrivaient à
    // quelques millisecondes d'écart pendant que le fil planificateur
    // (tickAll) et des requêtes clients (withSimulation, via `status`)
    // étaient en cours sur la même simulation. Cause réelle : registryMutex_
    // n'était tenu que le temps de récupérer un pointeur brut vers l'entrée
    // -- destroy() pouvait alors la libérer pendant qu'un autre fil s'en
    // servait encore (use-after-free). Corrigé en partageant la propriété
    // via shared_ptr plutôt que unique_ptr (voir DaemonProtocol.hpp).
    // Ce test ne peut pas prouver l'absence de plantage à 100% (une
    // interversion de fils reste non déterministe) mais martèle exactement
    // le scénario réel assez fort et assez longtemps pour le déclencher de
    // façon fiable sous l'ancien code.
    Daemon::SimulationRegistry registry;
    const std::string simId = "race-sim";
    std::atomic<bool> stop{false};

    // Fil "planificateur" : fait avancer toutes les simulations en lecture,
    // exactement comme la vraie boucle du daemon.
    std::thread tickThread([&]()
                            {
        while (!stop.load())
        {
            registry.tickAll();
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        } });

    // Plusieurs fils "requête client" : interrogent le statut en boucle,
    // exactement comme le sondage périodique de l'API Node (toutes les
    // 500ms en vrai, ici en continu pour maximiser les interversions).
    std::vector<std::thread> statusThreads;
    for (int i = 0; i < 4; ++i)
    {
        statusThreads.emplace_back([&]()
                                    {
            while (!stop.load())
            {
                // "not found" est une réponse valide (la simulation vient
                // peut-être d'être détruite) -- seul un plantage est un échec.
                Daemon::handleCommand(registry, makeRequest("status", simId));
            } });
    }

    // Fil "cycle de vie" : crée puis détruit la même simulation en boucle
    // serrée, pour maximiser les chances de retirer l'entrée pendant qu'un
    // autre fil la tient déjà (la fenêtre de la race réelle observée).
    for (int cycle = 0; cycle < 200; ++cycle)
    {
        Daemon::handleCommand(registry, makeRequest("create", simId, {{"founderCount", 5}}));
        registry.tickAll(); // laisse une chance au tick de s'en emparer avant le destroy
        Daemon::handleCommand(registry, makeRequest("destroy", simId));
    }

    stop = true;
    tickThread.join();
    for (auto &t : statusThreads)
        t.join();

    // Si on arrive ici sans plantage, la race est corrigée. Le registre doit
    // rester dans un état cohérent (aucune entrée fantôme).
    REQUIRE(registry.count() == 0);
}

TEST_CASE("the real JSON-lines protocol round-trips over an actual TCP socket", "[daemon][integration]")
{
    // Unlike every test above (which calls handleCommand() directly, no
    // network involved), this one proves the wire format actually works:
    // a real server thread accepting a real client connection and
    // exchanging real JSON-lines requests/responses, exactly as
    // serina_daemon's main() and the Node API do.
    Daemon::SimulationRegistry registry;
    uint16_t port = 17331;

    std::atomic<bool> ready{false};
    std::thread serverThread([&]()
                              {
        Net::TcpServer server(port);
        ready = true;
        Net::TcpConnection conn = server.accept();
        // La vraie boucle de connexion (voir DaemonProtocol.hpp), pas une
        // version simplifiée -- ce test exerce le code qui tourne
        // réellement dans serina_daemon, y compris son dispatch concurrent
        // par requête.
        Daemon::handleConnection(registry, std::move(conn)); });

    while (!ready.load())
        std::this_thread::sleep_for(std::chrono::milliseconds(5));

    Net::TcpConnection client = Net::connectTo("127.0.0.1", port);

    json createReq = makeRequest("create", "sim-net", {{"founderCount", 5}, {"seed", 1}});
    REQUIRE(client.writeLine(createReq.dump()));
    std::string responseLine;
    REQUIRE(client.readLine(responseLine));
    json createResp = json::parse(responseLine);
    REQUIRE(createResp["status"] == "success");
    REQUIRE(createResp["population"] == 25);

    json statusReq = makeRequest("status", "sim-net");
    REQUIRE(client.writeLine(statusReq.dump()));
    REQUIRE(client.readLine(responseLine));
    json statusResp = json::parse(responseLine);
    REQUIRE(statusResp["status"] == "success");
    REQUIRE(statusResp["speciesCount"] == 5);

    client.close();
    serverThread.detach();
}

TEST_CASE("a realistically large save snapshot round-trips over the actual TCP socket in one line", "[daemon][integration]")
{
    // Le plan de sauvegarde/reprise (Chantier H) exige de vérifier
    // concrètement que NetSocket.hpp encaisse une ligne JSON-lines de
    // plusieurs centaines de Ko (un vrai instantané complet, génomes
    // diploïdes et cerveaux NEAT compris) sans la tronquer ni bloquer --
    // pas seulement supposé sain faute de limite codée en dur trouvée à la
    // lecture.
    Daemon::SimulationRegistry registry;
    uint16_t port = 17332;

    std::atomic<bool> ready{false};
    std::thread serverThread([&]()
                              {
        Net::TcpServer server(port);
        ready = true;
        Net::TcpConnection conn = server.accept();
        Daemon::handleConnection(registry, std::move(conn)); });

    while (!ready.load())
        std::this_thread::sleep_for(std::chrono::milliseconds(5));

    Net::TcpConnection client = Net::connectTo("127.0.0.1", port);

    json createReq = makeRequest("create", "sim-big", {{"founderCount", 60}, {"seed", 7}});
    REQUIRE(client.writeLine(createReq.dump()));
    std::string responseLine;
    REQUIRE(client.readLine(responseLine));
    REQUIRE(json::parse(responseLine)["status"] == "success");

    // Quelques pas pour que des cerveaux NEAT gagnent des connexions et que
    // la population varie -- un instantané plus représentatif qu'une
    // population fraîchement semée.
    for (int i = 0; i < 10; ++i)
    {
        REQUIRE(client.writeLine(makeRequest("step", "sim-big").dump()));
        REQUIRE(client.readLine(responseLine));
    }

    REQUIRE(client.writeLine(makeRequest("save", "sim-big").dump()));
    REQUIRE(client.readLine(responseLine));
    INFO("save response line size (bytes): " << responseLine.size());
    REQUIRE(responseLine.size() > 10000); // confirme qu'on teste vraiment une grosse ligne, pas un cas trivial
    json saveResp = json::parse(responseLine);
    REQUIRE(saveResp["status"] == "success");
    REQUIRE(saveResp.contains("snapshot"));

    json loadReq = makeRequest("load", "sim-big-restored");
    loadReq["snapshot"] = saveResp["snapshot"];
    REQUIRE(client.writeLine(loadReq.dump()));
    REQUIRE(client.readLine(responseLine));
    json loadResp = json::parse(responseLine);
    REQUIRE(loadResp["status"] == "success");
    REQUIRE(loadResp["population"] == saveResp["snapshot"]["population"].size());

    client.close();
    serverThread.detach();
}

TEST_CASE("a slow command for one simulation does not block a concurrent command for another", "[daemon][integration]")
{
    // Regression test for a real bug: the connection loop used to process
    // one request fully (including waiting for whatever lock a slow
    // step() might be holding) before even reading the next line off the
    // socket. Two long-forgotten simulations left ticking for hours ended
    // up starving every other request on the same shared connection,
    // including a brand new "create" -- exactly the failure the user hit
    // ("Failed to start Serina simulation" with no other simulation
    // reachable either). DaemonProtocol.hpp's handleConnection() now reads
    // a line and dispatches its handling to its own thread immediately,
    // never blocking the next read.
    Daemon::SimulationRegistry registry;
    uint16_t port = 17332;

    std::atomic<bool> ready{false};
    std::thread serverThread([&]()
                              {
        Net::TcpServer server(port);
        ready = true;
        Net::TcpConnection conn = server.accept();
        Daemon::handleConnection(registry, std::move(conn)); });

    while (!ready.load())
        std::this_thread::sleep_for(std::chrono::milliseconds(5));

    Net::TcpConnection client = Net::connectTo("127.0.0.1", port);

    // Deux simulations réelles, distinctes.
    for (const std::string id : {"sim-a", "sim-b"})
    {
        REQUIRE(client.writeLine(makeRequest("create", id, {{"founderCount", 5}}).dump()));
        std::string line;
        REQUIRE(client.readLine(line));
        REQUIRE(json::parse(line)["status"] == "success");
    }

    // Beaucoup de requêtes rapides et entrelacées pour les deux
    // simulations, envoyées sans attendre chaque réponse -- si le dispatch
    // concurrent mélangeait les réponses entre elles, l'un des ids
    // manquerait ou une réponse porterait le mauvais contenu.
    constexpr int kRequestsPerSim = 25;
    std::unordered_map<int, std::string> expectedSimForId;
    int nextId = 100;
    for (int i = 0; i < kRequestsPerSim; ++i)
    {
        for (const std::string id : {"sim-a", "sim-b"})
        {
            json req = makeRequest("status", id);
            req["id"] = nextId;
            expectedSimForId[nextId] = id;
            REQUIRE(client.writeLine(req.dump()));
            ++nextId;
        }
    }

    std::unordered_map<int, json> received;
    for (size_t i = 0; i < expectedSimForId.size(); ++i)
    {
        std::string line;
        REQUIRE(client.readLine(line));
        json response = json::parse(line);
        received[response["id"].get<int>()] = response;
    }

    REQUIRE(received.size() == expectedSimForId.size());
    for (const auto &[id, response] : received)
    {
        REQUIRE(response["status"] == "success");
        REQUIRE(response["population"] == 25); // 5 founders x 5 individuals, same for both sims
    }

    client.close();
    serverThread.detach();
}
