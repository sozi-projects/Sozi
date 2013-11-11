Title: Install Sozi on GNU/Linux
Slug: install-linux
Lang: en
Status: hidden
Author: Guillaume Savaton

Distributions shipping Sozi
---------------------------

Sozi is available in repositories for the following distributions:

* [Archlinux (AUR)](http://aur.archlinux.org/packages.php?ID=42270)
* [Ubuntu (PPA)](https://launchpad.net/~sunab/+archive/sozi-release)
* [Debian](http://packages.banuscorp.eu/debian/)
* [Fedora](https://apps.fedoraproject.org/packages/inkscape-sozi)

Manual installation
-------------------

Sozi depends on the following packages:

* [Inkscape](http://inkscape.org) 0.48,
* [Python](http://python.org/) 2.7,
* [PyGTK](http://www.pygtk.org/) 2.24 and Python bindings for Glade2 (Ubuntu provides them in separate packages `python-gtk2` and `python-glade2`),
* [LXML](http://lxml.de/) for Python 2.

Inkscape extensions can be installed in two possible locations:

* in the extensions folder for all users (`/usr/share/inkscape/extensions/`)
* in your home folder (`~/.config/inkscape/extensions`)

> If you are upgrading from version 13.01 or earlier,
you should uninstall the previous version by removing all files whose names begin with `sozi`.

1. [Download Sozi](|filename|download.md)
2. Unzip the archive `sozi-release-[...].zip`.
You should get a folder named `archive sozi-release-[...]`.
3. Copy the content of this folder into the Inkscape extensions folder.
4. Check that the subfolder `sozi` has *execute* permissions.
5. Start or relaunch Inkscape.
You should now see an item *Sozi* in the *Extensions* menu.

You can now [create your first presentation](|filename|create.md).
