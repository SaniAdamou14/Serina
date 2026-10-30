# Contribuer à Serina

Merci de votre intérêt ! Le cap du projet et le jalon en cours sont dans
[`docs/ROADMAP.md`](docs/ROADMAP.md) : commencez par là.

## Principes

1. Mesurer plutôt que raconter : un changement du modèle s'accompagne d'une mesure
   sur plusieurs graines, pas d'une seule exécution qui semble correcte.
2. Faire avancer le jalon en cours avant d'ajouter du contenu.
3. Ajouter des tests à chaque changement : au moins le cas normal et un cas limite.
4. Préférer des PR petites et thématiques.
5. Documenter toute nouvelle structure JSON dans `docs/`.

## Avant d'ouvrir une PR

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
ctest --test-dir build --output-on-failure -C Release

cd web
npm run type-check
npm run lint
npm run build
```

La CI lance ces vérifications, avec le C++ sous Linux (GCC) et Windows (MSVC).

## Déterminisme

Une graine doit produire le même monde sur tous les compilateurs :

- Utiliser `Det::` (`include/Serina/DeterministicRandom.hpp`) à la place des
  distributions `std::`, de `std::shuffle`, `std::exp`, `std::log` et `std::tanh`.
- Ne pas faire dépendre un résultat de l'ordre de parcours d'un `unordered_map`,
  ni d'un `std::sort` sur des éléments égaux.
- Si le modèle change volontairement, mettre à jour l'empreinte de référence de
  `tests/test_determinism.cpp` dans le même commit, et vérifier qu'elle est identique
  sous Linux et Windows.

## Style

- C++20, sans `new`/`delete` directs.
- Pas de nouvelle dépendance sans discussion préalable dans une issue.
- Utiliser `const &` et `noexcept` quand c'est pertinent.

## Processus de PR

1. Faire un fork et une branche `feature/...` ou `fix/...`.
2. Lancer les vérifications ci-dessus.
3. Décrire clairement le changement et son impact sur l'API.

Ouvrez une issue pour clarifier un point de conception, proposer une architecture ou
préparer un refactor important.
