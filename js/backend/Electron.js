/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

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

/** Electron backend.
 *
 * @extends module:backend/AbstractBackend.AbstractBackend
 * @todo Add documentation.
 */
export class Electron extends AbstractBackend {

    constructor(controller, container) {
        const _ = controller.gettext;

        super(controller, container, "sozi-editor-backend-Electron-input", _("Open an SVG file from your computer"));

        this.loadConfiguration();

        document.getElementById("sozi-editor-backend-Electron-input").addEventListener("click", () => this.openFileChooser());

        // Save files when closing the window
        let closing = false;

        window.addEventListener("beforeunload", async evt => {
            // Workaround for a bug in Electron where the window closes after a few
            // seconds even when calling dialog.showMessageBox() synchronously.
            if (closing) {
                return;
            }

            this.controller.removeAllListeners("blur");

            closing = true;
            evt.returnValue = false;

            if (this.hasOutdatedFiles && this.controller.getPreference("saveMode") !== "onblur") {
                // If autosave is disabled and some files are outdated, ask user confirmation.
                const res = await remote.dialog.showMessageBox(browserWindow, {
                    type: "question",
                    message: _("Do you want to save the presentation before closing?"),
                    buttons: [_("Yes"), _("No")],
                    defaultId: 0,
                    cancelId: 1
                });
                this.quit(res.response === 0);
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
                this.controller.storage.setSVGFile(fileName, this);
            }
            catch (err) {
                this.controller.error(Jed.sprintf(_("File not found: %s."), fileName));
                // Force the error notification to appear before the file chooser.
                setTimeout(() => this.openFileChooser(), 100);
            }
        }
        else {
            this.openFileChooser();
        }
    }

    async quit(confirmSave) {
        // Always save the window settings and the preferences.
        this.saveConfiguration();
        this.controller.preferences.save();

        if (confirmSave && this.hasOutdatedFiles) {
            // Close the window only when all files have been saved.
            await this.saveOutdatedFiles();
        }

        browserWindow.close();
    }

    openFileChooser() {
        const _ = this.controller.gettext;

        const files = remote.dialog.showOpenDialogSync({
            title: _("Choose an SVG file"),
            filters: [{name: _("SVG files"), extensions: ["svg"]}],
            properties: ["openFile"]
        });
        this.controller.hideNotification();
        if (files) {
            this.controller.storage.setSVGFile(files[0], this);
        }
    }

    getName(fileDescriptor) {
        return path.basename(fileDescriptor);
    }

    getLocation(fileDescriptor) {
        return path.dirname(fileDescriptor);
    }

    find(name, location) {
        const fileName = path.join(location, name);
        return new Promise((resolve, reject) => {
            fs.access(fileName, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(fileName);
                }
            });
        });
    }

    load(fileDescriptor) {
        return new Promise((resolve, reject) => {
            fs.readFile(fileDescriptor, { encoding: "utf8" }, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    // Watch for changes in the loaded file.
                    // This includes a debouncing mechanism to ensure the file is in a stable
                    // state when the storage is notified.
                    if (!(fileDescriptor in this.watchers)) {
                        const watcher = this.watchers[fileDescriptor] = fs.watch(fileDescriptor);
                        let timer;
                        watcher.on("change", () => {
                            if (timer) {
                                clearTimeout(timer);
                            }
                            timer = setTimeout(() => {
                                timer = 0;
                                this.controller.storage.onFileChange(fileDescriptor);
                            }, 100);
                        });
                    }
                    resolve(data);
                }
            });
        });
    }

    loadSync(fileDescriptor) {
        try {
            return fs.readFileSync(fileDescriptor, {encoding: "utf8" });
        }
        catch (e) {
            const _ = this.controller.gettext;
            this.controller.error(Jed.sprintf(_("Could not read file %s."), fileDescriptor));
            return "";
        }
    }

    create(name, location, mimeType, data) {
        const fileName = path.join(location, name);
        return new Promise((resolve, reject) => {
            fs.writeFile(fileName, data, { encoding: "utf-8" }, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(fileName);
                }
            });
        });
    }

    save(fileDescriptor, data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(fileDescriptor, data, { encoding: "utf-8" }, err => {
                if (err) {
                    reject(err);
                }
                else {
                    this.controller.storage.onSave(fileDescriptor);
                    resolve(fileDescriptor);
                }
            });
        });
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
