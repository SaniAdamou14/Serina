#pragma once

// Sockets TCP minimales, locales uniquement (127.0.0.1) : le daemon n'a pas
// vocation à être exposé au réseau, seulement à parler à l'API Node tournant
// sur la même machine. Protocole "JSON-lines" : une requête ou une réponse
// JSON par ligne, terminée par '\n'.

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#ifdef _MSC_VER
#pragma comment(lib, "ws2_32.lib")
#endif
using SerinaSocketHandle = SOCKET;
inline constexpr SerinaSocketHandle kSerinaInvalidSocket = INVALID_SOCKET;
#else
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
using SerinaSocketHandle = int;
inline constexpr SerinaSocketHandle kSerinaInvalidSocket = -1;
#endif

#include <cstdint>
#include <cstring>
#include <stdexcept>
#include <string>

namespace Serina::Net
{
    inline void platformInit()
    {
#ifdef _WIN32
        static bool initialized = false;
        if (!initialized)
        {
            WSADATA wsaData;
            WSAStartup(MAKEWORD(2, 2), &wsaData);
            initialized = true;
        }
#endif
    }

    inline void closeSocketHandle(SerinaSocketHandle s)
    {
#ifdef _WIN32
        closesocket(s);
#else
        ::close(s);
#endif
    }

    /// @brief Une connexion TCP (acceptée par le serveur ou ouverte par un
    /// client), avec lecture/écriture ligne par ligne.
    class TcpConnection
    {
    public:
        explicit TcpConnection(SerinaSocketHandle fd = kSerinaInvalidSocket) : fd_(fd) {}
        TcpConnection(TcpConnection &&other) noexcept : fd_(other.fd_), buffer_(std::move(other.buffer_))
        {
            other.fd_ = kSerinaInvalidSocket;
        }
        TcpConnection &operator=(TcpConnection &&other) noexcept
        {
            if (this != &other)
            {
                close();
                fd_ = other.fd_;
                buffer_ = std::move(other.buffer_);
                other.fd_ = kSerinaInvalidSocket;
            }
            return *this;
        }
        TcpConnection(const TcpConnection &) = delete;
        TcpConnection &operator=(const TcpConnection &) = delete;
        ~TcpConnection() { close(); }

        void close()
        {
            if (fd_ != kSerinaInvalidSocket)
            {
                closeSocketHandle(fd_);
                fd_ = kSerinaInvalidSocket;
            }
        }

        bool isOpen() const { return fd_ != kSerinaInvalidSocket; }

        /// @brief Lit une ligne complète (jusqu'à '\n' exclu, '\r' final
        /// retiré). Retourne false si la connexion s'est fermée avant d'en
        /// recevoir une complète.
        bool readLine(std::string &out)
        {
            while (true)
            {
                size_t pos = buffer_.find('\n');
                if (pos != std::string::npos)
                {
                    out = buffer_.substr(0, pos);
                    buffer_.erase(0, pos + 1);
                    if (!out.empty() && out.back() == '\r')
                        out.pop_back();
                    return true;
                }

                char chunk[4096];
                auto n = recv(fd_, chunk, sizeof(chunk), 0);
                if (n <= 0)
                    return false;
                buffer_.append(chunk, static_cast<size_t>(n));
            }
        }

        bool writeLine(const std::string &line)
        {
            std::string withNewline = line;
            withNewline.push_back('\n');
            size_t total = 0;
            while (total < withNewline.size())
            {
                auto n = send(fd_, withNewline.data() + total,
                               static_cast<int>(withNewline.size() - total), 0);
                if (n <= 0)
                    return false;
                total += static_cast<size_t>(n);
            }
            return true;
        }

    private:
        SerinaSocketHandle fd_;
        std::string buffer_;
    };

    /// @brief Serveur TCP minimal lié à 127.0.0.1 seulement.
    class TcpServer
    {
    public:
        explicit TcpServer(uint16_t port)
        {
            platformInit();
            fd_ = socket(AF_INET, SOCK_STREAM, 0);
            if (fd_ == kSerinaInvalidSocket)
                throw std::runtime_error("socket() failed");

            int opt = 1;
            setsockopt(fd_, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char *>(&opt), sizeof(opt));

            sockaddr_in addr{};
            addr.sin_family = AF_INET;
            addr.sin_port = htons(port);
            addr.sin_addr.s_addr = inet_addr("127.0.0.1");

            if (bind(fd_, reinterpret_cast<sockaddr *>(&addr), sizeof(addr)) != 0)
            {
                closeSocketHandle(fd_);
                fd_ = kSerinaInvalidSocket;
                throw std::runtime_error("bind() failed on 127.0.0.1:" + std::to_string(port) + " (already in use?)");
            }
            if (listen(fd_, 32) != 0)
            {
                closeSocketHandle(fd_);
                fd_ = kSerinaInvalidSocket;
                throw std::runtime_error("listen() failed");
            }
        }

        ~TcpServer()
        {
            if (fd_ != kSerinaInvalidSocket)
                closeSocketHandle(fd_);
        }

        TcpServer(const TcpServer &) = delete;
        TcpServer &operator=(const TcpServer &) = delete;

        TcpConnection accept()
        {
            SerinaSocketHandle client = ::accept(fd_, nullptr, nullptr);
            if (client == kSerinaInvalidSocket)
                throw std::runtime_error("accept() failed");
            return TcpConnection(client);
        }

    private:
        SerinaSocketHandle fd_ = kSerinaInvalidSocket;
    };

    /// @brief Ouvre une connexion cliente — utilisé par les tests
    /// d'intégration pour vérifier le protocole réel de bout en bout.
    inline TcpConnection connectTo(const std::string &host, uint16_t port)
    {
        platformInit();
        SerinaSocketHandle fd = socket(AF_INET, SOCK_STREAM, 0);
        if (fd == kSerinaInvalidSocket)
            throw std::runtime_error("socket() failed");

        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_port = htons(port);
        inet_pton(AF_INET, host.c_str(), &addr.sin_addr);

        if (connect(fd, reinterpret_cast<sockaddr *>(&addr), sizeof(addr)) != 0)
        {
            closeSocketHandle(fd);
            throw std::runtime_error("connect() failed to " + host + ":" + std::to_string(port));
        }
        return TcpConnection(fd);
    }

} // namespace Serina::Net
