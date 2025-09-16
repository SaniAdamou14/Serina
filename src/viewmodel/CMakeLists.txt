set(SOURCES
    SimulationAPI.cpp
)

add_library(serina_viewmodel ${SOURCES})
target_include_directories(serina_viewmodel PUBLIC ${CMAKE_SOURCE_DIR}/include)
target_link_libraries(serina_viewmodel PUBLIC serina_core)