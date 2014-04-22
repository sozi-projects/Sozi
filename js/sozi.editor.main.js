
window.addEventListener("load", function () {
    "use strict";

    // Display context info
    console.log("Opening Sozi editor");

    var backend = sozi.editor.backend.NodeWebkit.init();
    
    var fileName = backend.svgFileName;

    backend.addListener("load", function (context, data) {
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
        sozi.editor.view.Properties.init(pres, selection);

        // Load presentation data from JSON file.
        //
        // If no JSON data is available, attempt to extract
        // presentation data from the SVG document, assuming
        // it has been generated from Sozi 13 or earlier.
        // Then save the extracted data to a JSON file.
        var jsonFileName = fileName.replace(/\.svg$/, ".sozi.json");
//        var presData = backend.load(jsonFileName);
//        if (presData) {
//            pres.fromStorable(presData);
//        }
//        else {
            pres.upgrade();
            if (pres.frames.length) {
                selection.selectFrames([pres.frames[0]]);
            }
            backend.save(jsonFileName, JSON.stringify(pres.toStorable()));
//        }
    });
    
    if (fileName) {
        backend.load(fileName);
    }
    else {
        // If no file name was specified,
        // open a file dialog and load the selected file.
        $("#file-dialog").change(function () {
            fileName = this.value;
            backend.load(fileName);
        }).click();
    }
    
}, false);
