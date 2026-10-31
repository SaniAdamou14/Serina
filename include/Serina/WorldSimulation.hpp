#pragma once

// The unified engine (see docs/UNIFIED_ENGINE_DESIGN.md): real individuals
// with diploid genomes (Evolution::Organism / Genetics::AdvancedGenome,
// PopulationManager.hpp), living on a real region grid (Region.hpp),
// organized into named taxa (Taxonomy::EcosystemTaxonomy), subject to real
// ecological interactions and biological constraints applied per
// individual rather than per aggregate species.

#include "DeterministicRandom.hpp"
#include "Region.hpp"
#include "Habitat.hpp"
#include "PopulationManager.hpp"
#include "EcosystemTaxonomy.hpp"
#include "TraitEcology.hpp"
#include "EvolutionaryConvergence.hpp"
#include "EvolutionaryConstraints.hpp"
#include "EnvironmentalAdaptation.hpp"
#include "NEAT.hpp"

#include <vector>
#include <unordered_map>
#include <map>
#include <string>
#include <random>
#include <algorithm>
#include <cmath>
#include <optional>
#include <array>
#include <memory>
#include <cstdio>
#include <set>

// Déclaration avancée seulement (fichier léger, pas l'implémentation
// complète) : ce header et les autres headers de simulation ne dépendent
// délibérément pas de nlohmann/json -- seuls le daemon (DaemonProtocol.hpp)
// et le module de sérialisation (SimulationSerialization.hpp) le font. Ça
// suffit pour déclarer toJson()/fromJson() ci-dessous ; leur définition
// complète (qui, elle, a besoin du vrai type) vit dans
// SimulationSerialization.hpp.
#include <nlohmann/json_fwd.hpp>

namespace Serina::Simulation
{
    /// @brief Snapshot en lecture seule de l'état réel d'une lignée
    /// (espèce vivante), calculé à partir des individus qui la composent,
    /// pas d'agrégat maintenu séparément qui pourrait diverger de la
    /// réalité de la population.
    struct LineageSnapshot
    {
        std::string speciesName;
        Taxonomy::BiologicalType biologicalType;
        uint32_t population = 0;
        double averageFitness = 0.0;
        double geneticDiversity = 0.0; ///< Distance génétique moyenne réelle (AdvancedGenome::geneticDistance)
        uint32_t regionsOccupied = 0;
        std::vector<std::string> adaptations;
        std::vector<std::string> innovations;
        /// Moyenne réelle des 12 traits diploïdes sur tous les individus
        /// vivants de cette lignée (valeurs réelles bornées, pas [0,1]) --
        /// pour une fiche d'espèce qui montre ce qu'elle est vraiment,
        /// pas seulement les quelques traits utilisés pour le rendu visuel.
        Genetics::AdvancedTraitValues averageTraits;
    };

    /// @brief Compteurs cumulatifs d'événements de vie réels depuis le début
    /// de la simulation -- observabilité pour comprendre POURQUOI une
    /// population évolue comme elle le fait (famine ou vieillesse, naissances,
    /// individus éligibles à la reproduction mais seuls dans leur case)
    /// plutôt que de deviner à partir des seules courbes d'effectifs.
    struct LifeEventCounters
    {
        uint64_t births = 0;
        uint64_t starvationDeaths = 0;
        uint64_t oldAgeDeaths = 0;
        uint64_t predationTransfers = 0;
        uint64_t predationKills = 0;
        /// Individus éligibles à la reproduction (énergie/âge suffisants)
        /// mais seuls de leur espèce dans leur case cette génération-là :
        /// la mesure directe d'un effet Allee (pas de partenaire).
        uint64_t eligibleWithoutPartner = 0;
    };

    struct ExtinctionEvent
    {
        std::string species;
        uint32_t generation = 0;
        uint32_t lastPopulation = 0;
    };

    /// @brief Un point de l'histoire de la partie, pour les graphiques.
    struct HistorySample
    {
        uint32_t generation = 0;
        uint32_t population = 0;
        uint32_t speciesCount = 0;
        double totalEnergy = 0.0;
        double meanDiversity = 0.0;
        std::map<std::string, uint32_t> bySpecies;
    };

    struct SpeciationEvent
    {
        std::string parentSpecies;
        std::string newSpecies;
        uint32_t generation;
        double geneticDistanceAtSplit;
    };

    /// @brief Un signal de convergence évolutive CANDIDAT (Chantier G2) :
    /// mesuré sur des traits/distances réels à deux instants successifs,
    /// jamais une preuve ni un phénomène mis en scène -- voir
    /// EvolutionaryConvergence.hpp pour le motif exact détecté.
    struct ConvergenceSignal
    {
        std::string speciesA;
        std::string speciesB;
        uint32_t generation;
        double traitDistance;
        double geneticDistance;
        double traitDistanceDelta;
        double geneticDistanceDelta;
    };

    /// @brief Snapshot en lecture seule d'une case de la carte : son biome
    /// réel et les valeurs d'environnement réellement utilisées par la
    /// simulation pour cette case (pas une constante globale), plus le
    /// compte réel d'individus vivants actuellement dedans, pour un
    /// frontend qui veut dessiner une vraie carte de régions, pas un
    /// placeholder.
    struct RegionSnapshot
    {
        int gridX = 0;
        int gridY = 0;
        Ecosystem::EnvironmentType environmentType = Ecosystem::EnvironmentType::GRASSLAND;
        std::string environmentName;
        double temperature = 0.0;
        double primaryProducers = 0.0;
        double predationPressure = 0.0;
        double competitionIntensity = 0.0;
        double climaticStress = 0.0;
        uint32_t population = 0;
        double plants = 0.0;  ///< biomasse végétale, fraction [0,1] de la capacité de la case
        double carrion = 0.0; ///< énergie des cadavres présents dans la case
    };

    /// @brief Snapshot en lecture seule d'un individu réel : de quoi
    /// dessiner un point sur la carte et l'inspecter, sans exposer le
    /// génome complet ni permettre de le muter depuis l'extérieur. Les
    /// champs visuels ci-dessous sont une projection normalisée ([0,1] ou
    /// un palier entier) d'un sous-ensemble de traits génétiques réels vers
    /// un petit nombre de canaux de rendu délibérément lisibles (voir
    /// docs/UNIFIED_ENGINE_DESIGN.md, "créatures procédurales"), la
    /// formule de correspondance vit ici, une seule fois ; le frontend ne
    /// fait que dessiner à partir de ces valeurs déjà calculées.
    struct IndividualSnapshot
    {
        uint64_t id = 0;
        std::string species;
        double x = 0.0;
        double y = 0.0;
        double energy = 0.0;
        double age = 0.0;
        Taxonomy::BiologicalType biologicalType = Taxonomy::BiologicalType::BIRD;
        double sizeScale = 0.5;         ///< SIZE normalisé [0,1]
        double elongation = 0.5;        ///< silhouette fuselée (rapide/léger) vs trapue (lent/lourd), [0,1]
        double camouflage = 0.0;        ///< trait CAMOUFLAGE réel, déjà borné [0,1]
        uint8_t ornamentTier = 0;       ///< AGGRESSION quantifiée en 4 paliers [0,3]
        double sensoryProminence = 0.0; ///< moyenne normalisée de VISION_RANGE et HEARING_ACUITY, [0,1]
        uint8_t patternTier = 0;        ///< SOCIAL_BEHAVIOR quantifiée en 5 paliers [0,4]
        double resistance = 0.0;        ///< RESISTANCE normalisée [0,1]
        double insulation = 0.5;        ///< INSULATION [0,1]
        double diet = 0.2;              ///< DIET [0,1], 0 herbivore et 1 carnivore
    };

    /// @brief Le "cerveau" d'une lignée : un seul réseau NEAT partagé par
    /// tous ses individus (pas un par individu, voir
    /// docs/UNIFIED_ENGINE_DESIGN.md, "échelle cible"), piloté par
    /// évolution (1+1) : `brain` est le candidat actuellement à l'essai,
    /// `stableBrain` la dernière version dont la fitness mesurée de la
    /// lignée a confirmé qu'elle n'était pas pire.
    struct LineageBrain
    {
        NEAT::NEATGenome brain;
        NEAT::NEATGenome stableBrain;
        double fitnessAtCheckpoint = 0.0;
        bool hasCheckpoint = false;

        LineageBrain(NEAT::NEATGenome initial)
            : brain(initial), stableBrain(std::move(initial)) {}
    };

    struct WorldSimulationParameters
    {
        int gridWidth = 12;
        int gridHeight = 9;
        double cellSize = 10.0; ///< Unités continues par case de grille

        Genetics::MutationConfig mutation{};
        Genetics::CrossoverConfig crossover{};

        /// Distance génétique moyenne (0..1) au-delà de laquelle deux
        /// sous-groupes régionaux d'une même espèce sont considérés en
        /// divergence.
        double speciationDistanceThreshold = 0.30;
        /// Ticks consécutifs pendant lesquels deux populations d'une espèce doivent rester
        /// sans contact avant de pouvoir se scinder (voir checkSpeciation()). Une durée de
        /// vie fait environ 1000 ticks.
        uint32_t speciationIsolationGenerations = 1000;
        /// Une case ne relie deux populations que si elle compte au moins ce nombre
        /// d'individus de l'espèce : un migrant isolé ne fait pas un flux de gènes.
        uint32_t speciationMinCellPopulation = 3;
        /// Taille minimale d'une population isolée pour devenir une espèce.
        uint32_t speciationMinPopulation = 20;

        /// Si >= 0 : critère de divergence RELATIF (défaut) -- deux
        /// sous-groupes ne divergent que si leur distance moyenne ENTRE eux
        /// dépasse leur distance moyenne INTERNE (moyenne des deux) d'au
        /// moins cette marge. < 0 : critère absolu historique
        /// (speciationDistanceThreshold).
        ///
        /// Pourquoi : la diversité interne du pool de fondateurs (allèles
        /// tirés uniformément) est déjà ~0.34, au-dessus du seuil absolu
        /// 0.30, donc n'importe quelle paire de sous-groupes le dépassait au
        /// départ (~38 spéciations d'artefact en 1000 générations), puis
        /// plus aucune ne le dépassait quand la diversité retombait à
        /// 0.05-0.2 (une seule spéciation de plus en 7000 générations).
        ///
        /// Calibration mesurée : plancher de bruit d'échantillonnage (deux
        /// sous-groupes tirés au hasard dans une population SANS
        /// divergence, 5000 tirages, diversité élevée) : p99 = 0.015, p99.9 =
        /// 0.020, max = 0.029 ; 0.03 est la plus petite valeur au-dessus. Sur
        /// 24 graines à 8000 générations : marge 0.02 -> ~25 spéciations,
        /// 0.03 -> ~12, 0.04 -> ~7, 0.06 -> ~1 ; les spéciations continuent
        /// au fil du temps au lieu de s'arrêter vers la génération 1000.
        double speciationDivergenceMargin = 0.03;

        uint32_t maxAttemptsPerConstraintRetry = 3;

        /// Nombre d'entrées/sorties du cerveau NEAT de chaque lignée (Chantier
        /// G1 : enrichi au-delà du seul déplacement) : voir buildBrainInputs()
        /// pour ce que représentent les entrées, et moveOrganisms()/
        /// applySurvivalAndInteractions() pour où chaque sortie est
        /// réellement consommée.
        static constexpr uint32_t brainInputCount = 10;
        static constexpr uint32_t brainOutputCount = 5;

        /// Index des sorties du cerveau dans le vecteur renvoyé par
        /// NEATGenome::evaluate() -- nommés pour éviter les indices
        /// magiques aux points de consommation.
        static constexpr size_t OUTPUT_MOVE_X = 0;
        static constexpr size_t OUTPUT_MOVE_Y = 1;
        /// Effort de chasse personnel [0,1] : ne s'applique QUE quand cet
        /// individu joue le rôle de prédateur dans une relation déjà
        /// classée par TraitEcology.hpp -- module sa probabilité de succès
        /// PERSONNELLE autour de la probabilité de base au niveau espèce,
        /// jamais un canal de gain indépendant (voir applySurvivalAndInteractions()).
        static constexpr size_t OUTPUT_HUNT_EFFORT = 2;
        /// Effort d'évasion personnel [0,1] : ne s'applique QUE quand cet
        /// individu est tiré au sort comme cible d'une chasse -- une chance
        /// personnelle et bornée d'échapper à l'attaque (jamais totale, voir
        /// MAX_PERSONAL_EVASION_CHANCE), au-delà du profil de traits moyen
        /// déjà utilisé pour classer la relation elle-même.
        static constexpr size_t OUTPUT_EVASION_EFFORT = 3;
        /// Effort de recherche de nourriture [0,1] : module foragingIncome
        /// (jamais en dessous d'un plancher de sécurité, voir
        /// applySurvivalAndInteractions()) -- jamais un second canal de
        /// revenu indépendant du terme déjà validé comme sûr.
        static constexpr size_t OUTPUT_FORAGE_EFFORT = 4;

