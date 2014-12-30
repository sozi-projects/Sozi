/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.backend", exports => {
    "use strict";

    var gui, fs, path, cwd, win;

    if (namespace.global.require) {
        gui = require("nw.gui");
        fs = require("fs");
        path = require("path");

        win = gui.Window.get();

        // Get the current working directory.
        // We use the PWD environment variable directly because
        // process.cwd() returns the installation path of Sozi.
        cwd = process.env.PWD;

        console.log("Configuration in: " + gui.App.dataPath);
        console.log("Current working dir: " + cwd);
    }

    var NodeWebkit = Object.create(sozi.editor.backend.AbstractBackend);

    NodeWebkit.init = function (container) {
        if (!namespace.global.require) {
            return this;
        }

        sozi.editor.backend.AbstractBackend.init.call(this, container, '<input id="sozi-editor-backend-NodeWebkit-input" type="file" accept="image/svg+xml" autofocus>');

        // Load the SVG document selected in the file input
        $("#sozi-editor-backend-NodeWebkit-input").change(evt => {
            if (evt.target.files.length) {
                this.load(evt.target.files[0].path);
            }
        });

        var autosaveCallback = this.doAutosave.bind(this);

        // Save automatically when the window loses focus
//            win.on("blur", autosaveCallback);

        // Workaround for issue #1720 in node-webkit for Windows
        // https://github.com/rogerwang/node-webkit/issues/1720
        $(window).blur(autosaveCallback);

        // Save automatically when closing the window
        win.on("close", () => {
            $(window).off("blur");
            autosaveCallback();
            win.close(true);
        });

        // If a file name was provided on the command line,
        // check that the file exists and load it.
        if (gui.App.argv.length > 0) {
            var fileName = path.resolve(cwd, gui.App.argv[0]);
            if (fs.existsSync(fileName)) {
                this.load(fileName);
            }
            else {
                console.log("File not found " + fileName);
            }
        }

        return this;
    };

    NodeWebkit.getName = function (fileDescriptor) {
        return path.basename(fileDescriptor);
    };

    NodeWebkit.getLocation = function (fileDescriptor) {
        return path.dirname(fileDescriptor);
    };

    NodeWebkit.find = function (name, location, callback) {
        var fileName = path.join(location, name);
        fs.exists(fileName, found => callback(found ? fileName : null));
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
                        this.emitEvent("change", [fileDescriptor]);
                    }, 100);
                });
            }
            this.emitEvent("load", [fileDescriptor, data, err]);
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
        this.emitEvent("save", [fileDescriptor, err]);
    };

    sozi.editor.backend.add(NodeWebkit);

    exports.NodeWebkit = NodeWebkit;
});
