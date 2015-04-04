/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {backendList} from "./backend/AbstractBackend";
import {EventEmitter} from "events";
import nunjucks from "nunjucks";

export var Storage = Object.create(EventEmitter.prototype);

Storage.init = function (controller, presentation, selection, timeline, i18n) {
    EventEmitter.call(this);

    this.controller = controller;
    this.presentation = presentation;
    this.selection = selection;
    this.timeline = timeline;
    this.backend = null;
    this.svgData = "";
    this.svgFileDescriptor = null;
    this.jsonNeedsSaving = false;
    this.htmlNeedsSaving = false;
    this.reloading = false;

    controller.addListener("presentationChange", () => {
        this.jsonNeedsSaving = this.htmlNeedsSaving = true;
    });

    controller.addListener("editorStateChange",  () => {
        this.jsonNeedsSaving = true;
    });

    var gettext = i18n.gettext.bind(i18n);

    backendList.forEach(backend => {
        var listItem = $("<li></li>");
        $("#sozi-editor-view-preview ul").append(listItem);
        backend.init(listItem, gettext)
            .addListener("load", this.onBackendLoad.bind(this, backend))
            .addListener("change", this.onBackendChange.bind(this));
    });

    if (backendList.length === 1) {
//        window.setTimeout(() => {
            backendList[0].openFileChooser();
//        }, 100);
    }

    return this;
};

Storage.save = function () {
    this.backend.doAutosave();
};

Storage.reload = function () {
    this.save();
    this.backend.load(this.svgFileDescriptor);
};

Storage.onBackendLoad = function (backend, fileDescriptor, data, err) {
    this.backend = backend;

    var name = backend.getName(fileDescriptor);
    var location = backend.getLocation(fileDescriptor);

    if (err) {
        $.notify("File " + name + " could not be loaded.", "error");
    }
    else if (/\.svg$/.test(name)) {
        this.reloading = fileDescriptor === this.svgFileDescriptor;
        if (this.loadSVG(data)) {
            this.svgFileDescriptor = fileDescriptor;
            this.openJSONFile(name.replace(/\.svg$/, ".sozi.json"), location);
            this.controller.once("ready", () => {
                this.createHTMLFile(name.replace(/\.svg$/, ".sozi.html"), location);
            });
        }
    }
    else if (/\.sozi\.json$/.test(name)) {
        // Load presentation data and editor state from JSON file.
        this.loadJSONData(data);
        this.autosaveJSON(fileDescriptor);
    }
};

Storage.onBackendChange = function (fileDescriptor) {
    if (fileDescriptor === this.svgFileDescriptor) {
        $.notify("Document was changed. Reloading", "info");
        this.reload();
    }
};

/*
 * Create an SVG DOM tree from the given textual data
 * and add it to the editor "preview" area.
 *
 * Return true on success, false on failure.
 */
Storage.loadSVG = function (data) {
    // Create a DOM tree from the given textual data
    var div = document.createElement("div");
    div.innerHTML = data;

    // Check that the root of is an SVG element
    var svgRoot = div.firstElementChild;
    if (!(svgRoot instanceof SVGSVGElement)) {
        $.notify("Document is not valid SVG.", "error");
        return false;
    }

    // Remove any existing script inside the SVG DOM tree
    var scripts = Array.prototype.slice.call(svgRoot.getElementsByTagName("script"));
    scripts.forEach(script => {
        script.parentNode.removeChild(script);
    });

    this.svgData = div.innerHTML;

    // TODO Transform xlink:href attributes to replace relative URLs with absolute URLs

    this.controller.setSVGRoot(svgRoot);
    return true;
};

/*
 * Open the JSON file with the given name at the given location.
 * If the file exists, load it.
 * It it does not exist, create it.
 */
Storage.openJSONFile = function (name, location) {
    this.backend.find(name, location, fileDescriptor => {
        if (fileDescriptor) {
            this.backend.load(fileDescriptor);
        }
        else {
            // If no JSON file is available, attempt to extract
            // presentation data from the SVG document, assuming
            // it has been generated from Sozi 13 or earlier.
            // Then save the extracted data to a JSON file.
            this.presentation.upgrade();

            // Select the first frame
            if (this.presentation.frames.length) {
                $.notify("Document was imported from Sozi 13 or earlier.", "success");
            }

            this.backend.create(name, location, "application/json", this.getJSONData(), fileDescriptor => {
                this.autosaveJSON(fileDescriptor);
            });

            this.controller.onLoad();
        }
    });
};

/*
 * Create the exported HTML file if it does not exist.
 */
Storage.createHTMLFile = function (name, location) {
    this.backend.find(name, location, fileDescriptor => {
        if (fileDescriptor) {
            this.autosaveHTML(fileDescriptor);
            this.backend.save(fileDescriptor, this.exportHTML());
        }
        else {
            this.backend.create(name, location, "text/html", this.exportHTML(), fileDescriptor => {
                this.autosaveHTML(fileDescriptor);
            });
        }
    });
};

/*
 * Load the presentation and set the initial state
 * of the editor using the given JSON data.
 */
Storage.loadJSONData = function (data) {
    var storable = JSON.parse(data);
    this.presentation.fromStorable(storable);
    this.timeline.fromStorable(storable);
    this.selection.fromStorable(storable);
    this.controller.onLoad();
};

/*
 * Configure autosaving for presentation data
 * and editor state.
 */
Storage.autosaveJSON = function (fileDescriptor) {
    if (this.reloading) {
        return;
    }

    this.backend.autosave(fileDescriptor, () => this.jsonNeedsSaving, this.getJSONData.bind(this));

    this.backend.addListener("save", savedFileDescriptor => {
        if (fileDescriptor === savedFileDescriptor) {
            this.jsonNeedsSaving = false;
            $.notify("Saved " + this.backend.getName(fileDescriptor), "info");
        }
    });
};

/*
 * Configure autosaving for HTML export.
 */
Storage.autosaveHTML = function (fileDescriptor) {
    if (this.reloading) {
        return;
    }

    this.backend.autosave(fileDescriptor, () => this.htmlNeedsSaving, this.exportHTML.bind(this));

    this.backend.addListener("save", savedFileDescriptor => {
        if (fileDescriptor === savedFileDescriptor) {
            this.htmlNeedsSaving = false;
            this.controller.emit("repaint"); // TODO move this to controller
            $.notify("Saved " + this.backend.getName(fileDescriptor), "info");
        }
    });
};

/*
 * Extract the data to save from the current presentation
 * and the current editor state.
 * Return it as a JSON string.
 */
Storage.getJSONData = function () {
    var storable = {};
    [this.presentation, this.selection, this.timeline].forEach(object => {
        var partial = object.toStorable();
        for (var key in partial) {
            storable[key] = partial[key];
        }
    });
    return JSON.stringify(storable);
};

/*
 * Generate the content of the exported HTML file.
 */
Storage.exportHTML = function () {
    return nunjucks.render("build/templates/player.html", {
        svg: this.svgData,
        pres: this.presentation,
        json: JSON.stringify(this.presentation.toMinimalStorable())
    });
};

