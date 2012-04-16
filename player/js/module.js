
function module(globals, path, body) {
    "use strict";
    
    // Start name lookup in the global object
	var current = globals;
	
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
	
	// Execute the module body in the last namespace
	body(current, globals);
}
