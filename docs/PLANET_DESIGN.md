# La planète à deux échelles

Enquête menée avant de coder, à la demande du propriétaire, le 2026-11-06. Elle prépare le plus gros changement
d'architecture du projet. Rien ici n'est encore implémenté.

## Le constat

Aujourd'hui, la carte 2D est toute la planète : 12 cases sur 9, enroulées sur le globe depuis la PR #26. Cliquer
n'importe où sur le globe ramène donc à une case de cette même carte. Le propriétaire veut ce que fait RimWorld :
un globe de très nombreuses tuiles, une grande carte 2D propre à chaque tuile, et des marqueurs sur lesquels cliquer.

Le moteur actuel ne peut pas simplement grandir. Un monde d'environ 3000 individus coûte environ 33 ms par tick
(mesuré par les bancs), et 2,7 Ko par individu. Une planète de milliers de tuiles simulées individu par individu
dépasserait de loin la machine de développement (7,5 Go de mémoire, Radeon intégrée).

## Ce que fait RimWorld

Faits relevés sur le [wiki officiel](https://rimworldwiki.com/), avec leur page. Ce qui n'y figure pas est signalé.

- **Le globe** est fait d'hexagones et de 12 pentagones, ce qui pave la sphère sans trou
  ([World generation](https://rimworldwiki.com/wiki/World_generation)). La couverture de la planète se règle (30, 50
  ou 100 %). Le nombre de tuiles n'est pas documenté.
- **Chaque tuile** porte un biome, une altitude, un relief (plat, collines, montagnes), une pluie annuelle, une
  température moyenne tirée du biome, de l'altitude et de la latitude, des rivières, des routes et des noms de lieux.
- **Le biome** découle de plages de température, de pluie et de marécage ([Biomes](https://rimworldwiki.com/wiki/Biomes)).
- **La génération** pose les continents, puis les rivières, qui naissent là où il pleut et coulent vers la mer.
- **La carte locale** fait 200 à 325 cases de côté selon le réglage, 250 par défaut. Le biome de la tuile fixe sa
  flore, sa faune et ses dangers. Une tuile de rivière donne une carte traversée par la rivière. Une tuile qui touche la
  mer donne une carte avec sa côte ([Landmarks](https://rimworldwiki.com/wiki/Landmarks)).
- **Hors des cartes ouvertes**, la simulation est abstraite : les caravanes se reposent, mangent et avancent selon leur
  charge et le terrain ([Caravan](https://rimworldwiki.com/wiki/Caravan)). Une colonie par défaut, jusqu'à 5 en option.
  Le wiki ne dit pas ce qui est simulé sur les tuiles jamais ouvertes.
- **Le climat** : plus froid en altitude et loin de l'équateur, saisons plus marquées vers les pôles, opposées entre
  hémisphères, année de 60 jours ([Time](https://rimworldwiki.com/wiki/Time)). Les formules ne sont pas publiées.
- **Les marqueurs** : colonies, bases de factions, sites générés pour une rencontre, camps, ruines, lieux remarquables
  ([Site](https://rimworldwiki.com/wiki/Site)).
- **La fiche d'une tuile** montre biome, altitude, pluie, températures moyennes, saison de culture et fuseau horaire
  ([World](https://rimworldwiki.com/wiki/World)).

La leçon : RimWorld ne simule en détail que les cartes ouvertes, et garde le reste de la planète en données de tuile.

## Ce que l'étude Serina demande

D'après la transcription de la vidéo d'Ego, *Serina : Le Grand Simulateur d'Évolution* : une lune des deux tiers de la
Terre, un supercontinent en arc dont les grandes masses de terre sont reliées par des isthmes étroits, un climat chaud
et humide d'environ 16 °C de moyenne sans calotte glaciaire, des îles au milieu de l'océan près de l'équateur, et des
continents qui dérivent sur des centaines de millions d'années. L'isolement par l'océan et les îles y fait apparaître
des espèces.

Ces repères servent de cadre de départ, pas de scénario : chaque planète est générée différemment.

## La proposition

### Deux échelles

**La planète** est une grille géodésique d'hexagones et de 12 pentagones, comme RimWorld. Chaque tuile garde :

- son milieu : biome, altitude, relief, pluie, température selon la latitude, l'altitude et la saison, plantes ;
- pour chaque espèce présente, une population résumée : effectif, et moyenne et variance de chaque trait.

C'est un modèle de métapopulation, éprouvé en biologie des populations. À chaque pas, sur chaque tuile :

- croissance limitée par les plantes, avec la même pousse que le moteur actuel (modèle de Miami) ;
- prédation selon le régime, comme la chasse actuelle ;
- sélection sur la moyenne des traits selon les mêmes coûts et gains que les individus ;
- dérive, d'autant plus forte que l'effectif est petit ;
- migration vers les tuiles voisines selon la dispersion et l'habitat ;
- spéciation quand deux populations isolées divergent, avec le critère actuel ; extinction sous un individu.

**La carte locale** est le moteur actuel, appliqué à une seule tuile. Quand on ouvre une tuile, ses individus sont tirés
de la population résumée, avec des génomes autour des moyennes et des variances. Quand on la quitte, le résultat est
reversé à la tuile : effectifs, moyennes, variances. La carte reprend aussi les voisines à ses bords, côtes et rivières.

### La cohérence entre les deux échelles

C'est le point scientifique le plus délicat. Les deux modèles doivent utiliser les mêmes règles, et un banc doit le
vérifier : une même tuile simulée en population et en individus doit donner des trajectoires semblables (effectif,
moyenne des traits). Sans ce banc, la planète et la carte raconteraient deux histoires différentes.

### Le temps géologique

La planète avance par grands pas, une génération ou plus à la fois, sans simuler chaque individu. C'est ce qui permet
de dérouler des millions d'années, et la dérive des continents peut alors changer les tuiles lentement.

### Les marqueurs

Pas de villages, puisqu'il n'y a pas d'humains, mais des points qui émergent de l'état des tuiles et qu'on peut
cliquer pour ouvrir leur carte :

- le dernier refuge d'une espèce, et son dernier survivant ;
- une colonie, là où une espèce atteint sa plus forte densité ;
- le lieu de naissance d'une nouvelle espèce ;
- un cratère de météorite, un grand incendie, un orage en cours.

Ils rejoignent directement les fresques de `V1_SERINA.md`.

## Les chiffres

Une grille géodésique de rang k compte 10k² + 2 tuiles : 1002 pour k = 10, 2562 pour k = 16, 10 242 pour k = 32.

| | Estimation |
|---|---|
| Une population résumée | effectif et 14 traits en moyenne et variance, environ 240 octets |
| 2562 tuiles, 20 espèces partout | environ 12 Mo |
| 10 242 tuiles, 20 espèces partout | environ 49 Mo |
| Une carte locale ouverte | le coût du moteur actuel, quelques milliers d'individus |

Les populations seront clairsemées, une espèce n'occupant qu'une partie des tuiles, donc la réalité sera en dessous.
Recommandation de départ : 2562 tuiles et une seule carte locale ouverte à la fois, comme la colonie unique de RimWorld.

## Les étapes

Chacune a son critère mesuré et sa PR.

1. **Grille géodésique et génération de la planète** (faite : 2562 tuiles dont 12 pentagones, continent en arc,
   climat et biomes, globe hexagonal à 60 images/s ; la carte actuelle est posée sur une tuile marquée) : continents, isthmes, océans, îles, relief, pluie, climat par
   latitude et altitude, globe hexagonal cliquable. Critère : 60 images/s, biomes cohérents avec le climat.
2. **Métapopulation seule** : la planète évolue sans carte ouverte. Critère : les groupes fondateurs survivent, la
   migration remplit les continents, l'isolement par l'océan crée des espèces, sur des graines nouvelles.
3. **Cohérence entre les échelles** : le banc population contre individus sur une même tuile. Critère : écart borné
   sur l'effectif et les traits.
4. **Ouvrir une tuile** : carte locale générée depuis la tuile et ses voisines, aller-retour, sauvegarde. Critère :
   rien ne se perd ni ne se crée en ouvrant puis en refermant.
5. **Marqueurs et fresques** sur le globe.
6. **Temps géologique et dérive des continents.**

## Les décisions à confirmer

Valeurs par défaut prises, à contester si besoin :

- 2562 tuiles au départ, extensible à 10 242 ;
- une carte locale ouverte à la fois ;
- le temps avance sur toute la planète, en population, même quand une carte est ouverte ;
- la carte locale reprend le moteur actuel, au lieu d'un moteur neuf.

## Les risques

- **La calibration** entre les deux échelles peut prendre du temps : c'est la raison de l'étape 3, avant d'ouvrir des
  tuiles.
- **Les bancs** changent de nature : il faudra mesurer la planète entière et plus seulement un monde de 108 cases.
- **La mémoire de la machine** a déjà coupé plusieurs bancs : les étapes doivent rester légères à compiler et à tester.
