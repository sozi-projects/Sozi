/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {AbstractBackend, addBackend} from "./AbstractBackend";

/** Browser FileReader backend.
 *
 * @extends module:backend/AbstractBackend.AbstractBackend
 */
export class FileReaderBackend extends AbstractBackend {

    /** Initialize a Sozi  backend based on the FileReader API.
     *
     * @param {module:Controller.Controller} controller - A controller instance.
     * @param {HTMLElement} container - The element that will contain the menu for choosing a backend.
     */
    constructor(controller, container) {
        const _ = controller.gettext;

        super(controller, container, "sozi-editor-backend-FileReader-input", _('Open an SVG file from your computer (<i class="fas fa-exclamation-triangle"></i> read-only)'));

        document.getElementById("sozi-editor-backend-FileReader-input").addEventListener("click", () => this.openFileChooser());

        /** A hidden HTML file input element to open a file chooser.
         *
         * @type {HTMLInputElement}
         */
        this.fileInput = document.createElement("input");
        this.fileInput.style.display = "none";
        this.fileInput.setAttribute("type", "file");
        this.fileInput.setAttribute("accept", "image/svg+xml");
        container.appendChild(this.fileInput);

        // Load the SVG document selected in the file input
        this.fileInput.addEventListener("change", evt => {
            if (evt.target.files.length) {
                this.controller.storage.setSVGFile(evt.target.files[0], this);
            }
        });
    }

    /** @inheritdoc */
    openFileChooser() {
        this.fileInput.dispatchEvent(new MouseEvent("click"));
    }

    /** @inheritdoc */
    getName(fileDescriptor) {
        return fileDescriptor.name;
    }

    /** @inheritdoc */
    sameFile(fd1, fd2) {
        return fd1.name === fd2.name;
    }

    /** @inheritdoc */
    load(fileDescriptor) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.readAsText(fileDescriptor, "utf8");
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = () => {
                reject(reader.error.name);
            };
        });
    }
}

addBackend(FileReaderBackend);
