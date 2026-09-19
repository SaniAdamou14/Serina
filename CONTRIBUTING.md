# Contribuer à Serina

Merci de votre intérêt ! Ce projet vise à construire un simulateur évolutif modulaire et fiable. Cette version contient encore des écarts entre la vision documentée et l’implémentation actuelle — ce fichier clarifie où contribuer utilement.

## Table État des Fonctionnalités

| Fonctionnalité | Implémenté | Notes |
|----------------|------------|-------|
| Génome de base (8 traits, `SimulationAPI`) | ✅ | `Genome` + mutation/crossover simples |
| Génome avancé / PopulationManager | ✅ (isolé) | Intégré partiellement via `enableAdvancedPopulation()` |
| Écosystème nommé (`SerinaEcosystemSimulator`) | ✅ (legacy) | Espèces réelles, mais n'est plus le backend du dashboard web depuis la Phase 9 — voir `UnifiedWorldSimulator`/`serina_daemon` ci-dessous. Toujours utilisable via `serina_cli` pour du scripting ponctuel |
| Moteur unifié (`UnifiedWorldSimulator`) | ✅ | Individus réels, grille de régions réelle, spéciation par divergence génétique mesurée — voir Phase 7 |
| `serina_daemon` : backend live du dashboard web | ✅ | Garde `UnifiedWorldSimulator` en mémoire, avance en continu sur un fil dédié, répond en JSON-lines sur TCP local — voir Phase 9, `docs/SERINA_DAEMON_PROTOCOL.md`. Remplace le pont `serina_cli` process-par-commande pour l'API Node |
| Diversité génétique (mode avancé/`PopulationManager`, mode unifié) | ✅ | Calcul réel de distance génétique |
| Diversité génétique (mode écosystème legacy) | ❌ | Re-tirée aléatoirement chaque génération (`SerinaSimulator.hpp:594`), pas calculée — dépassé par le moteur unifié, toujours vrai pour qui utilise `serina_cli` directement |
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

- [x] Phase 7 — Moteur unifié (fondation) : `include/Serina/WorldSimulation.hpp` fusionne individus à génome diploïde réel (`PopulationManager.hpp`), grille spatiale procédurale (`Region.hpp`), taxonomie, interactions écologiques et contraintes biologiques par individu. Diversité génétique calculée depuis `AdvancedGenome::geneticDistance()` (plus de tirage aléatoire), spéciation qui émerge d'une divergence génétique mesurée et soutenue géographiquement. 17 tests Catch2. Voir `docs/UNIFIED_ENGINE_DESIGN.md`. **Pas encore branché sur `serina_cli`/l'API/le frontend — voir phases suivantes.**
- [x] Phase 8 — Mouvement piloté par NEAT : `include/Serina/WorldSimulation.hpp` donne à chaque lignée vivante un vrai génome NEAT (`NEAT.hpp`, un réseau par espèce, pas par individu), évalué à chaque tick contre 7 entrées sensorielles réelles (énergie, ressources locale + 4 voisines, pression de prédation). Le cerveau évolue par ES (1+1) sur la fitness réellement mesurée de la lignée, hérité (muté, pas random) à la spéciation. Run de vérification (30 fondateurs, 80 générations) : population 150→182, 17 espèces émergentes, complexité de cerveau qui augmente réellement pour plusieurs lignées (23→26→29) via mutations structurelles acceptées. 4 nouveaux tests Catch2 (13 au total, 185 assertions). Voir `docs/UNIFIED_ENGINE_DESIGN.md`. **Toujours pas branché sur `serina_cli`/le frontend — Phase 9.**
- [x] Phase 9 — Backend live + nouveau contrat API : `serina_daemon` (`src/serina_daemon.cpp`, protocole dans `include/Serina/DaemonProtocol.hpp`) garde un ou plusieurs `UnifiedWorldSimulator` réels en mémoire et les avance en continu sur un fil planificateur, au lieu de relancer un process par commande. Protocole JSON-lines sur TCP local (`docs/SERINA_DAEMON_PROTOCOL.md`) exposant régions (grille réelle, une entrée par case avec climat/ressources/pressions réels et le compte réel d'individus dedans), individus (position/énergie/âge réels par organisme vivant) et lignées (fitness/diversité génétique/complexité de cerveau NEAT réels + historique complet des spéciations). `api/services/simulationEngine.js` et `daemonClient.js` réécrits pour parler au daemon via une connexion TCP persistante plutôt que de spawn un process par commande ; interface publique (`startSimulation`/`pauseSimulation`/.../événements EventEmitter) inchangée, donc `routes/serina.js` et `websocket.js` n'ont pas eu besoin de changer. Vérifié de bout en bout : un process `serina_daemon` séparé avance réellement en arrière-plan (15 générations en ~2s à 10 ticks/s), `pause` arrête réellement la progression, et l'API REST relaie ces données réelles (spéciation observée en vol, biomes multiples, complexité de cerveau croissante) à travers toute la pile. 13 tests Catch2 pour le protocole (dont un round-trip réel sur une vraie socket TCP), frontend retypé et re-vérifié (`tsc`, `eslint`, `vite build`) contre le nouveau schéma sans données inventées (le score de risque d'extinction de l'ancien moteur, qui n'existe pas dans `UnifiedWorldSimulator`, a été retiré plutôt que simulé). **Pas de sauvegarde sur disque pour l'instant — l'état du daemon vit en mémoire (voir le protocole, section "ce qui manque encore") ; `serina_cli` reste utilisable tel quel pour du scripting contre l'ancien moteur.**
- [ ] Phase 10 — Interface façon RimWorld : carte de régions 2D (consommant `regions`/`individuals` en temps réel), panneaux d'inspection par individu/lignée, écrans de paramétrage réels, visualisation de l'arbre de spéciation
- [ ] Étendre la CI à Windows/MSVC (actuellement Linux/GCC uniquement)
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