        /// Chance maximale (à effort d'évasion parfait, 1.0) d'échapper à
        /// une attaque par ailleurs réussie -- bornée pour qu'aucun individu
        /// ne devienne invulnérable, quel que soit son cerveau.
        static constexpr double MAX_PERSONAL_EVASION_CHANCE = 0.5;

        /// Ni un individu ne peut totalement s'arrêter de chercher de la
        /// nourriture par un mauvais tirage/mutation de cerveau : ce
        /// plancher borne foragingIncome à au moins cette fraction de sa
        /// valeur pleine, quel que soit l'effort de recherche décidé.
        static constexpr double MIN_FORAGE_EFFORT_FLOOR = 0.3;

        /// Tous les combien de générations un cerveau de lignée est
        /// réévalué : sa fitness mesurée sur la fenêtre écoulée décide si
        /// la mutation à l'essai est gardée ou annulée (évolution (1+1)).
        uint32_t brainEvolutionInterval = 8;

        /// Tous les combien de générations la détection de convergence
        /// évolutive (Chantier G2) recompare les profils de traits/distances
        /// génétiques de chaque paire de lignées éligible -- une analyse en
        /// O(paires × échantillon) volontairement peu fréquente, comme
        /// brainEvolutionInterval.
        uint32_t convergenceCheckInterval = 50;

        NEAT::NEATConfig neat{};

        /// Énergie gagnée par génération par un organisme au maximum
        /// d'efficacité (ENERGY_EFFICIENCY = 1.0) dans une région à
        /// ressources maximales (primaryProducers = 1.0) : le seul revenu
        /// énergétique positif de la simulation, avant cette constante il
        /// n'y en avait aucun (voir applySurvivalAndInteractions()), tout
        /// organisme ne faisait que perdre de l'énergie au métabolisme
        /// jusqu'à une extinction totale garantie, sans rapport avec les
        /// gènes ou l'environnement.
        ///
        /// Calibration mesurée (12 graines, 8000 générations, spéciation
        /// activée) : à 0.15 les fondateurs, d'efficacité moyenne ~0.65,
        /// sont SOUS le seuil de remplacement (une reproduction coûte 30
        /// d'énergie à chaque parent, qui doit ensuite la regagner : ~750
        /// générations entre deux reproductions pour une vie de ~1200, alors
        /// qu'il en faut 2 par individu) -- 4 extinctions sur 12 ; 0.25 : 1
        /// sur 12 ; 0.35 : 0 sur 12 ; 0.50 : 0 sur 12 mais populations plus
        /// grandes. La régulation par la densité (carryingCapacityPerResource)
        /// plafonne ensuite la population, pas la marge énergétique.
        double foragingRate = 0.35;

        /// Capacité de charge par case, par unité de ressource primaire du
        /// biome (primaryProducers, 0..1) : le revenu d'alimentation de
        /// chaque individu est multiplié par (1 - N/K) où N est le nombre
        /// RÉEL d'individus vivants (toutes espèces) dans sa case et K =
        /// ce paramètre × ressources de la case. Corrige un vrai défaut du
        /// modèle trouvé par un run de 30 000 générations : sans aucune
        /// régulation par la densité (la compétition du Chantier F ne
        /// s'applique qu'ENTRE espèces), une lignée seule dans son biome
        /// croissait exponentiellement sans plafond (534 000 individus à la
        /// génération 9900, sur les trois graines testées).
        double carryingCapacityPerResource = 400.0;

        /// Échelle du déplacement par pas (1 = jusqu'à cellSize × vitesse par pas).
        /// Mesuré sur 6 graines à 10000 ticks, avec le coût thermique : à 0.03, poissons
        /// vivants dans 2 mondes sur 6 et arthropodes dans 3 ; à 0.01, 6 et 5, avec 77 cases
        /// occupées sur 108 ; à 0.005, 6 et 6, mais 46 cases seulement.
        double movementScale = 0.01;

        /// Part aléatoire du déplacement [0,1] (0 = cerveau seul).
        double movementNoise = 0.5;
        /// Énergie dépensée par unité de taille et par unité de distance parcourue.
        double movementCost = 0.1;
        /// Rebondir sur le bord du monde plutôt que de s'y arrêter.
        bool reflectAtBorders = true;
        /// Énergie perdue par tick au maximum d'inadaptation au climat local : coût
        /// = taux × (résistance normalisée − stress climatique de la case)². Résister
        /// coûte donc quand le climat est doux : aucun niveau n'est bon partout.
        /// Mesuré sur 12 graines à 3000 ticks (corrélation résistance/stress local,
        /// population médiane) : 0 -> 0.04, 8859 ; 0.03 -> 0.03, 9059 ; 0.08 -> 0.12, 6228 ;
        /// 0.2 -> 0.16, 4515. Au-delà de 0.08, la carte se vide plus vite que l'adaptation ne gagne.
        double climateCostRate = 0.08;
        /// Énergie perdue par tick au maximum d'écart entre l'isolation d'un individu et
        /// celle qu'exige la température de sa case : trop froid ou trop chaud coûtent pareil.
        /// Mesuré sur 6 graines à 10000 ticks : écart moyen à l'isolation idéale de 0.31 sans
        /// coût, 0.14 à ce taux.
        double thermalCostRate = 0.15;
        /// Part de la capacité à laquelle une case de plantes ne donne plus que la moitié de
        /// ce qu'elle donne pleine : plus la case est broutée, plus manger y rapporte peu.
        double plantHalfSaturation = 0.3;
        /// Énergie de cadavres sur une case pour laquelle un charognard mange à moitié.
        double carrionHalfSaturation = 30.0;
        /// Prix du généraliste [0,1] : à 0 le rendement suit le régime en ligne droite, à 1 il
        /// suit son carré, et un régime moyen rapporte moins que deux spécialistes.
        double dietSpecialization = 0.25;
        /// Chances par tick qu'un carnivore pur (régime 1) tente une chasse si des proies
        /// abondent ; proportionnel au régime, donc un herbivore ne chasse pas.
        double huntRate = 0.05;
        /// Énergie au-dessus de laquelle un prédateur repu ne chasse plus : il tue pour se
        /// nourrir, pas sans fin. Reste au-dessus du seuil de reproduction (50).
        double huntSatiety = 55.0;
        /// Écart de régime qui fait d'un membre de sa propre espèce une proie : sans lui, une
        /// espèce seule sur ses cases n'aurait rien à chasser et ne se diversifierait jamais.
        double preyDietGap = 0.1;
        /// Écart de régime au-delà duquel deux individus ne s'accouplent pas : ils ne
        /// partagent plus le même mode de vie. C'est ce qui rend possible une divergence sur place.
        double assortativeMatingGap = 0.3;
        /// Écart de régime entre deux groupes d'une espèce à partir duquel elle peut se scinder.
        double nicheSplitGap = 0.12;
        /// Ticks pendant lesquels cet écart doit durer avant la scission.
        uint32_t nicheSplitDuration = 500;
        /// Biomasse végétale maximale d'une case, par unité de ressource du biome.
        double plantCapacityPerResource = 2000.0;
        /// Croissance logistique des plantes par tick.
        double plantGrowthRate = 0.05;
        /// Fraction des cadavres décomposée par tick ; une part revient au sol et aux plantes.
        double carrionDecayRate = 0.01;
        /// Énergie dépensée par tick par un corps de taille maximale : la taille aide à
        /// chasser, ce coût l'empêche d'être gratuite. Mesuré sur 8 graines à 4000 ticks :
        /// taille moyenne normalisée de 0.43 sans coût, 0.31 avec ce taux et movementCost.
        double sizeCostRate = 0.05;
    };

    /// @brief Moteur de simulation unifié : individus réels, espace réel,
    /// taxonomie réelle. Voir docs/UNIFIED_ENGINE_DESIGN.md pour la
    /// conception complète et ce que les phases suivantes y ajouteront
    /// (interactions écologiques à granularité fine, comportement piloté
    /// par NEAT, exposition via serina_cli).
    class UnifiedWorldSimulator
    {
    public:
        explicit UnifiedWorldSimulator(WorldSimulationParameters params = {},
                                        uint32_t seed = std::random_device{}())
            : params_(params), grid_(params.gridWidth, params.gridHeight, seed),
              environments_(seed), seed_(seed),
              // +N (jamais +0, pour ne pas rejouer exactement le même flux
              // que rng_) tout en restant entièrement déterministe à partir
              // de la même graine -- corrige deux vrais bugs latents trouvés
              // en poursuivant la reproductibilité jusqu'au bout (un premier
              // trouvé en écrivant les tests du Chantier G2, un second en
              // vérifiant empiriquement que deux simulateurs à graine
              // identique restent identiques au-delà de la mutation
              // génétique elle-même) : EcosystemTaxonomy (taxonomy_,
              // utilisée pour nommer chaque nouvelle espèce à la
              // spéciation) et SerinaEvolutionaryConstraints (constraints_)
              // se construisaient toutes deux avec leur valeur par défaut
              // (std::random_device{}(), non déterministe) faute d'argument
              // explicite ici -- le nom d'une espèce née par spéciation, et
              // la validation de ses mutations, divergeaient donc d'une
              // exécution à l'autre même à graine de simulation identique.
              // (Ordre d'initialisation : taxonomy_ puis constraints_ sont
              // déclarés avant rng_ dans la classe, donc listés avant lui
              // ici aussi, pour éviter tout avertissement -Wreorder.)
              taxonomy_(seed + 2), constraints_(seed + 1), rng_(seed)
        {
        }

        /// @brief Peuple le monde avec les cinq lignées fondatrices de
        /// Serina, chacune placée dans un biome cohérent avec sa biologie,
        /// avec une population initiale de vrais individus à génome
        /// diploïde.
        void seedFounderSpecies(uint32_t individualsPerFounder = 40)
        {
            struct Founder
            {
                std::string commonName;
                Taxonomy::BiologicalType type;
                Ecosystem::EnvironmentType preferredBiome;
            };

            static const Founder founders[] = {
                {"Serinus canaria", Taxonomy::BiologicalType::BIRD, Ecosystem::EnvironmentType::GRASSLAND},
                {"Xiphophorus hellerii", Taxonomy::BiologicalType::FISH, Ecosystem::EnvironmentType::FRESHWATER},
                {"Gryllus seriensis", Taxonomy::BiologicalType::ARTHROPOD, Ecosystem::EnvironmentType::GRASSLAND},
                {"Solenopsis invicta", Taxonomy::BiologicalType::ARTHROPOD, Ecosystem::EnvironmentType::FOREST},
                {"Achatina fulica", Taxonomy::BiologicalType::MOLLUSC, Ecosystem::EnvironmentType::WETLAND},
            };

            for (const auto &founder : founders)
            {
                biologicalTypeOf_[founder.commonName] = founder.type;
                ensureBrain(founder.commonName);

                auto candidateRegions = grid_.regionsOfType(founder.preferredBiome);
                if (candidateRegions.empty())
                    candidateRegions = bestHabitatRegions(founder.type);
                if (candidateRegions.empty())
                    continue; // aucune case habitable pour ce groupe sur cette carte

                Det::UniformInt<size_t> regionPick(0, candidateRegions.size() - 1);

                for (uint32_t i = 0; i < individualsPerFounder; ++i)
                {
                    auto [gx, gy] = candidateRegions[regionPick(rng_)];
                    // Graine dérivée du flux du simulateur (jamais le
                    // générateur partagé retiré d'AdvancedGenetics.hpp) --
                    // pour que deux UnifiedWorldSimulator construits avec la
                    // même graine produisent des génomes fondateurs
                    // réellement identiques, pas seulement des positions
                    // identiques.
                    auto genome = std::make_unique<Genetics::AdvancedGenome>(generation_, static_cast<uint32_t>(rng_()));
                    // Sinon presque tous les enfants violent les limites de leur
                    // groupe (validateMutation) et la lignée ne se reproduit pas.
                    if (const auto *rules = constraints_.getBiologicalGroupRules(founder.type))
                        for (const auto &[trait, limits] : rules->traitLimits)
                            genome->rescaleAllelesToRange(trait, limits.first, limits.second);
                    const auto dietRange = Habitat::founderDietRange(founder.type);
                    genome->rescaleAllelesToRange(Genetics::TraitType::DIET, dietRange.first, dietRange.second);
                    Evolution::Organism organism(std::move(genome), founder.commonName);
                    placeInRegion(organism, gx, gy);
                    organism.setEnergy(100.0);
                    population_.push_back(std::move(organism));
                }
            }
        }

