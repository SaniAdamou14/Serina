set(SOURCES
    World.cpp
    Species.cpp
    Genome.cpp
    PhysicsEngine.cpp
)

add_library(serina_core ${SOURCES})
target_include_directories(serina_core PUBLIC ${CMAKE_SOURCE_DIR}/include)
# TODO: Link nlohmann_json