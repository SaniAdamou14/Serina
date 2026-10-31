#pragma once

// Tirages aléatoires et fonctions mathématiques reproductibles au bit près sur
// tous les compilateurs. La séquence de std::mt19937 est fixée par la norme,
// mais pas celle des std::*_distribution ni de std::shuffle ; et les
// std::exp/std::log/std::tanh diffèrent de quelques ulps selon la libm. Une
// même graine produisait donc des mondes différents sous GCC et MSVC.
//
// Ici, tout repose sur + - * / sqrt (exacts en IEEE 754) et frexp/ldexp, qui
// sont exacts eux aussi. Les distributions ne gardent aucun état entre deux
// tirages : il n'y a rien à sauvegarder pour reprendre une simulation.

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iterator>
#include <limits>
#include <utility>

namespace Serina::Det
{
    inline double exp(double x)
    {
        if (std::isnan(x))
            return x;
        if (x > 709.0)
            return std::numeric_limits<double>::infinity();
        if (x < -745.0)
            return 0.0;

        constexpr double kLn2 = 0.693147180559945309417;
        const int k = static_cast<int>(std::floor(x / kLn2 + 0.5));
        const double r = x - k * kLn2;

        // Taylor sur |r| <= ln2/2.
        double term = 1.0;
        double sum = 1.0;
        for (int i = 1; i <= 14; ++i)
        {
            term = term * r / i;
            sum += term;
        }
        return std::ldexp(sum, k);
    }

    /// @pre x > 0
    inline double log(double x)
    {
        constexpr double kLn2 = 0.693147180559945309417;
        constexpr double kSqrtHalf = 0.707106781186547524401;

        int e = 0;
        double m = std::frexp(x, &e);
        if (m < kSqrtHalf)
        {
            m *= 2.0;
            --e;
        }

        // log(m) = 2 atanh(s), avec |s| <= 0.172.
        const double s = (m - 1.0) / (m + 1.0);
        const double s2 = s * s;
        double power = s;
        double sum = 0.0;
        for (int i = 1; i <= 25; i += 2)
        {
            sum += power / i;
            power *= s2;
        }
        return e * kLn2 + 2.0 * sum;
    }

    inline double tanh(double x)
    {
        if (x > 20.0)
            return 1.0;
        if (x < -20.0)
            return -1.0;
        const double e2x = exp(2.0 * x);
        return (e2x - 1.0) / (e2x + 1.0);
    }

    /// @brief Réel uniforme dans [0, 1), avec 53 bits de mantisse.
    template <typename Generator>
    double unit(Generator &g)
    {
        const uint64_t a = static_cast<uint32_t>(g()) >> 5;
        const uint64_t b = static_cast<uint32_t>(g()) >> 6;
        return static_cast<double>(a * 67108864ULL + b) / 9007199254740992.0;
    }

    class UniformReal
    {
    public:
        UniformReal(double a = 0.0, double b = 1.0) : a_(a), b_(b) {}

        template <typename Generator>
        double operator()(Generator &g) const
        {
            return a_ + (b_ - a_) * unit(g);
        }

    private:
        double a_, b_;
    };

    /// @brief Entier uniforme dans [a, b] (bornes incluses), sans biais.
    template <typename Int>
    class UniformInt
    {
    public:
        UniformInt(Int a = 0, Int b = std::numeric_limits<Int>::max()) : a_(a), b_(b) {}

        template <typename Generator>
        Int operator()(Generator &g) const
        {
            const uint64_t range = static_cast<uint64_t>(b_) - static_cast<uint64_t>(a_);
            if (range == 0)
                return a_;

            // Rejet sur le plus petit masque qui couvre l'intervalle.
            uint64_t mask = range;
            mask |= mask >> 1;
            mask |= mask >> 2;
            mask |= mask >> 4;
            mask |= mask >> 8;
            mask |= mask >> 16;
            mask |= mask >> 32;

            uint64_t value;
            do
            {
                value = static_cast<uint32_t>(g());
                if (mask > 0xFFFFFFFFULL)
                    value = (value << 32) | static_cast<uint32_t>(g());
                value &= mask;
            } while (value > range);

            return static_cast<Int>(static_cast<uint64_t>(a_) + value);
        }

    private:
        Int a_, b_;
    };

    class Normal
    {
    public:
        Normal(double mean = 0.0, double stddev = 1.0) : mean_(mean), stddev_(stddev) {}

        template <typename Generator>
        double operator()(Generator &g) const
        {
            // Méthode polaire de Marsaglia. Le second tirage est jeté : le
            // garder en réserve serait un état à sauvegarder.
            double u, v, s;
            do
            {
                u = 2.0 * unit(g) - 1.0;
                v = 2.0 * unit(g) - 1.0;
                s = u * u + v * v;
            } while (s >= 1.0 || s == 0.0);
            return mean_ + stddev_ * u * std::sqrt(-2.0 * log(s) / s);
        }

    private:
        double mean_, stddev_;
    };

    /// @brief Fisher-Yates.
    template <typename RandomIt, typename Generator>
    void shuffle(RandomIt first, RandomIt last, Generator &g)
    {
        using Diff = typename std::iterator_traits<RandomIt>::difference_type;
        const Diff n = last - first;
        for (Diff i = n - 1; i > 0; --i)
        {
            const auto j = UniformInt<uint64_t>(0, static_cast<uint64_t>(i))(g);
            using std::swap;
            swap(first[i], first[static_cast<Diff>(j)]);
        }
    }

} // namespace Serina::Det
