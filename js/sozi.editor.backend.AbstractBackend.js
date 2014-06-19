namespace("sozi.editor.backend", function (exports) {
    "use strict";

    exports.list = [];
    
    exports.add = function (backend) {
        exports.list.push(backend);
    };
    
    exports.AbstractBackend = sozi.model.Object.clone({
        
        init: function (container, html) {
            container.html(html);
            return this;
        },

        /*
         * Return the base name of the file
         * represented by the given descriptor.
         * 
         * Parameters:
         *  - fileDescriptor (backend-dependent)
         * 
         * Returns:
         *  - The file name (string)
         */
        getName: function (fileDescriptor) {
            // Not implemented
            return "";
        },
        
        /*
         * Return the location of the file
         * represented by the given descriptor.
         * 
         * Parameters:
         *  - fileDescriptor (backend-dependent)
         * 
         * Returns:
         *  - The file location (backend-dependent)
         */
        getLocation: function (fileDescriptor) {
            // Not implemented
            return null;
        },
        
        /*
         * Find a file.
         * 
         * Parameters
         *  - name (string) The base name of the file
         *  - location (backend-dependent)
         *  - callback (function) The function to call when the operation completes
         * 
         * The callback function accepts the following parameters:
         *  - fileDescriptor (backend-dependent), null if no file was found
         */
        find: function (name, location, callback) {
            // Not implemented
            callback(null);
        },
        
        /*
         * Load a file.
         *
         * This method loads a file and fires the "load" event. This event
         * must be fired even if loading failed.
         * 
         * If the file was successfully loaded and if the backend supports it,
         * a "change" event can be fired when the file is modified after being
         * loaded. The "change" event must be fired only on the first modification
         * after the file has been loaded.
         * 
         * Parameters
         *  - fileDescriptor (backend-dependent)
         * 
         * Events
         *  - load(fileDescriptor, data, err)
         *  - change(fileDescriptor)
         */
        load: function (fileDescriptor) {
            // Not implemented
            this.fire("load", fileDescriptor, "", "Not implemented");
        },

        /*
         * Create a new file.
         * 
         * Parameters:
         *  - name (string)
         *  - location (backend-dependent)
         *  - mimeType (string)
         *  - data (string)
         *  - callback (function) The function to call when the operation completes
         * 
         * The callback function accepts the following parameters:
         *  - fileDescriptor (backend-dependent)
         *  - err (string)
         */
        create: function (name, location, mimeType, data, callback) {
            // Not implemented
            callback(null, "Not implemented");
        },
        
        /*
         * Save data to an existing file.
         * 
         * Parameters:
         *  - fileDescriptor (backend-dependent)
         *  - data (string)
         * 
         * Events:
         *  - save(fileDescriptor, err)
         * 
         * TODO use a callback instead of an event
         */
        save: function (fileDescriptor, data) {
            // Not implemented
            this.fire("save", fileDescriptor, "Not implemented");
        }
    });
});
