# Framework de test réel (Catch2 v3). Cherche une installation système
# d'abord, télécharge sinon — même approche que nlohmann/json dans
# src/CMakeLists.txt.
find_package(Catch2 3 QUIET)
if(NOT Catch2_FOUND)
    message(STATUS "Catch2 not found, downloading...")
    include(FetchContent)
    FetchContent_Declare(
        Catch2
        GIT_REPOSITORY https://github.com/catchorg/Catch2.git
        GIT_TAG v3.7.1
        GIT_SHALLOW TRUE
    )
    FetchContent_MakeAvailable(Catch2)
    list(APPEND CMAKE_MODULE_PATH "${catch2_SOURCE_DIR}/extras")
endif()

include(Catch)

add_executable(tests test_simulation.cpp)
target_link_libraries(tests PRIVATE serina_core serina_viewmodel serina_utils Catch2::Catch2WithMain)
target_include_directories(tests PRIVATE ${CMAKE_SOURCE_DIR}/include)
catch_discover_tests(tests)

add_executable(test_runner_integration test_runner_integration.cpp)
target_link_libraries(test_runner_integration PRIVATE serina_core serina_viewmodel serina_utils Catch2::Catch2WithMain)
target_include_directories(test_runner_integration PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_compile_features(test_runner_integration PRIVATE cxx_std_20)
catch_discover_tests(test_runner_integration)

# WorldSimulation.hpp and everything it composes (Region, PopulationManager,
# EcosystemTaxonomy, EcologicalInteractions, EvolutionaryConstraints,
# EnvironmentalAdaptation) are header-only, so this target needs no library
# beyond Catch2 itself -- except nlohmann_json (header-only too, only the
# lightweight <nlohmann/json_fwd.hpp> forward declaration is actually
# needed here) since WorldSimulation.hpp declares
# UnifiedWorldSimulator::toJson()/fromJson() (defined in
# SimulationSerialization.hpp, see test_simulation_serialization below).
add_executable(test_world_simulation test_world_simulation.cpp)
target_link_libraries(test_world_simulation PRIVATE Catch2::Catch2WithMain nlohmann_json::nlohmann_json)
target_include_directories(test_world_simulation PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_compile_features(test_world_simulation PRIVATE cxx_std_20)
catch_discover_tests(test_world_simulation)

# Serina/DaemonProtocol.hpp (registry + command dispatch) plus the real
# sockets in Serina/NetSocket.hpp for the one end-to-end wire-format test.
find_package(Threads REQUIRED)
add_executable(test_daemon_protocol test_daemon_protocol.cpp)
target_link_libraries(test_daemon_protocol PRIVATE
    Catch2::Catch2WithMain
    nlohmann_json::nlohmann_json
    Threads::Threads
)
target_include_directories(test_daemon_protocol PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_compile_features(test_daemon_protocol PRIVATE cxx_std_20)
if(WIN32)
    target_link_libraries(test_daemon_protocol PRIVATE ws2_32)
endif()
catch_discover_tests(test_daemon_protocol)

# Serina/SimulationSerialization.hpp (sauvegarde/reprise, Chantier H) : a
# besoin de la vraie bibliothèque nlohmann/json (pas seulement la
# déclaration avancée que WorldSimulation.hpp utilise), donc une cible
# séparée de test_world_simulation plutôt que d'imposer cette dépendance à
# tout le fichier existant.
# Serina/TraitEcology.hpp (classification écologique par traits réels,
# Chantier F) : entièrement header-only, pas de dépendance nlohmann_json --
# uniquement des fonctions pures sur des doubles/entiers simples.
add_executable(test_trait_ecology test_trait_ecology.cpp)
target_link_libraries(test_trait_ecology PRIVATE Catch2::Catch2WithMain)
target_include_directories(test_trait_ecology PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_compile_features(test_trait_ecology PRIVATE cxx_std_20)
catch_discover_tests(test_trait_ecology)

add_executable(test_simulation_serialization test_simulation_serialization.cpp)
target_link_libraries(test_simulation_serialization PRIVATE
    Catch2::Catch2WithMain
    nlohmann_json::nlohmann_json
)
target_include_directories(test_simulation_serialization PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_compile_features(test_simulation_serialization PRIVATE cxx_std_20)
catch_discover_tests(test_simulation_serialization)
