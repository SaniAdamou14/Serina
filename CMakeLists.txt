cmake_minimum_required(VERSION 3.20)
project(Serina VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/include)

# Set pybind11 path
set(CMAKE_PREFIX_PATH "${CMAKE_PREFIX_PATH};C:/Users/NB03/Pictures/Projects/Webmaster/Serina/.venv/Lib/site-packages/pybind11/share/cmake")

# Find dependencies
# find_package(PkgConfig REQUIRED)
# TODO: Add nlohmann/json
# find_package(nlohmann_json REQUIRED)

# PyBind11 for Python bindings
find_package(pybind11 REQUIRED)

# Add source directories
add_subdirectory(src)

# TODO: Add tests
# add_subdirectory(tests)  # Temporarily disabled until tests are updated to new API

# Python module
pybind11_add_module(serina_py python/bindings.cpp)
target_link_libraries(serina_py PRIVATE serina_core serina_viewmodel serina_utils)
target_include_directories(serina_py PRIVATE include)