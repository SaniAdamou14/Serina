add_executable(tests test_simulation.cpp)
target_link_libraries(tests PRIVATE serina_core serina_viewmodel serina_utils)
target_include_directories(tests PRIVATE ${CMAKE_SOURCE_DIR}/include)