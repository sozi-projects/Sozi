
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
    
    var svgFileDescriptor;
    var jsonFileDescriptor;
    
    backends.forEach(function (name) {
        var listItem = $("<li></li>");
        $("#sozi-editor-view-preview ul").append(listItem);
        sozi.editor.backend[name]
            .addListener("load", function (backend, fileDescriptor, data, err) {
                var name = backend.getName(fileDescriptor);
                var location = backend.getLocation(fileDescriptor);
                if (/\.svg$/.test(name)) {
                    if (!err) {
                        // Find the SVG root and check that the loaded document is valid SVG.
                        var svgRoot = $("#sozi-editor-view-preview").html(data).get(0).querySelector("svg");
                        if (svgRoot instanceof SVGSVGElement) {
                            svgFileDescriptor = fileDescriptor;
                            presentation.init(svgRoot);
                            
                            var jsonName = name.replace(/\.svg$/, ".sozi.json");
                            backend.find(jsonName, location, function (fileDescriptor) {
                                if (fileDescriptor) {
//                                    backend.load(fileDescriptor);
                                }
//                                else {
                                    // If no JSON file is available, attempt to extract
                                    // presentation data from the SVG document, assuming
                                    // it has been generated from Sozi 13 or earlier.
                                    // Then save the extracted data to a JSON file.
                                    presentation.upgrade();
                                    if (presentation.frames.length) {
                                        selection.selectedFrames.push(presentation.frames.first);
                                    }
                                    backend.create(jsonName, location, "application/json", JSON.stringify(presentation.toStorable()), function (fileDescriptor) {
                                        jsonFileDescriptor = fileDescriptor;
                                    });
//                                }
                            });
                        }
                        else {
                            console.log("Error: Document is not valid SVG.");
                        }
                    }
                    else {
                        console.log("Error loading file: " + name);
                    }
                }
                else if (/\.sozi\.json$/.test(name)) {
                    if (!err) {
                        // Load presentation data from JSON file.
                        presentation.fromStorable(JSON.parse(data));
                        if (presentation.frames.length) {
                            selection.selectedFrames.push(presentation.frames.first);
                        }
                    }
                }
            })
            .addListener("change", function (backend, fileDescriptor) {
                if (fileDescriptor === svgFileDescriptor) {
                    console.log("Reloading");
                    backend.load(fileDescriptor);
                }
            })
            .init(listItem);
    });
}, false);
