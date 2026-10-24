set(SOURCES
    World.cpp
    Species.cpp
    Genome.cpp
    PhysicsEngine.cpp
)

add_library(serina_core ${SOURCES})
target_include_directories(serina_core PUBLIC ${CMAKE_SOURCE_DIR}/include)

# nlohmann/json is used by headers like SimulationSerialization.hpp and WorldSimulation.hpp
find_package(nlohmann_json QUIET)
if(NOT nlohmann_json_FOUND)
    include(FetchContent)
    FetchContent_Declare(
        nlohmann_json
        URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
    )
    FetchContent_MakeAvailable(nlohmann_json)
endif()
target_link_libraries(serina_core PUBLIC nlohmann_json::nlohmann_json)