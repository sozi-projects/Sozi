
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
        var fileDialog = document.querySelector("#file-dialog");
        fileDialog.addEventListener("change", function () {
            loadSVG(this.value);
        }, false);
        fileDialog.click();
    }

    // Load the file with the given name
    // and show its content in the preview area.
    function loadSVG(fileName) {
        fs.readFile(fileName, { encoding: "utf8" }, function (err, data) {
            if (!err) {
                var preview = document.querySelector("#preview");
                preview.innerHTML = data;

                // Check that the loaded document is valid SVG.
                // Find the SVG root: the beginning of the document
                // can contain comments and whitespace.
                var svgRoot = preview.firstChild;
                while (svgRoot.nodeName === "#comment" ||
                       svgRoot.nodeName === "#text" && svgRoot.nodeValue.trim() === "") {
                    svgRoot = svgRoot.nextSibling;
                }

                // Check that the first non-empty node is an element named "svg"
                // with the SVG namespace URI.
                if (svgRoot.localName.toLowerCase() !== "svg" ||
                    svgRoot.namespaceURI !== "http://www.w3.org/2000/svg") {
                    alert("Error: Document is not valid SVG. " + svgRoot.namespaceURI);
                }

                // Create Sozi document and viewport
                var pres = sozi.document.Presentation.create().init();
                sozi.editor.view.preview.init(svgRoot);
                sozi.editor.view.timeline.init(pres);
            }
            else {
                alert("Error: Failed to read file " + fileName);
            }
        });
    }
}, false);
