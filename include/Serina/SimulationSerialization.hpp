#pragma once

// Sérialisation complète (aller-retour) d'une simulation vivante, pour la
// sauvegarde/reprise (Chantier H du plan de refonte RimWorld). Délibérément
// séparé de WorldSimulation.hpp/AdvancedGenetics.hpp/NEAT.hpp/
// PopulationManager.hpp : ces headers de simulation ne dépendent pas de
// nlohmann/json (seul ce fichier et DaemonProtocol.hpp le font), pour ne pas
// imposer cette dépendance à l'ancien pipeline (SerinaSimulator.hpp) ni aux
// tests qui n'en ont pas besoin.
//
// À la différence de DaemonProtocol.hpp (qui ne construit que des résumés à
// sens unique pour le protocole réseau -- IndividualSnapshot, RegionSnapshot,
// etc., déjà allégés), tout ce qui est sérialisé ici doit reconstruire un
// état RÉELLEMENT équivalent : génomes diploïdes complets (24 allèles par
// organisme, pas seulement le phénotype), topologie NEAT complète avec son
// propre générateur aléatoire, et le générateur aléatoire du simulateur
// lui-même -- voir le plan pour le détail de ce qui est sciemment REGÉNÉRÉ
// plutôt que sérialisé (grid_/environments_/constraints_, déterministes à
// partir de (params, seed)) et ce qui est sciemment IGNORÉ (interactions_,
// déjà inerte pour ce moteur -- voir Chantier F ; taxonomy_, déjà non
// déterministe à la construction même sans sauvegarde).

#include "WorldSimulation.hpp"
#include <nlohmann/json.hpp>
#include <sstream>

namespace Serina::Simulation
{
    using json = nlohmann::json;

    // === Genetics::Allele / GeneticTrait / AdvancedGenome ===

    inline json alleleToJson(const Genetics::Allele &a)
    {
        return json{{"value", a.value}, {"dominance", a.dominance}, {"isDominant", a.isDominant}, {"generation", a.generation}};
    }

    inline Genetics::Allele alleleFromJson(const json &j)
    {
        return Genetics::Allele(j.at("value").get<double>(), j.at("dominance").get<double>(),
                                 j.at("isDominant").get<bool>(), j.at("generation").get<uint32_t>());
    }

    inline json geneticTraitToJson(const Genetics::GeneticTrait &t)
    {
        return json{{"type", static_cast<int>(t.type)},
                     {"maternal", alleleToJson(t.alleles.first)},
                     {"paternal", alleleToJson(t.alleles.second)}};
    }

    inline Genetics::GeneticTrait geneticTraitFromJson(const json &j)
    {
        return Genetics::GeneticTrait(static_cast<Genetics::TraitType>(j.at("type").get<int>()),
                                       alleleFromJson(j.at("maternal")), alleleFromJson(j.at("paternal")));
    }

    /// @brief Les 24 allèles complets (12 traits x 2), pas seulement le
    /// phénotype -- perdre la dominance/l'origine de chaque allèle
    /// romprait un croisement ou une mutation futurs corrects.
    inline json genomeToJson(const Genetics::AdvancedGenome &g)
    {
        json traits = json::array();
        for (const auto &t : g.getTraits())
            traits.push_back(geneticTraitToJson(t));
        return json{{"traits", traits}, {"generation", g.getGeneration()}, {"lineageId", g.getLineageId()}, {"fitness", g.getFitness()}};
    }

    inline Genetics::AdvancedGenome genomeFromJson(const json &j)
    {
        std::vector<Genetics::GeneticTrait> traits;
        for (const auto &tj : j.at("traits"))
            traits.push_back(geneticTraitFromJson(tj));
        // generateNewLineageId=false : voir le commentaire sur ce paramètre
        // dans AdvancedGenetics.hpp -- on restaure l'id exact juste en
        // dessous, pas la peine de tirer un nouveau (et perturber le
        // générateur partagé de toutes les simulations du process).
        Genetics::AdvancedGenome genome(traits, j.at("generation").get<uint32_t>(), /*generateNewLineageId=*/false);
        genome.setFitness(j.value("fitness", 0.0));
        genome.setLineageId(j.at("lineageId").get<std::string>());
        return genome;
    }

