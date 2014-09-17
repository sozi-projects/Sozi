Title: Installer Sozi sous GNU/Linux
Slug: install-linux
Lang: fr
Status: hidden
Author: Guillaume Savaton

Distributions contenant Sozi
----------------------------

Sozi est disponible dans les dépôts des distributions suivantes:

* [Archlinux (AUR)](http://aur.archlinux.org/packages.php?ID=42270)
* [Ubuntu (PPA)](https://launchpad.net/~sunab/+archive/sozi-release)
* [Debian](http://packages.banuscorp.eu/debian/)
* [Fedora](https://apps.fedoraproject.org/packages/inkscape-sozi)

Installation manuelle
-------------------

Sozi nécessite les dépendances suivantes:

* [Inkscape](http://inkscape.org) 0.48,
* [Python](http://python.org/) 2.7,
* [PyGTK](http://www.pygtk.org/) 2.24 et Python pour Glade2 (Ubuntu les livre dans des paquets séparés `python-gtk2` et `python-glade2`),
* [LXML](http://lxml.de/) for Python 2.

Les extensions pour Inkscape peuvent être installées dans deux endroits:

* dans le dossier des extensions pour tous les utilisateurs (`/usr/share/inkscape/extensions/`)
* dans votre dossier home personnel (`~/.config/inkscape/extensions`)

> Si vous mettez à jour depuis la version 13.01 ou plus récente,
vous devriez désinstaller les versions précédentes en supprimant tous les fichiers dont le nom commence par `sozi`.

1. [Télécharger Sozi](|filename|download.md)
2. Décompressez l'archive `sozi-release-[...].zip`.
Vous devriez obtenir un dossier nommé `archive sozi-release-[...]`.
3. Copiez le contenu de ce dossier dans le dossier des extensions d'Inkscape.
4. Contrôlez que le sous-dossier `sozi` possède les permissions *exécutable*.
5. Démarrez ou relancer Inkscape.
Vous devriez maintenant voir une entrée *Sozi* dans le menu *Extensions*.

VOus pouvez maintenant [créer votre première présentation](|filename|create.md).
