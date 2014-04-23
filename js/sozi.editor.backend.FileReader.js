namespace("sozi.editor.backend", function (exports) {
    "use strict";

    console.log("Configuration in local storage");

    exports.FileReader = sozi.model.Object.create({
        get svgFileName() {
            return null;
        },

        load: function (file) {
            if (file instanceof File) {
                var self = this;
                var reader = new FileReader();
                reader.readAsText(file, "utf8");
                reader.onload = function () {
                    self.fire("load", file.name, null, this.result);
                };
            }
            else {
                this.fire("load", file, "error", null);
            }
        },

        save: function (fileName, data) {
            // TODO
            this.fire("save", fileName, null);
        }
    });
});
