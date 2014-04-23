/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2013 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

/**
 * Create, augment or alias a namespace.
 *
 * In this example, function ``foo`` is exported and can be
 * called as ``a.b.c.foo(someValue)``.
 *
 * ```
 * namespace("a.b.c", function (exports, env) {
 *     exports.foo = function (x) {
 *         ...
 *     };
 * });
 * ```
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
 * @param {Object}   [env]  - The object that contains the namespace definition (defaults to the global object)
 * @param {String}   path   - The dot-separated path to the namespace
 * @param {Function} [body] - A function to execute in the context of the namespace
 * @return {Object} The namespace object
 */
function namespace(env, path, body) {
    "use strict";

    if (typeof env === "string") {
        body = path;
        path = env;
        env = namespace.global;
    }

    // Start name lookup in the global object
    var current = env;
    
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
}

namespace.global = this;
