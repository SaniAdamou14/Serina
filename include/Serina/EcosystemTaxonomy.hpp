#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <random>
#include <memory>
#include <algorithm>
#include <sstream>

namespace Serina::Taxonomy
{

    /// @brief Types biologiques principaux
    enum class BiologicalType
    {
        BIRD,        ///< Oiseaux (Canaris et descendants)
        FISH,        ///< Poissons (Xiphophorus, Poecilia)
        ARTHROPOD,   ///< Arthropodes (fourmis, criquets, etc.)
        MOLLUSC,     ///< Mollusques (escargots, limaces)
        CNIDARIAN,   ///< Cnidaires (hydres, méduses)
        ANNELID,     ///< Annélides (vers de terre)
        PLANT,       ///< Plantes (tournesols, graminées)
        CRUSTACEAN   ///< Crustacés (écrevisses, crevettes)
    };

    /// @brief Niveaux taxonomiques
    enum class TaxonomicRank
    {
        KINGDOM,
        PHYLUM,
        CLASS,
        ORDER,
        FAMILY,
        GENUS,
        SPECIES,
        SUBSPECIES
    };

    /// @brief Informations taxonomiques complètes
    struct TaxonomicInfo
    {
        std::string kingdom;
        std::string phylum;
        std::string class_;
        std::string order;
        std::string family;
        std::string genus;
        std::string species;
        std::string subspecies;
        std::string commonName;
        BiologicalType type;
        uint32_t generation; ///< Génération d'apparition

        /// @brief Obtient le nom scientifique complet
        std::string getScientificName() const
        {
            if (!subspecies.empty())
                return genus + " " + species + " " + subspecies;
            return genus + " " + species;
        }

        /// @brief Obtient la classification complète
        std::string getFullClassification() const
        {
            return kingdom + ";" + phylum + ";" + class_ + ";" + order + ";" + family + ";" + genus + ";" + species;
        }
    };

    /// @brief Générateur de noms scientifiques automatique
    class TaxonomicNameGenerator
    {
    private:
        std::mt19937 rng_;
        
        // Bases linguistiques pour génération de noms
        std::vector<std::string> latinRoots_ = {
            "aero", "alba", "amphi", "angusti", "aqua", "brachy", "cardi", "cephalo",
            "chloro", "chryso", "crypto", "deuter", "echino", "erythro", "gastro", "geo",
            "gymno", "halo", "hetero", "homo", "hydro", "leuko", "macro", "mega",
            "micro", "neo", "oligo", "pachy", "paleo", "para", "phago", "photo",
            "pseudo", "rhino", "rhizo", "sclero", "steno", "thermo", "ultra", "xero"
        };

        std::vector<std::string> speciesSuffixes_ = {
            "ensis", "icus", "atus", "oides", "ensis", "ilis", "anus", "osus",
            "eus", "inus", "arius", "iensis", "alis", "aster", "ensis", "ifer"
        };

        std::vector<std::string> morphologySuffixes_ = {
            "rostris", "caudis", "pinnis", "alatus", "cristatus", "striatus",
            "maculatus", "lineatus", "reticulatus", "punctatus", "fasciatus"
        };

        // Compteurs pour assurer l'unicité
        std::unordered_map<std::string, uint32_t> genusCounters_;
        std::unordered_map<std::string, uint32_t> speciesCounters_;

    public:
        TaxonomicNameGenerator(uint32_t seed = std::random_device{}())
            : rng_(seed) {}

        /// @brief Génère un nom de genre basé sur les caractéristiques
        std::string generateGenus(BiologicalType type, const std::vector<std::string>& traits = {})
        {
            std::string prefix = getTypePrefix(type);
            std::string root = latinRoots_[rng_() % latinRoots_.size()];
            
            // Ajouter un trait morphologique si disponible
            if (!traits.empty())
            {
                std::string trait = traits[rng_() % traits.size()];
                if (trait.length() > 3)
                    root = trait.substr(0, 4) + root.substr(2);
            }

            std::string genus = capitalizeFirst(prefix + root);
            
            // Assurer l'unicité
            if (genusCounters_[genus] > 0)
            {
                genus += std::to_string(genusCounters_[genus]);
            }
            genusCounters_[genus]++;

            return genus;
        }

