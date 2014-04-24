
window.addEventListener("load", function () {
    "use strict";

    // Display context info
    console.log("Opening Sozi editor");

    var backend;
    
    if (namespace.global.require) {
        console.log("Running in node.js");
        backend = sozi.editor.backend.NodeWebkit.init();
    }
    else {
        console.log("Running in browser");
        backend = sozi.editor.backend.FileReader.init();
    }
    
    var presentation, selection;
    
    function loadSVG(fileName, data) {
        // Find the SVG root and check that the loaded document is valid SVG.
        var svgRoot = $("#sozi-editor-view-preview").html(data).get(0).querySelector("svg");
        if (!(svgRoot instanceof SVGSVGElement)) {
            alert("Error: Document is not valid SVG.");
        }

        // Initialize models and views
        presentation = sozi.model.Presentation.init(svgRoot);
        selection = sozi.editor.model.Selection.init(presentation);
        sozi.editor.view.Preview.init(presentation, selection);
        sozi.editor.view.Timeline.init(presentation, selection);
        sozi.editor.view.Properties.init(presentation, selection);

        // Load presentation data from JSON file.
        //
        // If no JSON data is available, attempt to extract
        // presentation data from the SVG document, assuming
        // it has been generated from Sozi 13 or earlier.
        // Then save the extracted data to a JSON file.
        backend.load(fileName.replace(/\.svg$/, ".sozi.json"));
    }
    
    function loadJSON(fileName, data) {
//        if (data) {
//            presentation.fromStorable(JSON.parse(data));
//        }
//        else {
            presentation.upgrade();
            backend.save(fileName, JSON.stringify(presentation.toStorable()));
//        }
        if (presentation.frames.length) {
            selection.selectFrames([presentation.frames[0]]);
        }
    }
    
    backend.addListener("load", function (context, fileName, err, data) {
        if (fileName.match(/\.svg$/)) {
            if (!err) {
                loadSVG(fileName, data);
            }
            else {
                console.log("Error loading file: " + fileName);
            }
        }
        else if (fileName.match(/\.sozi\.json$/)) {
            loadJSON(fileName, !err && data);
        }
    });
    
    var fileName = backend.svgFileName;

    if (fileName) {
        backend.load(fileName);
    }
    else {
        // If no file name was specified,
        // open a file dialog and load the selected file.
        $("#file-dialog").change(function () {
            if (this.files.length) {
                backend.load(this.files[0]);
            }
        }).click();
    }
    
}, false);
