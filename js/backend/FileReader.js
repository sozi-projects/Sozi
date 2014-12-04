/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.backend", function (exports) {
    "use strict";

    exports.FileReader = Object.create(exports.AbstractBackend);

    exports.FileReader.init = function (container) {
        if (namespace.global.require) {
            return this;
        }

        console.log("Configuration in local storage");

        exports.AbstractBackend.init.call(this, container, '<input id="sozi-editor-backend-FileReader-input" type="file" accept="image/svg+xml" autofocus>');

        var self = this;

        // Load the SVG document selected in the file input
        $("#sozi-editor-backend-FileReader-input").change(function () {
            if (this.files.length) {
                self.load(this.files[0]);
            }
        });

        return this;
    };

    exports.FileReader.getName = function (fileDescriptor) {
        return fileDescriptor.name;
    };

    exports.FileReader.load = function (fileDescriptor) {
        var self = this;
        var reader = new FileReader();
        reader.readAsText(fileDescriptor, "utf8");
        reader.onload = function () {
            self.emitEvent("load", [fileDescriptor, this.result, this.error && this.error.name]);
        };
    };

    exports.add(exports.FileReader);
});
