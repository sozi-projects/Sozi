/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {EventEmitter} from "events";

/** The list of backends supported by the current editor.
 *
 * @category backend
 *
 * @type {AbstractBackend[]}
 */
export const backendList = [];

/** Add a backend to {@link backendList|the list of supported backends}.
 *
 * @category backend
 *
 * @param {AbstractBackend} backend - The backend to add.
 */
export function addBackend(backend) {
    backendList.push(backend);
}

/** Abstraction for the execution platform.
 *
 * @category backend
 * @extends EventEmitter
 */
export class AbstractBackend extends EventEmitter {
    /** Common constructor for backends.
     *
     * @param {Controller} controller - A controller instance.
     * @param {HTMLElement} container - The element that will contain the menu for choosing a backend.
     * @param {string} buttonId - The ID of the button to generate in the menu.
     * @param {string} buttonLabel - The text of the button to generate in the menu (already translated).
     */
    constructor(controller, container, buttonId, buttonLabel) {
        super();

        /** The controller for this backend.
         * @type {Controller} */
        this.controller = controller;

        /** A list of files to save automatically.
         *
         * This is an array of file descriptors. The actual type of the
         * elements depends on the platform.
         *
         * @type {Array} */
        this.autosavedFiles = [];

        /** True if the current window has the focus.
         * @type {boolean} */
        this.hasFocus = false;

        container.innerHTML = `<button id="${buttonId}">${buttonLabel}</button>`;

        window.addEventListener("focus", () => {
            this.hasFocus = true;
            /** Signals that the current editor window has received the focus.
             * @event AbstractBackend#focus */
            this.emit("focus");
        });

        window.addEventListener("blur", () => {
            this.hasFocus = false;
            /** Signals that the current editor window has lost the focus.
             * @event AbstractBackend#blur */
            this.emit("blur");
        });
    }

    /** Open a file chooser.
     *
     * This method opens a file dialog to open an SVG document.
     */
    openFileChooser() {
        // Not implemented
    }

    /** Return the base name of a file.
     *
     * @param fileDescriptor - A file descriptor (backend-dependent).
     * @return {string} The file name.
     */
    getName(fileDescriptor) {
        // Not implemented
        return "";
    }

    /** Return the location of a file.
     *
     * @param fileDescriptor - A file descriptor (backend-dependent).
     * @return {string} The file location.
     */
    getLocation(fileDescriptor) {
        // Not implemented
        return null;
    }

    /** Find a file.
     *
     * The callback function accepts a file descriptor, `null` if no file was
     * found.
     *
     * @param {string} name - The base name of the file.
     * @param location - The location of the file (backend-dependent).
     * @param {function(FileDescriptor)} callback - The function to call when the operation completes.
     */
    find(name, location, callback) {
        // Not implemented
        callback(null);
    }

    /** Load a file.
     *
     * This method loads a file and fires the `load` event. This event
     * must be fired even if loading failed.
     *
     * If the file was successfully loaded and if the backend supports it,
     * a `change` event can be fired when the file is modified after being
     * loaded. The `change` event must be fired only on the first modification
     * after the file has been loaded.
     *
     * @param fileDescriptor - A file to load (backend-dependent).
     *
     * @fires AbstractBackend#load
     * @fires AbstractBackend#change
     */
    load(fileDescriptor) {
        // Not implemented
        /** Signals that a file has been loaded.
         * @event AbstractBackend#load */
        this.emit("load", fileDescriptor, "", "Not implemented");
    }

    /** Signals that a file has changed.
     * @event AbstractBackend#change
     */

    /** Create a new file.
     *
     * The callback function receives a file descriptor and an error message.
     *
     * @param {string} name - The name of the file to create.
     * @param location - The location of the file to create (backend-dependent).
     * @param {string} mimeType - The MIME type of the file to create.
     * @param {string} data - The content of the file to create.
     * @param {function(FileDescriptor, string)} callback - The function to call when the operation completes.
     */
    create(name, location, mimeType, data, callback) {
        // Not implemented
        callback(null, "Not implemented");
    }

    /** Save data to an existing file.
     *
     * @param fileDescriptor - The file to save (backend-dependent).
     * @param {string} data - The new content of the file.
     *
     * @fires AbstractBackend#save
     *
     * @todo Use a callback instead of an event
     */
    save(fileDescriptor, data) {
        // Not implemented
        /** Signals that a file has been saved.
         * @event AbstractBackend#save */
        this.emit("save", fileDescriptor, "Not implemented");
    }

    /** Add the given file to the list of files to save automatically.
     *
     * @param descriptor - The file to autosave (backend-dependent).
     * @param {function():boolean} needsSaving - A function that returns `true` if the file needs saving.
     * @param {function():string} getData - A function that returns the data to save.
     */
    autosave(descriptor, needsSaving, getData) {
        this.autosavedFiles.push({descriptor, needsSaving, getData});
    }

    /** Check whether at least one file in the {@link AbstractBackend#autosavedFiles|autosaved file list} needs saving.
     *
     * This method uses the `needsSaving` function passed to {@link AbstractBackend#autosave|autosave}.
     *
     * @return {boolean} `true` if at least one file has unsaved modifications.
     */
    get hasOutdatedFiles() {
        return this.autosavedFiles.some(file => file.needsSaving());
    }

    /** Save all outdated files.
     *
     * This method calls {@link AbstractBackend#save|save} for each file
     * in the {@link AbstractBackend#autosavedFiles|autosaved file list}
     * where `needsSaving` returns `true`.
     *
     * It uses the function `getData` passed to {@link AbstractBackend#autosave|autosave}
     * to write the new file content.
     */
    saveOutdatedFiles() {
        for (let file of this.autosavedFiles) {
            if (file.needsSaving()) {
                this.save(file.descriptor, file.getData());
            }
        }
    }

    /** Save all files previously added to the {@link AbstractBackend#autosavedFiles|autosaved file list}.
     *
     * Typically, we want to call this method each time the editor loses focus
     * and when the editor closes.
     */
    doAutosave() {
        this.controller.preferences.save();
        this.saveOutdatedFiles();
    }

    /** Show or hide the development tools of the current web browser.
     */
    toggleDevTools() {
        // Not implemented
    }
}
