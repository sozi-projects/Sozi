/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.addEventListener("load", function () {
    "use strict";

    var presentation = sozi.model.Presentation;
    var selection = sozi.editor.model.Selection.init(presentation);
    sozi.editor.view.Preview.init(presentation, selection);
    var timeline = sozi.editor.view.Timeline.init(presentation, selection);
    sozi.editor.view.Properties.init(presentation, selection);
    
    var svgFileDescriptor;

    /*
     * Create an SVG DOM tree from the given textual data
     * and add it to the editor "preview" area.
     *
     * Return a copy of the DOM tree, null if the given data
     * is not a valid SVG document.
     */
    function loadSVG(data) {
        // Create a DOM tree from the given textual data
        var div = document.createElement("div");
        div.innerHTML = data;

        // Check that the root of is an SVG element
        var svgRoot = div.firstElementChild;
        if (!(svgRoot instanceof SVGSVGElement)) {
            $.notify("Document is not valid SVG.", "error");
            return null;
        }

        // Remove any existing script inside the SVG DOM tree
        var scripts = Array.prototype.slice.call(svgRoot.getElementsByTagName("script"));
        scripts.forEach(function (script) {
            script.parentNode.removeChild(script);
        });

        var result = div.innerHTML;

        // Add the SVG root to the editor view
        $("#sozi-editor-view-preview").html(svgRoot);
        presentation.init(svgRoot);
        $("html head title").text(presentation.title);

        return result;
    }

    function openJSONFile(backend, name, location) {
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

                backend.create(name, location, "application/json", getJSONData(), function (fileDescriptor) {
                    autosaveJSONFile(backend, fileDescriptor);
                });
            }
        });
    }

    function mergeStorables() {
        var storable = {};
        for (var i = 0; i < arguments.length; i ++) {
            var partial = arguments[i].toStorable();
            for (var key in partial) {
                storable[key] = partial[key];
            }
        }
        return storable;
    }

    function getJSONData() {
        return JSON.stringify(mergeStorables(
            presentation,
            timeline,
            selection
        ));
    }

    function loadJSONData(data) {
        var storable = JSON.parse(data);
        presentation.fromStorable(storable);
        timeline.fromStorable(storable);
        selection.fromStorable(storable);
    }

    function autosaveJSONFile(backend, fileDescriptor) {
        backend.autosave(fileDescriptor, getJSONData);
    }

    function createHTMLFile(backend, name, location, svg) {
        var context = {
            svg: svg,
            title: presentation.title,
            json: JSON.stringify(presentation.toMinimalStorable())
        };
        function exportHTML() {
            return nunjucks.render("build/templates/sozi.player.html", context);
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
                    var svg = loadSVG(data);
                    if (svg) {
                        svgFileDescriptor = fileDescriptor;

                        openJSONFile(backend, name.replace(/\.svg$/, ".sozi.json"), location);
                        createHTMLFile(backend, name.replace(/\.svg$/, ".sozi.html"), location, svg);

                        backend.addListener("save", function (backend, fileDescriptor) {
                            $.notify("Saved " + backend.getName(fileDescriptor), "info");
                        });
                    }
                }
                else if (/\.sozi\.json$/.test(name)) {
                    // Load presentation data from JSON file.
                    loadJSONData(data);

                    // Select the first frame
                    if (presentation.frames.length && !selection.selectedFrames.length) {
                        selection.selectedFrames.push(presentation.frames.first);
                    }

                    autosaveJSONFile(backend, fileDescriptor);
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
