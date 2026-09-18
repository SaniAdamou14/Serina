cmake_minimum_required(VERSION 3.20)
project(Serina VERSION 2.0.0 LANGUAGES CXX)

# Configuration C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Configuration pour Visual Studio
if(MSVC)
    add_compile_options(/W4 /permissive- /openmp)
    add_compile_definitions(_USE_MATH_DEFINES NOMINMAX)
    # Optimisations SIMD
    add_compile_options(/arch:AVX2)
else()
    add_compile_options(-Wall -Wextra -pedantic)
    # Support OpenMP et SIMD
    find_package(OpenMP REQUIRED)
    add_compile_options(-fopenmp -mavx2 -mfma)
    link_libraries(OpenMP::OpenMP_CXX)
endif()

# Options de build
option(ENABLE_SIMD "Enable SIMD optimizations" ON)
option(ENABLE_PROFILING "Enable performance profiling" OFF)
option(BUILD_TESTS "Build test executables" ON)
option(BUILD_PYTHON_MODULE "Build Python bindings" ON)

# Configuration conditionnelle
if(ENABLE_SIMD)
    add_compile_definitions(SERINA_ENABLE_SIMD)
endif()

if(ENABLE_PROFILING)
    add_compile_definitions(SERINA_ENABLE_PROFILING)
endif()

# Répertoires d'inclusion
include_directories(include include/Serina)

## ------------------------------------------------------------------
## Pybind11 (chemin configurable)
## Permet de surcharger via -DPYBIND11_ROOT="/chemin/vers/pybind11"
## ou en s'appuyant sur l'environnement (venv, conda, etc.)
## ------------------------------------------------------------------
set(PYBIND11_ROOT "" CACHE PATH "Chemin racine optionnel vers pybind11 (prefix contenant share/cmake/pybind11)")
if(PYBIND11_ROOT)
    list(APPEND CMAKE_PREFIX_PATH "${PYBIND11_ROOT}")
endif()

# PyBind11 pour les bindings Python
if(BUILD_PYTHON_MODULE)
    find_package(Python3 COMPONENTS Interpreter Development REQUIRED)
    find_package(pybind11 REQUIRED)
endif()

# Add source directories
add_subdirectory(src)

# Tests avancés
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Module Python avec nouvelles fonctionnalités
if(BUILD_PYTHON_MODULE)
    pybind11_add_module(serina_py python/bindings.cpp)
    target_link_libraries(serina_py PRIVATE serina_core serina_viewmodel serina_utils)
    target_include_directories(serina_py PRIVATE include)
    
    # Optimisations pour le module Python
    if(MSVC)
        target_compile_options(serina_py PRIVATE /O2)
    else()
        target_compile_options(serina_py PRIVATE -O3)
    endif()
endif()

# Affichage de la configuration
message(STATUS "Serina Configuration:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  SIMD Enabled: ${ENABLE_SIMD}")
message(STATUS "  Profiling Enabled: ${ENABLE_PROFILING}")
message(STATUS "  Build Tests: ${BUILD_TESTS}")
message(STATUS "  Build Python Module: ${BUILD_PYTHON_MODULE}")
if(MSVC)
    message(STATUS "  Compiler: MSVC with OpenMP")
else()
    message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID} with OpenMP")
endif()