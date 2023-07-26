
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

The following instructions work successfully in Ubuntu 22.04.

Install [Node.js](http://nodejs.org/) and Gulp.
The build script for Sozi is known to work with Node.js 14 from [Nodesource](https://github.com/nodesource/distributions).

    sudo apt install nodejs
    sudo npm install --global gulp-cli

From the root of the source tree, run:

    npm install

If you plan to build a Windows executable, also install *wine*.
In Debian/Ubuntu and their derivatives, you can type the following commands.

    dpkg --add-architecture i386
    sudo apt update
    sudo apt install wine wine32

If you plan to build Debian packages, install the following additional packages:

    sudo apt install devscripts debhelper

If you plan to build Redhat packages, install the following additional packages:

    sudo apt install rpm

If you plan to build Archlinux packages, install the following additional packages:

    sudo apt install libarchive-tools

The `zip` compression tool must also be installed:

    sudo apt install zip

Get the binaries for ffmpeg (optional, but video export will not work without them).
Download and unzip the FFMPEG executables to the following folders:

* Linux 32-bit: `resources/ffmpeg/linux-ia32`
* Linux 64-bit: `resources/ffmpeg/linux-x64`
* Windows 32-bit: `resources/ffmpeg/win32-ia32`
* Windows 64-bit: `resources/ffmpeg/win32-x64`
* MacOS X 64-bit: `resources/ffmpeg/darwin-x64`

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

