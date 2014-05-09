namespace("sozi.editor.backend", function (exports) {
    "use strict";

    if (!namespace.global.require) {
        return;
    }
    
    var gui = require("nw.gui");
    var fs = require("fs");
    var path = require("path");

    // Get the current working directory.
    // We use the PWD environment variable directly because
    // process.cwd() returns the installation path of Sozi.
    var cwd = process.env.PWD;

    console.log("Configuration in: " + gui.App.dataPath);
    console.log("Current working dir: " + cwd);

    exports.NodeWebkit = sozi.model.Object.clone({
        get svgFileName() {
            // If a file name was provided on the command line,
            // check that the file exists and return its name.
            if (gui.App.argv.length > 0) {
                var fileName = path.resolve(cwd, gui.App.argv[0]);
                if (fs.existsSync(fileName)) {
                    return fileName;
                }
                else {
                    console.log("File not found " + fileName);
                }
            }
            return null;
        },

        load: function (file) {
            if (file instanceof File) {
                console.log(file.path);
                file = file.path; // file.path is exposed in node-webkit
            }
            var self = this;
            fs.readFile(file, { encoding: "utf8" }, function (err, data) {
                self.fire("load", file, err, data);
            });
        },

        save: function (fileName, data) {
            var err = fs.writeFileSync(fileName, data, { encoding: "utf-8" });
            this.fire("save", fileName, err);
        }
    });
});
