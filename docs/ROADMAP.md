# Serina : feuille de route vers le monde complet

Rédigée le 2026-10-30, à partir de mesures faites sur `main` (`20a0df0e`).

## L'objectif, défini pour pouvoir être atteint

> La **profondeur systémique** de Dwarf Fortress, appliquée à l'évolution, sur
> une **Terre réelle** (globe 3D et carte 2D, régions, climat), avec
> l'**interface** et la **robustesse** de RimWorld, ou mieux.

« Aussi complet que Dwarf Fortress » ne peut pas vouloir dire « autant de
fonctionnalités » : DF représente plus de 20 ans de travail. Ce qu'on lui
reprend, ce sont ses trois idées de fond :

1. **Des couches de simulation à plusieurs échelles** : un monde abstrait, et
   une zone détaillée quand on zoome.
2. **Des systèmes qui se croisent**, pour que les histoires émergent au lieu
   d'être écrites.
3. **Une mémoire du monde** : tout ce qui arrive reste consultable (le « mode
   Légendes »).

### Décisions prises (à contester si besoin)

| Sujet | Décision | Raison |
|---|---|---|
| Rôle du joueur | Observateur et « dieu » (catastrophes, introduction d'espèces), pas de colonie à gérer | C'est ce que le projet simule déjà ; une colonie serait un autre jeu |
| Carte | Terre réelle, derrière un format de monde générique | Un monde procédural reste possible plus tard |
| Grille | Hexagones H3 résolution 3 (41 162 cases, environ 12 000 km² chacune) | Quasi équirépartie sur le globe, sans le problème des pôles d'une grille lat/long |
| Moteur | Démes au niveau mondial, individus seulement dans la zone zoomée | Impossible de simuler la Terre individu par individu (voir les mesures) |
| Moteur actuel | **Conservé** comme simulateur de la zone locale | Le travail déjà fait (génomes, NEAT, sauvegarde) reste utile |
| Front | React pour les panneaux ; WebGL pour les cartes (MapLibre + deck.gl, PixiJS en local) | Le SVG actuel crée un élément DOM par individu |

## État de départ mesuré

Banc d'essai : monde par défaut, 40 fondateurs par lignée, 6 000 ticks, graines 1 à 4.

| Mesure | Résultat | Ce que ça implique |
|---|---|---|
| Individus collés au bord du monde | **73–81 %** | La carte n'est pas vraiment habitée ; la calibration de `movementScale` et de la spéciation repose sur ce comportement |
| Population dans les cases de bordure | 78–88 %, pour 35 % des cases | Idem |
| Poissons hors de l'eau | 31 à 917 selon la graine ; graine 4 : 105 sur 105 | L'habitat ne contraint rien |
| Spéciations | 43–63, en environ 5 durées de vie | Une scission est un changement d'étiquette, pas une évolution ; l'interface appelle « génération » ce qui est un tick |
| `ENERGY_EFFICIENCY` moyenne | 0,64 → 0,83–0,91 sur les 4 graines | **La sélection naturelle fonctionne vraiment** |
| Vitesse | Environ 5 µs par individu et par tick, sur un seul cœur ; 100 000 individus = 2 ticks/s | Pas d'échelle planétaire possible |
| Mémoire | Plus de 2,7 Ko par individu (génome 2 640 octets + organisme 112 octets, hors allocations) | 1 million d'individus dépasse 2,7 Go |

Constats issus de la lecture du code :

- **Climat décoratif** : température et précipitations sont affichées, mais
  n'influencent aucun calcul de `WorldSimulation.hpp`.
- **Monde figé** : les biomes ne changent jamais, et toutes les cases d'un même
  biome ont des valeurs identiques.
- **Déplacement gratuit** : `setVelocity` n'est jamais appelé par le moteur (seulement
  à la reprise d'une sauvegarde), donc `movementCost` vaut 0.
- **Traits sans coût** : taille, agressivité et vision n'ont aucun coût.
- **Traits sans effet** : 5 traits sur 12 n'ont aucun effet direct sur la survie
  (intelligence, ouïe, camouflage, comportement social, taux de reproduction).
- **Pas de chaîne alimentaire** : la nourriture est illimitée (seule une capacité
  de charge par case la limite), et la prédation transfère de l'énergie sans tuer.
- **Fondateurs fragiles** : sur 120 graines et 4 000 ticks, les arthropodes
  disparaissent dans plus de 9 mondes sur 10 (cause à chercher en M1).
- **Dette** : aucun test web ni API.

Points forts à préserver : la culture du « mesuré, pas raconté », le déterminisme,
la sauvegarde/reprise au bit près, les 66 tests C++, et l'interface déjà pensée
pour le style RimWorld.

## Architecture cible

```
Données Terre (relief, côtes, climat)   -- outil hors ligne -->  fichier monde (cases H3)
                                                                       |
Couche planète      climat mensuel, anomalies, catastrophes            |
Couche écosystème   production végétale par case, flux par niveau trophique
Couche démes        par (espèce, case) : effectif, moyenne et variance des traits,
                    divergence neutre ; migration entre cases voisines
Couche individus    à la demande, dans la zone zoomée : le moteur actuel,
                    initialisé depuis les démes et qui leur renvoie ses résultats
Chroniques          journal permanent : naissances d'espèces, extinctions, migrations
        |
Daemon C++  -- instantanés binaires par WebSocket -->  Web : globe + carte 2D + zone locale
```

Ordre de grandeur visé (estimation, à valider en M3) : environ 12 000 cases
terrestres × 20 espèces par case ≈ 240 000 démes. Un déme n'a ni cerveau ni génome
complet, et le calcul se parallélise par case : son coût devrait être bien inférieur
à celui d'un individu.

## Jalons

Chaque jalon se termine par un **critère vérifiable**. Taille : S = quelques
sessions, M = une à deux semaines de travail, L = plusieurs semaines.

### M0 : Assainir (S)

Fait :

- Tri des PR (voir plus bas).
- Compilation MSVC corrigée (macro `small` du SDK Windows) et CI Windows prête.
- Conflit de port entre deux tests corrigé.
- Test de régulation de densité rendu robuste (3 graines, sans naissances).
- Déterminisme entre compilateurs : tirages et fonctions mathématiques maison
  (`DeterministicRandom.hpp`), ordre de parcours fixe, empreinte de référence testée.
  Comparaison sur 80 graines inédites : aucun changement de comportement détecté.
- Boutons de zoom de `WorldMap` corrigés.
- Anciens moteurs supprimés ; README et CONTRIBUTING réécrits.

Reste à faire : fusionner #3 et #6, puis voir la CI passer sous Linux, qui n'a pas pu
être testé en local.

**Critère :** CI verte sous Linux et Windows ; la même graine donne le même monde
sur GCC et MSVC (vérifié) ; le README ne contient plus rien de faux.

### M1 : Rendre la biologie honnête (M)

Fait (mesuré sur 16 graines, 4 000 ticks) :

- Banc scientifique multi-graines : `tools/serina_bench.cpp` et `tools/science.js`.
- Collage aux bords corrigé : 2,2 % d'individus au mur contre 93 %. Le cerveau sortait
  une direction constante ; il ne réagit plus qu'aux écarts réels entre voisins, et une
  dispersion aléatoire s'y ajoute. Cases occupées : 103 sur 108 contre 21.
- Limites des groupes biologiques remises à l'échelle des traits, fondateurs créés
  dans la plage de leur groupe. Arthropodes vivants dans 15 mondes sur 16, contre 0 à 2 :
  ils ne pouvaient presque pas se reproduire.

- Habitat par groupe biologique (`Habitat.hpp`) : 0 % d'individus hors habitat, oiseaux qui
  survolent l'eau sans s'y nourrir, biomes d'origine présents sur toutes les cartes.
- Coût énergétique du climat (`climateCostRate`) : effet de dose mesuré, mais encore faible.
- Spéciation par isolement réel : deux populations sans contact pendant 1 000 ticks et
  divergentes. 2 spéciations en 6 000 ticks contre 84, 5 espèces contre 24.
- Défense des proies : la meilleure de la vitesse et de la résistance, au lieu de leur moyenne.
  Mollusques vivants dans 12 mondes sur 12 contre 7 : la prédation les éliminait.

Reste à faire :

- Adaptation au climat encore modeste : corrélation résistance/climat de 0,12 à 0,16 sur des
  graines inédites à 6 000 ticks. Un seul trait est trop grossier : voir I6.
- Peu d'espèces (5 ou 6) : une carte de 12 cases sur 9 offre peu de vraies barrières.
- Introduire le coût du déplacement et de la taille ; donner un effet ou retirer
  chacun des 5 traits inertes.
- Ajouter l'habitat selon le groupe biologique (poissons dans l'eau, jusqu'à ce
  qu'une innovation évoluée change la règle).
- Faire dépendre la survie du climat. Une niche climatique a été rejetée par le passé,
  mais testée avec le biais des bords : à retester.
- Compter le temps en vraies générations, et revoir le seuil de spéciation en
  conséquence. Recalibrer tout ce qui reposait sur l'ancien comportement.

**Critères :** moins de 10 % d'individus collés aux bords ; 0 poisson hors de l'eau
sans innovation ; spéciations espacées d'un nombre réaliste de générations ; au moins
un trait dont la moyenne corrèle avec le climat local sur des graines non utilisées
pour la calibration.

### M2 : La Terre, sans simulation (M)

- Créer un outil hors ligne qui produit le fichier monde : altitude, océan/terre,
  température et précipitations mensuelles, biome par case H3.
- Sources à évaluer : ETOPO 2022, Natural Earth, Köppen-Geiger (Beck et al.),
  moyennes ERA5. **Licences à vérifier avant toute redistribution.**
- Créer un visualiseur : carte 2D et globe 3D, passage de l'un à l'autre, calques
  climat/altitude/biome, clic sur une case. Commencer par un essai court de MapLibre
  avec deck.gl ; repli sur three.js si leur globe ne convient pas.

**Critère :** 41 162 cases fluides à 60 images/s sur ta machine ; côtes et grands
biomes reconnaissables ; les valeurs de villes témoins (Niamey, Oslo, Manaus) sont
cohérentes avec leur climat réel.

### M3 : Moteur de démes, première tranche verticale (L)

- Implémenter le modèle de démes : croissance logistique, migration entre voisins,
  évolution des traits selon l'équation du sélectionneur, niche climatique.
- Calculer la production végétale à partir du climat (modèle de Miami, simple et publié).
- Implémenter la spéciation par isolement : une divergence neutre s'accumule quand
  le flux de gènes s'interrompt, ce qui rend possibles barrières géographiques et
  espèces en anneau.
- Utiliser des identifiants entiers, et paralléliser par case.

**Critère de démo :** une espèce lâchée en Afrique colonise les continents reliés,
s'arrête aux océans et aux déserts selon ses traits, et se scinde de part et d'autre
d'une barrière réelle. Moins de 100 ms par pas sur ta machine, déterministe.

### M4 : Écosystème complet (L)

- Mettre en place les niveaux trophiques (producteurs, herbivores, carnivores,
  décomposeurs) avec conservation de l'énergie.
- Dériver le régime alimentaire et les relations proie/prédateur des traits.
- Faire tourner les cinq fondateurs ensemble.

**Critères :** bilan énergétique fermé, pyramide trophique plausible, cascades
observées : retirer un prédateur modifie plusieurs niveaux.

### M5 : Interface sur le monde H3 (M)

- Brancher l'interface de la piste I sur le monde H3, et ajouter le globe.
- Remplacer le polling JSON par des instantanés binaires.

**Critère :** comprendre « pourquoi cette espèce est ici et pas là » en deux clics.

### M6 : Le zoom local (L)

- Générer une carte locale à partir d'une case ; y instancier de vrais individus
  depuis les démes (moteur actuel, rendu PixiJS) ; renvoyer les résultats aux démes.

**Critère :** en zoomant, on voit des créatures dont la répartition de traits
correspond à celle du déme, et l'aller-retour ne déforme pas ses statistiques.

### M7 : Profondeur façon Dwarf Fortress (L, puis continu)

- **Plans corporels** : locomotion, respiration, tégument, sens, régime, avec des
  innovations rares qui ouvrent de nouvelles niches (sortie de l'eau, vol).
- **Mode Légendes** : histoire de chaque espèce, arbre consultable, fossiles par
  région, ères nommées automatiquement.
- **Planète vivante** : glaciations, variation du niveau de la mer, volcans, météorites.
- **Outils de dieu** : catastrophe, introduction ou retrait d'une espèce, scénarios.
- **Créatures procédurales** : apparence dérivée du plan corporel.

**Critère :** deux parties à graines différentes racontent deux histoires vraiment
différentes, et on peut les raconter à partir des seules Chroniques.

## Piste I : l'interface façon RimWorld (active dès maintenant)

Aujourd'hui l'interface ressemble à un tableau de bord web : cartes arrondies, rail
d'icônes, panneau latéral fixe. Elle doit ressembler à un jeu. Cette piste avance en
parallèle de la biologie, sur la carte actuelle, puis passe au monde H3 en M5.

Ce qu'on reprend de RimWorld :

- **La carte occupe tout l'écran**, et tout le reste vient se poser dessus.
- **Barre d'onglets en bas** (Espèces, Évolution, Génétique, Monde, Historique, Dieu),
  chacun ouvrant une fenêtre posée sur la carte et déplaçable.
- **Inspecteur en bas à gauche**, qui apparaît à la sélection, avec ses propres onglets.
- **Temps en bas à droite** : tick, pause, vitesses, raccourcis `Espace` et `1` à `5`.
- **Alertes sur le bord droit** et lettres d'événements cliquables qui centrent la carte.
- **Calques en bas à droite**, activés par icônes (pour l'instant une liste).
- **Infobulles partout**, qui expliquent chaque valeur et comment elle est calculée.
- **Style visuel** : panneaux sombres à angles droits et bordure fine, texte compact,
  aucune carte arrondie, une icône claire par action.

**Deux niveaux de carte, comme RimWorld :**

- **La planète** : la vraie Terre en 3D, qu'on fait tourner et qu'on zoome jusqu'à un certain
  niveau, avec une carte 2D du même monde. On y lit climat, biomes et populations, et on y
  choisit une case. Rendu : celui de M2 (globe et cartes 2D).
- **La carte locale** : une case de la planète vue au sol, sur une grille de tuiles, avec des
  textures réelles d'arbres, d'herbe, de roche et d'eau, des animaux, des branches au sol, des
  cadavres qui se décomposent, des feux, de la pluie, de la neige, des éclairs. Rendu : WebGL2.

**Règle : rien de décoratif.** Chaque chose visible correspond à quelque chose de simulé,
comme le reste du projet. Il faut donc simuler ce qu'on veut montrer :

| Ce qu'on voit | Ce qu'il faut simuler |
|---|---|
| Arbres et herbe | Plantes individuelles : pousse, broutage, mort |
| Branches, bois mort | Débris produits par les plantes, et leur décomposition |
| Cadavres qui se décomposent | Un corps à chaque mort, mangé ou décomposé, qui rend ses nutriments au sol |
| Feux | Combustion et propagation selon le combustible, le vent et l'humidité |
| Pluie, neige, éclairs | Météo locale tirée du climat réel de la case |
| Animaux | Individus du moteur actuel, dessinés selon leur génome et leur plan corporel |

**Images :** aucune image ni carte de RimWorld, qui sont protégées. Sols en CC0 (voir
`web/public/textures/CREDITS.md`), créatures dessinées par notre code.

Étapes :

- **I1, la coquille (fait)** : carte plein écran, barre du bas, temps, inspecteur, fenêtres
  déplaçables, raccourcis clavier, alertes et lettres, thème sombre à angles droits, erreurs
  contenues par zone. Caméra testée : toujours au format de l'écran, jamais hors du monde,
  recentrée d'elle-même au dézoom. Vérifié par des parcours automatiques dans le navigateur.
- **I2, le rendu (fait)** : carte en WebGL2 à la place du SVG, sol texturé et éclairé, biomes
  fondus, côtes arrondies, eau animée, créatures de profil avec marche et ombre, minicarte du
  vrai terrain. Sur la Radeon intégrée de référence : 60 images/s en population réelle, 57 à
  10 000 créatures, 25 à 50 000. Reste une limite : les bords dessinés ondulent autour des
  cases du moteur, donc un clic près d'une frontière peut inspecter la case voisine.
- **I3, les informations** : alertes, lettres, infobulles, calques complets.
- **I4, la nature vivante** : plantes, débris, cadavres, feux et météo, simulés puis dessinés.
- **I5, la planète** : globe 3D et carte 2D de la Terre, sélection d'une case qui ouvre sa
  carte locale. S'appuie sur M2.
- **I6, les créatures issues de leur génome** : de nouveaux gènes héritables de forme et
  d'apparence (longueur du corps et des membres, tégument, pigment, motif), chacun avec un coût
  ou un effet réel sur la survie selon le climat et les prédateurs. Le dessin est généré à partir
  de ces gènes pour chaque lignée. Une apparence adaptée doit donc résulter de la sélection, sans
  règle du type « froid = fourrure ». Remplace le mélange de couleur avec le biome qui simule
  aujourd'hui le camouflage. Dépend du climat de M1.

**Critère :** une personne qui connaît RimWorld s'y retrouve sans explication ; 60
images/s avec 10 000 individus affichés.

## Piste R : la robustesse (active dès maintenant)

L'objectif : une partie peut tourner des jours sans perte. Chaque point est testé.

- **Sauvegarde** : sauvegarde automatique avec rotation, écriture atomique (un arrêt
  brutal ne corrompt jamais la dernière sauvegarde), format versionné avec migration.
- **Reprise après panne** : si le daemon tombe, l'API le relance et recharge la dernière
  sauvegarde ; l'interface l'indique sans planter.
- **Entrées** : le protocole et l'API refusent proprement toute requête invalide ; test
  avec des requêtes aléatoires (fuzzing) sur le protocole et le chargement de sauvegardes.
- **Interface** : une erreur dans une fenêtre ne fait jamais tomber la carte ; tests de
  bout en bout dans un vrai navigateur, lancés en CI.
- **Longue durée** : test d'endurance sans fuite de mémoire ni ralentissement anormal.

**Critère :** tuer le daemon ou l'API en pleine partie ne perd pas plus que l'intervalle
de sauvegarde ; 24 h d'endurance sans erreur ni croissance anormale de la mémoire.

## Dépendances

```
M0 -> M1 -> M3 -> M4 -> M6 -> M7
M0 -> M2 -> M3
M0 -> pistes I et R, en parallèle de tout le reste
M2 + I -> M5
```

M1 et M2 peuvent avancer en parallèle. M3 est le pivot du moteur : tant que sa démo ne
fonctionne pas, n'ajouter aucune fonctionnalité de contenu biologique.

## Triage des PR ouvertes (état du 2026-10-30)

Les résultats ci-dessous viennent d'essais locaux, car la CI n'avait pas tourné sur
ces PR (`action_required`).

| PR | Décision | Raison vérifiée |
|---|---|---|
| #8 docs save/load | **Fusionnée** | Exacte : confirmée par `DaemonProtocol.hpp` |
| #6 CI Windows | **À fusionner avec son correctif** | Telle quelle, la CI serait rouge : erreur MSVC sur `small`. Avec le correctif, 66 tests sur 66 passent |
| #3 UX carte | **À fusionner avec son correctif** | Telle quelle, la carte plante (`Rendered more hooks`, reproduit dans le navigateur) et les raccourcis sont doublés. Correctif vérifié dans l'application |
| #2 docs | **Fermée** | Déjà périmée : annonçait un état uniquement en mémoire alors que la sauvegarde existe, et parlait encore de MySQL |
| #1 historique | **Fermée** | Aucune fonctionnalité : `HistoryView` utilise déjà ces données sur `main` |
| #4 clé API | **Fermée pour l'instant** | Contournable par le socket `simulation-command`, et l'activer casse l'interface. À refaire si l'API est un jour déployée |
| #5 packaging Python | **Fermée** | Le wheel produit est vide : aucune règle `install()` |
| #7 lien nlohmann | **Fermée** | Inoffensive mais inutile : aucune source de `serina_core` n'utilisait cette bibliothèque |
