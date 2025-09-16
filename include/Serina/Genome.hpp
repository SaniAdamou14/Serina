#pragma once

#include <vector>
#include <string>

namespace Serina
{

    class Genome
    {
    public:
        Genome();
        Genome(const std::vector<double> &traits);

        // TODO: Represent genome as sequence of genes (for evolution).
        // TODO: Add mutation operators.

        void mutate(double rate);
        Genome crossover(const Genome &other) const;

        double getTrait(int index) const;
        void setTrait(int index, double value);

        // TODO: Serialize to JSON.
        std::string toJson() const;

    private:
        std::vector<double> traits_; // e.g., 0: size, 1: speed, 2: energy capacity
    };

} // namespace Serina