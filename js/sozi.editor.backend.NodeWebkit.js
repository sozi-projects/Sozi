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

    exports.NodeWebkit = sozi.model.Object.clone({

        getDescriptor: function (fileName) {
            return {
                name: path.basename(fileName),
                location: fileName,
                parents: [path.dirname(fileName)],
                type: path.extname(fileName),
                status: null,
                content: null
            };
        },
        
        init: function () {
            if (!namespace.global.require) {
                return this;
            }
            
            $("#sozi-editor-view-preview ul").append('<li><input id="sozi-editor-backend-NodeWebkit-input" type="file" accept="image/svg+xml" autofocus></li>');
            
            var self = this;
            $("#sozi-editor-backend-NodeWebkit-input").change(function () {
                if (this.files.length) {
                    self.load(self.getDescriptor(this.files[0].path));
                }
            });
            
            // If a file name was provided on the command line,
            // check that the file exists and load it.
            if (gui.App.argv.length > 0) {
                var fileName = path.resolve(cwd, gui.App.argv[0]);
                if (fs.existsSync(fileName)) {
                    this.load(this.getDescriptor(fileName));
                }
                else {
                    console.log("File not found " + fileName);
                }
            }

            return this;
        },
        
        load: function (fileDescriptor) {
            if (fileDescriptor.location === undefined) {
                fileDescriptor.location = path.join(fileDescriptor.parents[0], fileDescriptor.name);
            }
            
            // Read file asynchronously and fire the "load" event.
            var self = this;
            fs.readFile(fileDescriptor.location, { encoding: "utf8" }, function (err, data) {
                fileDescriptor.status = err;
                fileDescriptor.content = data;
                
                self.fire("load", fileDescriptor);
                if (!err) {
                    // Watch for changes in the loaded file and fire the "change" event.
                    // The "change" event is fired only once if the the file is modified
                    // after being loaded. It will not be fired again until the file is
                    // loaded again.
                    // This includes a debouncing mechanism to ensure the file is in a stable
                    // state when the "change" event is fired: the event is fired only if the
                    // file has not changed for 100 ms.
                    var watcher = fs.watch(fileDescriptor.location);
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
            });
        },

        save: function (fileDescriptor) {
            fileDescriptor.status = fs.writeFileSync(fileDescriptor.location, fileDescriptor.content, { encoding: "utf-8" });
            this.fire("save", fileDescriptor);
        }
    });
});
