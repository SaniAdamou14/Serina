find_package(nlohmann_json QUIET)
if(NOT nlohmann_json_FOUND)
    message(STATUS "nlohmann/json not found, downloading...")
    include(FetchContent)
    FetchContent_Declare(
        nlohmann_json
        URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
    )
    FetchContent_MakeAvailable(nlohmann_json)
endif()

# Live backend for the web API: keeps real UnifiedWorldSimulator instances in
# memory and serves them over a local TCP JSON-lines protocol (see
# docs/SERINA_DAEMON_PROTOCOL.md). Header-only simulation code + nlohmann/json
# + sockets/threads.
find_package(Threads REQUIRED)
add_executable(serina_daemon serina_daemon.cpp)
target_link_libraries(serina_daemon PRIVATE
    nlohmann_json::nlohmann_json
    Threads::Threads
)
target_include_directories(serina_daemon PRIVATE ../include)
target_compile_features(serina_daemon PRIVATE cxx_std_20)
if(WIN32)
    target_link_libraries(serina_daemon PRIVATE ws2_32)
endif()

set_target_properties(serina_daemon PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)
