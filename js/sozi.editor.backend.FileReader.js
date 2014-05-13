namespace("sozi.editor.backend", function (exports) {
    "use strict";

    console.log("Configuration in local storage");

    exports.FileReader = sozi.model.Object.clone({
        
        init: function () {
            if (namespace.global.require) {
                return this;
            }
            
            $("#sozi-editor-view-preview ul").append('<li><input id="sozi-editor-backend-FileReader-input" type="file" accept="image/svg+xml" autofocus></li>');
            
            var self = this;
            $("#sozi-editor-backend-FileReader-input").change(function () {
                if (this.files.length) {
                    self.load(this.files[0]);
                }
            });
            
            return this;
        },
        
        load: function (file) {
            var self = this;
            var reader = new FileReader();
            reader.readAsText(file, "utf8");
            reader.onload = function () {
                self.fire("load", file.name, null, this.result);
            };
        },

        save: function (file, data) {
            // TODO
            this.fire("save", file, null);
        }
    });
});
