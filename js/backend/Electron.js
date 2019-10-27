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

const browserWindow = remote.getCurrentWindow();

// Get the current working directory.
// We use the PWD environment variable directly because
// process.cwd() returns the installation path of Sozi.
const cwd = process.env.PWD;

console.log("Current working dir: " + cwd);

/** Electron backend.
 *
 * @category backend
 * @todo Add documentation.
 */
export class Electron extends AbstractBackend {

    constructor(controller, container, _) {
        super(controller, container, "sozi-editor-backend-Electron-input", _("Open an SVG file from your computer"));

        this.loadConfiguration();

        document.getElementById("sozi-editor-backend-Electron-input").addEventListener("click", () => this.openFileChooser(_));

        // Save automatically when the window loses focus
        const onBlur = () => {
            if (this.controller.getPreference("saveMode") === "onblur") {
                this.doAutosave();
            }
        };
        this.addListener("blur", onBlur);

        // Save files when closing the window
        let closing = false;

        window.addEventListener("beforeunload", (evt) => {
            // Workaround for a bug in Electron where the window closes after a few
            // seconds even when calling dialog.showMessageBox() synchronously.
            if (closing) {
                return;
            }
            closing = true;
            evt.returnValue = false;

            this.removeListener("blur", onBlur);

            if (this.hasOutdatedFiles && this.controller.getPreference("saveMode") !== "onblur") {
                // If autosave is disabled and some files are outdated, ask user confirmation.
                remote.dialog.showMessageBox(browserWindow, {
                    type: "question",
                    message: _("Do you want to save the presentation before closing?"),
                    buttons: [_("Yes"), _("No")],
                    defaultId: 0,
                    cancelId: 1
                }, (index) => this.quit(index === 0));
            }
            else {
                window.setTimeout(() => this.quit(true));
            }
        });

        this.watchers = {};

        // If a file name was provided on the command line,
        // check that the file exists and load it.
        // Open a file chooser if no file name was provided or
        // the file does not exist.
        if (remote.process.argv.length > 1) {
            const fileName = path.resolve(cwd, remote.process.argv[1]);
            try {
                fs.accessSync(fileName);
                this.load(fileName);
            }
            catch (err) {
                this.controller.error(Jed.sprintf(_("File not found: %s."), fileName));
                // Force the error notification to appear before the file chooser.
                setTimeout(() => this.openFileChooser(_), 100);
            }
        }
        else {
            this.openFileChooser(_);
        }
    }

    quit(confirmSave) {
        // Always save the window settings and the preferences.
        this.saveConfiguration();
        this.savePreferences();

        if (confirmSave && this.hasOutdatedFiles) {
            // Close the window only when all files have been saved.
            this.addListener("save", () => {
                if (!this.hasOutdatedFiles) {
                    browserWindow.close();
                }
            });
            this.saveOutdatedFiles();
        }
        else {
            browserWindow.close();
        }
    }

    openFileChooser(_) {
        const files = remote.dialog.showOpenDialogSync({
            title: _("Choose an SVG file"),
            filters: [{name: _("SVG files"), extensions: ["svg"]}],
            properties: ["openFile"]
        });
        if (files) {
            this.load(files[0]);
        }
    }

    getName(fileDescriptor) {
        return path.basename(fileDescriptor);
    }

    getLocation(fileDescriptor) {
        return path.dirname(fileDescriptor);
    }

    find(name, location, callback) {
        const fileName = path.join(location, name);
        fs.access(fileName, err => callback(err ? null : fileName));
    }

    load(fileDescriptor) {
        // Read file asynchronously and fire the "load" event.
        fs.readFile(fileDescriptor, { encoding: "utf8" }, (err, data) => {
            if (!err) {
                // Watch for changes in the loaded file and fire the "change" event.
                // The "change" event is fired only once if the file is modified
                // after being loaded. It will not be fired again until the file is
                // loaded again.
                // This includes a debouncing mechanism to ensure the file is in a stable
                // state when the "change" event is fired: the event is fired only if the
                // file has not changed for 100 ms.
                if (!(fileDescriptor in this.watchers)) {
                    const watcher = this.watchers[fileDescriptor] = fs.watch(fileDescriptor);
                    let timer;
                    watcher.on("change", () => {
                        if (timer) {
                            clearTimeout(timer);
                        }
                        timer = setTimeout(() => {
                            timer = 0;
                            this.emit("change", fileDescriptor);
                        }, 100);
                    });
                }
            }
            this.emit("load", fileDescriptor, data, err);
        });
    }

    create(name, location, mimeType, data, callback = () => {}) {
        const fileName = path.join(location, name);
        fs.writeFile(fileName, data, { encoding: "utf-8" }, (err) => callback(fileName, err));
    }

    save(fileDescriptor, data) {
        fs.writeFile(fileDescriptor, data, { encoding: "utf-8" }, (err) => this.emit("save", fileDescriptor, err));
    }

    loadConfiguration() {
        function getItem(key, val) {
            const result = localStorage.getItem(key);
            return result !== null ? JSON.parse(result) : val;
        }
        const [x, y] = browserWindow.getPosition();
        const [w, h] = browserWindow.getSize();
        browserWindow.setPosition(getItem("windowX", x), getItem("windowY", y));
        browserWindow.setSize(getItem("windowWidth", w), getItem("windowHeight", h));
        if (getItem("windowFullscreen", false)) {
            screenfull.request(document.documentElement);
        }
    }

    saveConfiguration() {
        [localStorage.windowX, localStorage.windowY] = browserWindow.getPosition();
        [localStorage.windowWidth, localStorage.windowHeight] = browserWindow.getSize();
        localStorage.windowFullscreen = screenfull.isFullscreen;
    }

    toggleDevTools() {
        browserWindow.toggleDevTools();
    }
}

addBackend(Electron);
