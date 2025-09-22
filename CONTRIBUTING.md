# Contribuer à Serina

Merci de votre intérêt ! Ce projet vise à construire un simulateur évolutif modulaire et fiable. Cette version contient encore des écarts entre la vision documentée et l’implémentation actuelle — ce fichier clarifie où contribuer utilement.

## Table État des Fonctionnalités

| Fonctionnalité | Implémenté | Notes |
|----------------|------------|-------|
| Génome de base (8 traits) | ✅ | `Genome` + mutation/crossover simples |
| Génome avancé / PopulationManager | ✅ (isolé) | Intégré partiellement via `enableAdvancedPopulation()` |
| Diversité génétique | ✅ (avancé) | Fournie par `PopulationManager` |
| Interactions écologiques complexes | ⏳ | Structures headers, logique non intégrée boucle principale |
| Physique (collisions simples) | ✅ | Pas encore d'optimisation SIMD/partition spatiale |
| Spéciation / Extinction réelles | ⏳ | Hooks possibles dans PopulationManager |
| NEAT / IA comportementale | ❌ | Planifié (roadmap) |
| API Node intégrée au core C++ | ⏳ | Actuellement indépendante / mock partiel |
| Export / Import complet état simulation | Partiel | `World::toJson()` seulement |
| Tests unitaires structurés (framework) | ❌ | Assertions manuelles pour l’instant |
| CI (build + tests) | ❌ | À ajouter (GitHub Actions) |
| Packaging Python (wheel) | ❌ | Pas de `pyproject.toml` encore |

## Principes de Contribution

1. Favoriser d’abord l’intégration cohérente avant d’ajouter de nouvelles features.
2. Garder l’API publique stable (`SimulationAPI`, bindings Python) – proposer un préfixe EXPERIMENTAL_ si nécessaire.
3. Ajouter des tests pour chaque ajout (C++ ou Python). Prévoir au moins : happy path + edge case.
4. Préférer des PRs petites et thématiques.
5. Documenter toute nouvelle structure JSON dans `docs/`.

## Guide Rapide de Build


```bash
cmake -S . -B build -DBUILD_PYTHON_MODULE=ON -DBUILD_TESTS=ON
cmake --build build --config Release
```
 
Module Python attendu (Windows): `build/Release/serina_py.*.pyd`

### Option Pybind11

Vous pouvez spécifier manuellement un chemin pybind11 si `find_package` échoue :

```bash
cmake -S . -B build -DPYBIND11_ROOT="C:/path/vers/pybind11"
```

## Ajout d’une Statistique

1. Étendre `PopulationStats` ou `SimulationStatistics`.
2. Ajuster `SimulationAPI::getStatistics()`.
3. Exposer côté Python dans `bindings.cpp`.
4. Mettre à jour `docs/STATISTICS_SCHEMA.md`.

## Qualité / Style

- C++: C++20, éviter new/delete directs (smart pointers) sauf allocations contrôlées.
- Pas de dépendance ajoutée sans discussion (ouvrir issue).
- Utiliser `const &` et `noexcept` quand pertinent.

## Roadmap Immédiate (Suggestions)

- [ ] CI (GitHub Actions) multi-plateforme
- [ ] Migration vers un framework de tests (Catch2 / GoogleTest)
- [ ] Intégration interactions écologiques dans boucle avancée
- [ ] Ajout index spatial (grid) pour collisions
- [ ] Packaging Python (scikit-build-core)
- [ ] Uniformisation API backend Node → Core

## Process Pull Request

1. Fork + branche nommée `feature/...` ou `fix/...`.
2. Lancer tests locaux.
3. PR avec description claire + mention des impacts API.
4. Révision : cohérence, clarté, documentation.

## Communication

Ouvrir une issue pour :

- Clarification de design
- Proposition d’architecture
- Refactor potentiellement disruptif

Merci de contribuer à faire évoluer Serina !
