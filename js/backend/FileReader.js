/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {AbstractBackend, addBackend} from "./AbstractBackend";

export const FileReaderBackend = Object.create(AbstractBackend);

FileReaderBackend.init = function (container, _) {
    AbstractBackend.init.call(this, container, "sozi-editor-backend-FileReader-input", _('Open an SVG file from your computer (<i class="fa fa-warning"></i> read-only)'));

    document.getElementById("sozi-editor-backend-FileReader-input").addEventListener("click", () => this.openFileChooser());

    this.fileInput = document.createElement("input");
    this.fileInput.style.display = "none";
    this.fileInput.setAttribute("type", "file");
    this.fileInput.setAttribute("accept", "image/svg+xml");
    container.appendChild(this.fileInput);

    // Load the SVG document selected in the file input
    this.fileInput.addEventListener("change", evt => {
        if (evt.target.files.length) {
            this.load(evt.target.files[0]);
        }
    });

    return this;
};

FileReaderBackend.openFileChooser = function () {
    this.fileInput.dispatchEvent(new MouseEvent("click"));
};

FileReaderBackend.getName = function (fileDescriptor) {
    return fileDescriptor.name;
};

FileReaderBackend.load = function (fileDescriptor) {
    const reader = new FileReader();
    reader.readAsText(fileDescriptor, "utf8");
    reader.onload = () => {
        this.emit("load", fileDescriptor, reader.result, reader.error && reader.error.name);
    };
};

addBackend(FileReaderBackend);
