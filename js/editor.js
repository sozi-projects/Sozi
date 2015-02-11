/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {backendList} from "./backend/AbstractBackend";
import {Presentation} from "./model/Presentation";
import "./model/Presentation.upgrade";
import {Selection} from "./model/Selection";
import {Viewport} from "./player/Viewport";
import {Controller} from "./Controller";
import {Preview} from "./view/Preview";
import {Properties} from "./view/Properties";
import {Toolbar} from "./view/Toolbar";
import {Timeline} from "./view/Timeline";
import nunjucks from "nunjucks";

window.addEventListener("load", () => {
    "use strict";

    nunjucks.configure({watch: false});
    
    var presentation = Presentation;
    var selection = Selection.init(presentation);
    var viewport = Viewport.init(presentation);

    var controller = Controller.init(presentation, selection, viewport);

    var preview = Preview.init(document.getElementById("sozi-editor-view-preview"), presentation, selection, viewport, controller);
    Properties.init(document.getElementById("sozi-editor-view-properties"), selection, controller);
    Toolbar.init(document.getElementById("sozi-editor-view-toolbar"), presentation, viewport, controller);
    var timeline = Timeline.init(document.getElementById("sozi-editor-view-timeline"), presentation, selection, controller);

    // The objects that contain the presentation data and
    // the editor state that need to be saved.
    var jsonSources = [presentation, selection, timeline];

    var svgData;
    var reloading = false;

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
        scripts.forEach(script => {
            script.parentNode.removeChild(script);
        });

        svgData = div.innerHTML;

        // TODO Transform xlink:href attributes to replace relative URLs with absolute URLs

        // Add the SVG root to the editor view
        $(preview.container).html(svgRoot);

        presentation.init(svgRoot);
        viewport.onLoad();
        $("html head title").text(presentation.title);
    }

    /*
     * Open the JSON file with the given name at the given location.
     * If the file exists, load it.
     * It it does not exist, create it.
     */
    function openJSONFile(backend, name, location) {
        backend.find(name, location, fileDescriptor => {
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
                }

                // TODO Move this to controller
                backend.create(name, location, "application/json", getJSONData(), fileDescriptor => {
                    autosaveJSON(backend, fileDescriptor);
                });

                controller.onLoad(backend);
            }
        });
    }

    /*
     * Configure autosaving for presentation data
     * and editor state.
     */
    // TODO Move this to controller
    function autosaveJSON(backend, fileDescriptor) {
        if (reloading) {
            return;
        }

        backend.autosave(fileDescriptor, () => controller.jsonNeedsSaving, getJSONData);

        backend.addListener("save", savedFileDescriptor => {
            if (fileDescriptor === savedFileDescriptor) {
                controller.jsonNeedsSaving = false;
                $.notify("Saved " + backend.getName(fileDescriptor), "info");
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
        jsonSources.forEach(object => {
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
    function loadJSONData(backend, data) {
        var storable = JSON.parse(data);
        presentation.fromStorable(storable);
        timeline.fromStorable(storable);
        selection.fromStorable(storable);
        controller.onLoad(backend);
    }

    /*
     * Create the exported HTML file if it does not exist.
     */
    function createHTMLFile(backend, name, location) {
        backend.find(name, location, fileDescriptor => {
            if (fileDescriptor) {
                autosaveHTML(backend, fileDescriptor);
                backend.save(fileDescriptor, exportHTML());
            }
            else {
                backend.create(name, location, "text/html", exportHTML(), fileDescriptor => {
                    autosaveHTML(backend, fileDescriptor);
                });
            }
        });
    }

    /*
     * Generate the content of the exported HTML file.
     */
    function exportHTML() {
        return nunjucks.render("build/templates/player.html", {
            svg: svgData,
            title: presentation.title,
            json: JSON.stringify(presentation.toMinimalStorable())
        });
    }

    /*
     * Configure autosaving for HTML export.
     */
    // TODO Move this to controller
    function autosaveHTML(backend, fileDescriptor) {
        if (reloading) {
            return;
        }

        backend.autosave(fileDescriptor, () => controller.htmlNeedsSaving, exportHTML);

        backend.addListener("save", savedFileDescriptor => {
            if (fileDescriptor === savedFileDescriptor) {
                controller.htmlNeedsSaving = false;
                controller.emit("repaint");
                $.notify("Saved " + backend.getName(fileDescriptor), "info");
            }
        });
    }

    var svgFileDescriptor;

    backendList.forEach(backend => {
        var listItem = $("<li></li>");
        $("#sozi-editor-view-preview ul").append(listItem);
        backend
            .addListener("load", (fileDescriptor, data, err) => {
                var name = backend.getName(fileDescriptor);
                var location = backend.getLocation(fileDescriptor);

                if (err) {
                    $.notify("File " + name + " could not be loaded.", "error");
                }
                else if (/\.svg$/.test(name)) {
                    reloading = fileDescriptor === svgFileDescriptor;

                    loadSVG(data);
                    if (svgData) {
                        svgFileDescriptor = fileDescriptor;

                        openJSONFile(backend, name.replace(/\.svg$/, ".sozi.json"), location);
                        controller.once("load", () => {
                            createHTMLFile(backend, name.replace(/\.svg$/, ".sozi.html"), location);
                        });
                    }
                }
                else if (/\.sozi\.json$/.test(name)) {
                    // Load presentation data and editor state from JSON file.
                    loadJSONData(backend, data);

                    // If no frame is selected, select the first frame
                    if (presentation.frames.length && !selection.selectedFrames.length) {
                        selection.selectedFrames.push(presentation.frames[0]);
                    }

                    autosaveJSON(backend, fileDescriptor);
                }
            })
            .addListener("change", fileDescriptor => {
                if (fileDescriptor === svgFileDescriptor) {
                    $.notify("Document was changed. Reloading", "info");
                    backend.load(fileDescriptor);
                }
            })
            .init(listItem);
    });
}, false);
