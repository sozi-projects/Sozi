Title: Démarrer Sozi avec un raccourci clavier dans Inkscape
Slug: tutorial-shortcut
Lang: fr
Author: Guillaume Savaton
Status: hidden

Inkscape permet de définir vos propres raccourcis clavier.
Vous pouvez modifier ou créer le fichier de configuration ``default.xml`` à l'un des emplacements suivants :

* Dans votre dossier de configuration personnel pour Inkscape (si vous utilisez GNU/Linux) : ``~/.config/inkscape/keys/default.xml``
* Pour tous les utilisateurs de votre ordinateur : ``{Dossier d'installation d'Inkscape}/share/keys/default.xml``

L'exemple suivant permet d'ouvrir Sozi en pressant la touche ``S`` :

    :::xml
    <?xml version="1.0"?>
    <keys name="Inkscape default">
      <bind key="s" action="sozi" display="true" />
    </keys>

Source: [Le wiki d'Inkscape](http://wiki.inkscape.org/wiki/index.php/Customizing_Inkscape).
