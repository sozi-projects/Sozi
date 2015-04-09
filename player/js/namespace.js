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

// The current context - might be the parent of this presentation
var context;

// The actual svg-node in the DOM
var svgRoot;

// Either the object-node in the parent-context (if the presentation is embedded) 
// or the window-itself (if presentation is used standalone)
var targetNode;

/**
 * Create or augment a namespace.
 *
 * <p>A typical use of this function is:</p>
 *
 * <pre>
 * namespace(this, "a.b.c", function (exports, globals) {
 *     exports.foo = function (x) {
 *         ...
 *     };
 * });
 * </pre>
 *
 * <p>where <code>this</code> is the global object.</p>
 *
 * <p>In this example, function <code>foo</code> is exported and can be
 * called as <code>a.b.c.foo(someValue)</code>.</p>
 *
 * @memberOf _global_
 * @param globals The global object
 * @param {String} path The dot-separated path to the namespace
 * @param {Function} body A function to execute in the context of the namespace
 */
function namespace(globals, path, body) {
    "use strict";

	// Start name lookup in the global object
	if(context == null) {
		context = globals;
		targetNode = context;
		svgRoot = targetNode.document.getElementsByTagName("svg")[0]
	}

	// When the presentation is embedded in a html-file switch the context to the parent-window
	if(context.parent != null) 
		context = context.parent;

	var current = context;
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
		body(current, context);
	}
	
	return current;    
}