        /// @brief Génère un nom d'espèce descriptif
        std::string generateSpecies(const std::string& genus, const std::vector<std::string>& characteristics = {})
        {
            std::string species;
            
            if (!characteristics.empty())
            {
                // Basé sur une caractéristique morphologique/écologique
                std::string trait = characteristics[rng_() % characteristics.size()];
                std::string suffix = morphologySuffixes_[rng_() % morphologySuffixes_.size()];
                species = trait + suffix;
            }
            else
            {
                // Nom générique
                std::string root = latinRoots_[rng_() % latinRoots_.size()];
                std::string suffix = speciesSuffixes_[rng_() % speciesSuffixes_.size()];
                species = root + suffix;
            }

            // Assurer l'unicité dans le genre
            std::string fullName = genus + "_" + species;
            if (speciesCounters_[fullName] > 0)
            {
                species += std::to_string(speciesCounters_[fullName]);
            }
            speciesCounters_[fullName]++;

            return toLowerCase(species);
        }

        /// @brief Génère une sous-espèce basée sur l'adaptation
        std::string generateSubspecies(const std::string& species, const std::string& environment)
        {
            std::string envSuffix;
            if (environment == "desert") envSuffix = "deserti";
            else if (environment == "forest") envSuffix = "silvestris";
            else if (environment == "mountain") envSuffix = "montanus";
            else if (environment == "ocean") envSuffix = "marinus";
            else if (environment == "freshwater") envSuffix = "lacustris";
            else if (environment == "arctic") envSuffix = "arcticus";
            else if (environment == "tropical") envSuffix = "tropicalis";
            else envSuffix = "adaptatus";

            return species + "_" + envSuffix;
        }

        /// @brief Crée une taxonomie complète pour une nouvelle espèce
        TaxonomicInfo createTaxonomy(BiologicalType type, uint32_t generation,
                                   const std::vector<std::string>& traits = {},
                                   const std::string& environment = "",
                                   const std::string& parentGenus = "")
        {
            TaxonomicInfo info;
            info.type = type;
            info.generation = generation;

            // Classification de base selon le type
            setBaseTaxonomy(info, type);

            // Génération du nom
            if (!parentGenus.empty())
            {
                info.genus = parentGenus;
            }
            else
            {
                info.genus = generateGenus(type, traits);
            }

            info.species = generateSpecies(info.genus, traits);

            // Sous-espèce si adaptation environnementale
            if (!environment.empty())
            {
                info.subspecies = generateSubspecies(info.species, environment);
            }

            // Nom commun généré
            info.commonName = generateCommonName(info, traits);

            return info;
        }

    private:
        std::string getTypePrefix(BiologicalType type)
        {
            switch (type)
            {
            case BiologicalType::BIRD: return "avi";
            case BiologicalType::FISH: return "ichthyo";
            case BiologicalType::ARTHROPOD: return "arthro";
            case BiologicalType::MOLLUSC: return "gastro";
            case BiologicalType::CNIDARIAN: return "cnido";
            case BiologicalType::ANNELID: return "lumbricu";
            case BiologicalType::PLANT: return "phyto";
            case BiologicalType::CRUSTACEAN: return "crusta";
            default: return "serina";
            }
        }

        void setBaseTaxonomy(TaxonomicInfo& info, BiologicalType type)
        {
            info.kingdom = "Animalia";
            
            switch (type)
            {
            case BiologicalType::BIRD:
                info.phylum = "Chordata";
                info.class_ = "Aves";
                info.order = "Passeriformes";
                info.family = "Fringillidae";
                break;
                
            case BiologicalType::FISH:
                info.phylum = "Chordata";
                info.class_ = "Actinopterygii";
                info.order = "Cyprinodontiformes";
                info.family = "Poeciliidae";
                break;
                
            case BiologicalType::ARTHROPOD:
                info.phylum = "Arthropoda";
                info.class_ = "Insecta";
                info.order = "Hymenoptera";
                info.family = "Formicidae";
                break;
                
            case BiologicalType::MOLLUSC:
                info.phylum = "Mollusca";
                info.class_ = "Gastropoda";
                info.order = "Stylommatophora";
                info.family = "Achatinidae";
                break;
                
            case BiologicalType::CNIDARIAN:
                info.phylum = "Cnidaria";
                info.class_ = "Hydrozoa";
                info.order = "Hydroida";
                info.family = "Hydridae";
                break;
                
            case BiologicalType::ANNELID:
                info.phylum = "Annelida";
                info.class_ = "Clitellata";
                info.order = "Haplotaxida";
                info.family = "Lumbricidae";
                break;
                
            case BiologicalType::PLANT:
                info.kingdom = "Plantae";
                info.phylum = "Tracheophyta";
                info.class_ = "Magnoliopsida";
                info.order = "Asterales";
                info.family = "Asteraceae";
                break;
                
            case BiologicalType::CRUSTACEAN:
                info.phylum = "Arthropoda";
                info.class_ = "Malacostraca";
                info.order = "Decapoda";
                info.family = "Astacidae";
                break;
            }
        }