    // === Evolution::Organism ===

    inline json organismToJson(const Evolution::Organism &o)
    {
        return json{
            {"id", o.getId()},
            {"species", o.getSpecies()},
            {"genome", genomeToJson(o.getGenome())},
            {"energy", o.getEnergy()},
            {"age", o.getAge()},
            {"alive", o.isAlive()},
            {"x", o.getX()},
            {"y", o.getY()},
            {"vx", o.getVX()},
            {"vy", o.getVY()}};
    }

    inline Evolution::Organism organismFromJson(const json &j)
    {
        auto genome = std::make_unique<Genetics::AdvancedGenome>(genomeFromJson(j.at("genome")));
        Evolution::Organism org(std::move(genome), j.at("species").get<std::string>());
        org.setId(j.at("id").get<uint64_t>());
        org.setEnergy(j.at("energy").get<double>());
        org.setAge(j.at("age").get<double>());
        org.setPosition(j.at("x").get<double>(), j.at("y").get<double>());
        org.setVelocity(j.value("vx", 0.0), j.value("vy", 0.0));
        org.setAlive(j.at("alive").get<bool>());
        // maxAge_ n'est jamais sérialisé : il est recalculé automatiquement
        // par le constructeur à partir du trait LONGEVITY du génome, qui
        // vient d'être restauré à l'identique -- pas besoin de le dupliquer.
        return org;
    }

    // === NEAT::NodeGene / ConnectionGene / NEATGenome ===

    inline json nodeGeneToJson(const NEAT::NodeGene &n)
    {
        return json{{"nodeId", n.nodeId}, {"type", static_cast<int>(n.type)}, {"activation", static_cast<int>(n.activation)}, {"bias", n.bias}, {"layer", n.layer}};
    }

    inline NEAT::NodeGene nodeGeneFromJson(const json &j)
    {
        NEAT::NodeGene n(j.at("nodeId").get<uint32_t>(), static_cast<NEAT::NodeType>(j.at("type").get<int>()),
                          static_cast<NEAT::ActivationType>(j.at("activation").get<int>()));
        n.bias = j.value("bias", 0.0);
        n.layer = j.value("layer", 0);
        return n;
    }

    inline json connectionGeneToJson(const NEAT::ConnectionGene &c)
    {
        return json{{"inNode", c.inNode}, {"outNode", c.outNode}, {"weight", c.weight}, {"enabled", c.enabled}, {"innovation", c.innovation}};
    }

    inline NEAT::ConnectionGene connectionGeneFromJson(const json &j)
    {
        NEAT::ConnectionGene c(j.at("inNode").get<uint32_t>(), j.at("outNode").get<uint32_t>(),
                                j.at("weight").get<double>(), j.at("innovation").get<uint32_t>());
        c.enabled = j.value("enabled", true);
        return c;
    }

    /// @brief Topologie NEAT complète, y compris son propre générateur
    /// aléatoire (état exact, pas juste une graine -- avancé à chaque
    /// mutation réelle du cerveau).
    inline json neatGenomeToJson(const NEAT::NEATGenome &g)
    {
        json nodes = json::array();
        for (const auto &n : g.getNodeGenes())
            nodes.push_back(nodeGeneToJson(n));
        json conns = json::array();
        for (const auto &c : g.getConnectionGenes())
            conns.push_back(connectionGeneToJson(c));
        return json{
            {"inputCount", g.getInputCount()},
            {"outputCount", g.getOutputCount()},
            {"fitness", g.getFitness()},
            {"speciesId", g.getSpeciesId()},
            {"nodeGenes", nodes},
            {"connectionGenes", conns},
            {"rngState", g.getRngState()}};
    }

