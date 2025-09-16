#include "Serina/Config.hpp"
#include <iostream>

namespace Serina {

Config& Config::instance() {
    static Config instance;
    return instance;
}

Config::Config() {}

void Config::load(const std::string& filename) {
    // TODO: Parse JSON
    std::cout << "Config loaded from " << filename << std::endl;
}

} // namespace Serina