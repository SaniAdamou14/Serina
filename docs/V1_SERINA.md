# V1 : des mondes à observer, et qui surprennent

Objectif fixé par le propriétaire du projet : voir évoluer des créatures sur une autre planète, avec la
rigueur scientifique de l'étude [*Serina*](https://sites.google.com/site/worldofserina/) de Dylan Bajda,
dans une interface façon RimWorld réaliste et complète, en pouvant agir sur le monde.

Cette V1 remplace la Terre réelle comme cible. Les jalons M2 et I5 de `ROADMAP.md` ne sont plus
nécessaires pour elle : le monde est une lune inventée, pas la Terre.

## Les règles

- **La même rigueur, pas les mêmes données.** Un copier-coller de l'étude n'aurait aucun sens : chaque
  simulation est un monde différent, avec des créatures qui évoluent autrement.
- **On implémente des mécanismes, jamais des résultats.** Rien n'est scripté : ni oiseau géant, ni
  baleine, ni ère imposée. Un monde a le droit de rater : les canaris peuvent s'éteindre ou rester petits.
- **On mesure.** Sur des graines jamais utilisées pour le réglage, et sur les mêmes graines pour comparer.
- **Les mondes doivent différer entre eux.** C'est un critère mesuré, pas un espoir.
- **Pas d'emprunt.** *Serina* est l'œuvre d'un autre auteur : on reprend ses idées générales, pas ses
  textes, ses images ni les noms de ses créatures.

## Ordre de travail

Toutes ces tâches doivent être faites ; l'ordre suit leurs priorités.

1. Validation du climat, puis correction des poissons (en cours : voir les limites connues).
2. Agir sur le monde : orage, feu, météorite, changement de climat, ajout d'espèces, consignés dans la
   chronique. Sert aussi d'outil de test.
3. Habitat héritable : gènes de vol et de vie aquatique.
4. Essai du temps géologique, pour fixer l'échelle avant de construire ce qui en dépend.
5. Monde qui change : introduction par étapes, extinctions de masse, biomes qui bougent.
6. Cerveau et intelligence, après le vol qui en est la contrainte.
7. Fresques : voir plus bas, à faire avancer en parallèle dès que le moteur retient les causes.
8. Planète façon RimWorld : un globe 3D de toute la planète, où cliquer sur un point ouvre sa carte 2D.
   - Première étape, faite : le monde actuel enroulé sur la sphère, l'est rejoignant l'ouest.
   - Étape suivante : une planète immense. Elle demande un moteur à deux échelles, toute la planète simulée
     en gros et les individus seulement sur la carte ouverte. C'est le même chantier de fond que le temps
     géologique : ils se feront ensemble.

## Les mécanismes à simuler

Tirés de l'étude et de la vidéo d'Ego, *Serina : Le Grand Simulateur d'Évolution*. La colonne de droite dit
ce qui peut en sortir, pas ce qui doit en sortir.

| Constat | Mécanisme | Ce qui peut émerger |
|---|---|---|
| Voler coûte cher, sans prédateur le vol se perd | Gène de vol : coûte de l'énergie, sert à fuir et à traverser | Grands oiseaux au sol, là où il n'y a pas de danger |
| On passe de plus en plus de temps dans l'eau pour manger | Vie aquatique progressive, guidée par la nourriture | Oiseaux marins, ou aucun |
| Géants marins : poussée de l'eau, nourriture stable | La taille coûte moins cher dans l'eau | Gigantisme |
| Beaucoup de petits meurent très jeunes | Jeunes vulnérables, compromis entre nombre et soins | Stratégies de reproduction différentes |
| Arbres et brouteurs grandissent l'un contre l'autre | Plantes qui évoluent, au lieu d'un simple niveau par case | Course aux armements |
| Oiseaux nettoyeurs sur des géants | Relations entre espèces qui se sélectionnent | Mutualisme |
| Oisillon parasite qui imite sa proie | Tromperie et contre-mesures héritables | Parasitisme, escalade |
| Peu de maladies dans un milieu sec | Pathogènes propres à chaque milieu | Extinction que l'intelligence n'empêche pas |
| Cerveau léger car le vol limite le poids | Le cerveau pèse et coûte, son efficacité est héritable | Intelligence dense chez des oiseaux qui volent |
| Formes semblables nées d'ancêtres différents | Mêmes contraintes physiques pour tous | Convergence, à mesurer |
| Montagnes qui privent de pluie un côté | Relief et vents qui répartissent la pluie | Déserts d'ombre, isolement |
| Un seul continent au départ, puis dérive | Continents qui bougent | Isolement, spéciation, retrouvailles |

