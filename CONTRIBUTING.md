# Contribuer à Serina

Merci de votre intérêt ! Ce projet vise à construire un simulateur évolutif modulaire et fiable. Cette version contient encore des écarts entre la vision documentée et l’implémentation actuelle — ce fichier clarifie où contribuer utilement.

## Table État des Fonctionnalités

| Fonctionnalité | Implémenté | Notes |
|----------------|------------|-------|
| Génome de base (8 traits, `SimulationAPI`) | ✅ | `Genome` + mutation/crossover simples |
| Génome avancé / PopulationManager | ✅ (isolé) | Intégré partiellement via `enableAdvancedPopulation()` |
| Écosystème nommé (`SerinaEcosystemSimulator`) | ✅ (legacy) | Espèces réelles, mais n'est plus le backend du dashboard web depuis la Phase 9 — voir `UnifiedWorldSimulator`/`serina_daemon` ci-dessous. Toujours utilisable via `serina_cli` pour du scripting ponctuel |
| Moteur unifié (`UnifiedWorldSimulator`) | ✅ | Individus réels, grille de régions réelle, spéciation par divergence génétique mesurée — voir Phase 7 |
| `serina_daemon` : backend live du dashboard web | ✅ | Garde `UnifiedWorldSimulator` en mémoire, avance en continu sur un fil dédié, répond en JSON-lines sur TCP local — voir Phase 9, `docs/SERINA_DAEMON_PROTOCOL.md`. Pont vers l'API Node via connexion TCP persistante |
| Diversité génétique (mode avancé/`PopulationManager`, mode unifié) | ✅ | Calcul réel de distance génétique |
| Diversité génétique (mode écosystème legacy) | ⚠️ | Dans certains chemins legacy peut être synthétique ; le dashboard live via daemon utilise les valeurs réelles du moteur unifié |
| Interactions écologiques complexes | ✅ | `simulateEcologicalInteractions()` (legacy) et `applySurvivalAndInteractions()` (unifié) appelées à chaque génération réelle |
| Adaptations / innovations évolutives | ✅ | Réellement acquises et persistées (vu en production : `lateral_line_enhancement`) |
| Physique (collisions simples) | ✅ | Pas encore d'optimisation SIMD/partition spatiale (code existe dans `PerformanceOptimizations.hpp`, non branché) |
| Spéciation / Extinction réelles | ✅ | Legacy : `simulateSpeciation()`/`simulateExtinction()` comptées par génération. Unifié : spéciation par divergence génétique mesurée et soutenue (Phase 7), extinction par disparition réelle de population |
| NEAT / IA comportementale | ✅ | Un cerveau NEAT réel par lignée (`WorldSimulation.hpp`), pilote le mouvement, évolue par (1+1)-ES sur la fitness réellement mesurée (Phase 8), exposé au dashboard web via `serina_daemon` depuis la Phase 9 |
| API Node intégrée au core C++ | ✅ | `simulationEngine.js` parle à `serina_daemon` (TCP JSON-lines, un process persistant) plutôt qu'à relancer un process par commande |
| Export / Import complet état simulation | Partiel | `World::toJson()` (mode simple) ; état écosystème legacy persisté via `--state-file` JSON. `serina_daemon` n'a pas encore de sauvegarde sur disque : l'état vit en mémoire tant qu'il tourne (voir `docs/SERINA_DAEMON_PROTOCOL.md`, "ce qui manque encore") |
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

- [x] Phase 7 — Moteur unifié (fondation) : `UnifiedWorldSimulator` avec individus diploïdes réels, grille `Region`, taxonomie, interactions écologiques, contraintes biologiques, diversité génétique calculée depuis `AdvancedGenome::geneticDistance()`, spéciation par divergence mesurée + isolement géographique. (17 tests Catch2) — voir `docs/UNIFIED_ENGINE_DESIGN.md`
- [x] Phase 8 — Mouvement piloté par NEAT : cerveau NEAT par lignée, entrées sensorielles réelles, évolution par (1+1)-ES sur fitness mesurée, héritage à la spéciation. (13 tests Catch2 au total) — voir `docs/UNIFIED_ENGINE_DESIGN.md`
- [x] Phase 9 — Backend live + nouveau contrat API : `serina_daemon` (TCP JSON-lines sur `127.0.0.1:7331`) garde `UnifiedWorldSimulator` en mémoire, avance sur thread dédié. `api/services/simulationEngine.js` + `daemonClient.js` pontent vers le daemon. Protocole documenté dans `docs/SERINA_DAEMON_PROTOCOL.md`. Frontend retypé sans données inventées.
- [x] Phase 10 — Interface façon RimWorld : `WorldMap` avec grille réelle + individus, inspection cliquable, arbre phylogénétique réel depuis `speciationEvents`, contrôles de vitesse réels. Correction biomes manquants (DESERT/ARCTIQUE/TROPICAL). — voir commits récents
- [x] Fix post-Phase-10 — Revenu d'alimentation réel (foraging) pour éviter extinction garantie ; sélection naturelle effective vérifiée sur 2000 générations.
- [x] Historique de tendances réel côté frontend : `HistoryView` consomme `GET /api/simulations/:id/trends` via `apiService.getPopulationTrends()` (PR #1).
- [ ] Étendre la CI à Windows/MSVC (actuellement Linux/GCC uniquement)
- [ ] Packaging Python (scikit-build-core)
- [ ] Authentification sur les routes API destructrices (aucune actuellement)
- [ ] Persistance état `serina_daemon` sur disque (sauvegarde/chargement) — voir `docs/SERINA_DAEMON_PROTOCOL.md`

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
