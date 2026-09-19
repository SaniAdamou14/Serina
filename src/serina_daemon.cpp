// Backend live du monde unifié : contrairement à serina_cli (un process par
// commande, état rechargé depuis un fichier JSON à chaque appel — adapté au
// moteur d'agrégats SerinaEcosystemSimulator qu'il pilote), serina_daemon
// garde un ou plusieurs UnifiedWorldSimulator réels en mémoire, les fait
// avancer en continu sur un fil d'exécution dédié, et répond aux requêtes
// JSON-lines de l'API Node sur une connexion TCP locale persistante — pas de
// resérialisation du génome diploïde complet de chaque individu à chaque
// appel. Le protocole lui-même (registre + dispatch de commandes) vit dans
// Serina/DaemonProtocol.hpp pour rester testable sans socket ; ce fichier ne
// fait que le brancher sur une vraie connexion réseau. Voir
// docs/SERINA_DAEMON_PROTOCOL.md pour le contrat complet.

#include "Serina/DaemonProtocol.hpp"
#include "Serina/NetSocket.hpp"

#include <atomic>
#include <chrono>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

using namespace Serina;

namespace
{
    void handleConnection(Daemon::SimulationRegistry &registry, Net::TcpConnection connection)
    {
        std::string line;
        while (connection.readLine(line))
        {
            if (line.empty())
                continue;

            Daemon::json response;
            try
            {
                Daemon::json request = Daemon::json::parse(line);
                response = Daemon::handleCommand(registry, request);
            }
            catch (const std::exception &e)
            {
                response = Daemon::errorJson(std::string("malformed request: ") + e.what());
            }

            if (!connection.writeLine(response.dump()))
                break;
        }
    }
} // namespace

int main(int argc, char *argv[])
{
    uint16_t port = 7331;
    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];
        if (arg == "--port" && i + 1 < argc)
            port = static_cast<uint16_t>(std::stoi(argv[++i]));
    }

    Daemon::SimulationRegistry registry;

    std::atomic<bool> keepTicking{true};
    std::thread scheduler([&]()
                           {
        while (keepTicking.load())
        {
            registry.tickAll();
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        } });
    scheduler.detach();

    try
    {
        Net::TcpServer server(port);
        std::cerr << "serina_daemon listening on 127.0.0.1:" << port << std::endl;

        std::vector<std::thread> connectionThreads;
        while (true)
        {
            Net::TcpConnection conn = server.accept();
            connectionThreads.emplace_back(
                [&registry](Net::TcpConnection c)
                { handleConnection(registry, std::move(c)); },
                std::move(conn));
            connectionThreads.back().detach();
        }
    }
    catch (const std::exception &e)
    {
        std::cerr << "serina_daemon fatal error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
