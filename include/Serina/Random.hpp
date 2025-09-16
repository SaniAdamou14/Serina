#pragma once

#include <random>

namespace Serina {

class Random {
public:
    static Random& instance();

    double uniform(double min, double max);
    int uniformInt(int min, int max);
    double normal(double mean, double stddev);

private:
    Random();
    std::mt19937 gen_;
};

} // namespace Serina