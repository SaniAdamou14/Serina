# Banc scientifique, voir tools/science.js.
add_executable(serina_bench serina_bench.cpp)
target_link_libraries(serina_bench PRIVATE nlohmann_json::nlohmann_json)
target_compile_features(serina_bench PRIVATE cxx_std_20)
set_target_properties(serina_bench PROPERTIES RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
