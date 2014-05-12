
window.addEventListener("load", function () {
    "use strict";

    // Display context info
    console.log("Opening Sozi editor");

    var backend;
    
    if (namespace.global.require) {
        console.log("Running in node.js");
        backend = sozi.editor.backend.NodeWebkit;
    }
    else {
        console.log("Running in browser");
        backend = sozi.editor.backend.FileReader;
    }
    
    var presentation = sozi.model.Presentation;
    var selection = sozi.editor.model.Selection;
    sozi.editor.view.Preview.init(presentation, selection);
    sozi.editor.view.Timeline.init(presentation, selection);
    sozi.editor.view.Properties.init(presentation, selection);
    
    backend.addListener("load", function (context, fileName, err, data) {
        if (/\.svg$/.test(fileName)) {
            if (!err) {
                // Find the SVG root and check that the loaded document is valid SVG.
                var svgRoot = $("#sozi-editor-view-preview").html(data).get(0).querySelector("svg");
                if (svgRoot instanceof SVGSVGElement) {
                    presentation.init(svgRoot);
                    backend.load(fileName.replace(/\.svg$/, ".sozi.json"));
                }
                else {
                    console.log("Error: Document is not valid SVG.");
                }
            }
            else {
                console.log("Error loading file: " + fileName);
            }
        }
        else if (/\.sozi\.json$/.test(fileName)) {
//            if (!err) {
//                // Load presentation data from JSON file.
//                presentation.fromStorable(JSON.parse(data));
//            }
//            else {
                // If no JSON data is available, attempt to extract
                // presentation data from the SVG document, assuming
                // it has been generated from Sozi 13 or earlier.
                // Then save the extracted data to a JSON file.
                presentation.upgrade();
                backend.save(fileName, JSON.stringify(presentation.toStorable()));
//            }
            if (presentation.frames.length) {
                selection.selectedFrames.push(presentation.frames.first);
            }
        }
    });
    
    backend.addListener("change", function (context, fileName) {
        if (/\.svg$/.test(fileName)) {
            console.log("Reloading " + fileName);
            backend.load(fileName);
        }
    });
    
    var svgFileName = backend.svgFileName;

    if (svgFileName) {
        backend.load(svgFileName);
    }
    else {
        // If no file name was specified,
        // open a file dialog and load the selected file.
        $("#file-dialog").change(function () {
            if (this.files.length) {
                svgFileName = this.files[0];
                backend.load(svgFileName);
            }
        });
    }
    
}, false);
