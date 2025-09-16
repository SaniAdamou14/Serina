set(SOURCES
    Random.cpp
    Config.cpp
)

add_library(serina_utils ${SOURCES})
target_include_directories(serina_utils PUBLIC ${CMAKE_SOURCE_DIR}/include)