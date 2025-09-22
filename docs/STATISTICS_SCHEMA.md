# Simulation Statistics Schema

Ce document décrit le schéma JSON et la structure interne exposée par `SimulationAPI::getStatistics()`.

## Structure interne (C++)

```cpp
struct SimulationStatistics {
    uint64_t tick;               // Compteur de steps
    uint32_t generation;         // Génération logique (mode avancé: PopulationManager)
    uint64_t timestampMs;        // Epoch (ms)
    uint32_t speciesCount;       // Nombre d'espèces (mode simple) ou 1 en mode avancé agrégé
    uint64_t totalPopulation;    // Estimation ou population réelle (avancé)
    double averageFitness;
    double maxFitness;
    double minFitness;
    double geneticDiversity;     // Distance génétique moyenne (avancé)
    uint64_t births;             // Naissances cumulées (avancé)
    uint64_t deaths;             // Décès cumulés (avancé)
};
```

## JSON exemple (mode simple)

```json
{
  "tick": 1260,
  "generation": 3,
  "timestampMs": 1737600000123,
  "speciesCount": 5,
  "totalPopulation": 8421,
  "averageFitness": 12.43125,
  "maxFitness": 33.2,
  "minFitness": 3.14,
  "geneticDiversity": 0.0,
  "births": 0,
  "deaths": 0
}
```

## JSON exemple (mode avancé population)

```json
{
  "tick": 2400,
  "generation": 12,
  "timestampMs": 1737601111456,
  "speciesCount": 1,
  "totalPopulation": 978,
  "averageFitness": 0.582311,
  "maxFitness": 0.912300,
  "minFitness": 0.102211,
  "geneticDiversity": 0.238551,
  "births": 1342,
  "deaths": 1021
}
```

## Différences Mode Simple vs Avancé

| Champ | Simple | Avancé |
|-------|--------|--------|
| totalPopulation | Estimation dérivée des traits/énergie | Compte réel des organismes |
| speciesCount | Nombre de `Species` présents | 1 (agrégation) *pour l'instant* |
| geneticDiversity | 0.0 | Calcul réel distance génétique moyenne |
| births/deaths | 0 | Incréments cumulés PopulationManager |

## Évolution future

- Ajout `events` : speciation, extinction, migration
- Ajout histogrammes de traits (`traitDistributions`)
- Injections de tags/labels d'expériences

## Bonnes pratiques d'utilisation

- Ne pas interpréter `totalPopulation` simple comme un compte réel d'individus.
- Pour analyses scientifiques, activer le mode avancé via `enableAdvancedPopulation(true, initialSize)`.
- Timestamp est en millisecondes UTC (epoch). Convertir côté client selon fuseau.

## Mapping Python

Accès via :

```python
stats = api.getStatistics()
print(stats.totalPopulation, stats.averageFitness)
```

## Versionnage

Version initiale: v1 (ce fichier). Ajouter une section CHANGELOG en cas d'ajout de champs.
