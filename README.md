
![Github Downloads (latest)](https://img.shields.io/github/downloads/senshu/Sozi/latest/total.svg?style=flat-square)
![Github Downloads (total)](https://img.shields.io/github/downloads/senshu/Sozi/total.svg?style=flat-square)

Sozi is a presentation tool for SVG documents.

It is free software distributed under the terms of the
[Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/).

More details can be found on the official web site: <http://sozi.baierouge.fr>

Building and installing Sozi from sources
=========================================

Get the source files
--------------------

Clone the repository:

    git clone git://github.com/senshu/Sozi.git


Install the build tools and dependencies
----------------------------------------

Install [Node.js](http://nodejs.org/), [Bower](http://bower.io/)
and the [Grunt](http://gruntjs.com/) CLI.
If you plan to build a Windows executable from Linux or OS X, also install wine.
In Debian/Ubuntu and their derivatives, you can type the following commands.

    sudo apt install nodejs nodejs-legacy npm wine
    sudo npm install bower grunt-cli -g

From the root of the source tree:

    npm install
    bower install

Also install the following:

* [Droid Sans](http://www.fontsquirrel.com/fonts/Droid-Sans) as `vendor/DroidSans/DroidSans.eot|ttf` and `vendor/DroidSans/DroidSans-Bold.eot|ttf`

Build
-----

To build the desktop application for all platforms, run the following command from the root of the source tree:

    grunt

After a successful build, you will get a `dist` folder that will contain the
generated application bundles for each platform.

You can customize the build by creating a custom configuration file.
See `config.default.json` and `config.linux-x64.json` for examples.
For instance, if you want to build 64-bit executables for OS X and Linux,
the configuration file (`config.linux-darwin-x64.json`) will look like this:

```json
{
    "platforms": [
        "darwin-x64",
        "linux-x64"
    ]
}
```

Then run Grunt with the `--config` option:

    grunt --config=config.linux-darwin-x64.json

Other Grunt tasks are available for developers:

Command                           | Effect
----------------------------------|-------
`grunt electron-build`            | Build the desktop application without creating bundles.
`grunt web-build`                 | Build the web application without uploading it.
`grunt electron-bundle` (default) | Build the desktop application and create executable bundles for various platforms.
`grunt web-demo`                  | Build the web application and upload it to a server.
`grunt pot`                       | Extract a template file (`locales/messages.pot`) for translation.


Install
-------

Sozi is released as a zip/tgz archive that you can extract wherever you like.
Open the extracted folder and run the `Sozi` executable.

If installation on your specific platform is supported by Sozi, there will be an *install* folder in the extracted archive containing an installation script. Run it with admin privileges (e.g. in Linux, open a terminal in the *install* folder and type `sudo ./install.sh`) to install Sozi system-wide.

In many situations, Sozi will not need additional software to be installed.
If Sozi complains about missing libraries, here is the list of all the known
runtime dependencies of the `Sozi` executable:

```
sudo apt install \
    libasound2 \
    libatk1.0-0 \
    libavahi-client3 \
    libavahi-common3 \
    libc6 libcairo2 \
    libcomerr2 \
    libcups2 \
    libdatrie1 \
    libdbus-1-3 \
    libdbus-glib-1-2 \
    libexpat1 \
    libffi6 \
    libfontconfig1 \
    libfreetype6 \
    libgcc1 \
    libgconf-2-4 \
    libgcrypt20 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgmp10 \
    libgnutls30 \
    libgpg-error0 \
    libgraphite2-3 \
    libgssapi-krb5-2 \
    libgtk2.0-0 \
    libharfbuzz0b \
    libhogweed4 \
    libidn11 \
    libk5crypto3 \
    libkeyutils1 \
    libkrb5-3 \
    libkrb5support0 \
    liblzma5 \
    libnettle6 \
    libnspr4 \
    libnss3 \
    libp11-kit0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libpcre3 \
    libpixman-1-0 \
    libpng12-0 \
    libselinux1 \
    libstdc++6 \
    libsystemd0 \
    libtasn1-6 \
    libthai0 \
    libx11-6 \
    libx11-xcb1 \
    libxau6 \
    libxcb1 \
    libxcb-render0 \
    libxcb-shm0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxdmcp6 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxinerama1 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    zlib1g
```
