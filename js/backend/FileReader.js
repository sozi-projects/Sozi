/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {AbstractBackend, addBackend} from "./AbstractBackend";

export var FileReaderBackend = Object.create(AbstractBackend);

FileReaderBackend.init = function (container) {
    console.log("Configuration in local storage");

    AbstractBackend.init.call(this, container, '<input id="sozi-editor-backend-FileReader-input" type="file" accept="image/svg+xml" autofocus>');

    // Load the SVG document selected in the file input
    $("#sozi-editor-backend-FileReader-input").change(evt => {
        if (evt.target.files.length) {
            this.load(evt.target.files[0]);
        }
    });

    return this;
};

FileReaderBackend.getName = function (fileDescriptor) {
    return fileDescriptor.name;
};

FileReaderBackend.load = function (fileDescriptor) {
    var reader = new FileReader();
    reader.readAsText(fileDescriptor, "utf8");
    reader.onload = () => {
        this.emit("load", fileDescriptor, reader.result, reader.error && reader.error.name);
    };
};

addBackend(FileReaderBackend);
