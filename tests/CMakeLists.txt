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
# beyond Catch2 itself.
add_executable(test_world_simulation test_world_simulation.cpp)
target_link_libraries(test_world_simulation PRIVATE Catch2::Catch2WithMain)
target_include_directories(test_world_simulation PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_compile_features(test_world_simulation PRIVATE cxx_std_20)
catch_discover_tests(test_world_simulation)
