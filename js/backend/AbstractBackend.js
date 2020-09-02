/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/** The list of backends supported by the current editor.
 *
 * @type {module:backend/AbstractBackend.AbstractBackend[]}
 */
export const backendList = [];

/** Add a backend to {@link module:backend/AbstractBackend.backendList|the list of supported backends}.
 *
 * @param {module:backend/AbstractBackend.AbstractBackend} backend - The backend to add.
 */
export function addBackend(backend) {
    backendList.push(backend);
}

/** Abstraction for the execution platform. */
export class AbstractBackend {
    /** Common constructor for backends.
     *
     * @param {module:Controller.Controller} controller - A controller instance.
     * @param {HTMLElement} container - The element that will contain the menu for choosing a backend.
     * @param {string} buttonId - The ID of the button to generate in the menu.
     * @param {string} buttonLabel - The text of the button to generate in the menu (already translated).
     */
    constructor(controller, container, buttonId, buttonLabel) {
        /** The controller for this backend.
         *
         * @type {module:Controller.Controller} */
        this.controller = controller;

        /** A list of files to save automatically.
         *
         * This is an array of file descriptors. The actual type of the
         * elements depends on the platform.
         *
         * @type {Array} */
        this.autosavedFiles = [];

        container.innerHTML = `<button id="${buttonId}">${buttonLabel}</button>`;
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
     * @param {any} fileDescriptor - A file descriptor (backend-dependent).
     * @returns {string} The file name.
     */
    getName(fileDescriptor) {
        // Not implemented
        return "";
    }

    /** Return the location of a file.
     *
     * @param {any} fileDescriptor - A file descriptor (backend-dependent).
     * @returns {string} The file location.
     */
    getLocation(fileDescriptor) {
        // Not implemented
        return null;
    }

    /** Compare two file descriptors.
     *
     * @param {any} fd1 - A file descriptor (backend-dependent).
     * @param {any} fd2 - A file descriptor (backend-dependent).
     * @returns {boolean} - `true` if `fd1` and `fd2` represent the same file.
     */
    sameFile(fd1, fd2) {
        return fd1 === fd2;
    }

    /** Find a file.
     *
     * @param {string} name - The base name of the file.
     * @param {any} location - The location of the file (backend-dependent).
     * @returns {Promise} - A promise that resolves to a file descriptor, rejected if not found.
     */
    find(name, location) {
        return Promise.reject("Not implemented");
    }

    /** Load a file.
     *
     * This method loads a file and returns a promise with the content of this file.
     *
     * @param {any} fileDescriptor - A file to load (backend-dependent).
     * @returns {Promise<string>} - A promise that resolves to the content of the file.
     */
    load(fileDescriptor) {
        return Promise.reject("Not implemented");
    }

    /** Load a file synchronously.
     *
     * @param {any} fileDescriptor - A file to load (backend-dependent).
     * @returns {string} - The content of the file.
     */
    loadSync(fileDescriptor) {
        // Not implemented
        return "";
    }

    /** Create a new file.
     *
     * @param {string} name - The name of the file to create.
     * @param {any} location - The location of the file to create (backend-dependent).
     * @param {string} mimeType - The MIME type of the file to create.
     * @param {string} data - The content of the file to create.
     * @returns {Promise} - A promise that resolves to a file descriptor.
     */
    create(name, location, mimeType, data) {
        return Promise.reject("Not implemented");
    }

    /** Save data to an existing file.
     *
     * @param {any} fileDescriptor - The file to save (backend-dependent).
     * @param {string} data - The new content of the file.
     * @returns {Promise} - A promise that resolves to the given file descriptor.
     */
    save(fileDescriptor, data) {
        return Promise.reject("Not implemented");
    }

    /** Add the given file to the list of files to save automatically.
     *
     * @param {any} fileDescriptor - The file to autosave (backend-dependent).
     * @param {function():boolean} needsSaving - A function that returns `true` if the file needs saving.
     * @param {function():string} getData - A function that returns the data to save.
     */
    autosave(fileDescriptor, needsSaving, getData) {
        this.autosavedFiles.push({fileDescriptor, needsSaving, getData});
    }

    /** Check whether at least one file in the {@link module:backend/AbstractBackend.AbstractBackend#autosavedFiles|autosaved file list} needs saving.
     *
     * This method uses the `needsSaving` function passed to {@link module:backend/AbstractBackend.AbstractBackend#autosave|autosave}.
     *
     * @returns {boolean} `true` if at least one file has unsaved modifications.
     */
    get hasOutdatedFiles() {
        return this.autosavedFiles.some(file => file.needsSaving());
    }

    /** Save all outdated files.
     *
     * This method calls {@link module:backend/AbstractBackend.AbstractBackend#save|save} for each file
     * in the {@link module:backend/AbstractBackend.AbstractBackend#autosavedFiles|autosaved file list}
     * where `needsSaving` returns `true`.
     *
     * It uses the function `getData` passed to {@link module:backend/AbstractBackend.AbstractBackend#autosave|autosave}
     * to write the new file content.
     *
     * @returns {Promise<Array>} - A promise that resolves when all autosaved files have been saved.
     */
    saveOutdatedFiles() {
        return Promise.all(
            this.autosavedFiles
                .filter(file => file.needsSaving())
                .map(file => this.save(file.descriptor, file.getData()))
        );
    }

    /** Save all files previously added to the {@link module:backend/AbstractBackend.AbstractBackend#autosavedFiles|autosaved file list}.
     *
     * Typically, we want to call this method each time the editor loses focus
     * and when the editor closes.
     *
     * @returns {Promise<Array>} - A promise that resolves when all autosaved files have been saved.
     */
    doAutosave() {
        this.controller.preferences.save();
        return this.saveOutdatedFiles();
    }

    /** Show or hide the development tools of the current web browser.
     */
    toggleDevTools() {
        // Not implemented
    }
}
