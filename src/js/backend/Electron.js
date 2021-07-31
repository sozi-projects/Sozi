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

/** Type for Electron browser windows.
 *
 * @external BrowserWindow
 */

/** The main browser window of the Sozi editor.
 *
 * @type {BrowserWindow}
 */
const browserWindow = remote.getCurrentWindow();

/** The current working directory.
 *
 * We use the `PWD` environment variable directly because
 * `process.cwd()` returns the installation path of Sozi.
 *
 * @type {string}
 */
const cwd = process.env.PWD;

/** A Sozi editor backend based on Electron.
 *
 * @extends module:backend/AbstractBackend.AbstractBackend
 */
export class Electron extends AbstractBackend {

    /** Initialize a Sozi  backend based on Electron.
     *
     * @param {module:Controller.Controller} controller - A controller instance.
     * @param {HTMLElement} container - The element that will contain the menu for choosing a backend.
     */
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

        /** A dictionary of file watchers.
         *
         * Populated by the {@linkcode module:backend/Electron.Electron#load|load} method.
         *
         * @type {object.<string, fs.FSWatcher>}
         */
        this.watchers = {};

        // If a file name was provided on the command line,
        // check that the file exists and load it.
        // Open a file chooser if no file name was provided or
        // the file does not exist.
        if (remote.process.argv.length > 1) {
            const arg = remote.process.argv[remote.process.argv.length - 1];
            const fileName = path.resolve(cwd, arg);
            if (fs.existsSync(fileName) && fs.statSync(fileName).isFile()) {
                this.controller.storage.setSVGFile(fileName, this);
            }
            else {
                this.controller.error(Jed.sprintf(_("File not found: %s."), fileName));
                // Force the error notification to appear before the file chooser.
                setTimeout(() => this.openFileChooser(), 100);
            }
        }
        else {
            this.openFileChooser();
        }
    }

    /** Close the editor window and terminate the application.
     *
     * @param {boolean} confirmSave - If `true`, save the current presentation before quitting.
     */
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

    /** @inheritdoc */
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

    /** @inheritdoc */
    getName(fileDescriptor) {
        return path.basename(fileDescriptor);
    }

    /** @inheritdoc */
    getLocation(fileDescriptor) {
        return path.dirname(fileDescriptor);
    }

    /** @inheritdoc */
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

    /** @inheritdoc */
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
                        try {
                            const watcher = this.watchers[fileDescriptor] = fs.watch(fileDescriptor);
                            let timer;
                            watcher.on("change", () => {
                                if (timer) {
                                    clearTimeout(timer);
                                }
                                timer = setTimeout(() => {
                                    timer = 0;
                                    this.controller.onFileChange(fileDescriptor);
                                }, 100);
                            });
                        }
                        catch (err) {
                            const _ = this.controller.gettext;
                            this.controller.error(Jed.sprintf(_("This file will not be reloaded on change: %s."), fileDescriptor));
                        }
                    }
                    resolve(data);
                }
            });
        });
    }

    /** @inheritdoc */
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

    /** @inheritdoc */
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

    /** @inheritdoc */
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

    /** Load the configuration of the current browser window.
     *
     * This method will restore the location, size, and fullscreen state
     * of the window.
     */
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

    /** Save the configuration of the current browser window.
     *
     * This method will save the location, size, and fullscreen state
     * of the window.
     */
    saveConfiguration() {
        [localStorage.windowX, localStorage.windowY] = browserWindow.getPosition();
        [localStorage.windowWidth, localStorage.windowHeight] = browserWindow.getSize();
        localStorage.windowFullscreen = screenfull.isFullscreen;
    }

    /** @inheritdoc */
    toggleDevTools() {
        browserWindow.toggleDevTools();
    }
}

addBackend(Electron);
