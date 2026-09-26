#pragma once

// Détection de convergence évolutive (Chantier G2) : compare les profils de
// traits réels de deux lignées génétiquement éloignées partageant un vrai
// biome, et signale quand leur distance de traits diminue dans le temps
// alors que leur distance génétique croît -- exactement le motif attendu
// d'une convergence adaptative (deux lignées non apparentées qui en
// viennent à se ressembler phénotypiquement sous une pression écologique
// similaire), mais présenté honnêtement comme un signal candidat détecté
// sur des mesures réelles, jamais comme une preuve ni un phénomène mis en
// scène. Fonctions pures, testables directement (aucun état, aucun
// aléatoire) -- voir tests/test_evolutionary_convergence.cpp.

#include "AdvancedGenetics.hpp"
#include <cstdint>
#include <cmath>
#include <algorithm>
#include <utility>

namespace Serina::Ecology
{
    /// @brief Un point de mesure réel pour une paire de lignées à une
    /// génération donnée -- ni interprété ni lissé, juste ce qui a été
    /// calculé ce tour-ci.
    struct ConvergenceSample
    {
        uint32_t generation = 0;
        double traitDistance = 0.0;
        double geneticDistance = 0.0;
    };

    /// @brief Résultat de la comparaison entre deux échantillons successifs
    /// de la même paire de lignées.
    struct ConvergenceSignal
    {
        /// true seulement si la distance de traits a RÉELLEMENT diminué
        /// entre les deux échantillons alors que la distance génétique a
        /// RÉELLEMENT augmenté -- le motif exact d'une convergence
        /// adaptative candidate, jamais un seuil arbitraire sur une seule
        /// mesure isolée.
        bool isCandidate = false;
        double traitDistanceDelta = 0.0;   ///< current - previous (négatif = rapprochement phénotypique)
        double geneticDistanceDelta = 0.0; ///< current - previous (positif = éloignement génétique)
    };

    /// @brief Distance de traits réelle entre deux profils moyens de
    /// lignée, sur la même échelle (RMS de différences normalisées [0,1])
    /// que Genetics::AdvancedGenome::geneticDistance() -- pour que les deux
    /// distances restent directement comparables, jamais deux unités
    /// différentes présentées côte à côte. N'utilise que les 12 traits
    /// réels (exclut délibérément fertility/neuralComplexity/sensoryAcuity,
    /// de simples alias de reproductionRate/intelligence/hearingAcuity qui
    /// compteraient sinon ces trois traits deux fois).
    inline double normalizedTraitDistance(const Genetics::AdvancedTraitValues &a, const Genetics::AdvancedTraitValues &b)
    {
        auto normalize = [](Genetics::TraitType type, double value) {
            const auto &bounds = Genetics::TRAIT_BOUNDS[static_cast<size_t>(type)];
            if (bounds.max <= bounds.min)
                return 0.5;
            return std::clamp((value - bounds.min) / (bounds.max - bounds.min), 0.0, 1.0);
        };

        const std::pair<Genetics::TraitType, std::pair<double, double>> fields[] = {
            {Genetics::TraitType::SIZE, {a.size, b.size}},
            {Genetics::TraitType::SPEED, {a.speed, b.speed}},
            {Genetics::TraitType::ENERGY_EFFICIENCY, {a.energyEfficiency, b.energyEfficiency}},
            {Genetics::TraitType::REPRODUCTION_RATE, {a.reproductionRate, b.reproductionRate}},
            {Genetics::TraitType::AGGRESSION, {a.aggression, b.aggression}},
            {Genetics::TraitType::INTELLIGENCE, {a.intelligence, b.intelligence}},
            {Genetics::TraitType::LONGEVITY, {a.longevity, b.longevity}},
            {Genetics::TraitType::RESISTANCE, {a.resistance, b.resistance}},
            {Genetics::TraitType::VISION_RANGE, {a.visionRange, b.visionRange}},
            {Genetics::TraitType::HEARING_ACUITY, {a.hearingAcuity, b.hearingAcuity}},
            {Genetics::TraitType::CAMOUFLAGE, {a.camouflage, b.camouflage}},
            {Genetics::TraitType::SOCIAL_BEHAVIOR, {a.socialBehavior, b.socialBehavior}},
        };

        double sumSquares = 0.0;
        for (const auto &[type, values] : fields)
        {
            double na = normalize(type, values.first);
            double nb = normalize(type, values.second);
            double diff = na - nb;
            sumSquares += diff * diff;
        }
        return std::sqrt(sumSquares / 12.0);
    }

    /// @brief Compare deux échantillons successifs de la même paire de
    /// lignées et détecte le motif de convergence -- fonction pure, aucune
    /// connaissance de QUAND ni COMMENT les échantillons ont été pris.
    inline ConvergenceSignal evaluateConvergenceTrend(const ConvergenceSample &previous, const ConvergenceSample &current)
    {
        ConvergenceSignal signal;
        signal.traitDistanceDelta = current.traitDistance - previous.traitDistance;
        signal.geneticDistanceDelta = current.geneticDistance - previous.geneticDistance;
        signal.isCandidate = signal.traitDistanceDelta < 0.0 && signal.geneticDistanceDelta > 0.0;
        return signal;
    }

} // namespace Serina::Ecology
