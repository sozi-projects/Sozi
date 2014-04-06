Title: Votre première présentation
Slug: tutorial-first
Lang: fr
Author: Guillaume Savaton
Translation fr: David Libralesso
Status: hidden


Ce tutoriel est une introduction aux principes de base de Sozi.
vous apprendrez à créer vos premières vues et à jouer la présentation dans un navigateur web.



Télécharger et ouvrir le document d'exemple
-------------------------------------------

Ce tutoriel se base sur un simple document SVG qui contient les éléments visuels nécessaires à notre présentation.
[Téléchargez le document SVG de base](|filename|/images/tutorial-first/sozi-tutorial-base.svg) (Bouton droit sur le lien et choisissez *Enregistrer la cible du lien sous*)
et ouvrez-le dans Inkscape.

![Ouvrir le document SVG dans Inkscape](|filename|/images/tutorial-first/sozi-tutorial-screenshot-01.png)

Dessinez les cadres des vues
----------------------------

Dessinez un rectangle pour chaque vue de votre présentation.
Redimensionnez-les ou tournez-les pour définir les cadres de chaque vue.

![Dessinez les cadres des vues](|filename|/images/tutorial-first/sozi-tutorial-screenshot-02.png)

Inkscape assigne un identifiant unique à chaque élement du document.
Ces identifiants sont utilisés par Sozi pour associer les rectangles avec les vues de votre présentation.

Sélectionnez un rectangle, cliquez avec le bouton droit sur un des bords et choisissez *Propriétés de l'object*.

![Afficher les propriétés du rectangle](|filename|/images/tutorial-first/sozi-tutorial-screenshot-03.png)

L'identifiant du rectangle est affiché dans le champs *Id*.
Dans l'exemple suivant, Le champ indique `rect3816`, mais cela peut être différent pour vous.
vous pouvez changer l'identifiant si vous le souhaitez, en faisant attention à ne pas donner le même identifiant à des éléments différents dans le même document.

![L'identifiant d'un rectangle](|filename|/images/tutorial-first/sozi-tutorial-screenshot-04.png)

ouvrer l'éditeur de présentation
--------------------------------

Selectionnez le premier rectangle.
Puis, dans le menu *Extensions*, cliquez sur *Sozi*
(voir aussi: [Démarrer Sozi avec un raccourci clavier dans Inkscape](|filename|tutorial-shortcut.md)).

![Ouvrir l'éditeur de présentation](|filename|/images/tutorial-first/sozi-tutorial-screenshot-05.png)

La fenêtre *Sozi* vous permet de créer, modifier et effacer les vues de votre présentation.
La fenêtre principale de Inkscape restera inactive tant que la fenêtre de l'éditeur de vue sera active.

![L'éditeur de présentation](|filename|/images/tutorial-first/sozi-tutorial-screenshot-06.png)

Quand vous démarrez Sozi avec un nouveau document, Sozi sera automatique installé dans votre document.
Par la suite, chaque fois que vous réouvrez Sozi dans le même document, Sozi sera mis à jour en utilisant la dernière version installée sur votre ordinateur.

Ajouter des vues et éditer leurs propriétés
-------------------------------------------

Cliquez sur le bouton *+* en bas à gauche de la fenêtre.
Ceci va créer une nouvelle vue sans titre.
Dans la capture d'écran ci-dessous, nous avons changé le titre de la vue par *First*.

Remarquez que le champs *Elément SVG* a été automatiquement complété avec l'identifiant du rectangle sélectionné
(`rect3816` dans notre exemple).
Pour lier la vue à un autre rectangle, vous pouvez modifier manuellement le champs *Elément SVG*, ou, après avoir sélectionné un autre rectangle dans Inkscape, utilisez l'iĉone *Coller* sur la gauche.


![L'éditeur de vues](|filename|/images/tutorial-first/sozi-tutorial-screenshot-07.png)

Fermez l'éditeur de présentation Sozi en cliquant sur le bouton *OK*.
Dans la fenêtre principale de Inkscape, sélectionnez les trois autres rectangles (en maintenant enfoncé la touche Majuscule),
en suivant l'ordre de la présentation.

![L'éditeur de vues](|filename|/images/tutorial-first/sozi-tutorial-screenshot-08.png)

Ouvrez de nouveau l'éditeur de présentation, et appuyez trois fois sur le bouton *+*.
Cela va créer trois nouvelles vues en utilisant les trois rectangles sélectionnés.

![L'éditeur de présentation](|filename|/images/tutorial-first/sozi-tutorial-screenshot-09.png)

Donnez un titre à chaque vue et fermez l'éditeur de présentation.

Jouer la présentation dans un navigateur web
--------------------------------------------

Sauvez le document dans Inkscape.

Ouvrez le document SVG dans votre navigateur préféré.
La première vue sera automatiquement chargé.
Cliquez à l'intérieur de la présentation pour passer à la vue suivante.
(voir aussi: [Jouer une présentation](|filename|play.md)).

[Télécharger ou jouer une présentation complète](|filename|/images/tutorial-first/sozi-tutorial-full.svg).
