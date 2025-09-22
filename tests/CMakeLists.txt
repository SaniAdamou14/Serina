# Tests de base existants
add_executable(tests test_simulation.cpp)
target_link_libraries(tests PRIVATE serina_core serina_viewmodel serina_utils)
target_include_directories(tests PRIVATE ${CMAKE_SOURCE_DIR}/include)

# Test d'intégration du runner autonome
add_executable(test_runner_integration test_runner_integration.cpp)
target_link_libraries(test_runner_integration PRIVATE serina_core serina_viewmodel serina_utils)
target_include_directories(test_runner_integration PRIVATE ${CMAKE_SOURCE_DIR}/include)
target_compile_features(test_runner_integration PRIVATE cxx_std_20)