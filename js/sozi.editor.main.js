
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
                var selection = sozi.editor.model.Selection.init(pres);
                sozi.editor.view.Preview.init(pres, selection);
                sozi.editor.view.Timeline.init(pres, selection);

                // Load presentation data from JSON file.
                //
                // If no JSON data is available, attempt to extract
                // presentation data from the SVG document, assuming
                // it has been generated from Sozi 13 or earlier.
                // Then save the extracted data to a JSON file.
                var jsonFileName = fileName.replace(/\.svg$/, ".sozi.json");
//                var presData = loadJSON(jsonFileName);
//                if (presData) {
//                    pres.fromStorable(presData);
//                }
//                else {
                    pres.upgrade();
                    saveJSON(jsonFileName, pres.toStorable());
//                }
            }
            else {
                alert("Error: Failed to read file " + fileName);
            }
        });
    }

    function loadJSON(fileName) {
        if (!fs.existsSync(fileName)) {
            console.log("File " + fileName + " does not exist.");
            return null;
        }
        try {
            return JSON.parse(fs.readFileSync(fileName, { encoding: "utf8" }));
        }
        catch (e) {
            alert("Error: file " + fileName + " could not be read or is corrupted");
            return null;
        }
    }

    function saveJSON(fileName, data) {
        fs.writeFileSync(fileName, JSON.stringify(data), { encoding: "utf-8" });
    }

}, false);