        /// @brief Avance la simulation d'une génération réelle : mouvement,
        /// métabolisme + interactions écologiques régionales, reproduction
        /// contrainte biologiquement, vérification de spéciation par
        /// divergence mesurée, extinction.
        void step()
        {
            ++generation_;
            updateFood();
            moveOrganisms();
            applySurvivalAndInteractions();
            removeDead();
            reproduce();
            checkSpeciation();
            checkExtinction();

            if (generation_ % params_.brainEvolutionInterval == 0)
                evolveBrains();
            if (generation_ % params_.convergenceCheckInterval == 0)
                checkConvergence();
            if (generation_ % historyInterval_ == 0)
                recordHistory();
        }

        uint32_t getGeneration() const { return generation_; }
        size_t getPopulationCount() const { return population_.size(); }
        const Spatial::RegionGrid &getGrid() const { return grid_; }
        uint32_t getSeed() const { return seed_; }
        const WorldSimulationParameters &getParams() const { return params_; }

        /// @brief Sérialisation complète pour sauvegarde/reprise (voir
        /// SimulationSerialization.hpp, qui inclut nlohmann/json.hpp --
        /// délibérément pas inclus ici : ce fichier et les autres headers
        /// de simulation ne dépendent pas de nlohmann/json, seul le daemon
        /// et ce module de sérialisation le font). Le type de retour/
        /// paramètre n'a besoin que d'une déclaration avancée ici
        /// (<nlohmann/json_fwd.hpp>, incluse plus bas) ; la définition
        /// complète vit dans SimulationSerialization.hpp qui, lui, inclut
        /// la vraie bibliothèque.
        nlohmann::json toJson() const;
        /// @brief Retourne un pointeur (pas un objet par valeur) : évite de
        /// dépendre de la mutabilité/déplaçabilité de la classe entière, et
        /// correspond exactement à comment le daemon la stocke déjà
        /// (`ManagedSimulation::sim`, un `unique_ptr`).
        static std::unique_ptr<UnifiedWorldSimulator> fromJson(const nlohmann::json &j);

        /// @brief Unités continues par case de grille : le facteur dont un
        /// consommateur externe (le daemon, un frontend) a besoin pour
        /// replacer une position d'individu (continue) sur la grille de
        /// régions (discrète) sans dupliquer cette constante.
        double getCellSize() const { return params_.cellSize; }
        const std::vector<SpeciationEvent> &getSpeciationEvents() const { return speciationEvents_; }
        const std::vector<ExtinctionEvent> &getExtinctionEvents() const { return extinctionEvents_; }
        const std::vector<HistorySample> &getHistory() const { return history_; }
        /// @brief Historique des signaux de convergence évolutive candidats
        /// détectés jusqu'ici (Chantier G2) -- voir ConvergenceSignal pour
        /// ce qu'un signal représente réellement et ne représente pas.
        const std::vector<ConvergenceSignal> &getConvergenceSignals() const { return convergenceSignals_; }
        const LifeEventCounters &getLifeEventCounters() const { return lifeEvents_; }

        /// @brief Un instantané par espèce vivante, calculé depuis les
        /// individus réels (jamais un tirage aléatoire).
        std::vector<LineageSnapshot> getLineageSnapshots() const
        {
            return buildSnapshots();
        }

        bool hasBrain(const std::string &species) const { return brains_.find(species) != brains_.end(); }

        /// @brief Nombre de nœuds + connexions du cerveau stable d'une
        /// lignée, utile pour vérifier qu'une mutation structurelle
        /// (addNode/addConnection) a bien eu lieu au fil des générations.
        size_t getBrainComplexity(const std::string &species) const
        {
            auto it = brains_.find(species);
            return it != brains_.end() ? it->second.stableBrain.getComplexity() : 0;
        }

        /// @brief Un instantané par case de la carte, avec le compte réel
        /// d'individus vivants dedans à cet instant, pour dessiner une
        /// vraie carte de régions plutôt qu'un seul environnement global.
        std::vector<RegionSnapshot> getRegionSnapshots() const
        {
            auto counts = populationCountsByRegion();

            std::vector<RegionSnapshot> result;
            result.reserve(static_cast<size_t>(grid_.getWidth()) * grid_.getHeight());
            for (int y = 0; y < grid_.getHeight(); ++y)
            {
                for (int x = 0; x < grid_.getWidth(); ++x)
                {
                    const auto &cell = grid_.at(x, y);
                    RegionSnapshot snap;
                    snap.gridX = x;
                    snap.gridY = y;
                    snap.environmentType = cell.environmentType;
                    const auto *env = environments_.getEnvironment(cell.environmentType);
                    if (env)
                    {
                        snap.environmentName = env->name;
                        snap.temperature = env->climate.temperature;
                        snap.primaryProducers = env->resources.primaryProducers;
                        snap.predationPressure = env->pressures.predationPressure;
                        snap.competitionIntensity = env->pressures.competitionIntensity;
                        snap.climaticStress = env->pressures.climaticStress;
                    }
                    auto it = counts.find(regionKey(x, y));
                    snap.population = (it != counts.end()) ? it->second : 0;
                    if (!plants_.empty())
                    {
                        const size_t cellIndex = static_cast<size_t>(y) * grid_.getWidth() + x;
                        const double capacity = plantCapacity(x, y);
                        snap.plants = capacity > 0.0 ? plants_[cellIndex] / capacity : 0.0;
                        snap.carrion = carrion_[cellIndex];
                    }
                    result.push_back(std::move(snap));
                }
            }
            return result;
        }

        /// @brief Un instantané par individu vivant réel, position,
        /// espèce, énergie, âge, et une projection visuelle réelle de son
        /// génome, pour un frontend qui veut afficher chaque organisme sur
        /// la carte plutôt qu'un agrégat par espèce.
        std::vector<IndividualSnapshot> getIndividualSnapshots() const
        {
            std::vector<IndividualSnapshot> result;
            result.reserve(population_.size());
            for (const auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;
                IndividualSnapshot snap;
                snap.id = organism.getId();
                snap.species = organism.getSpecies();
                snap.x = organism.getX();
                snap.y = organism.getY();
                snap.energy = organism.getEnergy();
                snap.age = organism.getAge();

                auto typeIt = biologicalTypeOf_.find(organism.getSpecies());
                snap.biologicalType = (typeIt != biologicalTypeOf_.end()) ? typeIt->second : Taxonomy::BiologicalType::BIRD;

                const auto &genome = organism.getGenome();
                double speedNorm = normalizeTrait(Genetics::TraitType::SPEED, genome.getTrait(Genetics::TraitType::SPEED));
                snap.sizeScale = normalizeTrait(Genetics::TraitType::SIZE, genome.getTrait(Genetics::TraitType::SIZE));
                snap.resistance = normalizeTrait(Genetics::TraitType::RESISTANCE, genome.getTrait(Genetics::TraitType::RESISTANCE));
                snap.insulation = genome.getTrait(Genetics::TraitType::INSULATION);
                snap.diet = genome.getTrait(Genetics::TraitType::DIET);
                // Élongation : un organisme relativement plus rapide que
                // grand paraît fuselé (proche de 1), l'inverse trapu (proche
                // de 0) -- un ratio dérivé plutôt qu'exposer SPEED comme son
                // propre canal visuel indépendant.
                snap.elongation = std::clamp(0.5 + (speedNorm - snap.sizeScale) * 0.5, 0.0, 1.0);
                snap.camouflage = std::clamp(genome.getTrait(Genetics::TraitType::CAMOUFLAGE), 0.0, 1.0);
                snap.ornamentTier = static_cast<uint8_t>(std::clamp(
                    static_cast<int>(normalizeTrait(Genetics::TraitType::AGGRESSION, genome.getTrait(Genetics::TraitType::AGGRESSION)) * 4.0),
                    0, 3));
                snap.sensoryProminence = std::clamp(
                    (normalizeTrait(Genetics::TraitType::VISION_RANGE, genome.getTrait(Genetics::TraitType::VISION_RANGE)) +
                     normalizeTrait(Genetics::TraitType::HEARING_ACUITY, genome.getTrait(Genetics::TraitType::HEARING_ACUITY))) *
                        0.5,
                    0.0, 1.0);
                snap.patternTier = static_cast<uint8_t>(std::clamp(
                    static_cast<int>(normalizeTrait(Genetics::TraitType::SOCIAL_BEHAVIOR, genome.getTrait(Genetics::TraitType::SOCIAL_BEHAVIOR)) * 5.0),
                    0, 4));

                result.push_back(std::move(snap));
            }
            return result;
        }

    private:
        WorldSimulationParameters params_;
        Spatial::RegionGrid grid_;
        Environment::SerinaEnvironmentManager environments_;
        /// Graine d'origine, retenue pour permettre à toJson() de la
        /// sauvegarder -- grid_/environments_ n'ont pas besoin d'être
        /// sérialisés eux-mêmes : ils sont reconstruits à l'identique par
        /// le constructeur à partir de (params_, seed_) (voir
        /// SimulationSerialization.hpp).
        uint32_t seed_;
        Taxonomy::EcosystemTaxonomy taxonomy_;
        Evolution::SerinaEvolutionaryConstraints constraints_;

        std::vector<Evolution::Organism> population_;
        std::map<std::string, Taxonomy::BiologicalType> biologicalTypeOf_;
        std::map<std::string, uint32_t> divergentStreak_; ///< par espèce
        std::map<std::string, uint32_t> nicheStreak_;     ///< par espèce
        std::map<std::string, LineageBrain> brains_;      ///< un cerveau NEAT par espèce vivante
        std::vector<SpeciationEvent> speciationEvents_;
        std::vector<ExtinctionEvent> extinctionEvents_;
        std::set<uint64_t> killedThisTick_;
        std::vector<double> plants_;  ///< biomasse végétale par case
        std::vector<double> carrion_; ///< énergie des cadavres par case
        /// Énergie que contient un corps par unité de taille.
        static constexpr double BODY_ENERGY_PER_SIZE = 30.0;
        std::map<std::string, uint32_t> lastCounts_; ///< effectifs du tick précédent
        std::vector<HistorySample> history_;
        uint32_t historyInterval_ = 20; ///< ticks entre deux points, double quand l'historique est plein

        /// @brief Sorties complètes du cerveau de chaque individu vivant
        /// pour LA génération courante (Chantier G1) -- vidé et repeuplé à
        /// chaque appel de moveOrganisms(), jamais accumulé d'une
        /// génération à l'autre (mémoire bornée par la population vivante,
        /// pas par l'historique). Indexé par id d'organisme (stable à
        /// travers removeDead(), contrairement à un index dans population_)
        /// pour être relu plus tard dans le même step() par
        /// applySurvivalAndInteractions() (chasse, évasion, effort de
        /// recherche de nourriture).
        std::unordered_map<uint64_t, std::vector<double>> latestBrainOutputs_;

        /// @brief Dernier échantillon (traitDistance, geneticDistance) connu
        /// pour chaque paire de lignées éligible (Chantier G2), indexé par
        /// une clé canonique "speciesA|speciesB" (ordre alphabétique, une
        /// seule entrée par paire non ordonnée). Persiste d'une vérification
        /// à l'autre -- c'est justement la comparaison à la mesure
        /// PRÉCÉDENTE qui permet de détecter une tendance, pas un seul
        /// instantané isolé.
        std::map<std::string, Ecology::ConvergenceSample> lastConvergenceSample_;
        /// @brief Historique réel des signaux de convergence détectés --
        /// jamais purgé, comme speciationEvents_ : un fait mesuré une fois
        /// reste un fait, même si la paire cesse ensuite de converger.
        std::vector<ConvergenceSignal> convergenceSignals_;
        LifeEventCounters lifeEvents_;

