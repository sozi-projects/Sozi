/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {AbstractBackend, addBackend} from "./AbstractBackend";
import $ from "jquery";

export var FileReaderBackend = Object.create(AbstractBackend);

FileReaderBackend.init = function (container, _) {
    AbstractBackend.init.call(this, container, "sozi-editor-backend-FileReader-input", _('Open an SVG file from your computer (<i class="fa fa-warning"></i> read-only)'));

    $(container).append('<input style="display:none;" id="sozi-editor-backend-FileReader-file" type="file" accept="image/svg+xml">');

    $("#sozi-editor-backend-FileReader-input").click(this.openFileChooser.bind(this));

    // Load the SVG document selected in the file input
    $("#sozi-editor-backend-FileReader-file").change(evt => {
        if (evt.target.files.length) {
            this.load(evt.target.files[0]);
        }
    });

    return this;
};

FileReaderBackend.openFileChooser = function () {
    $("#sozi-editor-backend-FileReader-file").click();
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
