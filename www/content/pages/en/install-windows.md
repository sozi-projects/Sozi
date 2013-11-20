Title: Install Sozi on Windows
Slug: install-windows
Lang: en
Status: hidden
Author: Guillaume Savaton

> If you are upgrading from version 13.01 or earlier,
you should uninstall the previous version by removing all files whose names begin with `sozi`
from `C:\Program Files\Inkscape\share\extensions`.

These instructions have been tested with Inkscape 0.48, Python 2.7 and PyGTK 2.24.
If you are upgrading from an earlier version of Sozi, you can go directly to step 8.

1. Install [Inkscape](http://inkscape.org/download/) using the Windows 32-bit installer.
The default installation location is `C:\Program Files\Inkscape`
or `C:\Program Files (x86)\Inkscape`
2. Install [Python](http://python.org/download/) 2.7.
Use the default Windows 32-bit installer, not the one for x86_64. The default installation location is `C:\Python27`
3. Install [LXML](https://pypi.python.org/pypi/lxml/3.2.4#downloads) for Python 2.7 and Windows 32-bit (win32-py2.7).
4. Install [PyGTK](http://ftp.gnome.org/pub/GNOME/binaries/win32/pygtk/2.24/) 2.24.
Choose the *all-in-one* installer for Python 2.7 and Windows 32-bit (win32).
5. Copy the folder `C:\Python27` into `C:\Program Files\Inkscape`
6. Rename the folder `C:\Program Files\Inkscape\python` as `C:\Program Files\Inkscape\python26`
7. Rename the folder `C:\Program Files\Inkscape\Python27` as `C:\Program Files\Inkscape\python`
8. [Download Sozi](|filename|download.md)
9. Unzip the archive `sozi-release-[...].zip`.
You should get a folder named `archive sozi-release-[...]`.
Copy the content of this folder into `C:\Program Files\Inkscape\share\extensions`
10. Start or relaunch Inkscape.
You should now see an item *Sozi* in the *Extensions* menu.

You can now [create your first presentation](|filename|create.md).