        /// @brief Pression écologique réelle mesurée à la dernière
        /// génération pour chaque espèce (Chantier F) -- rempli une fois
        /// par applySurvivalAndInteractions(), lu par buildSnapshots() pour
        /// journaliser des adaptations honnêtes (jamais une liste
        /// inventée : uniquement si une pression réelle a été détectée
        /// cette génération même).
        struct EcologicalPressureSummary
        {
            bool isPreyOfSomeone = false;
            bool isInCompetition = false;
        };
        std::map<std::string, EcologicalPressureSummary> ecologicalPressure_;

        uint32_t generation_ = 0;
        mutable std::mt19937 rng_;

        double worldWidth() const { return params_.gridWidth * params_.cellSize; }
        double worldHeight() const { return params_.gridHeight * params_.cellSize; }

        /// @brief Ramène une valeur réelle de trait (bornée par
        /// Genetics::TRAIT_BOUNDS, pas [0,1]) à [0,1] -- utilisé pour
        /// projeter des traits génétiques réels vers des canaux visuels
        /// comparables entre eux (voir IndividualSnapshot).
        static double normalizeTrait(Genetics::TraitType type, double realValue)
        {
            const auto &bounds = Genetics::TRAIT_BOUNDS[static_cast<size_t>(type)];
            if (bounds.max <= bounds.min)
                return 0.5;
            return std::clamp((realValue - bounds.min) / (bounds.max - bounds.min), 0.0, 1.0);
        }

        Habitat::Suitability habitatOf(const std::string &species, int gx, int gy) const
        {
            auto type = biologicalTypeOf_.find(species);
            if (type == biologicalTypeOf_.end())
                return {};
            return Habitat::suitabilityOf(type->second, grid_.at(gx, gy).environmentType);
        }

        /// @brief Les cases les plus favorables à un groupe, pour un fondateur dont le
        /// biome préféré manque sur cette carte. Vide si aucune n'est habitable.
        std::vector<std::pair<int, int>> bestHabitatRegions(Taxonomy::BiologicalType group) const
        {
            std::vector<std::pair<int, int>> best;
            double bestForaging = 0.0;
            for (int y = 0; y < grid_.getHeight(); ++y)
            {
                for (int x = 0; x < grid_.getWidth(); ++x)
                {
                    auto suitability = Habitat::suitabilityOf(group, grid_.at(x, y).environmentType);
                    if (!suitability.passable || suitability.foraging <= 0.0 || suitability.foraging < bestForaging)
                        continue;
                    if (suitability.foraging > bestForaging)
                        best.clear();
                    bestForaging = suitability.foraging;
                    best.emplace_back(x, y);
                }
            }
            return best;
        }

        std::pair<int, int> regionOf(const Evolution::Organism &o) const
        {
            return grid_.positionToGrid(o.getX(), o.getY(), worldWidth(), worldHeight());
        }

        void placeInRegion(Evolution::Organism &organism, int gx, int gy)
        {
            Det::UniformReal jitter(0.0, params_.cellSize);
            organism.setPosition(gx * params_.cellSize + jitter(rng_), gy * params_.cellSize + jitter(rng_));
        }

        /// @brief Déplace chaque organisme selon la décision de sa lignée :
        /// le cerveau NEAT de son espèce évalue son environnement local
        /// (énergie, ressources alentour, pression de prédation, présence
        /// et agressivité perçue d'autres espèces à proximité -- Chantier
        /// G1) et sort une direction plus trois efforts personnels (chasse,
        /// évasion, recherche de nourriture) consommés plus tard dans le
        /// même step() par applySurvivalAndInteractions(). Un individu sans
        /// cerveau enregistré (ne devrait pas arriver hors tests unitaires
        /// isolés) se rabat sur une marche aléatoire et des efforts neutres
        /// plutôt que de planter.
        void moveOrganisms()
        {
            // Indices des voisins dans buildBrainInputs().
            static constexpr size_t INPUT_NORTH = 2, INPUT_SOUTH = 3, INPUT_EAST = 4, INPUT_WEST = 5;

            Det::UniformReal fallback(-params_.cellSize * 0.5, params_.cellSize * 0.5);
            latestBrainOutputs_.clear();
            Det::UniformReal unitNoise(-1.0, 1.0);

            // --- Agrégats réels par région pour les nouvelles entrées
            // sensorielles (présence/agressivité perçue d'autres espèces) --
            // un passage de plus sur population_, même ordre de complexité
            // que le reste du moteur (voir Chantier F pour le même patron). ---
            struct RegionAggregate
            {
                uint32_t totalAlive = 0;
                double totalAggression = 0.0;
            };
            struct RegionSpeciesAggregate
            {
                uint32_t count = 0;
                double aggressionSum = 0.0;
            };
            std::map<long long, RegionAggregate> regionTotals;
            std::map<long long, std::map<std::string, RegionSpeciesAggregate>> regionSpeciesTotals;

            for (const auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;
                auto [gx, gy] = regionOf(organism);
                long long region = regionKey(gx, gy);
                double aggression = normalizeTrait(Genetics::TraitType::AGGRESSION, organism.getGenome().getTrait(Genetics::TraitType::AGGRESSION));
                auto &total = regionTotals[region];
                total.totalAlive++;
                total.totalAggression += aggression;
                auto &speciesAgg = regionSpeciesTotals[region][organism.getSpecies()];
                speciesAgg.count++;
                speciesAgg.aggressionSum += aggression;
            }

            for (auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;

                double dx, dy;
                auto brainIt = brains_.find(organism.getSpecies());
                if (brainIt != brains_.end())
                {
                    auto [gx, gy] = regionOf(organism);
                    long long region = regionKey(gx, gy);
                    const auto &total = regionTotals.at(region);           // cet organisme y a déjà contribué
                    const auto &ownSpeciesAgg = regionSpeciesTotals.at(region).at(organism.getSpecies());
                    uint32_t otherCount = total.totalAlive - ownSpeciesAgg.count;
                    double otherAggressionSum = total.totalAggression - ownSpeciesAgg.aggressionSum;
                    double perceivedAggression = otherCount > 0 ? otherAggressionSum / otherCount : 0.0;
                    double otherSpeciesDensity = Ecology::densitySaturation(otherCount, 10.0);

                    bool recentPredationPressure = false;
                    auto pressureIt = ecologicalPressure_.find(organism.getSpecies());
                    if (pressureIt != ecologicalPressure_.end())
                        recentPredationPressure = pressureIt->second.isPreyOfSomeone;

                    auto inputs = buildBrainInputs(organism, otherSpeciesDensity, perceivedAggression, recentPredationPressure);
                    auto outputs = brainIt->second.brain.evaluate(inputs);
                    latestBrainOutputs_[organism.getId()] = outputs;

                    // Les neurones de sortie de NEATGenome utilisent
                    // l'activation SIGMOID par défaut (image [0,1]). Les trois
                    // autres sorties (chasse, évasion, recherche de nourriture)
                    // restent en [0,1] natif -- ce sont déjà des efforts/probabilités.
                    //
                    // La direction est la différence entre la réponse du cerveau
                    // à ses entrées et sa réponse aux mêmes entrées avec les
                    // voisins échangés (N/S, E/O). Sans cela, ses sorties saturées
                    // donnaient une direction presque constante et toute une lignée
                    // dérivait vers un mur (93 % des individus collés au bord). Un
                    // milieu uniforme ne pousse ainsi dans aucune direction, par
                    // construction : seul un vrai écart entre voisins oriente.
                    double moveX = 0.0;
                    double moveY = 0.0;
                    if (inputs[INPUT_NORTH] != inputs[INPUT_SOUTH] || inputs[INPUT_EAST] != inputs[INPUT_WEST])
                    {
                        auto mirrored = inputs;
                        std::swap(mirrored[INPUT_NORTH], mirrored[INPUT_SOUTH]);
                        std::swap(mirrored[INPUT_EAST], mirrored[INPUT_WEST]);
                        const auto mirroredOutputs = brainIt->second.brain.evaluate(mirrored);
                        moveX = outputs[WorldSimulationParameters::OUTPUT_MOVE_X] - mirroredOutputs[WorldSimulationParameters::OUTPUT_MOVE_X];
                        moveY = outputs[WorldSimulationParameters::OUTPUT_MOVE_Y] - mirroredOutputs[WorldSimulationParameters::OUTPUT_MOVE_Y];
                    }
                    double speed = organism.getGenome().getTrait(Genetics::TraitType::SPEED);
                    if (params_.movementNoise > 0.0)
                    {
                        moveX = (1.0 - params_.movementNoise) * moveX + params_.movementNoise * unitNoise(rng_);
                        moveY = (1.0 - params_.movementNoise) * moveY + params_.movementNoise * unitNoise(rng_);
                    }
                    dx = moveX * params_.cellSize * speed * params_.movementScale;
                    dy = moveY * params_.cellSize * speed * params_.movementScale;
                }
                else
                {
                    dx = fallback(rng_) * params_.movementScale;
                    dy = fallback(rng_) * params_.movementScale;
                    // Valeurs neutres/sûres pour un individu sans cerveau :
                    // ni bonus ni pénalité de chasse/évasion/alimentation.
                    latestBrainOutputs_[organism.getId()] = {0.5, 0.5, 1.0, 1.0, 1.0};
                }

                double nx = organism.getX() + dx;
                double ny = organism.getY() + dy;
                if (params_.reflectAtBorders)
                {
                    if (nx < 0.0) nx = -nx;
                    if (ny < 0.0) ny = -ny;
                    if (nx >= worldWidth()) nx = 2.0 * worldWidth() - nx;
                    if (ny >= worldHeight()) ny = 2.0 * worldHeight() - ny;
                }
                nx = std::clamp(nx, 0.0, worldWidth() - 1e-6);
                ny = std::clamp(ny, 0.0, worldHeight() - 1e-6);

                // Une case interdite arrête le déplacement : l'individu reste sur place
                // et la dispersion aléatoire le fera repartir ailleurs.
                auto [targetX, targetY] = grid_.positionToGrid(nx, ny, worldWidth(), worldHeight());
                if (!habitatOf(organism.getSpecies(), targetX, targetY).passable)
                {
                    nx = organism.getX();
                    ny = organism.getY();
                    dx = 0.0;
                    dy = 0.0;
                }
                organism.setPosition(nx, ny);

                if (params_.movementCost > 0.0)
                {
                    double size = organism.getGenome().getTrait(Genetics::TraitType::SIZE);
                    auto group = biologicalTypeOf_.find(organism.getSpecies());
                    const double locomotion = group != biologicalTypeOf_.end() ? Habitat::locomotionCostFactor(group->second) : 1.0;
                    organism.setEnergy(organism.getEnergy() - params_.movementCost * locomotion * size * std::sqrt(dx * dx + dy * dy));
                }
            }
        }

