
![Github Downloads (latest)](https://img.shields.io/github/downloads/sozi-projects/Sozi/latest/total.svg?style=flat-square)
![Github Downloads (total)](https://img.shields.io/github/downloads/sozi-projects/Sozi/total.svg?style=flat-square)

Sozi is a presentation tool for SVG documents.

It is free software distributed under the terms of the
[Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/).

More details can be found on the official web site: <http://sozi.baierouge.fr>

Building and installing Sozi from sources
=========================================

Get the source files
--------------------

Clone the repository:

    git clone git://github.com/sozi-projects/Sozi.git


Install the build tools and dependencies
----------------------------------------

Install [Node.js](http://nodejs.org/) and the [Grunt](http://gruntjs.com/) CLI.
The build script for Sozi is known to work with Node.js 11 from [Nodesource](https://github.com/nodesource/distributions).
If you plan to build a Windows executable from Linux or OS X, also install *wine*.
In Debian/Ubuntu and their derivatives, you can type the following commands.

    sudo apt install nodejs wine
    sudo npm install --global gulp-cli

If you plan to build Debian packages, install the following additional packages:

    sudo apt install devscripts debhelper

From the root of the source tree:

    npm install

Get the binaries for ffmpeg (optional, video export will not work without them).
Download and unzip the FFMPEG executables to the following folders:

* Linux 32-bit: `vendor/ffmpeg/linux-ia32`
* Linux 64-bit: `vendor/ffmpeg/linux-x64`
* Windows 32-bit: `vendor/ffmpeg/win32-ia32`
* Windows 64-bit: `vendor/ffmpeg/win32-x64`
* MacOS X 64-bit: `vendor/ffmpeg/darwin-x64`

Build
-----

To build the desktop application for all platforms, run the following command from the root of the source tree:

    grunt

After a successful build, you will get a `dist` folder that will contain the
generated application archives for each platform.

You can customize the build by creating a custom configuration file.
See `config/sozi-default.json` and `config/sozi-linux-x64.json` for examples.
For instance, if you want to build 64-bit executables for OS X and Linux,
the configuration file (`config/sozi-linux-darwin-x64.json`) will look like this:

```json
{
    "platforms": [
        "darwin-x64",
        "linux-x64"
    ]
}
```

Then run Grunt with the `--config` option:

    grunt --config=config/sozi-linux-darwin-x64.json

Other Grunt tasks are available for developers:

| Command                            | Effect                                                                       |
|:-----------------------------------|:-----------------------------------------------------------------------------|
| `grunt electron-archive` (default) | Build the desktop application and create zip archives for various platforms. |
| `grunt deb`                        | Build Debian packages.                                                       |
| `grunt dist`                       | Create zip archives and Debian packages.                                     |
| `grunt electron-build`             | Build the desktop application without creating archives.                     |
| `grunt web-build`                  | Build the web application without uploading it.                              |
| `grunt jspot`                      | Extract a template file (`locales/messages.pot`) for translation.            |
| `grunt jsdoc`                      | Generate the API documentation.                                              |


Install
-------

Since Sozi 18.01, a Debian package is available for users of Debian or Ubuntu-based distributions.

```
sudo dpkg -i sozi_[...].deb
```

[Alien](https://joeyh.name/code/alien/) can convert it to an RPM package by `sudo alien --to-rpm`.

For other platforms, Sozi is released as a zip/tar.xz archive that you can extract wherever you like.

* OS X users can drag the `Sozi.app` subfolder into their `Applications` folder.
* Windows and Linux users can run the `Sozi` executable directly from the extracted folder.

If installation on your specific platform is supported by Sozi, there will be an *install* folder in the extracted archive containing installation scripts.
To install Sozi system-wide:

```
cd Sozi-[...]/install
sudo ./install.sh
```

To install Sozi in your home folder:

```
cd Sozi-[...]/install
./install-local.sh
```

In many situations, Sozi will not need additional software to be installed.
If Sozi complains about missing libraries, here is the list of all the known
runtime dependencies of the `Sozi` executable:

```
libasound2
libatk1.0-0
libc6
libcairo2
libcups2
libdbus-1-3
libexpat1
libfontconfig1
libfreetype6
libgcc1
libgconf-2-4
libgdk-pixbuf2.0-0
libglib2.0-0
libgtk2.0-0
libnspr4
libnss3
libpango-1.0-0
libpangocairo-1.0-0
libstdc++6
libx11-6
libx11-xcb1
libxcb1
libxcomposite1
libxcursor1
libxdamage1
libxext6
libxfixes3
libxi6
libxrandr2
libxrender1
libxss1
libxtst6
```

Helping debugging Sozi
======================

While Sozi is running, press `F12` to open the developer tools.
Check the *Console* tab for error messages.

Some environment variables will enable debugging features in Sozi.
When running Sozi from the command line, you can add one
or more variable assignments like this:

```
SOME_VAR=1 SOME_OTHER_VAR=1 sozi my-presentation.svg
```

Where `SOME_VAR` and `SOME_OTHER_VAR` are variable names from the
first column of this table:

| Variable                               | Effect                                                                                                                                   |
|:---------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------|
| `ELECTRON_ENABLE_LOGGING`              | Display JavaScript console messages in the current terminal window.                                                                      |
| `SOZI_DEVTOOLS`                        | Open the developer tools immediately. This can be useful if `F12` has no effect or when you want to debug events that happen at startup. |
| `SOZI_DISABLE_HW_ACCELERATION`         | Disable hardware acceleration in the rendering engine.                                                                                   |
| `SOZI_DISABLE_COLOR_CORRECT_RENDERING` | Disable color profile correction.                                                                                                        |
