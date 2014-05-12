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
            // Get file path if file is a File object
            // file.path is exposed in node-webkit
            if (file instanceof File) {
                file = file.path;
            }
            
            // Read file asynchronously and fire the "load" event.
            var self = this;
            fs.readFile(file, { encoding: "utf8" }, function (err, data) {
                self.fire("load", file, err, data);
            });
            
            // Watch for changes in the loaded file and fire the "change" event.
            // The "change" event is fired only once if the the file is modified
            // after being loaded. It will not be fired again until the file is
            // loaded again.
            // This includes a debouncing mechanism to ensure the file is in a stable
            // state when the "change" event is fired: the event is fired only if the
            // file has not been changed for 100 ms.
            var watcher = fs.watch(file);
            var timer;
            watcher.on("change", function () {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(function () {
                    watcher.close();
                    self.fire("change", file);
                }, 100);
            });
        },

        save: function (fileName, data) {
            var err = fs.writeFileSync(fileName, data, { encoding: "utf-8" });
            this.fire("save", fileName, err);
        }
    });
});
