/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {EventEmitter} from "events";

export const backendList = [];

export function addBackend(backend) {
    backendList.push(backend);
}

/** Abstraction for the execution platform.
 *
 * @category backend
 * @todo Add documentation.
 */
export class AbstractBackend extends EventEmitter {
    constructor(controller, container, buttonId, buttonLabel) {
        super();

        this.controller = controller;
        this.autosavedFiles = [];
        container.innerHTML = `<button id="${buttonId}">${buttonLabel}</button>`;

        this.hasFocus = false;
        window.addEventListener("focus", () => {
            this.hasFocus = true;
            this.emit("focus");
        });
        window.addEventListener("blur", () => {
            this.hasFocus = false;
            this.emit("blur");
        });
    }

    openFileChooser() {
        // Not implemented
    }

    /*
     * Return the base name of the file
     * represented by the given descriptor.
     *
     * Parameters:
     *  - fileDescriptor (backend-dependent)
     *
     * Returns:
     *  - The file name (string)
     */
    getName(fileDescriptor) {
        // Not implemented
        return "";
    }

    /*
     * Return the location of the file
     * represented by the given descriptor.
     *
     * Parameters:
     *  - fileDescriptor (backend-dependent)
     *
     * Returns:
     *  - The file location (backend-dependent)
     */
    getLocation(fileDescriptor) {
        // Not implemented
        return null;
    }

    /*
     * Find a file.
     *
     * Parameters
     *  - name (string) The base name of the file
     *  - location (backend-dependent)
     *  - callback (function) The function to call when the operation completes
     *
     * The callback function accepts the following parameters:
     *  - fileDescriptor (backend-dependent), null if no file was found
     */
    find(name, location, callback) {
        // Not implemented
        callback(null);
    }

    /*
     * Load a file.
     *
     * This method loads a file and fires the "load" event. This event
     * must be fired even if loading failed.
     *
     * If the file was successfully loaded and if the backend supports it,
     * a "change" event can be fired when the file is modified after being
     * loaded. The "change" event must be fired only on the first modification
     * after the file has been loaded.
     *
     * Parameters
     *  - fileDescriptor (backend-dependent)
     *
     * Events
     *  - load(fileDescriptor, data, err)
     *  - change(fileDescriptor)
     */
    load(fileDescriptor) {
        // Not implemented
        this.emit("load", fileDescriptor, "", "Not implemented");
    }

    /*
     * Create a new file.
     *
     * Parameters:
     *  - name (string)
     *  - location (backend-dependent)
     *  - mimeType (string)
     *  - data (string)
     *  - callback (function) The function to call when the operation completes
     *
     * The callback function accepts the following parameters:
     *  - fileDescriptor (backend-dependent)
     *  - err (string)
     */
    create(name, location, mimeType, data, callback) {
        // Not implemented
        callback(null, "Not implemented");
    }

    /*
     * Save data to an existing file.
     *
     * Parameters:
     *  - fileDescriptor (backend-dependent)
     *  - data (string)
     *
     * Events:
     *  - save(fileDescriptor, err)
     *
     * TODO use a callback instead of an event
     */
    save(fileDescriptor, data) {
        // Not implemented
        this.emit("save", fileDescriptor, "Not implemented");
    }

    /*
     * Add the given file to the list of files to save automatically.
     *
     * Parameters:
     *  - descriptor (backend-dependent)
     *  - needsSaving (function) A function that returns true if the file needs saving
     *  - getData (function) A function that returns the data to save.
     */
    autosave(descriptor, needsSaving, getData) {
        this.autosavedFiles.push({descriptor, needsSaving, getData});
    }

    /*
     * Check whether at least one file needs saving.
     */
    get hasOutdatedFiles() {
        return this.autosavedFiles.some(file => file.needsSaving());
    }

    /*
     * Save all outdated files.
     */
    saveOutdatedFiles() {
        for (let file of this.autosavedFiles) {
            if (file.needsSaving()) {
                this.save(file.descriptor, file.getData());
            }
        }
    }

    /*
     * Save all files previously added to the list of files to save automatically.
     *
     * Typically, we want to call this method each time the editor loses focus
     * and when the editor closes.
     */
    doAutosave() {
        this.controller.preferences.save();
        this.saveOutdatedFiles();
    }

    toggleDevTools() {
        // Not implemented
    }
}
