#pragma once

// The unified engine (see docs/UNIFIED_ENGINE_DESIGN.md): real individuals
// with diploid genomes (Evolution::Organism / Genetics::AdvancedGenome,
// PopulationManager.hpp), living on a real region grid (Region.hpp),
// organized into named taxa (Taxonomy::EcosystemTaxonomy), subject to real
// ecological interactions and biological constraints applied per
// individual rather than per aggregate species.

#include "Region.hpp"
#include "PopulationManager.hpp"
#include "EcosystemTaxonomy.hpp"
#include "TraitEcology.hpp"
#include "EvolutionaryConvergence.hpp"
#include "EvolutionaryConstraints.hpp"
#include "EnvironmentalAdaptation.hpp"
#include "NEAT.hpp"

#include <vector>
#include <unordered_map>
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
    /// (espèce vivante), calculé à partir des individus qui la composent —
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
    /// compte réel d'individus vivants actuellement dedans — pour un
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
    };

    /// @brief Snapshot en lecture seule d'un individu réel : de quoi
    /// dessiner un point sur la carte et l'inspecter, sans exposer le
    /// génome complet ni permettre de le muter depuis l'extérieur. Les
    /// champs visuels ci-dessous sont une projection normalisée ([0,1] ou
    /// un palier entier) d'un sous-ensemble de traits génétiques réels vers
    /// un petit nombre de canaux de rendu délibérément lisibles (voir
    /// docs/UNIFIED_ENGINE_DESIGN.md, "créatures procédurales") — la
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
    };

    /// @brief Le "cerveau" d'une lignée : un seul réseau NEAT partagé par
    /// tous ses individus (pas un par individu — voir
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
        /// Nombre de générations consécutives de divergence soutenue
        /// avant qu'une scission d'espèce ne soit déclenchée. Une
        /// approximation volontairement simple de l'isolement
        /// reproducteur (voir docs/UNIFIED_ENGINE_DESIGN.md) : on ne
        /// modélise pas de graphe de migration individuel, seulement la
        /// persistance mesurée de la divergence.
        uint32_t speciationIsolationGenerations = 10;

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
        /// n'y en avait aucun (voir applySurvivalAndInteractions()) — tout
        /// organisme ne faisait que perdre de l'énergie au métabolisme
        /// jusqu'à une extinction totale garantie, sans rapport avec les
        /// gènes ou l'environnement.
        double foragingRate = 0.15;
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
              // +1 pour ne pas rejouer exactement le même flux que rng_ tout
              // en restant entièrement déterministe à partir de la même
              // graine -- corrige un vrai bug latent trouvé en écrivant les
              // tests du Chantier G2 : SerinaEvolutionaryConstraints se
              // construisait avec sa valeur par défaut
              // (std::random_device{}(), non déterministe) faute d'un
              // argument explicite ici, ce qui rendait la validation des
              // mutations biologiques -- et donc la reproductibilité de
              // toute la simulation à partir d'une graine -- non
              // reproductible d'une exécution à l'autre. (Ordre
              // d'initialisation : constraints_ est déclaré avant rng_ dans
              // la classe, donc listé avant lui ici aussi, pour éviter tout
              // avertissement -Wreorder.)
              constraints_(seed + 1), rng_(seed)
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
                    candidateRegions = {{0, 0}}; // biome absent de cette carte : repli sur l'origine

                std::uniform_int_distribution<size_t> regionPick(0, candidateRegions.size() - 1);

                for (uint32_t i = 0; i < individualsPerFounder; ++i)
                {
                    auto [gx, gy] = candidateRegions[regionPick(rng_)];
                    auto genome = std::make_unique<Genetics::AdvancedGenome>(generation_);
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
        /// @brief Historique des signaux de convergence évolutive candidats
        /// détectés jusqu'ici (Chantier G2) -- voir ConvergenceSignal pour
        /// ce qu'un signal représente réellement et ne représente pas.
        const std::vector<ConvergenceSignal> &getConvergenceSignals() const { return convergenceSignals_; }

        /// @brief Un instantané par espèce vivante, calculé depuis les
        /// individus réels (jamais un tirage aléatoire).
        std::vector<LineageSnapshot> getLineageSnapshots() const
        {
            return buildSnapshots();
        }

        bool hasBrain(const std::string &species) const { return brains_.find(species) != brains_.end(); }

        /// @brief Nombre de nœuds + connexions du cerveau stable d'une
        /// lignée — utile pour vérifier qu'une mutation structurelle
        /// (addNode/addConnection) a bien eu lieu au fil des générations.
        size_t getBrainComplexity(const std::string &species) const
        {
            auto it = brains_.find(species);
            return it != brains_.end() ? it->second.stableBrain.getComplexity() : 0;
        }

        /// @brief Un instantané par case de la carte, avec le compte réel
        /// d'individus vivants dedans à cet instant — pour dessiner une
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
                    result.push_back(std::move(snap));
                }
            }
            return result;
        }

        /// @brief Un instantané par individu vivant réel — position,
        /// espèce, énergie, âge, et une projection visuelle réelle de son
        /// génome — pour un frontend qui veut afficher chaque organisme sur
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
        std::unordered_map<std::string, Taxonomy::BiologicalType> biologicalTypeOf_;
        std::unordered_map<std::string, uint32_t> divergentStreak_; ///< par espèce
        std::unordered_map<std::string, LineageBrain> brains_;      ///< un cerveau NEAT par espèce vivante
        std::vector<SpeciationEvent> speciationEvents_;

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
        std::unordered_map<std::string, Ecology::ConvergenceSample> lastConvergenceSample_;
        /// @brief Historique réel des signaux de convergence détectés --
        /// jamais purgé, comme speciationEvents_ : un fait mesuré une fois
        /// reste un fait, même si la paire cesse ensuite de converger.
        std::vector<ConvergenceSignal> convergenceSignals_;

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
        std::unordered_map<std::string, EcologicalPressureSummary> ecologicalPressure_;

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

        std::pair<int, int> regionOf(const Evolution::Organism &o) const
        {
            return grid_.positionToGrid(o.getX(), o.getY(), worldWidth(), worldHeight());
        }

        void placeInRegion(Evolution::Organism &organism, int gx, int gy)
        {
            std::uniform_real_distribution<double> jitter(0.0, params_.cellSize);
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
            std::uniform_real_distribution<double> fallback(-params_.cellSize * 0.5, params_.cellSize * 0.5);
            latestBrainOutputs_.clear();

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
            std::unordered_map<long long, RegionAggregate> regionTotals;
            std::unordered_map<long long, std::unordered_map<std::string, RegionSpeciesAggregate>> regionSpeciesTotals;

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
                    // l'activation SIGMOID par défaut (image [0,1]) ; on
                    // remet le déplacement à l'échelle [-1,1] nous-mêmes
                    // plutôt que de modifier NEAT.hpp pour un besoin propre
                    // à cet appelant. Les trois autres sorties (chasse,
                    // évasion, recherche de nourriture) restent en [0,1]
                    // natif -- ce sont déjà des efforts/probabilités.
                    double moveX = outputs[WorldSimulationParameters::OUTPUT_MOVE_X] * 2.0 - 1.0;
                    double moveY = outputs[WorldSimulationParameters::OUTPUT_MOVE_Y] * 2.0 - 1.0;
                    double speed = organism.getGenome().getTrait(Genetics::TraitType::SPEED);
                    dx = moveX * params_.cellSize * speed;
                    dy = moveY * params_.cellSize * speed;
                }
                else
                {
                    dx = fallback(rng_);
                    dy = fallback(rng_);
                    // Valeurs neutres/sûres pour un individu sans cerveau :
                    // ni bonus ni pénalité de chasse/évasion/alimentation.
                    latestBrainOutputs_[organism.getId()] = {0.5, 0.5, 1.0, 1.0, 1.0};
                }

                double nx = std::clamp(organism.getX() + dx, 0.0, worldWidth() - 1e-6);
                double ny = std::clamp(organism.getY() + dy, 0.0, worldHeight() - 1e-6);
                organism.setPosition(nx, ny);
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
            double localResource = localEnv ? localEnv->resources.primaryProducers : 0.5;
            double localPredation = localEnv ? localEnv->pressures.predationPressure : 0.3;

            // N, S, E, W — retombe sur la ressource locale (gradient nul)
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
                    neighborResources[i] = neighborEnv->resources.primaryProducers;
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
            std::unordered_map<long long, std::unordered_map<std::string, RegionSpeciesEntry>> regionSpecies;
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
            std::unordered_map<long long, std::vector<RegionRelation>> regionRelations;
            std::unordered_map<std::string, EcologicalPressureSummary> pressureThisGeneration;

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

                organism.update(1.0); // métabolisme, âge — logique existante d'Organism

                auto [gx, gy] = regionOf(organism);
                long long region = regionKey(gx, gy);
                auto environmentType = grid_.at(gx, gy).environmentType;

                const auto *localEnv = environments_.getEnvironment(environmentType);
                double resourceLevel = localEnv ? localEnv->resources.primaryProducers : 0.5;
                double efficiency = organism.getGenome().getTrait(Genetics::TraitType::ENERGY_EFFICIENCY);
                double foragingIncome = resourceLevel * efficiency * params_.foragingRate;

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

                if (foragingIncome > 0.0)
                    organism.setEnergy(organism.getEnergy() + foragingIncome);
            }

            // --- Passe 3 : prédation -- transaction appairée à somme
            // exactement nulle (même constante des deux côtés), tirée au
            // sort indépendamment pour chaque individu prédateur plutôt
            // qu'un drain garanti à chaque génération (garde-fou impératif
            // du Chantier F). Chantier G1 : la probabilité de base au
            // niveau espèce reste la même autorité, mais chaque individu y
            // ajoute un effort de chasse (prédateur) ou d'évasion (proie)
            // personnel décidé par son propre cerveau -- jamais un second
            // canal indépendant, seulement une modulation bornée de ce qui
            // existe déjà. ---
            std::uniform_real_distribution<double> huntRoll(0.0, 1.0);
            std::uniform_real_distribution<double> evasionRoll(0.0, 1.0);
            for (auto &[region, relations] : regionRelations)
            {
                const auto &speciesHere = regionSpecies[region];
                for (const auto &rel : relations)
                {
                    std::string predatorSpecies, preySpecies;
                    if (rel.classification.relation == Ecology::EcologicalRelation::A_PREYS_ON_B)
                    {
                        predatorSpecies = rel.speciesA;
                        preySpecies = rel.speciesB;
                    }
                    else if (rel.classification.relation == Ecology::EcologicalRelation::B_PREYS_ON_A)
                    {
                        predatorSpecies = rel.speciesB;
                        preySpecies = rel.speciesA;
                    }
                    else
                    {
                        continue; // compétition déjà traitée en passe 2
                    }

                    auto predatorIt = speciesHere.find(predatorSpecies);
                    auto preyIt = speciesHere.find(preySpecies);
                    if (predatorIt == speciesHere.end() || preyIt == speciesHere.end())
                        continue;
                    const auto &preyIndices = preyIt->second.individualIndices;
                    if (preyIndices.empty())
                        continue;

                    double probability = Ecology::predationEncounterProbability(
                        rel.classification.dominanceGap, preyIt->second.profile.population);
                    if (probability <= 0.0)
                        continue;

                    std::uniform_int_distribution<size_t> preyPick(0, preyIndices.size() - 1);
                    for (size_t predatorIdx : predatorIt->second.individualIndices)
                    {
                        if (!population_[predatorIdx].isAlive())
                            continue;

                        double huntEffort = 1.0;
                        auto predatorOutputsIt = latestBrainOutputs_.find(population_[predatorIdx].getId());
                        if (predatorOutputsIt != latestBrainOutputs_.end() && predatorOutputsIt->second.size() > WorldSimulationParameters::OUTPUT_HUNT_EFFORT)
                            huntEffort = predatorOutputsIt->second[WorldSimulationParameters::OUTPUT_HUNT_EFFORT];
                        // Borné à [50%, 100%] de la probabilité de base au
                        // niveau espèce -- un effort de chasse personnel ne
                        // peut jamais faire dépasser ce que le profil de
                        // traits moyen autorise, seulement s'en approcher ou
                        // s'en éloigner de moitié au pire.
                        double personalProbability = probability * (0.5 + 0.5 * huntEffort);
                        if (huntRoll(rng_) >= personalProbability)
                            continue;

                        size_t preyIdx = preyIndices[preyPick(rng_)];
                        if (!population_[preyIdx].isAlive())
                            continue;

                        double evasionEffort = 0.0;
                        auto preyOutputsIt = latestBrainOutputs_.find(population_[preyIdx].getId());
                        if (preyOutputsIt != latestBrainOutputs_.end() && preyOutputsIt->second.size() > WorldSimulationParameters::OUTPUT_EVASION_EFFORT)
                            evasionEffort = preyOutputsIt->second[WorldSimulationParameters::OUTPUT_EVASION_EFFORT];
                        // Chance personnelle et bornée d'échapper à une
                        // attaque par ailleurs réussie -- jamais totale
                        // (voir MAX_PERSONAL_EVASION_CHANCE), au-delà du
                        // profil de traits moyen déjà utilisé pour classer
                        // la relation elle-même.
                        if (evasionRoll(rng_) < evasionEffort * WorldSimulationParameters::MAX_PERSONAL_EVASION_CHANCE)
                            continue; // la proie a évité l'attaque : aucun transfert, comme une chasse manquée

                        // Transfert à somme exactement nulle : la MÊME
                        // constante des deux côtés d'un événement unique et
                        // appairé (pas deux tirages indépendants qui
                        // pourraient déséquilibrer le bilan énergétique
                        // total quand prédateurs et proies sont en nombre
                        // différent).
                        population_[predatorIdx].setEnergy(population_[predatorIdx].getEnergy() + Ecology::PREDATION_ENERGY_TRANSFER);
                        population_[preyIdx].setEnergy(population_[preyIdx].getEnergy() - Ecology::PREDATION_ENERGY_TRANSFER);
                    }
                }
            }
        }

        void removeDead()
        {
            population_.erase(
                std::remove_if(population_.begin(), population_.end(),
                                [](const Evolution::Organism &o) { return !o.isAlive(); }),
                population_.end());
        }

        void reproduce()
        {
            // Regroupe les reproducteurs potentiels par (région, espèce) :
            // seuls des individus de la même espèce, dans la même région,
            // se reproduisent ensemble.
            std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> candidates;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                if (!population_[i].canReproduce())
                    continue;
                auto [gx, gy] = regionOf(population_[i]);
                candidates[regionKey(gx, gy)][population_[i].getSpecies()].push_back(i);
            }

            std::vector<Evolution::Organism> offspring;
            std::uniform_real_distribution<double> crossoverChance(0.0, 1.0);

            for (auto &[key, bySpecies] : candidates)
            {
                for (auto &[species, indices] : bySpecies)
                {
                    if (indices.size() < 2)
                        continue;
                    std::shuffle(indices.begin(), indices.end(), rng_);

                    for (size_t i = 0; i + 1 < indices.size(); i += 2)
                    {
                        if (crossoverChance(rng_) > params_.crossover.crossoverRate)
                            continue;

                        auto &parent1 = population_[indices[i]];
                        auto &parent2 = population_[indices[i + 1]];

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

        /// @brief Vérifie, pour chaque espèce présente dans plusieurs
        /// régions, si ses deux plus grands sous-groupes régionaux ont
        /// divergé génétiquement au-delà du seuil de façon soutenue — et
        /// scinde une nouvelle espèce le cas échéant, avec un vrai nom
        /// taxonomique.
        void checkSpeciation()
        {
            auto byRegionAndSpecies = groupByRegionAndSpecies();

            for (auto &[species, regionGroups] : bySpeciesRegionIndex(byRegionAndSpecies))
            {
                if (regionGroups.size() < 2)
                {
                    divergentStreak_[species] = 0;
                    continue;
                }

                // Les deux plus grands sous-groupes régionaux.
                std::vector<std::pair<long long, std::vector<size_t>>> sorted(regionGroups.begin(), regionGroups.end());
                std::sort(sorted.begin(), sorted.end(),
                          [](const auto &a, const auto &b) { return a.second.size() > b.second.size(); });

                const auto &groupA = sorted[0].second;
                const auto &groupB = sorted[1].second;
                if (groupA.size() < 3 || groupB.size() < 3)
                {
                    divergentStreak_[species] = 0;
                    continue;
                }

                double distance = averageInterGroupDistance(groupA, groupB);

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
            // parent, puis mute — pas un cerveau neuf au hasard.
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
                    divergentStreak_.erase(it->first);
                    it = brains_.erase(it);
                }
                else
                {
                    ++it;
                }
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
        /// stable — puis un nouveau candidat est proposé pour la fenêtre
        /// suivante.
        void evolveBrains()
        {
            auto snapshots = buildSnapshots();
            std::unordered_map<std::string, double> fitnessBySpecies;
            for (const auto &snap : snapshots)
                fitnessBySpecies[snap.speciesName] = snap.averageFitness;

            std::uniform_real_distribution<double> chance(0.0, 1.0);

            for (auto &[species, lineageBrain] : brains_)
            {
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
            std::unordered_map<std::string, std::vector<size_t>> bySpecies;
            std::unordered_map<std::string, std::set<Ecosystem::EnvironmentType>> biomesBySpecies;
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
            std::unordered_map<std::string, const LineageSnapshot *> snapshotByName;
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

        std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> groupByRegionAndSpecies() const
        {
            std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> result;
            for (size_t i = 0; i < population_.size(); ++i)
            {
                auto [gx, gy] = regionOf(population_[i]);
                result[regionKey(gx, gy)][population_[i].getSpecies()].push_back(i);
            }
            return result;
        }

        std::unordered_map<std::string, std::unordered_map<long long, std::vector<size_t>>>
        bySpeciesRegionIndex(const std::unordered_map<long long, std::unordered_map<std::string, std::vector<size_t>>> &byRegion) const
        {
            std::unordered_map<std::string, std::unordered_map<long long, std::vector<size_t>>> result;
            for (const auto &[region, bySpecies] : byRegion)
                for (const auto &[species, indices] : bySpecies)
                    result[species][region] = indices;
            return result;
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

        std::unordered_map<std::string, uint32_t> populationCountsBySpecies() const
        {
            std::unordered_map<std::string, uint32_t> counts;
            for (const auto &organism : population_)
                counts[organism.getSpecies()]++;
            return counts;
        }

        std::unordered_map<long long, uint32_t> populationCountsByRegion() const
        {
            std::unordered_map<long long, uint32_t> counts;
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
            std::unordered_map<std::string, std::vector<size_t>> bySpecies;
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

                std::unordered_map<long long, bool> regions;
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
            values.fertility = values.reproductionRate;
            values.neuralComplexity = values.intelligence;
            values.sensoryAcuity = values.hearingAcuity;
            return values;
        }
    };

} // namespace Serina::Simulation
