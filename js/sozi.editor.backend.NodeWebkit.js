namespace("sozi.editor.backend", function (exports) {
    "use strict";

    var gui = require("nw.gui");
    var fs = require("fs");
    var path = require("path");

    // Get the current working directory.
    // We use the PWD environment variable directly because
    // process.cwd() returns the installation path of Sozi.
    var cwd = process.env.PWD;

    console.log("Configuration in: " + gui.App.dataPath);
    console.log("Current working dir: " + cwd);

    exports.NodeWebkit = sozi.model.Object.create({
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

        load: function (fileName) {
            var self = this;
            fs.readFile(fileName, { encoding: "utf8" }, function (err, data) {
                self.fire("load", fileName, err, data);
            });
        },

        save: function (fileName, data) {
            var err = fs.writeFileSync(fileName, data, { encoding: "utf-8" });
            this.fire("save", fileName, err);
        }
    });
});