        /// @brief Construit les entrées sensorielles d'un organisme pour
        /// son cerveau de lignée : énergie propre, ressources locales et
        /// des quatre régions voisines, pression de prédation locale
        /// (entrées historiques) plus trois entrées réelles ajoutées au
        /// Chantier G1 -- densité d'individus d'AUTRES espèces à proximité,
        /// leur agressivité moyenne perçue, et si cette espèce a été proie
        /// de quelqu'un quelque part dans le monde à LA GÉNÉRATION
        /// PRÉCÉDENTE (ecologicalPressure_, mesuré, jamais un signal
        /// inventé). Toutes normalisées dans [0,1].
        std::vector<double> buildBrainInputs(const Evolution::Organism &organism, double otherSpeciesDensity,
                                              double perceivedAggression, bool recentPredationPressure) const
        {
            auto [gx, gy] = regionOf(organism);
            const auto *localEnv = environments_.getEnvironment(grid_.at(gx, gy).environmentType);
            double localResource = (localEnv ? localEnv->resources.primaryProducers : 0.5) * habitatOf(organism.getSpecies(), gx, gy).foraging;
            double localPredation = localEnv ? localEnv->pressures.predationPressure : 0.3;

            // N, S, E, W, retombe sur la ressource locale (gradient nul)
            // si la région est en bord de carte.
            std::array<double, 4> neighborResources = {localResource, localResource, localResource, localResource};
            const std::array<std::pair<int, int>, 4> offsets = {{{0, -1}, {0, 1}, {1, 0}, {-1, 0}}};
            for (size_t i = 0; i < offsets.size(); ++i)
            {
                int nx = gx + offsets[i].first;
                int ny = gy + offsets[i].second;
                if (nx < 0 || nx >= grid_.getWidth() || ny < 0 || ny >= grid_.getHeight())
                    continue;
                const auto *neighborEnv = environments_.getEnvironment(grid_.at(nx, ny).environmentType);
                if (neighborEnv)
                    neighborResources[i] = neighborEnv->resources.primaryProducers * habitatOf(organism.getSpecies(), nx, ny).foraging;
            }

            return {
                std::clamp(organism.getEnergy() / 200.0, 0.0, 1.0),
                localResource,
                neighborResources[0], neighborResources[1], neighborResources[2], neighborResources[3],
                localPredation,
                otherSpeciesDensity,
                perceivedAggression,
                recentPredationPressure ? 1.0 : 0.0};
        }

        /// @brief Profil de traits réel moyen par (région, espèce), avec les
        /// index des individus vivants qui le composent -- construit une
        /// seule fois par génération, jamais recalculé par paire
        /// d'organismes (voir applySurvivalAndInteractions()).
        struct RegionSpeciesEntry
        {
            Ecology::RegionalSpeciesProfile profile;
            std::vector<size_t> individualIndices;
        };

        /// @brief Point d'entrée du réalisme écologique (Chantier F) :
        /// agrège les vrais profils de traits par (région, espèce), classe
        /// chaque paire d'espèces cohabitantes une seule fois par région
        /// (jamais par individu), puis applique le métabolisme, une
        /// alimentation réelle éventuellement pénalisée par compétition, et
        /// une prédation à somme nulle tirée au sort par individu prédateur.
        void applySurvivalAndInteractions()
        {
            // --- Passe 1 : profil de traits réel moyen par (région, espèce) ---
            std::map<long long, std::map<std::string, RegionSpeciesEntry>> regionSpecies;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                const auto &organism = population_[i];
                if (!organism.isAlive())
                    continue;
                auto [gx, gy] = regionOf(organism);
                auto &entry = regionSpecies[regionKey(gx, gy)][organism.getSpecies()];
                entry.individualIndices.push_back(i);
                const auto &genome = organism.getGenome();
                entry.profile.population++;
                entry.profile.avgSize += normalizeTrait(Genetics::TraitType::SIZE, genome.getTrait(Genetics::TraitType::SIZE));
                entry.profile.avgAggression += normalizeTrait(Genetics::TraitType::AGGRESSION, genome.getTrait(Genetics::TraitType::AGGRESSION));
                entry.profile.avgVision += normalizeTrait(Genetics::TraitType::VISION_RANGE, genome.getTrait(Genetics::TraitType::VISION_RANGE));
                entry.profile.avgSpeed += normalizeTrait(Genetics::TraitType::SPEED, genome.getTrait(Genetics::TraitType::SPEED));
                entry.profile.avgResistance += normalizeTrait(Genetics::TraitType::RESISTANCE, genome.getTrait(Genetics::TraitType::RESISTANCE));
            }
            for (auto &[region, bySpecies] : regionSpecies)
            {
                for (auto &[species, entry] : bySpecies)
                {
                    double n = static_cast<double>(entry.profile.population);
                    entry.profile.avgSize /= n;
                    entry.profile.avgAggression /= n;
                    entry.profile.avgVision /= n;
                    entry.profile.avgSpeed /= n;
                    entry.profile.avgResistance /= n;
                }
            }

            // --- Classe chaque paire d'espèces cohabitant une région, UNE
            // SEULE FOIS par région (jamais par individu) ---
            struct RegionRelation
            {
                std::string speciesA;
                std::string speciesB;
                Ecology::RelationClassification classification;
            };
            std::map<long long, std::vector<RegionRelation>> regionRelations;
            std::map<std::string, EcologicalPressureSummary> pressureThisGeneration;

            for (auto &[region, bySpecies] : regionSpecies)
            {
                std::vector<std::string> names;
                names.reserve(bySpecies.size());
                for (auto &[species, entry] : bySpecies)
                    names.push_back(species);

                auto &relations = regionRelations[region];
                for (size_t i = 0; i < names.size(); ++i)
                {
                    for (size_t j = i + 1; j < names.size(); ++j)
                    {
                        auto classification = Ecology::classifyRelation(bySpecies[names[i]].profile, bySpecies[names[j]].profile);
                        if (classification.relation == Ecology::EcologicalRelation::NEUTRAL)
                            continue;
                        relations.push_back({names[i], names[j], classification});

                        if (classification.relation == Ecology::EcologicalRelation::COMPETITION)
                        {
                            pressureThisGeneration[names[i]].isInCompetition = true;
                            pressureThisGeneration[names[j]].isInCompetition = true;
                        }
                        else if (classification.relation == Ecology::EcologicalRelation::A_PREYS_ON_B)
                        {
                            pressureThisGeneration[names[j]].isPreyOfSomeone = true;
                        }
                        else if (classification.relation == Ecology::EcologicalRelation::B_PREYS_ON_A)
                        {
                            pressureThisGeneration[names[i]].isPreyOfSomeone = true;
                        }
                    }
                }
            }
            ecologicalPressure_ = std::move(pressureThisGeneration);

            // --- Passe 2 : métabolisme + alimentation (pénalisée par
            // compétition réelle, jamais un canal de drain séparé) ---
            for (auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;

                organism.update(1.0); // métabolisme, âge, logique existante d'Organism

                auto [gx, gy] = regionOf(organism);
                long long region = regionKey(gx, gy);
                auto environmentType = grid_.at(gx, gy).environmentType;

                const auto *localEnv = environments_.getEnvironment(environmentType);
                double resourceLevel = localEnv ? localEnv->resources.primaryProducers : 0.5;
                double efficiency = organism.getGenome().getTrait(Genetics::TraitType::ENERGY_EFFICIENCY);
                double foragingIncome = resourceLevel * efficiency * params_.foragingRate * habitatOf(organism.getSpecies(), gx, gy).foraging;

                if (params_.climateCostRate > 0.0 && localEnv)
                {
                    double mismatch = normalizeTrait(Genetics::TraitType::RESISTANCE, organism.getGenome().getTrait(Genetics::TraitType::RESISTANCE)) -
                                      localEnv->pressures.climaticStress;
                    organism.setEnergy(organism.getEnergy() - params_.climateCostRate * mismatch * mismatch);
                }

                if (params_.thermalCostRate > 0.0 && localEnv)
                {
                    double gap = organism.getGenome().getTrait(Genetics::TraitType::INSULATION) - Habitat::idealInsulation(localEnv->climate.temperature);
                    organism.setEnergy(organism.getEnergy() - params_.thermalCostRate * gap * gap);
                }

                if (params_.sizeCostRate > 0.0)
                {
                    double size = normalizeTrait(Genetics::TraitType::SIZE, organism.getGenome().getTrait(Genetics::TraitType::SIZE));
                    organism.setEnergy(organism.getEnergy() - params_.sizeCostRate * size);
                }

                // Régulation par la densité : la case ne peut nourrir qu'un
                // nombre borné d'individus (voir carryingCapacityPerResource).
                uint32_t localPopulation = 0;
                for (const auto &[speciesName, entry] : regionSpecies[region])
                    localPopulation += entry.profile.population;
                double capacity = std::max(1.0, params_.carryingCapacityPerResource * resourceLevel);
                foragingIncome *= std::clamp(1.0 - static_cast<double>(localPopulation) / capacity, 0.0, 1.0);

                // Effort de recherche de nourriture décidé par le cerveau
                // (Chantier G1) : jamais en dessous du plancher de sécurité
                // MIN_FORAGE_EFFORT_FLOOR, quel que soit l'effort choisi --
                // un canal existant module son intensité, ce n'est jamais
                // un second canal de revenu indépendant.
                double forageEffort = 1.0;
                auto brainOutputsIt = latestBrainOutputs_.find(organism.getId());
                if (brainOutputsIt != latestBrainOutputs_.end() && brainOutputsIt->second.size() > WorldSimulationParameters::OUTPUT_FORAGE_EFFORT)
                    forageEffort = brainOutputsIt->second[WorldSimulationParameters::OUTPUT_FORAGE_EFFORT];
                foragingIncome *= (WorldSimulationParameters::MIN_FORAGE_EFFORT_FLOOR +
                                    (1.0 - WorldSimulationParameters::MIN_FORAGE_EFFORT_FLOOR) * forageEffort);

                auto relIt = regionRelations.find(region);
                if (relIt != regionRelations.end())
                {
                    const auto &speciesHere = regionSpecies[region];
                    for (const auto &rel : relIt->second)
                    {
                        if (rel.classification.relation != Ecology::EcologicalRelation::COMPETITION)
                            continue;
                        if (organism.getSpecies() != rel.speciesA && organism.getSpecies() != rel.speciesB)
                            continue;
                        const std::string &rival = (organism.getSpecies() == rel.speciesA) ? rel.speciesB : rel.speciesA;
                        auto rivalIt = speciesHere.find(rival);
                        uint32_t rivalPopulation = (rivalIt != speciesHere.end()) ? rivalIt->second.profile.population : 0;
                        double penalty = Ecology::competitionForagingPenalty(rel.classification.dominanceGap, rivalPopulation);
                        foragingIncome *= (1.0 - penalty);
                    }
                }

                // La nourriture existe vraiment : ce qui est mangé manque aux suivants. Le
                // régime partage l'effort entre plantes et cadavres, sans en faire deux gratuits.
                if (foragingIncome > 0.0)
                {
                    ensureFood();
                    const size_t cell = static_cast<size_t>(gy) * grid_.getWidth() + gx;
                    const double diet = organism.getGenome().getTrait(Genetics::TraitType::DIET);
                    const double plantStock = plants_[cell];
                    const double plantHalf = params_.plantHalfSaturation * std::max(plantCapacity(gx, gy), 1.0);
                    const double plantResponse = plantStock * (1.0 + params_.plantHalfSaturation) / std::max(plantStock + plantHalf, 1e-9);
                    const double carrionResponse = carrion_[cell] / std::max(carrion_[cell] + params_.carrionHalfSaturation, 1e-9);
                    const double fromPlants = std::min(plantStock, foragingIncome * dietEfficiency(1.0 - diet) * plantResponse);
                    const double fromCarrion = std::min(carrion_[cell], foragingIncome * dietEfficiency(diet) * carrionResponse);
                    plants_[cell] -= fromPlants;
                    carrion_[cell] -= fromCarrion;
                    organism.setEnergy(organism.getEnergy() + fromPlants + fromCarrion);
                }
            }

