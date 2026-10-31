cmake_minimum_required(VERSION 3.20)
project(Serina VERSION 2.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(MSVC)
    add_compile_options(/W4 /permissive- /fp:precise)
    add_compile_definitions(_USE_MATH_DEFINES NOMINMAX)
else()
    # -ffp-contract=off : une fusion a*b+c en FMA change l'arrondi, donc le
    # monde produit par une graine selon le compilateur.
    add_compile_options(-Wall -Wextra -pedantic -ffp-contract=off)
endif()

option(BUILD_TESTS "Build test executables" ON)

include_directories(include)

add_subdirectory(src)
add_subdirectory(tools)

if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