Le moteur ne pourra jamais dire qu'un oiseau pense. Il pourra montrer qu'un cerveau petit et dense résout ce
que d'autres ne résolvent pas, et rien de plus.

## Les fresques

Idée du propriétaire : quand un moment marquant survient, une fresque en pixel art s'affiche avec une image
et un texte, pour l'effet dramatique, et reste consignée dans un registre. Exemples : le dernier individu d'une
espèce, une extinction, un événement à l'échelle du monde, ou l'apparition d'une nouvelle créature avec son
image et ses caractéristiques. Référence citée : [« 1 sur 8 milliards »](https://1in8billion.app/fr/), un jeu
qui fait vivre une vie humaine année après année à partir de vraies probabilités.

**Ce qu'on reprend de « 1 sur 8 milliards », transposé à des espèces**

| Chez eux | Chez nous |
|---|---|
| Acte de naissance et acte de décès | Acte de naissance d'une espèce (ancêtre, lieu, date, ce qui a changé) et acte d'extinction (dernier lieu, cause mesurée, durée de la lignée) |
| Carte de vie, une case par année | Carte de vie d'une espèce : une frise où chaque case montre l'effectif et l'événement de la période |
| Courbe de survie | Courbe de population d'une lignée, jusqu'à son dernier individu |
| Mémorial | Mémorial des espèces disparues, dans le registre des légendes |
| Carte à partager | Export d'une fresque |
| Pauses de réflexion à certains âges | Pause aux grands jalons du monde, avec ce qui a changé depuis |
| Probabilités, pas destin | Notre règle : les mécanismes sont fixés, le résultat reste libre |

Le ton aussi : les événements graves y sont brefs et sans détails. Une date, un lieu, un effectif qui tombe à 1
porteront plus qu'un texte dramatique, et restent fidèles à la règle de ne rien inventer. Une différence à garder :
ce jeu s'appuie sur des données humaines réelles, nous sur une simulation. Nos actes ne présentent donc jamais un
chiffre comme un fait biologique, seulement comme ce qui s'est passé dans ce monde-là.

**Ce qui les rend fidèles au projet**

- **Tout vient du moteur.** Le texte ne dit que ce qui s'est vraiment passé : date, effectifs, milieu, cause
  mesurée. Sans cause mesurée, il ne l'invente pas. Une fresque n'est jamais écrite à l'avance.
- **L'image aussi.** La créature est dessinée depuis son vrai génome, dans le vrai biome de la scène, à la
  vraie saison, avec le temps qu'il faisait. Deux fresques de deux mondes ne se ressemblent donc pas.
- **Le pixel art a un rôle.** La carte reste façon RimWorld. Le changement de style marque que ce moment est
  à part.

**Ce qu'il faut prévoir**

- **Éviter la lassitude.** Un monde compte des dizaines de scissions, et une fresque à chacune tuerait
  l'effet. Chaque événement reçoit un score d'importance : le plus marquant met le jeu en pause et prend
  l'écran, le reste devient une lettre façon RimWorld ou une simple ligne du registre. Plafond de fréquence,
  et réglage pour le joueur.
- **Les causes de mort.** Dire « tuée par le feu » exige que le moteur compte les morts par cause et par
  espèce. Il ne compte aujourd'hui que quelques totaux pour tout le monde : c'est le premier travail.
- **Les vrais moments.** Détecter le dernier individu, le premier occupant d'une niche, le plus grand animal
  jamais vu, une population qui s'effondre, une extinction de masse, le premier oiseau qui ne vole plus.
- **Suivre le dernier survivant.** Un bouton qui centre la caméra sur lui, pour qu'on le regarde vivre.
- **Comparer.** Pour une nouvelle espèce, l'ancêtre et la descendante côte à côte, avec les traits qui ont
  changé et ce que ça lui permet.
- **Le registre.** Une page de légendes : frise du monde, galerie des fresques, cliquable, gardée dans la
  sauvegarde. On doit pouvoir exporter une image, pour raconter son monde.

**Étapes**

1. Le moteur retient les causes de mort et détecte les moments marquants, avec un score d'importance.
2. Registre et fresques en version simple : texte réel et créature en pixel art depuis les sprites actuels.
3. Scènes générées : biome, saison, météo et silhouette tirée du génome, ce qui dépend des silhouettes d'I6.
4. Galerie, frise, export d'image, et un son à l'ouverture.

## Critères de la V1

Une case n'est cochée que si le banc l'a montré sur des graines non utilisées pour le réglage.

**Le monde**
- [x] Globe 3D de la planète façon RimWorld : tout le monde enroulé sur la sphère, l'est rejoignant l'ouest,
  avec les vraies données de chaque case, et un double-clic qui descend sur la carte. 60 images/s sur Radeon
  intégrée.
- [ ] Planète immense à deux échelles.
- [x] Saisons opposées entre hémisphères, latitude, pluie, foudre et feu.
- [x] Adaptation locale à la température à l'intérieur d'une espèce : 0,256 sur 6 graines nouvelles
  (61 à 66, 20 000 ticks), contre 0,007 sans climat.
- [x] Plantes qui poussent selon la température et la pluie (modèle de Miami, Lieth 1975).
- [ ] Lune paramétrable : taille, gravité, inclinaison, longueur de l'année.
- [ ] Grandes périodes froides et chaudes qui changent vraiment les biomes.
- [ ] Continents qui bougent et extinctions de masse.
- [ ] Plantes qui évoluent.
- [ ] Introduction par étapes, le canari en dernier, avec plus de groupes fondateurs.

**La surprise**
- [ ] Les mondes diffèrent entre eux, mesuré sur des graines différentes.
- [ ] Des mondes où les canaris échouent existent, et aucun résultat n'est écrit à l'avance.

**Les mécanismes**
- [ ] Vol héritable, avec un coût et un usage réels.
- [ ] Vie aquatique héritable. L'habitat dépend aujourd'hui du groupe, ce qui interdit aux oiseaux d'aller
  vivre dans l'eau.
- [ ] Prédateurs spécialisés qui persistent.
- [ ] Relations entre espèces, parasitisme et maladies.
- [ ] Cerveau au coût réel et à l'efficacité héritable.
- [ ] Convergence mesurée.

**La durée**
- [ ] Un temps géologique : pouvoir dérouler des millions d'années sans simuler chaque individu à chaque instant.
- [ ] Un monde complet, de la fondation à la fin, sans plantage ni fuite, avec une mémoire consultable.

**Agir sur le monde**
- [x] Orage, feu, météorite, changement de climat et ajout d'espèces, depuis la fiche d'une case. Chaque action
  dit ce qu'elle a vraiment fait, reste dans la chronique et la sauvegarde, et les morts d'une catastrophe ont leur
  propre cause.

**L'interface**
- [x] Carte vivante : plantes, morts, feu, pluie, éclairs, neige et saisons.
- [ ] Silhouettes tirées du génome de chaque lignée, à la place des gabarits.
- [ ] Fresques et registre des légendes.
- [ ] Alertes et lettres, calques complets.
- [ ] Sauvegarde automatique, limite des parties oubliées, tests navigateur en CI.

## Repères de l'étude

Lus sur son site le 2026-11-01, et donnés comme ordre de grandeur, pas comme scénario. Le site se contredit
parfois sur les limites exactes.

| Époque | Millions d'années | Thème |
|---|---:|---|
| Fondation | avant 0 | Lune stérile rendue habitable, plantes puis faune, le canari en dernier |
| Hypostecene | 0 à 10 | Explosion des canaris, premières spécialisations |
| Tempuscene | 11 à 50 | Prédateurs, symbioses |
| Cryocene | 50 à 75 | Refroidissement |
| Thermocene | 75 à 175 | Longue chaleur, puis extinction de masse |
| Pangeacene | 178 à 250 | Continents réunis, reprise de la vie |
| Ultimocene | 250 à 270 | Intelligence, nouvel âge glaciaire |
| Fin de l'Ultimocene | après 270 | Âge très chaud |

## Limites connues

Elles viennent des mesures et ne doivent pas disparaître sans nouvelle mesure.

- Sur 6 graines nouvelles (61 à 66) à 20 000 ticks, avec le climat : 2 espèces d'oiseaux en médiane, 5 au mieux,
  2 niches de régime sur 3, 3 au mieux. Oiseaux vivants dans 4 mondes sur 6, poissons 3, arthropodes et
  mollusques 6. Population médiane de 1842, 11 incendies par monde.
- Les poissons meurent surtout de vieillesse, faute de naissances : sur les graines 61 à 66 à 8000 ticks, ils
  survivent dans 4 mondes sur 6. Ni des portées plus grandes ni une vraie famine n'ont réglé ce point, la cause
  reste à trouver.
- Le moteur compte environ 2,7 Ko par individu et 5 µs par individu et par tick. Le passage au temps géologique
  ne se fera pas en ajoutant des individus : c'est le chantier le plus lourd de cette V1.
- La carte fait 12 cases sur 9, ce qui limite l'isolement et donc la diversité.
