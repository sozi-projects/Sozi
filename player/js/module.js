
function module(path, body) {
	var names = path.split("."),
	    i,
	    current = this;
	for (i = 0; i < names.length; i += 1) {
		if (typeof current[names[i]] === "undefined") {
			current[names[i]] = {};
		}
		current = current[names[i]];
	}
	body(current);
}
