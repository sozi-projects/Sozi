/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function (global) {
    "use strict";
    
    /**
     * Create, augment or alias a namespace.
     *
     * In this example, function ``foo`` is exported and can be
     * called as ``a.b.c.foo(someValue)``.
     *
     * ```
     * namespace("a.b.c", function (exports) {
     *     exports.foo = function (x) {
     *         ...
     *     };
     * });
     * ```
     *
     * The global object is aliased as ``namespace.global``.
     * 
     * To create an alias to a given namespace, you can call this function
     * like in the following example. This will create a new namespace object
     * ``a.b.c`` if it does not exist yet.
     *
     * ```
     * var abc = namespace("a.b.c");
     * abc.foo(someValue);
     * ```
     *
     * @param {String}   path   - The dot-separated path to the namespace
     * @param {Function} [body] - A function to execute in the context of the namespace
     * @return {Object} The namespace object
     */
    global.namespace = function (path, body) {
        // Start name lookup in the global object
        var current = global;

        // For each name in the given path
        path.split(".").forEach(function (name) {
            // If the current path element does not exist
            // in the current namespace, create a new sub-namespace
            if (typeof current[name] === "undefined") {
                current[name] = {};
            }

            // Move to the namespace for the current path element
            current = current[name];
        });

        // Execute the given function in the last namespace
        if (body) {
            body(current);
        }

        return current;
    };

    global.namespace.global = global;
})(typeof window !== "undefined" ? window : global);