        std::string generateCommonName(const TaxonomicInfo& info, const std::vector<std::string>& traits)
        {
            std::string baseName;
            
            switch (info.type)
            {
            case BiologicalType::BIRD: baseName = "Serina"; break;
            case BiologicalType::FISH: baseName = "Fish"; break;
            case BiologicalType::ARTHROPOD: baseName = "Insect"; break;
            case BiologicalType::MOLLUSC: baseName = "Snail"; break;
            case BiologicalType::CNIDARIAN: baseName = "Hydroid"; break;
            case BiologicalType::ANNELID: baseName = "Worm"; break;
            case BiologicalType::PLANT: baseName = "Plant"; break;
            case BiologicalType::CRUSTACEAN: baseName = "Crawler"; break;
            }

            if (!traits.empty())
            {
                std::string trait = traits[rng_() % traits.size()];
                baseName = capitalizeFirst(trait) + " " + baseName;
            }

            if (info.generation > 0)
            {
                baseName += " Gen" + std::to_string(info.generation);
            }

            return baseName;
        }

        std::string capitalizeFirst(const std::string& str)
        {
            if (str.empty()) return str;
            std::string result = str;
            result[0] = std::toupper(result[0]);
            return result;
        }

        std::string toLowerCase(const std::string& str)
        {
            std::string result = str;
            std::transform(result.begin(), result.end(), result.begin(), ::tolower);
            return result;
        }
    };

    /// @brief Gestionnaire de taxonomie pour tout l'écosystème
    class EcosystemTaxonomy
    {
    private:
        TaxonomicNameGenerator nameGenerator_;
        std::unordered_map<std::string, TaxonomicInfo> species_;
        std::unordered_map<BiologicalType, std::vector<std::string>> typeSpecies_;
        uint32_t currentGeneration_;

    public:
        EcosystemTaxonomy(uint32_t seed = std::random_device{}())
            : nameGenerator_(seed), currentGeneration_(0) {}

        /// @brief Enregistre une nouvelle espèce
        std::string registerNewSpecies(BiologicalType type, const std::vector<std::string>& traits = {},
                                     const std::string& environment = "", const std::string& parentSpecies = "")
        {
            std::string parentGenus;
            if (!parentSpecies.empty() && species_.find(parentSpecies) != species_.end())
            {
                parentGenus = species_[parentSpecies].genus;
            }

            TaxonomicInfo info = nameGenerator_.createTaxonomy(type, currentGeneration_, 
                                                             traits, environment, parentGenus);
            
            std::string speciesKey = info.getScientificName();
            species_[speciesKey] = info;
            typeSpecies_[type].push_back(speciesKey);

            return speciesKey;
        }

        /// @brief Obtient les informations taxonomiques
        const TaxonomicInfo* getSpeciesInfo(const std::string& speciesName) const
        {
            auto it = species_.find(speciesName);
            return (it != species_.end()) ? &it->second : nullptr;
        }

        /// @brief Liste toutes les espèces d'un type
        std::vector<std::string> getSpeciesByType(BiologicalType type) const
        {
            auto it = typeSpecies_.find(type);
            return (it != typeSpecies_.end()) ? it->second : std::vector<std::string>();
        }

        /// @brief Avance à la génération suivante
        void nextGeneration() { currentGeneration_++; }

        /// @brief Obtient la génération actuelle
        uint32_t getCurrentGeneration() const { return currentGeneration_; }

        /// @brief Obtient toutes les espèces enregistrées
        const std::unordered_map<std::string, TaxonomicInfo>& getAllSpecies() const
        {
            return species_;
        }
    };

} // namespace Serina::Taxonomy