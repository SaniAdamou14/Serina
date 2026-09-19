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
        std::string line;
        while (conn.readLine(line))
        {
            if (line.empty()) continue;
            auto response = Daemon::handleCommand(registry, json::parse(line));
            if (!conn.writeLine(response.dump())) break;
        } });

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
