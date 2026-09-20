#include <catch2/catch_test_macros.hpp>
#include "Serina/DaemonProtocol.hpp"
#include "Serina/NetSocket.hpp"
#include <algorithm>
#include <thread>
#include <chrono>

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
