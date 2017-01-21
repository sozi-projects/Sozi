/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {backendList} from "./backend/AbstractBackend";
import {EventEmitter} from "events";
import nunjucks from "nunjucks";
import Jed from "jed";
import {upgrade} from "./upgrade";
import {toArray} from "./utils";
import $ from "jquery";
import path from "path";

export var Storage = Object.create(EventEmitter.prototype);

Storage.init = function (controller, document, presentation, selection, timeline, locale) {
    EventEmitter.call(this);

    this.controller = controller;
    this.document = document;
    this.presentation = presentation;
    this.selection = selection;
    this.timeline = timeline;
    this.backend = null;
    this.svgFileDescriptor = null;
    this.jsonNeedsSaving = false;
    this.htmlNeedsSaving = false;
    this.reloading = false;
    this.gettext = locale.gettext.bind(locale);

    nunjucks.configure(path.join(__dirname, "..", "templates"), {
        watch: false,
        autoescape: false
    });

    controller.addListener("presentationChange", () => {
        this.jsonNeedsSaving = this.htmlNeedsSaving = true;
    });

    controller.addListener("editorStateChange",  () => {
        this.jsonNeedsSaving = true;
    });

    backendList.forEach(backend => {
        var listItem = $("<li></li>");
        $("#sozi-editor-view-preview ul").append(listItem);
        backend.init(listItem, this.gettext)
            .addListener("load", this.onBackendLoad.bind(this, backend))
            .addListener("change", this.onBackendChange.bind(this));
    });

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
    var _ = this.gettext;
    this.backend = backend;

    var name = backend.getName(fileDescriptor);
    var location = backend.getLocation(fileDescriptor);

    if (err) {
        new Notification(_("Sozi (Error)"), {body: Jed.sprintf(_("File %s could not be loaded."), name)});
    }
    else if (/\.svg$/.test(name)) {
        this.reloading = fileDescriptor === this.svgFileDescriptor;
        this.document.import(data);
        if (this.document.isValidSVG) {
            this.resolveRelativeURLs(location);
            this.controller.setSVGDocument(this.document);
            this.svgFileDescriptor = fileDescriptor;
            this.openJSONFile(name.replace(/\.svg$/, ".sozi.json"), location);
            this.controller.once("ready", () => {
                this.createHTMLFile(name.replace(/\.svg$/, ".sozi.html"), location);
            });
        }
        else {
            new Notification(_("Sozi (Error)"), {body: _("Document is not valid SVG.")});
        }
    }
    else if (/\.sozi\.json$/.test(name)) {
        // Load presentation data and editor state from JSON file.
        this.loadJSONData(data);
        this.autosaveJSON(fileDescriptor);
    }
    else {
        new Notification(_("Sozi (Error)"), {body: _("Document is not valid SVG.")});
    }
};

/*
 * Fix the href attribute of linked images when the given URL is relative.
 *
 * In linked images, the href attribute can be either an absolute URL
 * or a path relative to the location of the SVG file.
 * But in the presentation editor, URLs are relative to the location of
 * the index.html file of the application.
 * For this reason, we modify image URLs by prefixing all relative URLs
 * with the actual location of the SVG file.
 */
Storage.resolveRelativeURLs = function (location) {
    const XLINK_NS = "http://www.w3.org/1999/xlink";
    var xlinkNsAttrs = toArray(this.document.root.attributes).filter(a => a.value === XLINK_NS);
    if (!xlinkNsAttrs.length) {
        return;
    }
    var xlinkPrefix = xlinkNsAttrs[0].name.replace(/^xmlns:/, "") + ":";

    var images = toArray(this.document.root.getElementsByTagName("image"));
    images.forEach(img => {
        var href = img.getAttribute(xlinkPrefix + "href");
        if (!/^[a-z]+:|^[/#]/.test(href)) {
            img.setAttribute(xlinkPrefix + "href", `${location}/${href}`);
        }
    });
};

Storage.onBackendChange = function (fileDescriptor) {
    var _ = this.gettext;

    if (fileDescriptor === this.svgFileDescriptor) {
        new Notification(_("Sozi (Information)"), {body: _("Document was changed. Reloading.")});
        this.reload();
    }
};

/*
 * Open the JSON file with the given name at the given location.
 * If the file exists, load it.
 * It it does not exist, create it.
 */
Storage.openJSONFile = function (name, location) {
    var _ = this.gettext;

    this.backend.find(name, location, fileDescriptor => {
        if (fileDescriptor) {
            this.backend.load(fileDescriptor);
        }
        else {
            // If no JSON file is available, attempt to extract
            // presentation data from the SVG document, assuming
            // it has been generated from Sozi 13 or earlier.
            // Then save the extracted data to a JSON file.
            upgrade(this.presentation, this.timeline);

            // Select the first frame
            if (this.presentation.frames.length) {
                new Notification(_("Sozi (Information)"), {body: _("Document was imported from Sozi 13 or earlier.")});
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

    var _ = this.gettext;

    this.backend.autosave(fileDescriptor, () => this.jsonNeedsSaving, this.getJSONData.bind(this));

    this.backend.addListener("save", savedFileDescriptor => {
        if (fileDescriptor === savedFileDescriptor) {
            this.jsonNeedsSaving = false;
            new Notification(_("Sozi (Information)"), {body: Jed.sprintf(_("Saved %s."), this.backend.getName(fileDescriptor))});
        }
    });
};

/*
 * Configure autosaving for HTML export.
 */
Storage.autosaveHTML = function (fileDescriptor) {
    var _ = this.gettext;

    if (this.reloading) {
        return;
    }

    this.backend.autosave(fileDescriptor, () => this.htmlNeedsSaving, this.exportHTML.bind(this));

    this.backend.addListener("save", savedFileDescriptor => {
        if (fileDescriptor === savedFileDescriptor) {
            this.htmlNeedsSaving = false;
            this.controller.emit("repaint"); // TODO move this to controller
            new Notification(_("Sozi (Information)"), {body: Jed.sprintf(_("Saved %s."), this.backend.getName(fileDescriptor))});
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
    return JSON.stringify(storable, null, "  ");
};

/*
 * Generate the content of the exported HTML file.
 */
Storage.exportHTML = function () {
    return nunjucks.render("player.html", {
        svg: this.document.asText,
        pres: this.presentation,
        json: JSON.stringify(this.presentation.toMinimalStorable())
    });
};
