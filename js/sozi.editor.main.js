
window.addEventListener("load", function () {
    "use strict";

    var gui = require("nw.gui");
    var fs = require("fs");
    var path = require("path");

    // Get the current working directory.
    // We use the PWD environment variable directly because
    // process.cwd() returns the installation path of Sozi.
    var cwd = process.env.PWD;

    // Display context info
    console.log("Opening Sozi editor");
    console.log("Configuration in: " + gui.App.dataPath);
    console.log("Current working dir: " + cwd);

    // If a file name was provided on the command line,
    // check that the file exists and load it.
    if (gui.App.argv.length > 0) {
        var fileName = path.resolve(cwd, gui.App.argv[0]);
        if (fs.existsSync(fileName)) {
            loadSVG(fileName);
        }
        else {
            alert("Error: File not found " + fileName);
        }
    }
    // If no file name was specified,
    // open a file dialog and load the selected file.
    else {
        $("#file-dialog").change(function () {
            loadSVG(this.value);
        }).click();
    }

    // Load the file with the given name
    // and show its content in the preview area.
    function loadSVG(fileName) {
        fs.readFile(fileName, { encoding: "utf8" }, function (err, data) {
            if (!err) {
                // Find the SVG root and check that the loaded document is valid SVG.
                var svgRoot = $("#preview").html(data).get(0).querySelector("svg");
                if (!(svgRoot instanceof SVGSVGElement)) {
                    alert("Error: Document is not valid SVG.");
                }

                // Initialize models and views
                var pres = sozi.model.Presentation.init(svgRoot);
                var editor = sozi.editor.model.Editor.init(pres);
                sozi.editor.view.Preview.init(editor);
                sozi.editor.view.Timeline.init(editor);
            }
            else {
                alert("Error: Failed to read file " + fileName);
            }
        });
    }
}, false);
