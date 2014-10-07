
window.addEventListener("load", function () {
    "use strict";

    var presentation = sozi.model.Presentation;
    var selection = sozi.editor.model.Selection.init(presentation);
    sozi.editor.view.Preview.init(presentation, selection);
    sozi.editor.view.Timeline.init(presentation, selection);
    sozi.editor.view.Properties.init(presentation, selection);
    
    var svgFileDescriptor;

    function loadSVG(data) {
        // Find the SVG root and check that the loaded document is valid SVG.
        var svgRoot = $("#sozi-editor-view-preview").html(data).get(0).querySelector("svg");
        if (svgRoot instanceof SVGSVGElement) {
            presentation.init(svgRoot);
            $("html head title").text(presentation.title);
        }
        else {
            $.notify("Document is not valid SVG.", "error");
        }
    }

    function loadJSON(backend, name, location) {
        backend.find(name, location, function (fileDescriptor) {
            if (fileDescriptor) {
                backend.load(fileDescriptor);
            }
            else {
                // If no JSON file is available, attempt to extract
                // presentation data from the SVG document, assuming
                // it has been generated from Sozi 13 or earlier.
                // Then save the extracted data to a JSON file.
                presentation.upgrade();

                // Select the first frame
                if (presentation.frames.length) {
                    $.notify("Document was imported from Sozi 13 or earlier.", "success");
                    selection.selectedFrames.push(presentation.frames.first);
                }

                backend.create(name, location, "application/json", presentation.toJSON(), function (fileDescriptor) {
                    autosaveJSON(backend, fileDescriptor);
                });
            }
        });
    }

    function autosaveJSON(backend, fileDescriptor) {
        backend.autosave(fileDescriptor, function () {
            return presentation.toJSON();
        });
    }

    function createHTML(backend, name, location, data) {
        function exportHTML() {
            return nunjucks.render("build/templates/sozi.player.html", {
                svg: data,
                pres: presentation
            });
        }
        backend.create(name, location, "text/html", exportHTML(), function (fileDescriptor) {
            backend.autosave(fileDescriptor, exportHTML);
        });
    }

    sozi.editor.backend.list.forEach(function (backend) {
        var listItem = $("<li></li>");
        $("#sozi-editor-view-preview ul").append(listItem);
        backend
            .addListener("load", function (backend, fileDescriptor, data, err) {
                var name = backend.getName(fileDescriptor);
                var location = backend.getLocation(fileDescriptor);

                if (err) {
                    $.notify("File " + name + " could not be loaded.", "error");
                }
                else if (/\.svg$/.test(name)) {
                    svgFileDescriptor = fileDescriptor;

                    loadSVG(data);
                    loadJSON(backend, name.replace(/\.svg$/, ".sozi.json"), location);
                    createHTML(backend, name.replace(/\.svg$/, ".sozi.html"), location, data);

                    backend.addListener("save", function (backend, fileDescriptor) {
                        $.notify("Saved " + backend.getName(fileDescriptor), "info");
                    });
                }
                else if (/\.sozi\.json$/.test(name)) {
                    // Load presentation data from JSON file.
                    presentation.fromJSON(data);

                    // Select the first frame
                    if (presentation.frames.length) {
                        selection.selectedFrames.push(presentation.frames.first);
                    }

                    autosaveJSON(backend, fileDescriptor);
                }
            })
            .addListener("change", function (backend, fileDescriptor) {
                if (fileDescriptor === svgFileDescriptor) {
                    $.notify("Document was changed. Reloading", "info");
                    backend.load(fileDescriptor);
                }
            })
            .init(listItem);
    });
}, false);
