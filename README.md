
Sozi is a presentation tool for SVG documents.

More details can be found on the official web site: <http://sozi.baierouge.fr>

This repository is organized in three main branches:

- master contains the latest stable version. It is updated when a new release is available or when an issue requires a hot fix.
- preview contains the current release candidate of Sozi. It is a feature-frozen version that is still undergoing test and debug.
- dev is the main development branch. Experimental features are added here.


Building and installing Sozi from sources
=========================================

Install the build tools
---------------------

TODO

Get the source files
--------------------

Clone the repository:

    git clone git://github.com/senshu/Sozi.git

If needed, switch to the branch that you want to build:

    git checkout preview
    
or

    git checkout dev


Dependencies
------------

* [Font Awesome](http://fortawesome.github.io/Font-Awesome/) ([download](http://fortawesome.github.io/Font-Awesome/assets/font-awesome-4.1.0.zip)) as `vendor/font-awesome/`
* [jQuery](http://jquery.com/) ([download](http://code.jquery.com/jquery-2.1.1.min.js)) as `vendor/jquery.min.js`
* [Notify.js](http://notifyjs.com/) ([download](http://notifyjs.com/dist/notify-combined.min.js) as `vendor/notify-combined.min.js`
* [Nunjucks](http://mozilla.github.io/nunjucks/) ([download](http://mozilla.github.io/nunjucks/files/nunjucks-slim.js)) as `vendor/nunjucks-slim.js`
* [Droid Sans](http://www.fontsquirrel.com/fonts/Droid-Sans) as `vendor/DroidSans/DroidSans.eot|ttf` and `vendor/DroidSans/DroidSans-Bold.eot|ttf`

Build
-----

TODO

Install
-------

TODO