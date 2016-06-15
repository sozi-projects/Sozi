/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {AbstractBackend, addBackend} from "./AbstractBackend";
import fs from "fs";
import path from "path";
import process from "process";
import Jed from "jed";
import screenfull from "screenfull";
import {remote} from "electron";
import $ from "jquery";

var win = remote.getCurrentWindow();

// Get the current working directory.
// We use the PWD environment variable directly because
// process.cwd() returns the installation path of Sozi.
var cwd = process.env.PWD;

console.log("Current working dir: " + cwd);

export var Electron = Object.create(AbstractBackend);

Electron.init = function (container, _) {
    AbstractBackend.init.call(this, container, "sozi-editor-backend-Electron-input", _("Open an SVG file from your computer"));

    this.loadConfiguration();

    $("#sozi-editor-backend-Electron-input").click(this.openFileChooser.bind(this, _));

    // Save automatically when the window loses focus
    $(window).on("blur", this.doAutosave.bind(this));

    // Save automatically when closing the window
    $(window).on("beforeunload", () => {
        $(window).off("blur");
        this.doAutosave();
        this.saveConfiguration();
    });

    // If a file name was provided on the command line,
    // check that the file exists and load it.
    // Open a file chooser if no file name was provided or
    // the file does not exist.
    if (remote.process.argv.length > 1) {
        var fileName = path.resolve(cwd, remote.process.argv[1]);
        try {
            fs.accessSync(fileName);
            this.load(fileName);
        }
        catch (err) {
            new Notification(_("Sozi (Error)"), {body: Jed.sprintf(_("File not found: %s."), fileName)});
            this.openFileChooser(_);
        }
    }
    else {
        this.openFileChooser(_);
    }

    return this;
};

Electron.openFileChooser = function (_) {
    var files = remote.dialog.showOpenDialog({
        title: _("Choose an SVG file"),
        filters: [{name: _("SVG files"), extensions: ["svg"]}],
        properties: ["openFile"]
    });
    if (files) {
        this.load(files[0]);
    }
};

Electron.getName = function (fileDescriptor) {
    return path.basename(fileDescriptor);
};

Electron.getLocation = function (fileDescriptor) {
    return path.dirname(fileDescriptor);
};

Electron.find = function (name, location, callback) {
    var fileName = path.join(location, name);
    fs.access(fileName, err => callback(err ? null : fileName));
};

Electron.load = function (fileDescriptor) {
    // Read file asynchronously and fire the "load" event.
    fs.readFile(fileDescriptor, { encoding: "utf8" }, (err, data) => {
        if (!err) {
            // Watch for changes in the loaded file and fire the "change" event.
            // The "change" event is fired only once if the the file is modified
            // after being loaded. It will not be fired again until the file is
            // loaded again.
            // This includes a debouncing mechanism to ensure the file is in a stable
            // state when the "change" event is fired: the event is fired only if the
            // file has not changed for 100 ms.
            var watcher = fs.watch(fileDescriptor);
            var timer;
            watcher.on("change", () => {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(() => {
                    watcher.close();
                    this.emit("change", fileDescriptor);
                }, 100);
            });
        }
        this.emit("load", fileDescriptor, data, err);
    });
};

Electron.create = function (name, location, mimeType, data, callback) {
    var fileName = path.join(location, name);
    // TODO use async file write
    var err = fs.writeFileSync(fileName, data, { encoding: "utf-8" });
    callback(fileName, err);
};

Electron.save = function (fileDescriptor, data) {
    // TODO use async file write
    var err = fs.writeFileSync(fileDescriptor, data, { encoding: "utf-8" });
    this.emit("save", fileDescriptor, err);
};

Electron.loadConfiguration = function () {
    function getItem(key, val) {
        var result = localStorage.getItem(key);
        return result !== null ? JSON.parse(result) : val;
    }
    let [x, y] = win.getPosition();
    let [w, h] = win.getSize();
    win.setPosition(getItem("windowX", x), getItem("windowY", y));
    win.setSize(getItem("windowWidth", w), getItem("windowHeight", h));
    if (getItem("windowFullscreen", false)) {
        screenfull.request(document.documentElement);
    }
};

Electron.saveConfiguration = function () {
    [localStorage.windowX, localStorage.windowY] = win.getPosition();
    [localStorage.windowWidth, localStorage.windowHeight] = win.getSize();
    localStorage.windowFullscreen = screenfull.isFullscreen;
};

addBackend(Electron);
