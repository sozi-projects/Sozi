namespace("sozi.editor.backend", function (exports) {
    "use strict";

    var gui, fs, path, cwd;
    
    if (namespace.global.require) {
        gui = require("nw.gui");
        fs = require("fs");
        path = require("path");

        // Get the current working directory.
        // We use the PWD environment variable directly because
        // process.cwd() returns the installation path of Sozi.
        cwd = process.env.PWD;

        console.log("Configuration in: " + gui.App.dataPath);
        console.log("Current working dir: " + cwd);
    }

    exports.NodeWebkit = exports.AbstractBackend.clone({

        init: function (container) {
            if (!namespace.global.require) {
                return this;
            }
            
            exports.AbstractBackend.init.call(this, container, '<input id="sozi-editor-backend-NodeWebkit-input" type="file" accept="image/svg+xml" autofocus>');
            
            var self = this;
            $("#sozi-editor-backend-NodeWebkit-input").change(function () {
                if (this.files.length) {
                    self.load(this.files[0].path);
                }
            });
            
            // If a file name was provided on the command line,
            // check that the file exists and load it.
            if (gui.App.argv.length > 0) {
                var fileName = path.resolve(cwd, gui.App.argv[0]);
                if (fs.existsSync(fileName)) {
                    this.load(fileName);
                }
                else {
                    console.log("File not found " + fileName);
                }
            }

            return this;
        },
        
        getName: function (fileDescriptor) {
            return path.basename(fileDescriptor);
        },
        
        getLocation: function (fileDescriptor) {
            return path.dirname(fileDescriptor);
        },
        
        find: function (name, location, callback) {
            var fileName = path.join(location, name);
            fs.exists(fileName, function (found) {
                if (found) {
                    callback(fileName);
                }
                else {
                    callback(null);
                }
            });
        },
        
        load: function (fileDescriptor) {
            // Read file asynchronously and fire the "load" event.
            var self = this;
            fs.readFile(fileDescriptor, { encoding: "utf8" }, function (err, data) {
                if (!err) {
                    // Watch for changes in the loaded file and fire the "change" event.
                    // The "change" event is fired only once if the the file is modified
                    // after being loaded. It will not be fired again until the file is
                    // loaded again.
                    // This includes a debouncing mechanism to ensure the file is in a stable
                    // state when the "change" event is fired: the event is fired only if the
                    // file has not changed for 100 ms.
                    var watcher = fs.watch(fileDescriptor);
                    var timer;
                    watcher.on("change", function () {
                        if (timer) {
                            clearTimeout(timer);
                        }
                        timer = setTimeout(function () {
                            watcher.close();
                            self.fire("change", fileDescriptor);
                        }, 100);
                    });
                }
                self.fire("load", fileDescriptor, data, err);
            });
        },

        create: function (name, location, mimeType, data, callback) {
            var fileName = path.join(location, name);
            var err = fs.writeFileSync(fileName, data, { encoding: "utf-8" });
            callback(fileName, err);
        },
        
        save: function (fileDescriptor, data) {
            var err = fs.writeFileSync(fileDescriptor, data, { encoding: "utf-8" });
            this.fire("save", fileDescriptor, err);
        }
    });
});
