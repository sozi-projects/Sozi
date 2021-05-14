
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

    sudo apt install nodejs
    sudo apt install wine # To build Windows executables
    sudo npm install --global gulp-cli

If you plan to build Debian packages, install the following additional packages:

    sudo apt install devscripts debhelper

If you plan to build Redhat packages, install the following additional packages:

    sudo apt install rpm

From the root of the source tree:

    npm install

Get the binaries for ffmpeg (optional, but video export will not work without them).
Download and unzip the FFMPEG executables to the following folders:

* Linux 32-bit: `vendor/ffmpeg/linux-ia32`
* Linux 64-bit: `vendor/ffmpeg/linux-x64`
* Windows 32-bit: `vendor/ffmpeg/win32-ia32`
* Windows 64-bit: `vendor/ffmpeg/win32-x64`
* MacOS X 64-bit: `vendor/ffmpeg/darwin-x64`

Build
-----

To build and run the desktop application without packaging it,
run the following commands from the root of the source tree.
At startup, Sozi will show an error notification that can be ignored.

```
gulp
npm start
```

To build and package the desktop application for all platforms, do:

```
gulp all
```

After a successful build, you will get a `build/dist` folder that contains the
generated application archives for each platform.

You can customize the build by creating a configuration file in the `config` folder.
See `config/sozi-default.json` and `config/sozi-linux-x64.json` for examples.
For instance, if you want to build 64-bit executables for OS X and Linux,
the configuration file (`config/sozi-linux-darwin-x64.json`) will look like this:

```json
{
    "electronPackager": {
        "platform": ["darwin", "linux"],
        "arch": ["x64"],
        "electronVersion": "9.2.1"
    }
}
```

Then run Gulp with the `SOZI_CONFIG` environment variable:

```
SOZI_CONFIG=sozi-linux-darwin-x64 gulp all
```

Install
-------

A Debian package is available for users of Debian or Ubuntu-based distributions.

```
sudo dpkg -i sozi_[...].deb
```

You can convert it to the RPM format with [Alien](https://joeyh.name/code/alien/):

```
sudo alien --to-rpm sozi_[...].deb
```

For other platforms, Sozi is released as a zip/tar.xz archive that you can extract wherever you like.

* OS X users can drag the `sozi.app` subfolder into their `Applications` folder.
* Windows and Linux users can run the `sozi` executable directly from the extracted folder.

If installation on your specific platform is supported by Sozi,
there will be an *install* folder in the extracted archive containing installation scripts.
To install Sozi system-wide:

```
cd sozi-[...]/install
sudo ./install.sh
```

To install Sozi in your home folder:

```
cd sozi-[...]/install
./install-local.sh
```

Helping debug Sozi
==================

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
