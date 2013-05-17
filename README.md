
Sozi is a presentation tool for SVG documents.

More details can be found on the official web site: <http://sozi.baierouge.fr>

This repository is organized in three main branches:

- master contains the latest stable version. It is updated when a new release is available or when an issue requires a hot fix.
- preview contains the current release candidate of Sozi. It is a feature-frozen version that is still undergoing test and debug.
- dev is the main development branch. Experimental features are added here.


Building and installing Sozi from sources
=========================================

Install the build tools:
------------------------

SCons 2.3 or higher is required.

    sudo apt-get install git scons

Optionally, install Javascript and CSS compressors:
- For Javascript: UglifyJS (default if installed), YUI-Compressor or none
- For CSS: YUI-Compressor (default if installed) or none

<!-- -->

    sudo apt-get install node-uglify
    sudo apt-get install yui-compressor

For developers, install the API documentation generator:

    sudo apt-get install jsdoc-toolkit
    
For developers, install the Javascript checker:

    sudo apt-get install npm
    sudo npm install autolint -g


Get the source files:
---------------------

Clone the repository:

    git clone git://github.com/senshu/Sozi.git

If needed, switch to the branch that you want to build:

    git checkout preview
    
or

    git checkout dev


Build:
------

Build a release bundle (`build/editors/inkscape/sozi-release-{version}.zip`):

    scons

For translators, create a translation template file (`build/editors/inkscape/sozi.pot`):

    scons pot-update

For developers, check the Javascript sources:

    autolint --once


Install:
--------

Install the Inkscape extension for the current user (in `$HOME/.config/inkscape/extensions`):

    scons install-editor-inkscape
    
Install the Inkscape extension for all users (in `/usr/share/inkscape/extensions`):

    sudo scons --prefix=/usr install-editor-inkscape

Install the player files only (to `/usr/share/sozi`, `/usr/share/doc/sozi` and `/usr/include`):

    sudo scons --prefix=/usr install-player

Install all documentation files, including API reference (to `/usr/share/doc/sozi`):

    sudo scons --prefix=/usr install-docs