            // --- Passe 3 : chasse, décidée par chaque individu selon son propre régime et ses
            // propres traits. Un carnivore rare trouve des proies, un carnivore trop commun
            // les épuise : c'est ce qui peut ouvrir et fermer la niche.
            Det::UniformReal roll(0.0, 1.0);
            for (auto &[region, bySpecies] : regionSpecies)
            {
                std::vector<size_t> everyone;
                for (const auto &[name, entry] : bySpecies)
                    everyone.insert(everyone.end(), entry.individualIndices.begin(), entry.individualIndices.end());
                if (everyone.size() < 2)
                    continue;
                Det::UniformInt<size_t> pick(0, everyone.size() - 1);

                for (size_t predatorIdx : everyone)
                {
                    auto &predator = population_[predatorIdx];
                    if (!predator.isAlive() || predator.getEnergy() >= params_.huntSatiety)
                        continue;
                    const double diet = predator.getGenome().getTrait(Genetics::TraitType::DIET);
                    double huntEffort = 1.0;
                    auto outputs = latestBrainOutputs_.find(predator.getId());
                    if (outputs != latestBrainOutputs_.end() && outputs->second.size() > WorldSimulationParameters::OUTPUT_HUNT_EFFORT)
                        huntEffort = outputs->second[WorldSimulationParameters::OUTPUT_HUNT_EFFORT];
                    const double chance = params_.huntRate * diet * (0.5 + 0.5 * huntEffort) * Ecology::densitySaturation(static_cast<uint32_t>(everyone.size() - 1));
                    if (chance <= 0.0 || roll(rng_) >= chance)
                        continue;

                    auto &prey = population_[everyone[pick(rng_)]];
                    if (!prey.isAlive())
                        continue; // rencontre manquée
                    if (prey.getSpecies() == predator.getSpecies() && diet - prey.getGenome().getTrait(Genetics::TraitType::DIET) < params_.preyDietGap)
                        continue; // un semblable, pas une proie

                    const auto trait = [](const Evolution::Organism &o, Genetics::TraitType type) { return normalizeTrait(type, o.getGenome().getTrait(type)); };
                    const double attack = 0.45 * trait(predator, Genetics::TraitType::AGGRESSION) + 0.30 * trait(predator, Genetics::TraitType::SIZE) + 0.25 * trait(predator, Genetics::TraitType::VISION_RANGE);
                    const double defense = std::max(trait(prey, Genetics::TraitType::SPEED), trait(prey, Genetics::TraitType::RESISTANCE));
                    double evasion = 0.0;
                    auto preyOutputs = latestBrainOutputs_.find(prey.getId());
                    if (preyOutputs != latestBrainOutputs_.end() && preyOutputs->second.size() > WorldSimulationParameters::OUTPUT_EVASION_EFFORT)
                        evasion = preyOutputs->second[WorldSimulationParameters::OUTPUT_EVASION_EFFORT] * WorldSimulationParameters::MAX_PERSONAL_EVASION_CHANCE;
                    const double success = std::clamp(0.5 + attack - defense, 0.05, 0.95) * (1.0 - evasion);
                    if (roll(rng_) >= success)
                        continue;

                    // Le prédateur mange le corps : réserves de la proie, et chair selon sa taille.
                    lifeEvents_.predationKills++;
                    lifeEvents_.predationTransfers++;
                    const double body = BODY_ENERGY_PER_SIZE * prey.getGenome().getTrait(Genetics::TraitType::SIZE);
                    predator.setEnergy(predator.getEnergy() + (prey.getEnergy() + body) * 0.5);
                    killedThisTick_.insert(prey.getId());
                    prey.setAlive(false);
                }
            }
        }

        /// @brief Rendement d'un régime pour la part donnée : le généraliste paie son manque de spécialisation.
        double dietEfficiency(double share) const
        {
            return (1.0 - params_.dietSpecialization) * share + params_.dietSpecialization * share * share;
        }

        double plantCapacity(int gx, int gy) const
        {
            const auto *env = environments_.getEnvironment(grid_.at(gx, gy).environmentType);
            return params_.plantCapacityPerResource * (env ? env->resources.primaryProducers : 0.5);
        }

        /// @brief Première utilisation : les plantes couvrent toute leur capacité.
        void ensureFood()
        {
            if (!plants_.empty())
                return;
            const size_t cells = static_cast<size_t>(grid_.getWidth()) * grid_.getHeight();
            plants_.resize(cells);
            carrion_.assign(cells, 0.0);
            for (int y = 0; y < grid_.getHeight(); ++y)
                for (int x = 0; x < grid_.getWidth(); ++x)
                    plants_[static_cast<size_t>(y) * grid_.getWidth() + x] = plantCapacity(x, y);
        }

        /// @brief Les plantes repoussent, les cadavres se décomposent et nourrissent le sol.
        void updateFood()
        {
            ensureFood();
            for (int y = 0; y < grid_.getHeight(); ++y)
            {
                for (int x = 0; x < grid_.getWidth(); ++x)
                {
                    const size_t cell = static_cast<size_t>(y) * grid_.getWidth() + x;
                    const double capacity = plantCapacity(x, y);
                    const double decayed = carrion_[cell] * params_.carrionDecayRate;
                    carrion_[cell] -= decayed;
                    double &plants = plants_[cell];
                    // Un minimum de repousse : une case rasée n'est jamais perdue pour toujours.
                    const double growth = params_.plantGrowthRate * std::max(plants, capacity * 0.02) * (1.0 - plants / std::max(capacity, 1.0));
                    plants = std::min(capacity, plants + std::max(0.0, growth) + decayed * 0.5);
                }
            }
        }

        void removeDead()
        {
            ensureFood();
            for (const auto &o : population_)
            {
                if (o.isAlive())
                    continue;
                if (killedThisTick_.count(o.getId()))
                    continue; // déjà mangée
                auto [cellX, cellY] = regionOf(o);
                carrion_[static_cast<size_t>(cellY) * grid_.getWidth() + cellX] +=
                    BODY_ENERGY_PER_SIZE * o.getGenome().getTrait(Genetics::TraitType::SIZE) + o.getEnergy() * 0.5;
                if (o.getEnergy() <= 0.0)
                    lifeEvents_.starvationDeaths++;
                else
                    lifeEvents_.oldAgeDeaths++;
            }
            population_.erase(
                std::remove_if(population_.begin(), population_.end(),
                                [](const Evolution::Organism &o) { return !o.isAlive(); }),
                population_.end());
            killedThisTick_.clear();
        }

        void reproduce()
        {
            // Regroupe les reproducteurs potentiels par (région, espèce) :
            // seuls des individus de la même espèce, dans la même région,
            // se reproduisent ensemble.
            std::map<long long, std::map<std::string, std::vector<size_t>>> candidates;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                if (!population_[i].canReproduce())
                    continue;
                auto [gx, gy] = regionOf(population_[i]);
                candidates[regionKey(gx, gy)][population_[i].getSpecies()].push_back(i);
            }

            std::vector<Evolution::Organism> offspring;
            Det::UniformReal crossoverChance(0.0, 1.0);

            for (auto &[key, bySpecies] : candidates)
            {
                for (auto &[species, indices] : bySpecies)
                {
                    if (indices.size() < 2)
                    {
                        lifeEvents_.eligibleWithoutPartner += indices.size();
                        continue;
                    }
                    Det::shuffle(indices.begin(), indices.end(), rng_);

                    for (size_t i = 0; i + 1 < indices.size(); i += 2)
                    {
                        if (crossoverChance(rng_) > params_.crossover.crossoverRate)
                            continue;

                        auto &parent1 = population_[indices[i]];
                        auto &parent2 = population_[indices[i + 1]];
                        if (std::abs(parent1.getGenome().getTrait(Genetics::TraitType::DIET) - parent2.getGenome().getTrait(Genetics::TraitType::DIET)) > params_.assortativeMatingGap)
                            continue;

                        auto child = tryReproduce(parent1, parent2, species);
                        if (child)
                        {
                            parent1.setEnergy(parent1.getEnergy() - 30.0);
                            parent2.setEnergy(parent2.getEnergy() - 30.0);
                            offspring.push_back(std::move(*child));
                        }
                    }
                }
            }

