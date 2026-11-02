# V1 : l'histoire d'un monde d'oiseaux, jusqu'au bout

Objectif fixé par le propriétaire du projet : voir l'évolution des créatures sur une autre planète,
en reproduisant le déroulement de l'étude [*Serina*](https://sites.google.com/site/worldofserina/)
de Dylan Bajda, avec la robustesse de l'étude et une interface façon RimWorld complète.

Cette V1 remplace la Terre réelle comme cible. Les jalons M2 et I5 de `ROADMAP.md` ne sont plus
nécessaires pour elle : le monde est une lune inventée, pas la Terre.

## Ce que « reproduire » veut dire

L'étude est écrite ; notre simulation fait émerger ses résultats. Elle ne peut pas retrouver les mêmes
créatures, et la forcer à le faire reviendrait à raconter au lieu de simuler. Une V1 réussie suit donc
le **même déroulement** : le même monde de départ, les mêmes grandes étapes, et les mêmes types de
réponses évolutives, mesurés sur plusieurs mondes.

*Serina* est l'œuvre d'un autre auteur. Nous reprenons ses idées générales et sa chronologie comme
guide, pas ses textes, ses images ni les noms de ses créatures.

## Le déroulement à reproduire

Lu sur le site de l'étude le 2026-11-01. Le site se contredit parfois sur les limites exactes.

| Époque | Millions d'années | Ce qui s'y passe |
|---|---:|---|
| Fondation | avant 0 | Lune stérile rendue habitable, plantes et algues d'abord, puis faune du sol, invertébrés, poissons, et le canari en dernier |
| Hypostecene | 0 à 10 | Sans prédateurs, explosion des canaris, puis granivores, insectivores, pilleurs de nids et oiseaux au sol qui perdent le vol |
| Tempuscene | 11 à 50 | Prédateurs parmi les oiseaux, symbioses avec fourmis et plantes |
| Cryocene | 50 à 75 | Refroidissement, oiseaux marins géants, fouisseurs, grands brouteurs, vie de montagne |
| Thermocene | 75 à 175 | Longue chaleur, géants, nouvelles formes de développement, puis extinction de masse |
| Pangeacene | 178 à 250 | Continents réunis, reprise de la vie, retour des oiseaux percheurs |
| Ultimocene | 250 à 270 | Intelligence, début d'agriculture, nouvel âge glaciaire |
| Fin de l'Ultimocene | après 270 | Âge très chaud, puis fin du monde |

## Critères de la V1

Chacun est mesuré sur des graines non utilisées pour le réglage. Une case n'est cochée que si le banc
l'a montré.

**Le monde**
- [x] Saisons opposées entre hémisphères, latitude, pluie, foudre et feu.
- [x] Plantes qui poussent selon la température et la pluie (modèle de Miami, Lieth 1975).
- [ ] Lune paramétrable : taille, gravité, inclinaison, longueur de l'année.
- [ ] Grandes périodes froides et chaudes qui changent vraiment les biomes.
- [ ] Continents qui bougent et extinctions de masse.
- [ ] Plantes qui évoluent, au lieu d'un simple niveau par case.

**La fondation**
- [ ] Introduction par étapes, le canari en dernier, avec plus de groupes fondateurs.

**Les réponses évolutives**
- [x] Divergence du canari selon le régime (voir les limites ci-dessous).
- [ ] Les trois niches de régime occupées par des descendants du canari.
- [ ] Perte du vol et grands oiseaux au sol.
- [ ] Retour à la mer : il faut que l'habitat d'une espèce soit héritable. Il dépend aujourd'hui de
  son groupe, ce qui interdit aux oiseaux de devenir marins.
- [ ] Prédateurs spécialisés qui persistent.
- [ ] Symbioses entre espèces.
- [ ] Diversité de l'ordre de la centaine d'espèces, sans effondrement.
- [ ] Intelligence qui a un effet réel sur la survie.

**La durée**
- [ ] Un temps géologique : le moteur compte des ticks à l'échelle d'individus, il faut pouvoir
  dérouler des millions d'années sans simuler chaque individu à chaque instant.
- [ ] Un monde complet de la fondation à la fin, avec une mémoire consultable, sans plantage ni fuite.

**L'interface**
- [x] Carte vivante : plantes, morts, feu, pluie, éclairs, neige et saisons.
- [ ] Silhouettes tirées du génome de chaque lignée, à la place des gabarits.
- [ ] Alertes et lettres, calques complets, récit du monde façon RimWorld.
- [ ] Sauvegarde automatique, limite des parties oubliées, tests navigateur en CI.

## Limites connues

Elles viennent des mesures et ne doivent pas disparaître sans nouvelle mesure.

- Sur 6 graines à 20 000 ticks, avant le climat : 2 espèces d'oiseaux en médiane, 3 au mieux, 2 niches
  de régime sur 3, et les poissons vivants dans seulement 3 mondes sur 6.
- Le moteur compte environ 2,7 Ko par individu et 5 µs par individu et par tick. Le passage au temps
  géologique ne se fera pas en ajoutant des individus : c'est le chantier le plus lourd de cette V1.
- La carte fait 12 cases sur 9, ce qui limite l'isolement et donc la diversité.
