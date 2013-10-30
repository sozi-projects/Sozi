Title: Améliorer les performances de rendu
Slug: tutorial-performance
Lang: fr
Author: Guillaume Savaton
Status: hidden

Les présentations Sozi construites à partir de documents SVG complexes
peuvent présenter des problèmes de fluidité dans les animations.
Ce problème est généralement lié aux performances de rendu des documents
SVG dans votre navigateur web.

Il existe plusieurs techniques pour contourner ce problème :

Convertir les textes en chemins
-------------------------------

Dans certains navigateurs web, la durée nécessaire au rendu d'un document
SVG peut augmenter considérablement si le document contient beaucoup de texte.
La conversion des éléments textes en chemins facilite le travail du navigateur
en précalculant la forme des caractères.
Elle présente également l'avantage de garantir un rendu identique du texte
quel que soit le navigateur utilisé, et ce même si les fontes utilisées dans
le document ne sont pas disponible sur le PC où il est affiché.

Cependant, cette opération présente l'inconvénient de faire disparaître
le texte original de votre document.
Le texte n'est plus modifiable.
Il ne peut plus être indexé par les moteurs de recherche.

> N'effectuez pas cette opération sur votre document original.
> Enregistrez toujours une copie de votre document avant de faire ceci.

Dans Inkscape, sélectionnez tous les éléments textes (menu *Édition*/*Rechercher*, ou Ctrl-F).

![Rechercher les éléments textes](|filename|/images/tutorial-performance/sozi-tutorial-performance-screenshot-01.fr.png)

Dans le menu *Chemin*, choisissez *Objet en chemin* (Maj-Ctrl-C).

Optimiser un document
---------------------

[Scour](http://www.codedread.com/scour/) est un outil qui effectue des
opérations d'optimisation sur les documents SVG.
Bien que le but soit de réduire la taille des fichiers, certaines
[operations](http://www.codedread.com/scour/ops.php) peuvent contribuer
à accélérer le rendu :

* la suppression des éléments vides ou inutilisés,
* la fusion des groupes imbriqués,
* la réduction des chemins et des dégradés,
* la suppression des propriétés de style inutiles.

Scour peut être exécuté comme un script Python autonome ou comme une
extension pour Inkscape.

> N'exécutez pas Scour sur votre document original.
> Enregistrez toujours une copie de votre document au préalable.
>
> Nous n'avons pas testé en profondeur l'utilisation de Scour sur des présentations Sozi.
> Certaines optimisations peuvent éventuellement supprimer des informations utilisées par le script de présentation.