            lifeEvents_.births += offspring.size();
            for (auto &child : offspring)
                population_.push_back(std::move(child));
        }

        /// @brief Croise et mute deux parents, en re-tirant la mutation si
        /// elle viole les contraintes biologiques du groupe (jusqu'à
        /// params_.maxAttemptsPerConstraintRetry fois), plutôt que
        /// d'accepter silencieusement une descendance biologiquement
        /// implausible.
        std::optional<Evolution::Organism> tryReproduce(const Evolution::Organism &parent1,
                                                          const Evolution::Organism &parent2,
                                                          const std::string &species)
        {
            auto typeIt = biologicalTypeOf_.find(species);
            Taxonomy::BiologicalType biologicalType =
                (typeIt != biologicalTypeOf_.end()) ? typeIt->second : Taxonomy::BiologicalType::BIRD;

            auto originalTraits = toTraitValues(parent1.getGenome());

            for (uint32_t attempt = 0; attempt < params_.maxAttemptsPerConstraintRetry; ++attempt)
            {
                auto childGenome = std::make_unique<Genetics::AdvancedGenome>(
                    parent1.getGenome().crossover(parent2.getGenome(), params_.crossover));
                childGenome->mutate(params_.mutation);

                auto mutatedTraits = toTraitValues(*childGenome);
                if (constraints_.validateMutation(species, originalTraits, mutatedTraits, biologicalType))
                {
                    Evolution::Organism child(std::move(childGenome), species);
                    double midX = (parent1.getX() + parent2.getX()) * 0.5;
                    double midY = (parent1.getY() + parent2.getY()) * 0.5;
                    child.setPosition(midX, midY);
                    child.setEnergy(40.0);
                    return child;
                }
            }
            return std::nullopt; // toutes les tentatives ont violé les contraintes : pas de descendance ce tour-ci
        }

        /// @brief Une espèce ne se scinde que par isolement réel : deux populations sans
        /// aucun contact géographique, restées séparées assez longtemps, et génétiquement
        /// divergentes. Sans ces conditions, de simples écarts d'échantillonnage entre
        /// cases voisines créaient des dizaines d'espèces en quelques durées de vie.
        void checkSpeciation()
        {
            auto byRegionAndSpecies = groupByRegionAndSpecies();

            for (auto &[species, regionGroups] : bySpeciesRegionIndex(byRegionAndSpecies))
            {
                // Critère absolu historique, encore utilisé par certains tests.
                if (params_.speciationDivergenceMargin < 0.0)
                {
                    checkAbsoluteSpeciation(species, regionGroups);
                    continue;
                }

                if (generation_ % 50 == 0 && checkNicheSplit(species, regionGroups))
                    continue;

                auto populations = isolatedPopulations(regionGroups);
                if (populations.size() < 2 || populations[1].size() < params_.speciationMinPopulation)
                {
                    divergentStreak_[species] = 0;
                    continue;
                }

                uint32_t streak = ++divergentStreak_[species];
                // La divergence coûte cher à mesurer : pas à chaque tick.
                if (streak < params_.speciationIsolationGenerations || streak % 50 != 0)
                    continue;

                const auto sampleA = evenSample(populations[0], 15);
                const auto sampleB = evenSample(populations[1], 15);
                const double distance = averageInterGroupDistance(sampleA, sampleB);
                const double within = 0.5 * (averageWithinGroupDistance(sampleA) + averageWithinGroupDistance(sampleB));
                if (distance - within >= params_.speciationDivergenceMargin)
                {
                    performSpeciation(species, populations[1], distance);
                    divergentStreak_[species] = 0;
                }
            }
        }

        /// @brief Scission sur place : deux groupes de régime séparés par un vrai écart, qui
        /// ne se croisent plus depuis assez longtemps. Vrai si l'espèce vient de se scinder.
        bool checkNicheSplit(const std::string &species, const std::map<long long, std::vector<size_t>> &regionGroups)
        {
            std::vector<std::pair<double, size_t>> byDiet;
            for (const auto &[region, members] : regionGroups)
                for (size_t idx : members)
                    byDiet.emplace_back(population_[idx].getGenome().getTrait(Genetics::TraitType::DIET), idx);
            std::sort(byDiet.begin(), byDiet.end());

            const size_t minimum = params_.speciationMinPopulation;
            double widest = 0.0;
            size_t cut = 0;
            for (size_t i = minimum; i + minimum <= byDiet.size(); ++i)
            {
                const double gap = byDiet[i].first - byDiet[i - 1].first;
                if (gap > widest)
                {
                    widest = gap;
                    cut = i;
                }
            }

            if (widest < params_.nicheSplitGap)
            {
                nicheStreak_[species] = 0;
                return false;
            }
            uint32_t &streak = nicheStreak_[species];
            streak += 50;
            if (streak < params_.nicheSplitDuration)
                return false;

            std::vector<size_t> lower, upper;
            for (size_t i = 0; i < byDiet.size(); ++i)
                (i < cut ? lower : upper).push_back(byDiet[i].second);
            const double distance = averageInterGroupDistance(evenSample(lower, 15), evenSample(upper, 15));
            performSpeciation(species, upper, distance);
            streak = 0;
            return true;
        }

        /// @brief Populations d'une espèce sans contact entre elles : composantes connexes
        /// de ses cases assez peuplées, de la plus grande à la plus petite.
        std::vector<std::vector<size_t>> isolatedPopulations(const std::map<long long, std::vector<size_t>> &regionGroups) const
        {
            std::vector<std::vector<size_t>> populations;
            std::set<long long> visited;
            const auto occupied = [&](long long key) {
                auto it = regionGroups.find(key);
                return it != regionGroups.end() && it->second.size() >= params_.speciationMinCellPopulation;
            };

            for (const auto &[start, unused] : regionGroups)
            {
                if (!occupied(start) || visited.count(start))
                    continue;

                std::vector<size_t> population;
                std::vector<long long> frontier{start};
                visited.insert(start);
                while (!frontier.empty())
                {
                    const long long key = frontier.back();
                    frontier.pop_back();
                    const auto &members = regionGroups.at(key);
                    population.insert(population.end(), members.begin(), members.end());
                    const int gx = static_cast<int>(key / 100000);
                    const int gy = static_cast<int>(key % 100000);
                    for (const auto &[nx, ny] : grid_.neighbors(gx, gy))
                    {
                        const long long next = regionKey(nx, ny);
                        if (occupied(next) && visited.insert(next).second)
                            frontier.push_back(next);
                    }
                }
                populations.push_back(std::move(population));
            }

            std::stable_sort(populations.begin(), populations.end(),
                             [](const auto &a, const auto &b) { return a.size() > b.size(); });
            return populations;
        }

        /// @brief Échantillon réparti sur tout le groupe, pour ne pas mesurer une seule case.
        static std::vector<size_t> evenSample(const std::vector<size_t> &group, size_t count)
        {
            if (group.size() <= count)
                return group;
            std::vector<size_t> sample;
            sample.reserve(count);
            for (size_t i = 0; i < count; ++i)
                sample.push_back(group[i * group.size() / count]);
            return sample;
        }

        void checkAbsoluteSpeciation(const std::string &species, const std::map<long long, std::vector<size_t>> &regionGroups)
        {
            if (regionGroups.size() < 2)
            {
                divergentStreak_[species] = 0;
                return;
            }

            std::vector<std::pair<long long, std::vector<size_t>>> sorted(regionGroups.begin(), regionGroups.end());
            std::stable_sort(sorted.begin(), sorted.end(),
                             [](const auto &a, const auto &b) { return a.second.size() > b.second.size(); });

            const auto &groupA = sorted[0].second;
            const auto &groupB = sorted[1].second;
            if (groupA.size() < 3 || groupB.size() < 3)
            {
                divergentStreak_[species] = 0;
                return;
            }

            const double distance = averageInterGroupDistance(groupA, groupB);
            if (distance >= params_.speciationDistanceThreshold)
                divergentStreak_[species]++;
            else
                divergentStreak_[species] = 0;

            if (divergentStreak_[species] >= params_.speciationIsolationGenerations)
            {
                performSpeciation(species, groupB, distance);
                divergentStreak_[species] = 0;
            }
        }

        void performSpeciation(const std::string &parentSpecies, const std::vector<size_t> &splittingGroup, double distance)
        {
            auto typeIt = biologicalTypeOf_.find(parentSpecies);
            Taxonomy::BiologicalType biologicalType =
                (typeIt != biologicalTypeOf_.end()) ? typeIt->second : Taxonomy::BiologicalType::BIRD;

            std::string newName = taxonomy_.registerNewSpecies(biologicalType, {}, "", parentSpecies);
            biologicalTypeOf_[newName] = biologicalType;

            for (size_t idx : splittingGroup)
                population_[idx].setSpecies(newName);

            // Le comportement diverge en même temps que le génome : la
            // nouvelle lignée hérite du cerveau (stable, éprouvé) du
            // parent, puis mute, pas un cerveau neuf au hasard.
            auto parentBrainIt = brains_.find(parentSpecies);
            if (parentBrainIt != brains_.end())
            {
                LineageBrain newBrain(parentBrainIt->second.stableBrain);
                newBrain.brain.mutateWeights(params_.neat);
                brains_.emplace(newName, std::move(newBrain));
            }
            else
            {
                ensureBrain(newName);
            }

            speciationEvents_.push_back({parentSpecies, newName, generation_, distance});
        }

        void checkExtinction()
        {
            auto counts = populationCountsBySpecies();
            for (auto it = brains_.begin(); it != brains_.end();)
            {
                if (counts.find(it->first) == counts.end())
                {
                    auto last = lastCounts_.find(it->first);
                    extinctionEvents_.push_back({it->first, generation_, last != lastCounts_.end() ? last->second : 0u});
                    divergentStreak_.erase(it->first);
                    nicheStreak_.erase(it->first);
                    it = brains_.erase(it);
                }
                else
                {
                    ++it;
                }
            }
            lastCounts_ = std::move(counts);
        }

        /// @brief Ajoute un point à l'histoire de la partie. Quand elle est pleine, un point
        /// sur deux disparaît : toute la partie reste visible, à mémoire bornée.
        void recordHistory()
        {
            static constexpr size_t MAX_SAMPLES = 1000;

            HistorySample sample;
            sample.generation = generation_;
            sample.population = static_cast<uint32_t>(population_.size());
            for (const auto &organism : population_)
                sample.totalEnergy += organism.getEnergy();

            double weightedDiversity = 0.0;
            for (const auto &lineage : buildSnapshots())
            {
                sample.bySpecies[lineage.speciesName] = lineage.population;
                weightedDiversity += lineage.geneticDiversity * lineage.population;
            }
            sample.speciesCount = static_cast<uint32_t>(sample.bySpecies.size());
            sample.meanDiversity = sample.population > 0 ? weightedDiversity / sample.population : 0.0;
            history_.push_back(std::move(sample));

            if (history_.size() >= MAX_SAMPLES)
            {
                size_t kept = 0;
                for (size_t i = 0; i < history_.size(); i += 2)
                    history_[kept++] = std::move(history_[i]);
                history_.resize(kept);
                historyInterval_ *= 2;
            }
        }

        void ensureBrain(const std::string &species)
        {
            if (brains_.find(species) != brains_.end())
                return;
            NEAT::NEATGenome genome(WorldSimulationParameters::brainInputCount,
                                     WorldSimulationParameters::brainOutputCount,
                                     static_cast<uint32_t>(rng_()));
            brains_.emplace(species, LineageBrain(std::move(genome)));
        }

        /// @brief Réévalue chaque cerveau de lignée tous les
        /// params_.brainEvolutionInterval générations : une évolution
        /// (1+1) sur le génome NEAT, avec la fitness réellement mesurée de
        /// la lignée comme seul juge. Le candidat à l'essai (`brain`) est
        /// gardé s'il n'a pas fait baisser la fitness depuis le dernier
        /// point de contrôle, sinon on revient à la dernière version
        /// stable, puis un nouveau candidat est proposé pour la fenêtre
        /// suivante.
        void evolveBrains()
        {
            auto snapshots = buildSnapshots();
            std::map<std::string, double> fitnessBySpecies;
            for (const auto &snap : snapshots)
                fitnessBySpecies[snap.speciesName] = snap.averageFitness;

            Det::UniformReal chance(0.0, 1.0);

            // Ordre alphabétique des espèces, jamais l'ordre d'itération de
            // brains_ : cette boucle consomme rng_ espèce par espèce (jets de
            // mutation structurelle), et l'ordre d'itération d'une
            // unordered_map dépend de son HISTOIRE d'insertion -- après une
            // reprise la map est reconstruite dans l'ordre alphabétique du
            // JSON, dans une simulation jamais interrompue dans l'ordre
            // chronologique, donc les mêmes tirages tombaient sur des
            // espèces différentes. Trouvé par un test de déterminisme
            // post-reprise qui échouait à ~1e-10 près sur l'énergie.
            std::vector<std::string> speciesOrder;
            speciesOrder.reserve(brains_.size());
            for (const auto &entry : brains_)
                speciesOrder.push_back(entry.first);
            std::sort(speciesOrder.begin(), speciesOrder.end());

            for (const auto &species : speciesOrder)
            {
                auto &lineageBrain = brains_.at(species);
                auto fitnessIt = fitnessBySpecies.find(species);
                if (fitnessIt == fitnessBySpecies.end())
                    continue; // espèce sans individus ce tour-ci (rare, entre reproduce() et le prochain step)
                double currentFitness = fitnessIt->second;

                if (lineageBrain.hasCheckpoint && currentFitness < lineageBrain.fitnessAtCheckpoint)
                {
                    // Le candidat a fait moins bien : on revient à la version stable.
                    lineageBrain.brain = lineageBrain.stableBrain;
                }
                else
                {
                    // Le candidat a tenu (ou amélioré) la fitness : il devient la nouvelle référence.
                    lineageBrain.stableBrain = lineageBrain.brain;
                }

                lineageBrain.fitnessAtCheckpoint = currentFitness;
                lineageBrain.hasCheckpoint = true;

                // Nouveau candidat pour la prochaine fenêtre : toujours une
                // perturbation de poids, rarement un changement structurel
                // (taux définis par params_.neat, pas de constante dupliquée
                // ici).
                lineageBrain.brain.mutateWeights(params_.neat);
                if (chance(rng_) < params_.neat.addConnectionMutationRate)
                    lineageBrain.brain.addConnection(params_.neat);
                if (chance(rng_) < params_.neat.addNodeMutationRate)
                    lineageBrain.brain.addNode(params_.neat);
            }
        }

        /// @brief Détection de convergence évolutive (Chantier G2) : compare
        /// les profils de traits réels moyens de chaque paire de lignées
        /// génétiquement distinctes partageant au moins un vrai biome
        /// occupé, à la mesure précédente de cette même paire -- signale une
        /// tendance candidate (jamais une preuve) quand la distance de
        /// traits a diminué alors que la distance génétique a augmenté.
        /// Volontairement peu fréquente (params_.convergenceCheckInterval) :
        /// une analyse en O(paires × échantillon), pas un calcul par
        /// génération.
        void checkConvergence()
        {
            std::map<std::string, std::vector<size_t>> bySpecies;
            std::map<std::string, std::set<Ecosystem::EnvironmentType>> biomesBySpecies;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                if (!population_[i].isAlive())
                    continue;
                const std::string &species = population_[i].getSpecies();
                bySpecies[species].push_back(i);
                auto [gx, gy] = regionOf(population_[i]);
                biomesBySpecies[species].insert(grid_.at(gx, gy).environmentType);
            }

            if (bySpecies.size() < 2)
                return;

            // Réutilise les traits moyens déjà calculés par buildSnapshots()
            // plutôt que de les recalculer une seconde fois.
            auto snapshots = buildSnapshots();
            std::map<std::string, const LineageSnapshot *> snapshotByName;
            for (const auto &snap : snapshots)
                snapshotByName[snap.speciesName] = &snap;

            std::vector<std::string> names;
            names.reserve(bySpecies.size());
            for (const auto &[species, indices] : bySpecies)
                names.push_back(species);

            for (size_t i = 0; i < names.size(); ++i)
            {
                for (size_t j = i + 1; j < names.size(); ++j)
                {
                    const std::string &speciesA = names[i];
                    const std::string &speciesB = names[j];

                    bool shareBiome = false;
                    for (auto biome : biomesBySpecies[speciesA])
                    {
                        if (biomesBySpecies[speciesB].count(biome))
                        {
                            shareBiome = true;
                            break;
                        }
                    }
                    if (!shareBiome)
                        continue;

                    double geneticDistance = averageInterGroupDistance(bySpecies[speciesA], bySpecies[speciesB]);
                    // Doivent être génétiquement assez éloignées pour être de
                    // vraies lignées distinctes -- exclut une paire issue
                    // d'une scission encore toute récente, qui serait
                    // trivialement proche des deux côtés sans que ce soit une
                    // convergence.
                    if (geneticDistance < params_.speciationDistanceThreshold)
                        continue;

                    double traitDistance = Ecology::normalizedTraitDistance(
                        snapshotByName.at(speciesA)->averageTraits, snapshotByName.at(speciesB)->averageTraits);

                    std::string pairKey = speciesA < speciesB ? speciesA + "|" + speciesB : speciesB + "|" + speciesA;
                    Ecology::ConvergenceSample current{generation_, traitDistance, geneticDistance};

                    auto previousIt = lastConvergenceSample_.find(pairKey);
                    if (previousIt != lastConvergenceSample_.end())
                    {
                        auto signal = Ecology::evaluateConvergenceTrend(previousIt->second, current);
                        if (signal.isCandidate)
                        {
                            convergenceSignals_.push_back({speciesA, speciesB, generation_, traitDistance, geneticDistance,
                                                            signal.traitDistanceDelta, signal.geneticDistanceDelta});
                        }
                    }
                    lastConvergenceSample_[pairKey] = current;
                }
            }
        }

        // --- Regroupements utilitaires (recalculés depuis population_, jamais mis en cache séparément) ---

        long long regionKey(int gx, int gy) const { return static_cast<long long>(gx) * 100000 + gy; }

        std::map<long long, std::map<std::string, std::vector<size_t>>> groupByRegionAndSpecies() const
        {
            std::map<long long, std::map<std::string, std::vector<size_t>>> result;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                auto [gx, gy] = regionOf(population_[i]);
                result[regionKey(gx, gy)][population_[i].getSpecies()].push_back(i);
            }
            return result;
        }

        std::map<std::string, std::map<long long, std::vector<size_t>>>
        bySpeciesRegionIndex(const std::map<long long, std::map<std::string, std::vector<size_t>>> &byRegion) const
        {
            std::map<std::string, std::map<long long, std::vector<size_t>>> result;
            for (const auto &[region, bySpecies] : byRegion)
                for (const auto &[species, indices] : bySpecies)
                    result[species][region] = indices;
            return result;
        }

        double averageWithinGroupDistance(const std::vector<size_t> &group) const
        {
            double total = 0.0;
            size_t comparisons = 0;
            size_t sample = std::min<size_t>(group.size(), 15);
            for (size_t i = 0; i < sample; ++i)
            {
                for (size_t j = i + 1; j < sample; ++j)
                {
                    total += population_[group[i]].getGenome().geneticDistance(population_[group[j]].getGenome());
                    comparisons++;
                }
            }
            return comparisons > 0 ? total / comparisons : 0.0;
        }

        double averageInterGroupDistance(const std::vector<size_t> &groupA, const std::vector<size_t> &groupB) const
        {
            double total = 0.0;
            size_t comparisons = 0;
            // Échantillonne pour rester borné même si les groupes sont grands.
            size_t sampleA = std::min<size_t>(groupA.size(), 15);
            size_t sampleB = std::min<size_t>(groupB.size(), 15);
            for (size_t i = 0; i < sampleA; ++i)
            {
                for (size_t j = 0; j < sampleB; ++j)
                {
                    total += population_[groupA[i]].getGenome().geneticDistance(population_[groupB[j]].getGenome());
                    comparisons++;
                }
            }
            return comparisons > 0 ? total / comparisons : 0.0;
        }

        std::map<std::string, uint32_t> populationCountsBySpecies() const
        {
            std::map<std::string, uint32_t> counts;
            for (const auto &organism : population_)
                counts[organism.getSpecies()]++;
            return counts;
        }

        std::map<long long, uint32_t> populationCountsByRegion() const
        {
            std::map<long long, uint32_t> counts;
            for (const auto &organism : population_)
            {
                if (!organism.isAlive())
                    continue;
                auto [gx, gy] = regionOf(organism);
                counts[regionKey(gx, gy)]++;
            }
            return counts;
        }

        std::vector<LineageSnapshot> buildSnapshots() const
        {
            std::map<std::string, std::vector<size_t>> bySpecies;
            for (size_t i = 0; i < population_.size(); ++i)
                bySpecies[population_[i].getSpecies()].push_back(i);

            std::vector<LineageSnapshot> snapshots;
            snapshots.reserve(bySpecies.size());

            for (const auto &[species, indices] : bySpecies)
            {
                LineageSnapshot snap;
                snap.speciesName = species;
                auto typeIt = biologicalTypeOf_.find(species);
                snap.biologicalType = (typeIt != biologicalTypeOf_.end()) ? typeIt->second : Taxonomy::BiologicalType::BIRD;
                snap.population = static_cast<uint32_t>(indices.size());

                double fitnessSum = 0.0;
                for (size_t idx : indices)
                    fitnessSum += population_[idx].calculateFitness();
                snap.averageFitness = indices.empty() ? 0.0 : fitnessSum / indices.size();

                // Diversité génétique réelle : distance moyenne échantillonnée
                // entre paires d'individus de cette espèce.
                double distanceSum = 0.0;
                size_t comparisons = 0;
                size_t sampleSize = std::min<size_t>(indices.size(), 20);
                for (size_t i = 0; i < sampleSize; ++i)
                {
                    for (size_t j = i + 1; j < sampleSize; ++j)
                    {
                        distanceSum += population_[indices[i]].getGenome().geneticDistance(population_[indices[j]].getGenome());
                        comparisons++;
                    }
                }
                snap.geneticDiversity = comparisons > 0 ? distanceSum / comparisons : 0.0;

                std::map<long long, bool> regions;
                for (size_t idx : indices)
                {
                    auto [gx, gy] = regionOf(population_[idx]);
                    regions[regionKey(gx, gy)] = true;
                }
                snap.regionsOccupied = static_cast<uint32_t>(regions.size());

                if (!indices.empty())
                {
                    Genetics::AdvancedTraitValues sum{};
                    sum.size = sum.speed = sum.energyEfficiency = sum.reproductionRate = 0.0;
                    sum.aggression = sum.intelligence = sum.longevity = sum.resistance = 0.0;
                    sum.visionRange = sum.hearingAcuity = sum.camouflage = sum.socialBehavior = 0.0;
                    sum.insulation = sum.diet = 0.0;
                    for (size_t idx : indices)
                    {
                        auto traits = toTraitValues(population_[idx].getGenome());
                        sum.size += traits.size;
                        sum.speed += traits.speed;
                        sum.energyEfficiency += traits.energyEfficiency;
                        sum.reproductionRate += traits.reproductionRate;
                        sum.aggression += traits.aggression;
                        sum.intelligence += traits.intelligence;
                        sum.longevity += traits.longevity;
                        sum.resistance += traits.resistance;
                        sum.visionRange += traits.visionRange;
                        sum.hearingAcuity += traits.hearingAcuity;
                        sum.camouflage += traits.camouflage;
                        sum.socialBehavior += traits.socialBehavior;
                        sum.insulation += traits.insulation;
                        sum.diet += traits.diet;
                    }
                    double n = static_cast<double>(indices.size());
                    snap.averageTraits.size = sum.size / n;
                    snap.averageTraits.speed = sum.speed / n;
                    snap.averageTraits.energyEfficiency = sum.energyEfficiency / n;
                    snap.averageTraits.reproductionRate = sum.reproductionRate / n;
                    snap.averageTraits.aggression = sum.aggression / n;
                    snap.averageTraits.intelligence = sum.intelligence / n;
                    snap.averageTraits.longevity = sum.longevity / n;
                    snap.averageTraits.resistance = sum.resistance / n;
                    snap.averageTraits.visionRange = sum.visionRange / n;
                    snap.averageTraits.hearingAcuity = sum.hearingAcuity / n;
                    snap.averageTraits.camouflage = sum.camouflage / n;
                    snap.averageTraits.socialBehavior = sum.socialBehavior / n;
                    snap.averageTraits.insulation = sum.insulation / n;
                    snap.averageTraits.diet = sum.diet / n;

                    // Adaptations réelles : un trait moyen mesurablement
                    // au-dessus de sa valeur par défaut biologique, alors
                    // que cette espèce subit une pression écologique
                    // RÉELLEMENT détectée à la génération courante (voir
                    // ecologicalPressure_, rempli par
                    // applySurvivalAndInteractions()) -- jamais une liste
                    // inventée ni un seuil arbitraire décorrélé d'un
                    // événement mesuré.
                    auto pressureIt = ecologicalPressure_.find(species);
                    bool preyPressure = pressureIt != ecologicalPressure_.end() && pressureIt->second.isPreyOfSomeone;
                    bool competitionPressure = pressureIt != ecologicalPressure_.end() && pressureIt->second.isInCompetition;

                    auto aboveDefaultByMargin = [](double average, Genetics::TraitType type, double marginFraction) {
                        const auto &bounds = Genetics::TRAIT_BOUNDS[static_cast<size_t>(type)];
                        double margin = (bounds.max - bounds.min) * marginFraction;
                        return average > bounds.defaultValue + margin;
                    };
                    auto formatValue = [](double v) {
                        char buf[32];
                        std::snprintf(buf, sizeof(buf), "%.2f", v);
                        return std::string(buf);
                    };

                    if (preyPressure && aboveDefaultByMargin(snap.averageTraits.resistance, Genetics::TraitType::RESISTANCE, 0.15))
                        snap.adaptations.push_back(
                            "Résistance moyenne élevée (" + formatValue(snap.averageTraits.resistance) +
                            ") alors qu'une pression de prédation réelle est mesurée cette génération.");
                    if (preyPressure && aboveDefaultByMargin(snap.averageTraits.speed, Genetics::TraitType::SPEED, 0.15))
                        snap.adaptations.push_back(
                            "Vitesse de fuite moyenne élevée (" + formatValue(snap.averageTraits.speed) +
                            ") alors qu'une pression de prédation réelle est mesurée cette génération.");
                    if (competitionPressure && aboveDefaultByMargin(snap.averageTraits.energyEfficiency, Genetics::TraitType::ENERGY_EFFICIENCY, 0.15))
                        snap.adaptations.push_back(
                            "Efficacité énergétique moyenne élevée (" + formatValue(snap.averageTraits.energyEfficiency) +
                            ") alors qu'une compétition réelle pour les ressources est mesurée cette génération.");

                    // Innovations réelles : le cerveau NEAT stable de cette
                    // lignée a réellement grandi au-delà de sa topologie
                    // minimale de départ (entrées->sorties directement
                    // connectées, sans neurone caché) -- une mutation
                    // structurelle (addNode/addConnection) a donc été
                    // conservée par l'évolution (1+1) au moins une fois.
                    // Volontairement décrit sobrement : ceci ne mesure
                    // qu'une croissance topologique réelle, jamais un
                    // comportement plus "intelligent" (voir Chantier G).
                    auto brainIt = brains_.find(species);
                    if (brainIt != brains_.end())
                    {
                        size_t complexity = brainIt->second.stableBrain.getComplexity();
                        size_t minimalComplexity = WorldSimulationParameters::brainInputCount + WorldSimulationParameters::brainOutputCount +
                                                    WorldSimulationParameters::brainInputCount * WorldSimulationParameters::brainOutputCount;
                        if (complexity > minimalComplexity + 2)
                            snap.innovations.push_back(
                                "Cerveau NEAT structurellement enrichi (" + std::to_string(complexity) +
                                " nœuds/connexions, contre " + std::to_string(minimalComplexity) + " à la fondation de la lignée).");
                    }
                }

                snapshots.push_back(std::move(snap));
            }

            return snapshots;
        }

        static Genetics::AdvancedTraitValues toTraitValues(const Genetics::AdvancedGenome &genome)
        {
            Genetics::AdvancedTraitValues values;
            values.size = genome.getTrait(Genetics::TraitType::SIZE);
            values.speed = genome.getTrait(Genetics::TraitType::SPEED);
            values.energyEfficiency = genome.getTrait(Genetics::TraitType::ENERGY_EFFICIENCY);
            values.reproductionRate = genome.getTrait(Genetics::TraitType::REPRODUCTION_RATE);
            values.aggression = genome.getTrait(Genetics::TraitType::AGGRESSION);
            values.intelligence = genome.getTrait(Genetics::TraitType::INTELLIGENCE);
            values.longevity = genome.getTrait(Genetics::TraitType::LONGEVITY);
            values.resistance = genome.getTrait(Genetics::TraitType::RESISTANCE);
            values.visionRange = genome.getTrait(Genetics::TraitType::VISION_RANGE);
            values.hearingAcuity = genome.getTrait(Genetics::TraitType::HEARING_ACUITY);
            values.camouflage = genome.getTrait(Genetics::TraitType::CAMOUFLAGE);
            values.socialBehavior = genome.getTrait(Genetics::TraitType::SOCIAL_BEHAVIOR);
            values.insulation = genome.getTrait(Genetics::TraitType::INSULATION);
            values.diet = genome.getTrait(Genetics::TraitType::DIET);
            values.fertility = values.reproductionRate;
            values.neuralComplexity = values.intelligence;
            values.sensoryAcuity = values.hearingAcuity;
            return values;
        }
    };

} // namespace Serina::Simulation