    inline NEAT::NEATGenome neatGenomeFromJson(const json &j)
    {
        // La graine passée ici ne sert qu'à construire une topologie de
        // départ jetable (immédiatement écrasée juste en dessous, RNG
        // compris) -- son état lui-même n'a donc aucune importance.
        NEAT::NEATGenome genome(j.at("inputCount").get<uint32_t>(), j.at("outputCount").get<uint32_t>(), 1u);

        std::vector<NEAT::NodeGene> nodes;
        for (const auto &nj : j.at("nodeGenes"))
            nodes.push_back(nodeGeneFromJson(nj));
        genome.setNodeGenes(std::move(nodes));

        std::vector<NEAT::ConnectionGene> conns;
        for (const auto &cj : j.at("connectionGenes"))
            conns.push_back(connectionGeneFromJson(cj));
        genome.setConnectionGenes(std::move(conns));

        genome.setFitness(j.value("fitness", 0.0));
        genome.setSpeciesId(j.value("speciesId", 0u));
        genome.setRngState(j.at("rngState").get<std::string>());
        return genome;
    }

    // === LineageBrain / SpeciationEvent ===

    inline json lineageBrainToJson(const LineageBrain &lb)
    {
        return json{{"brain", neatGenomeToJson(lb.brain)}, {"stableBrain", neatGenomeToJson(lb.stableBrain)}, {"fitnessAtCheckpoint", lb.fitnessAtCheckpoint}, {"hasCheckpoint", lb.hasCheckpoint}};
    }

    inline LineageBrain lineageBrainFromJson(const json &j)
    {
        LineageBrain lb(neatGenomeFromJson(j.at("brain")));
        lb.stableBrain = neatGenomeFromJson(j.at("stableBrain"));
        lb.fitnessAtCheckpoint = j.value("fitnessAtCheckpoint", 0.0);
        lb.hasCheckpoint = j.value("hasCheckpoint", false);
        return lb;
    }

    // Nommé différemment de DaemonProtocol.hpp::speciationEventToJson (même
    // fonction en substance) pour éviter une ambiguïté de surcharge : les
    // deux sont trouvables par ADL sur un Simulation::SpeciationEvent depuis
    // n'importe quel appelant qui inclut les deux headers (DaemonProtocol.hpp
    // inclut celui-ci pour save/load).
    inline json serializeSpeciationEvent(const SpeciationEvent &e)
    {
        return json{{"parentSpecies", e.parentSpecies}, {"newSpecies", e.newSpecies}, {"generation", e.generation}, {"geneticDistanceAtSplit", e.geneticDistanceAtSplit}};
    }

    inline SpeciationEvent speciationEventFromJson(const json &j)
    {
        SpeciationEvent e;
        e.parentSpecies = j.at("parentSpecies").get<std::string>();
        e.newSpecies = j.at("newSpecies").get<std::string>();
        e.generation = j.at("generation").get<uint32_t>();
        e.geneticDistanceAtSplit = j.at("geneticDistanceAtSplit").get<double>();
        return e;
    }

    // === UnifiedWorldSimulator (point d'entrée) ===

    inline json UnifiedWorldSimulator::toJson() const
    {
        json j;
        j["seed"] = seed_;
        j["generation"] = generation_;

        // Seuls les champs scalaires de premier niveau de
        // WorldSimulationParameters sont sérialisés -- mutation_/crossover_/
        // neat_ restent aux valeurs par défaut à la reprise. Vérifié avant
        // d'écrire ce module : SimulationRegistry::create() (DaemonProtocol.hpp)
        // construit toujours `WorldSimulationParameters params{};` sans jamais
        // les personnaliser aujourd'hui -- si ça change un jour, ce module
        // devra être étendu en conséquence.
        j["params"] = {
            {"gridWidth", params_.gridWidth},
            {"gridHeight", params_.gridHeight},
            {"cellSize", params_.cellSize},
            {"speciationDistanceThreshold", params_.speciationDistanceThreshold},
            {"speciationIsolationGenerations", params_.speciationIsolationGenerations},
            {"maxAttemptsPerConstraintRetry", params_.maxAttemptsPerConstraintRetry},
            {"brainEvolutionInterval", params_.brainEvolutionInterval},
            {"foragingRate", params_.foragingRate}};

        json population = json::array();
        for (const auto &org : population_)
            population.push_back(organismToJson(org));
        j["population"] = population;

        json bioType = json::object();
        for (const auto &[name, type] : biologicalTypeOf_)
            bioType[name] = static_cast<int>(type);
        j["biologicalTypeOf"] = bioType;

        json divergent = json::object();
        for (const auto &[name, streak] : divergentStreak_)
            divergent[name] = streak;
        j["divergentStreak"] = divergent;

        json brains = json::object();
        for (const auto &[name, brain] : brains_)
            brains[name] = lineageBrainToJson(brain);
        j["brains"] = brains;

        json events = json::array();
        for (const auto &e : speciationEvents_)
            events.push_back(serializeSpeciationEvent(e));
        j["speciationEvents"] = events;

        std::ostringstream rngOss;
        rngOss << rng_;
        j["rngState"] = rngOss.str();

        // Compteurs globaux (partagés par tout le process) : sauvegardés
        // pour que la reprise sache jusqu'où les avancer sans reculer --
        // voir Organism::advanceNextIdTo()/InnovationCounter::advanceTo().
        j["nextOrganismId"] = Evolution::Organism::getNextId();
        j["nextInnovation"] = NEAT::InnovationCounter::getNext();

        return j;
    }

