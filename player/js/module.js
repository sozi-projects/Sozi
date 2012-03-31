
function module(path, body) {
	var current = this;
	path.split(".").forEach(function (name) {
		if (typeof current[name] === "undefined") {
			current[name] = {};
		}
		current = current[name];
	});
	body(current);
}
