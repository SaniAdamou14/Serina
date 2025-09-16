#include "Serina/Random.hpp"

namespace Serina {

Random& Random::instance() {
    static Random instance;
    return instance;
}

Random::Random() : gen_(std::random_device{}()) {}

double Random::uniform(double min, double max) {
    std::uniform_real_distribution<> dist(min, max);
    return dist(gen_);
}

int Random::uniformInt(int min, int max) {
    std::uniform_int_distribution<> dist(min, max);
    return dist(gen_);
}

double Random::normal(double mean, double stddev) {
    std::normal_distribution<> dist(mean, stddev);
    return dist(gen_);
}

} // namespace Serina