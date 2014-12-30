/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.backend", exports => {
    "use strict";

    var FileReader = Object.create(sozi.editor.backend.AbstractBackend);

    FileReader.init = function (container) {
        if (namespace.global.require) {
            return this;
        }

        console.log("Configuration in local storage");

        sozi.editor.backend.AbstractBackend.init.call(this, container, '<input id="sozi-editor-backend-FileReader-input" type="file" accept="image/svg+xml" autofocus>');

        // Load the SVG document selected in the file input
        $("#sozi-editor-backend-FileReader-input").change(evt => {
            if (evt.target.files.length) {
                this.load(evt.target.files[0]);
            }
        });

        return this;
    };

    FileReader.getName = function (fileDescriptor) {
        return fileDescriptor.name;
    };

    FileReader.load = function (fileDescriptor) {
        var reader = new FileReader();
        reader.readAsText(fileDescriptor, "utf8");
        reader.onload = () => {
            this.emitEvent("load", [fileDescriptor, reader.result, reader.error && reader.error.name]);
        };
    };

    sozi.editor.backend.add(FileReader);

    exports.FileReader = FileReader;
});
