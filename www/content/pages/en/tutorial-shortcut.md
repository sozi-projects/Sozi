Title: Launching Sozi with a keyboard shortcut in Inkscape
Slug: tutorial-shortcut
Lang: en
Author: Guillaume Savaton
Status: hidden

Inkscape supports the definition of custom keyboard shortcuts.
You can edit or create the configuration file ``default.xml`` in one of the following locations:

* In you personal Inkscape configuration folder at ``~/.config/inkscape/keys/default.xml`` (if you are using GNU/Linux).
* For all users of your computer at ``{Inkscape installation folder}/share/keys/default.xml``

The following example allows to open Sozi by pressing the ``S`` key:

    :::xml
    <?xml version="1.0"?>
    <keys name="Inkscape default">
      <bind key="s" action="sozi" display="true" />
    </keys>

Source: [Inkscape wiki](http://wiki.inkscape.org/wiki/index.php/Customizing_Inkscape).
