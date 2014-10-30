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
    
    // The objects that contain the presentation data and
    // the editor state that need to be saved.
    var jsonSources = [presentation, selection, timeline];

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

    /*
     * Open the JSON file with the given name at the given location.
     * If the file exists, load it.
     * It it does not exist, create it.
     */
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
                    backend.autosave(fileDescriptor, getJSONData);
                });
            }
        });
    }

    /*
     * Extract the data to save from the current presentation
     * and the current editor state.
     * Return it as a JSON string.
     */
    function getJSONData() {
        var storable = {};
        jsonSources.forEach(function (object) {
            var partial = object.toStorable();
            for (var key in partial) {
                storable[key] = partial[key];
            }
        });
        return JSON.stringify(storable);
    }

    /*
     * Load the presentation and set the initial state
     * of the editor using the given JSON data.
     */
    function loadJSONData(data) {
        var storable = JSON.parse(data);
        presentation.fromStorable(storable);
        timeline.fromStorable(storable);
        selection.fromStorable(storable);
    }

    /*
     * Export the presentation to the HTML file with the given name,
     * at the given location and using the given SVG data.
     */
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

    var svgFileDescriptor;

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
                    // Load presentation data and editor state from JSON file.
                    loadJSONData(data);

                    // If no frame is selected, select the first frame
                    if (presentation.frames.length && !selection.selectedFrames.length) {
                        selection.selectedFrames.push(presentation.frames.first);
                    }

                    backend.autosave(fileDescriptor, getJSONData);
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