    inline std::unique_ptr<UnifiedWorldSimulator> UnifiedWorldSimulator::fromJson(const json &j)
    {
        WorldSimulationParameters params{};
        if (j.contains("params"))
        {
            const auto &pj = j.at("params");
            params.gridWidth = pj.value("gridWidth", params.gridWidth);
            params.gridHeight = pj.value("gridHeight", params.gridHeight);
            params.cellSize = pj.value("cellSize", params.cellSize);
            params.speciationDistanceThreshold = pj.value("speciationDistanceThreshold", params.speciationDistanceThreshold);
            params.speciationIsolationGenerations = pj.value("speciationIsolationGenerations", params.speciationIsolationGenerations);
            params.maxAttemptsPerConstraintRetry = pj.value("maxAttemptsPerConstraintRetry", params.maxAttemptsPerConstraintRetry);
            params.brainEvolutionInterval = pj.value("brainEvolutionInterval", params.brainEvolutionInterval);
            params.foragingRate = pj.value("foragingRate", params.foragingRate);
        }

        uint32_t seed = j.at("seed").get<uint32_t>();
        // Reconstruit grid_/environments_/constraints_ à l'identique --
        // déterministes à partir de (params, seed), jamais sérialisés
        // eux-mêmes (voir l'en-tête de ce fichier). interactions_ et
        // taxonomy_ restent à leur état par défaut post-construction,
        // délibérément (voir l'en-tête de ce fichier).
        auto sim = std::make_unique<UnifiedWorldSimulator>(params, seed);

        sim->generation_ = j.at("generation").get<uint32_t>();

        sim->population_.clear();
        sim->population_.reserve(j.at("population").size());
        for (const auto &oj : j.at("population"))
            sim->population_.push_back(organismFromJson(oj));

        sim->biologicalTypeOf_.clear();
        for (const auto &[name, val] : j.at("biologicalTypeOf").items())
            sim->biologicalTypeOf_[name] = static_cast<Taxonomy::BiologicalType>(val.get<int>());

        sim->divergentStreak_.clear();
        for (const auto &[name, val] : j.at("divergentStreak").items())
            sim->divergentStreak_[name] = val.get<uint32_t>();

        sim->brains_.clear();
        for (const auto &[name, val] : j.at("brains").items())
            sim->brains_.emplace(name, lineageBrainFromJson(val));

        sim->speciationEvents_.clear();
        for (const auto &ej : j.at("speciationEvents"))
            sim->speciationEvents_.push_back(speciationEventFromJson(ej));

        std::istringstream rngIss(j.at("rngState").get<std::string>());
        rngIss >> sim->rng_;

        Evolution::Organism::advanceNextIdTo(j.value("nextOrganismId", Evolution::Organism::getNextId()));
        NEAT::InnovationCounter::advanceTo(j.value("nextInnovation", NEAT::InnovationCounter::getNext()));

        return sim;
    }
}
