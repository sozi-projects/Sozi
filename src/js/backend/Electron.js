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
import * as remote from "@electron/remote";
import settings from "electron-app-settings";
import {isOdgFile, convertOdg} from "./OdgImport";

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

/** The key used to pass the name of the next SVG file across an editor reload.
 *
 * @type {string}
 */
const PENDING_FILE_KEY = "sozi-pending-svg-file";

/** Escape a string for insertion into an HTML notification.
 *
 * File names can contain characters such as `<` and `&` on some platforms.
 *
 * @param {string} str - A string to escape.
 * @returns {string} - The escaped string.
 */
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

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

        /** Set to `true` when the editor reloads to open another SVG document.
         *
         * @default
         * @type {boolean}
         */
        this.reloading = false;

        /** Set to `true` while a request to open another SVG document is in progress.
         *
         * @default
         * @type {boolean}
         */
        this.openingAnotherFile = false;

        window.addEventListener("beforeunload", async evt => {
            // When opening another file, the presentation has already been saved
            // and the window must reload instead of closing.
            if (this.reloading) {
                return;
            }

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

        // If another file was chosen before the editor was reloaded, load it.
        // Else, if a file name was provided on the command line,
        // check that the file exists and load it.
        // Open a file chooser if no file name was provided or
        // the file does not exist.
        const pendingFile = this.takePendingFile();
        if (pendingFile) {
            if (fs.existsSync(pendingFile) && fs.statSync(pendingFile).isFile()) {
                this.controller.storage.setSVGFile(pendingFile, this);
            }
            else {
                this.controller.error(Jed.sprintf(_("File not found: %s."), escapeHTML(pendingFile)));
                setTimeout(() => this.openFileChooser(), 100);
            }
        }
        else if (remote.process.argv.length > 1) {
            const arg = remote.process.argv[remote.process.argv.length - 1];
            const fileName = path.resolve(cwd, arg);
            if (fs.existsSync(fileName) && fs.statSync(fileName).isFile()) {
                this.controller.storage.setSVGFile(fileName, this);
            }
            else {
                this.controller.error(Jed.sprintf(_("File not found: %s."), escapeHTML(fileName)));
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
            filters: [
                {name: _("SVG and LibreOffice Draw files"), extensions: ["svg", "odg"]},
                {name: _("SVG files"), extensions: ["svg"]},
                {name: _("LibreOffice Draw files"), extensions: ["odg"]}
            ],
            properties: ["openFile"]
        });
        this.controller.hideNotification();
        if (files) {
            this.controller.storage.setSVGFile(files[0], this);
        }
    }

    /** Read and forget the name of the file chosen before the last editor reload.
     *
     * @returns {?string} - A file name, or `null` if no file was chosen.
     */
    takePendingFile() {
        try {
            const fileName = sessionStorage.getItem(PENDING_FILE_KEY);
            sessionStorage.removeItem(PENDING_FILE_KEY);
            return fileName;
        }
        catch (err) { // eslint-disable-line no-unused-vars
            return null;
        }
    }

    /** @inheritdoc */
    get canOpenAnotherFile() {
        return true;
    }

    /** @inheritdoc */
    async openAnotherFile() {
        // Ignore the request while a previous one is still in progress.
        if (this.openingAnotherFile) {
            return;
        }

        this.openingAnotherFile = true;
        try {
            await this.chooseAndOpenAnotherFile();
        }
        finally {
            this.openingAnotherFile = false;
        }
    }

    /** Let the user choose another SVG document, save the current presentation and reload the editor.
     *
     * If the current presentation cannot be saved, the editor is not reloaded.
     */
    async chooseAndOpenAnotherFile() {
        const _ = this.controller.gettext;

        const files = remote.dialog.showOpenDialogSync(browserWindow, {
            title: _("Choose an SVG file"),
            filters: [
                {name: _("SVG and LibreOffice Draw files"), extensions: ["svg", "odg"]},
                {name: _("SVG files"), extensions: ["svg"]},
                {name: _("LibreOffice Draw files"), extensions: ["odg"]}
            ],
            properties: ["openFile"]
        });
        if (!files) {
            return;
        }

        // Save the current presentation, or ask the user if autosave is disabled.
        if (this.hasOutdatedFiles) {
            let save = true;
            if (this.controller.getPreference("saveMode") !== "onblur") {
                const res = await remote.dialog.showMessageBox(browserWindow, {
                    type: "question",
                    message: _("Do you want to save the presentation before opening another file?"),
                    buttons: [_("Yes"), _("No"), _("Cancel")],
                    defaultId: 0,
                    cancelId: 2
                });
                if (res.response === 2) {
                    return;
                }
                save = res.response === 0;
            }

            if (save) {
                // Keep the current presentation open if it could not be saved.
                try {
                    await this.saveOutdatedFiles();
                }
                catch (err) { // eslint-disable-line no-unused-vars
                    this.controller.error(_("Could not save the presentation. The other file was not opened."));
                    return;
                }
            }
        }

        this.saveConfiguration();
        this.controller.preferences.save();

        // Reload the editor with a clean state and load the chosen file on startup.
        try {
            sessionStorage.setItem(PENDING_FILE_KEY, files[0]);
        }
        catch (err) { // eslint-disable-line no-unused-vars
            this.controller.error(_("Could not open another file."));
            return;
        }
        this.reloading = true;
        window.location.reload();
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
        if (isOdgFile(fileDescriptor)) {
            return this.loadOdg(fileDescriptor);
        }
        return new Promise((resolve, reject) => {
            fs.readFile(fileDescriptor, { encoding: "utf8" }, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    this.watch(fileDescriptor, 100);
                    resolve(data);
                }
            });
        });
    }

    /** Watch for changes in a loaded file.
     *
     * This includes a debouncing mechanism to ensure the file is in a stable
     * state when the storage is notified.
     *
     * @param {string} fileDescriptor - The name of the file to watch.
     * @param {number} delay - The debouncing delay, in milliseconds.
     */
    watch(fileDescriptor, delay) {
        if (fileDescriptor in this.watchers) {
            return;
        }
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
                }, delay);
            });
        }
        catch (err) {
            const _ = this.controller.gettext;
            this.controller.error(Jed.sprintf(_("This file will not be reloaded on change: %s."), escapeHTML(fileDescriptor)));
        }
    }

    /** Load a LibreOffice Draw document as an SVG document with layers.
     *
     * The drawing is converted with LibreOffice each time it is loaded.
     *
     * @param {string} fileDescriptor - The name of the .odg file.
     * @returns {Promise<string>} - A promise that resolves to the SVG source.
     */
    async loadOdg(fileDescriptor) {
        const _ = this.controller.gettext;
        this.controller.info(Jed.sprintf(_("Converting %s with LibreOffice..."), escapeHTML(path.basename(fileDescriptor))), true);
        try {
            const {svg, messages} = await convertOdg(fileDescriptor, _);
            this.controller.hideNotification();
            if (messages.length) {
                this.controller.info(messages.map(escapeHTML).join("<br>"), true);
            }
            // LibreOffice can write the file in several steps: wait longer before reloading.
            this.watch(fileDescriptor, 1000);
            return svg;
        }
        catch (err) {
            const msg = err && err.message ? err.message : String(err);
            this.controller.error(Jed.sprintf(_("Could not convert %s: %s"), escapeHTML(path.basename(fileDescriptor)), escapeHTML(msg)));
            throw err;
        }
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

    /** @inheritdoc */
    getAppSetting(key) {
        return settings.get(key);
    }

    /** @inheritdoc */
    setAppSetting(key, newValue) {
        settings.set(key, newValue);
    }
}

addBackend(Electron);
