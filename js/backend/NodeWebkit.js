/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {AbstractBackend, addBackend} from "./AbstractBackend";
import gui from "nw.gui";
import fs from "fs";
import path from "path";
import process from "process";
import Jed from "jed";
import screenfull from "screenfull";

var win = gui.Window.get();

// Get the current working directory.
// We use the PWD environment variable directly because
// process.cwd() returns the installation path of Sozi.
var cwd = process.env.PWD;

console.log("Configuration in: " + gui.App.dataPath);
console.log("Current working dir: " + cwd);

export var NodeWebkit = Object.create(AbstractBackend);

NodeWebkit.init = function (container, _) {
    AbstractBackend.init.call(this, container, "sozi-editor-backend-NodeWebkit-input", _("Load an SVG file from your computer"));

    this.loadConfiguration();

    $(container).append('<input style="display:none;" id="sozi-editor-backend-NodeWebkit-file" type="file" accept="image/svg+xml">');

    $("#sozi-editor-backend-NodeWebkit-input").click(this.openFileChooser.bind(this));

    // Load the SVG document selected in the file input
    $("#sozi-editor-backend-NodeWebkit-file").change(evt => {
        if (evt.target.files.length) {
            this.load(evt.target.files[0].path);
        }
    });

    // Save automatically when the window loses focus
//            win.on("blur", this.doAutosave.bind(this));

    // Workaround for issue #1720 in node-webkit for Windows
    // https://github.com/rogerwang/node-webkit/issues/1720
    $(window).blur(this.doAutosave.bind(this));

    // Save automatically when closing the window
    win.on("close", () => {
        $(window).off("blur");
        this.doAutosave();
        this.saveConfiguration();
        win.close(true);
    });

    // If a file name was provided on the command line,
    // check that the file exists and load it.
    // Open a file chooser if no file name was provided or
    // the file does not exist.
    if (gui.App.argv.length > 0) {
        var fileName = path.resolve(cwd, gui.App.argv[0]);
        try {
            fs.accessSync(fileName);
            this.load(fileName);
        }
        catch (err) {
            $.notify(Jed.sprintf(_("File not found: %s."), fileName), "error");
            this.openFileChooser();
        }
    }
    else {
        this.openFileChooser();
    }

    return this;
};

NodeWebkit.openFileChooser = function () {
    $("#sozi-editor-backend-NodeWebkit-file").click();
};

NodeWebkit.getName = function (fileDescriptor) {
    return path.basename(fileDescriptor);
};

NodeWebkit.getLocation = function (fileDescriptor) {
    return path.dirname(fileDescriptor);
};

NodeWebkit.find = function (name, location, callback) {
    var fileName = path.join(location, name);
    fs.access(fileName, err => callback(err ? null : fileName));
};

NodeWebkit.load = function (fileDescriptor) {
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

NodeWebkit.create = function (name, location, mimeType, data, callback) {
    var fileName = path.join(location, name);
    // TODO use async file write
    var err = fs.writeFileSync(fileName, data, { encoding: "utf-8" });
    callback(fileName, err);
};

NodeWebkit.save = function (fileDescriptor, data) {
    // TODO use async file write
    var err = fs.writeFileSync(fileDescriptor, data, { encoding: "utf-8" });
    this.emit("save", fileDescriptor, err);
};

NodeWebkit.loadConfiguration = function () {
    function getItem(key, val) {
        var result = localStorage.getItem(key);
        return result !== null ? JSON.parse(result) : val;
    }
    win.moveTo(getItem("windowX", win.x), getItem("windowY", win.y));
    win.resizeTo(getItem("windowWidth", win.width), getItem("windowHeight", win.height));
    if (getItem("windowFullscreen", false)) {
        screenfull.request(document.documentElement);
    }
};

NodeWebkit.saveConfiguration = function () {
    localStorage.windowX = win.x;
    localStorage.windowY = win.y;
    localStorage.windowWidth = win.width;
    localStorage.windowHeight = win.height;
    localStorage.windowFullscreen = screenfull.isFullscreen;
};

addBackend(NodeWebkit);
