
window.addEventListener("load", function () {
    "use strict";

    // Display context info
    console.log("Opening Sozi editor");

    var presentation = sozi.model.Presentation;
    var selection = sozi.editor.model.Selection;
    sozi.editor.view.Preview.init(presentation, selection);
    sozi.editor.view.Timeline.init(presentation, selection);
    sozi.editor.view.Properties.init(presentation, selection);
    
    var backends = ["NodeWebkit", "FileReader", "GoogleDrive"];
    
    backends.forEach(function (name) {
        sozi.editor.backend[name]
            .addListener("load", function (context, fileDescriptor) {
                if (/\.svg$/.test(fileDescriptor.name)) {
                    if (!fileDescriptor.status) {
                        // Find the SVG root and check that the loaded document is valid SVG.
                        var svgRoot = $("#sozi-editor-view-preview").html(fileDescriptor.content).get(0).querySelector("svg");
                        if (svgRoot instanceof SVGSVGElement) {
                            presentation.init(svgRoot);
                            context.load({
                                name: fileDescriptor.name.replace(/\.svg$/, ".sozi.json"),
                                parents: fileDescriptor.parents
                            });
                        }
                        else {
                            console.log("Error: Document is not valid SVG.");
                        }
                    }
                    else {
                        console.log("Error loading file: " + fileDescriptor.name);
                    }
                }
                else if (/\.sozi\.json$/.test(fileDescriptor.name)) {
//                    if (!fileDescriptor.status) {
//                        // Load presentation data from JSON file.
//                        presentation.fromStorable(JSON.parse(fileDescriptor.content));
//                    }
//                    else {
                        // If no JSON data is available, attempt to extract
                        // presentation data from the SVG document, assuming
                        // it has been generated from Sozi 13 or earlier.
                        // Then save the extracted data to a JSON file.
                        presentation.upgrade();
                        fileDescriptor.content = JSON.stringify(presentation.toStorable());
                        context.save(fileDescriptor);
//                    }
                    if (presentation.frames.length) {
                        selection.selectedFrames.push(presentation.frames.first);
                    }
                }
            })
            .addListener("change", function (context, fileDescriptor) {
                if (/\.svg$/.test(fileDescriptor.name)) {
                    console.log("Reloading " + fileDescriptor.name);
//                    context.load(fileDescriptor);
                }
            })
            .init();
    });
}, false);
