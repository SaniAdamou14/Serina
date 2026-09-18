# Contribuer à Serina

Merci de votre intérêt ! Ce projet vise à construire un simulateur évolutif modulaire et fiable. Cette version contient encore des écarts entre la vision documentée et l’implémentation actuelle — ce fichier clarifie où contribuer utilement.

## Table État des Fonctionnalités

| Fonctionnalité | Implémenté | Notes |
|----------------|------------|-------|
| Génome de base (8 traits, `SimulationAPI`) | ✅ | `Genome` + mutation/crossover simples |
| Génome avancé / PopulationManager | ✅ (isolé) | Intégré partiellement via `enableAdvancedPopulation()` |
| Écosystème nommé (`SerinaEcosystemSimulator`) | ✅ | Espèces réelles, backend du CLI et du dashboard web |
| Diversité génétique (mode avancé/`PopulationManager`) | ✅ | Calcul réel de distance génétique |
| Diversité génétique (mode écosystème) | ❌ | Re-tirée aléatoirement chaque génération (`SerinaSimulator.hpp:594`), pas calculée — voir README §Known limitations |
| Interactions écologiques complexes | ✅ | `simulateEcologicalInteractions()` appelée à chaque génération réelle |
| Adaptations / innovations évolutives | ✅ | Réellement acquises et persistées (vu en production : `lateral_line_enhancement`) |
| Physique (collisions simples) | ✅ | Pas encore d'optimisation SIMD/partition spatiale (code existe dans `PerformanceOptimizations.hpp`, non branché) |
| Spéciation / Extinction réelles | ✅ | `simulateSpeciation()`/`simulateExtinction()` appelées et comptées à chaque génération |
| NEAT / IA comportementale | ❌ | Code réel (`NEAT.hpp`) mais jamais instancié — `AI::NEATEvolution` référencée n'existe pas |
| API Node intégrée au core C++ | ✅ | Un seul moteur (`simulationEngine.js`), état persisté entre appels CLI |
| Export / Import complet état simulation | Partiel | `World::toJson()` (mode simple) ; état écosystème persisté via `--state-file` JSON |
| Tests unitaires structurés (framework) | ✅ | Catch2 v3, intégré à CTest (`ctest` depuis `build/`) |
| Bindings Python testés | ✅ | `pytest python/tests` (a trouvé et corrigé un vrai bug de binding sur `PhysicsEngine.update()`) |
| CI (build + tests) | ✅ | GitHub Actions : build+ctest (Linux/GCC), lint+typecheck+build web, sanity-check API |
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
 
Module Python attendu : `build/serina_py.*.pyd` (générateurs single-config, ex. MinGW Makefiles/Ninja) ou `build/Release/serina_py.*.pyd` (générateurs multi-config, ex. Visual Studio). `python/tests/conftest.py` cherche les deux automatiquement.

### Option Pybind11

Vous pouvez spécifier manuellement un chemin pybind11 si `find_package` échoue :

```bash
cmake -S . -B build -DPYBIND11_ROOT="C:/path/vers/pybind11"
```

## Ajout d’une Statistique

Selon le moteur concerné (voir README §Architecture pour la distinction) :

**Mode simple (`SimulationAPI`) :**
1. Étendre `PopulationStats` ou `SimulationStatistics`.
2. Ajuster `SimulationAPI::getStatistics()`.
3. Exposer côté Python dans `bindings.cpp`.
4. Mettre à jour `docs/STATISTICS_SCHEMA.md`.

**Mode écosystème (`SerinaEcosystemSimulator`, backend du CLI/dashboard) :**
1. Étendre `SpeciesSimulationStats` ou les compteurs globaux dans `SerinaSimulator.hpp`.
2. Exposer le champ dans `serina_cli.cpp` (`getEcosystemStatus`/`getWorldData`/`getGeneticData`).
3. Mettre à jour `docs/SERINA_CLI_SCHEMA.md` et le type TypeScript correspondant dans `web/src/types/index.ts`.
4. Consommer le champ dans le composant React concerné (`web/src/components/`).

## Qualité / Style

- C++: C++20, éviter new/delete directs (smart pointers) sauf allocations contrôlées.
- Pas de dépendance ajoutée sans discussion (ouvrir issue).
- Utiliser `const &` et `noexcept` quand pertinent.

## Roadmap Immédiate (Suggestions)

- [ ] Étendre la CI à Windows/MSVC (actuellement Linux/GCC uniquement)
- [ ] Wiring réel de NEAT/AdvancedGenetics dans `SerinaEcosystemSimulator::simulateGeneration()` (le code existe dans `NEAT.hpp`/`AdvancedGenetics.hpp` mais n'est appelé par aucun chemin d'exécution — voir `SerinaSimulator.hpp`)
- [ ] Une fois AdvancedGenetics branché : remplacer le tirage aléatoire de `geneticDiversity` (`SerinaSimulator.hpp:594`) par un vrai calcul de distance génétique
- [ ] Historique de tendances réel côté frontend (le backend expose déjà `/api/simulations/:id/trends`, non consommé par `web/`)
- [ ] Packaging Python (scikit-build-core)
- [ ] Authentification sur les routes API destructrices (aucune actuellement)

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
