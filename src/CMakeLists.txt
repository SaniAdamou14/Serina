add_subdirectory(core)
add_subdirectory(viewmodel)
add_subdirectory(utils)

# Find nlohmann/json for CLI tool
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

# Build main demo executable
add_executable(serina_demo main.cpp)
target_link_libraries(serina_demo PRIVATE 
    serina_core 
    serina_viewmodel 
    serina_utils
)
target_include_directories(serina_demo PRIVATE ../include)

# Build CLI executable for web backend integration
add_executable(serina_cli serina_cli.cpp)
target_link_libraries(serina_cli PRIVATE 
    serina_core 
    serina_viewmodel 
    serina_utils
    nlohmann_json::nlohmann_json
)
target_include_directories(serina_cli PRIVATE ../include)

# Set output directories
set_target_properties(serina_demo serina_cli PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)