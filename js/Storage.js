/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {SVGDocumentWrapper} from "./svg/SVGDocumentWrapper";
import {backendList} from "./backend/AbstractBackend";
import {EventEmitter} from "events";
import nunjucks from "nunjucks";
import Jed from "jed";
import {upgradeFromSVG, upgradeFromStorable} from "./upgrade";
import {toArray} from "./utils";
import path from "path";

export class Storage extends EventEmitter {

    constructor(controller, presentation, selection, locale) {
        super();

        this.controller = controller;
        this.document = null;
        this.presentation = presentation;
        this.selection = selection;
        this.backend = backendList[0];
        this.svgFileDescriptor = null;
        this.jsonNeedsSaving = false;
        this.htmlNeedsSaving = false;
        this.reloading = false;
        this.gettext = s => locale.gettext(s);

        // Adjust the template path depending on the target platform.
        // In the web browser, __dirname is set to "/js". The leading "/" will result
        // in an incorrect URL if the app is not hosted at the root of its domain.
        const templatePath = __dirname === "/js" ? "templates" : path.join(__dirname, "..", "templates");

        nunjucks.configure(templatePath, {
            watch: false,
            autoescape: false
        });

        controller.addListener("presentationChange", () => {
            this.jsonNeedsSaving = this.htmlNeedsSaving = true;
        });

        controller.addListener("editorStateChange",  () => {
            this.jsonNeedsSaving = true;
        });

        for (let backend of backendList) {
            const listItem = document.createElement("li");
            document.querySelector("#sozi-editor-view-preview ul").appendChild(listItem);

            const backendInstance = new backend(controller, listItem, this.gettext);
            backendInstance.addListener("load", (...a) => this.onBackendLoad(backendInstance, ...a));
            backendInstance.addListener("change", (...a) => this.onBackendChange(...a));
        }
    }

    save() {
        this.backend.doAutosave();
    }

    reload() {
        this.save();
        this.backend.load(this.svgFileDescriptor);
    }

    onBackendLoad(backend, fileDescriptor, data, err) {
        const _ = this.gettext;
        this.backend = backend;

        const name = backend.getName(fileDescriptor);
        const location = backend.getLocation(fileDescriptor);

        if (err) {
            this.controller.error(Jed.sprintf(_("File %s could not be loaded."), name));
        }
        else if (/\.svg$/.test(name)) {
            this.reloading = fileDescriptor === this.svgFileDescriptor;
            this.document = SVGDocumentWrapper.fromString(data);
            if (this.document.isValidSVG) {
                this.resolveRelativeURLs(location);
                this.controller.setSVGDocument(this.document);
                this.svgFileDescriptor = fileDescriptor;
                this.controller.once("ready", () => {
                    const htmlFileName = name.replace(/\.svg$/, ".sozi.html");
                    this.createHTMLFile(htmlFileName, location);
                    this.createPresenterHTMLFile(name.replace(/\.svg$/, "-presenter.sozi.html"), location, htmlFileName);
                });
                this.openJSONFile(name.replace(/\.svg$/, ".sozi.json"), location);
            }
            else {
                this.controller.error(_("Document is not valid SVG."));
            }
        }
        else if (/\.sozi\.json$/.test(name)) {
            // Load presentation data and editor state from JSON file.
            this.loadJSONData(data);
            this.autosaveJSON(fileDescriptor);
        }
        else {
            this.controller.error(_("Document is not valid SVG."));
        }
    }

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
    resolveRelativeURLs(location) {
        const XLINK_NS = "http://www.w3.org/1999/xlink";
        const xlinkNsAttrs = toArray(this.document.root.attributes).filter(a => a.value === XLINK_NS);
        if (!xlinkNsAttrs.length) {
            return;
        }
        const xlinkPrefix = xlinkNsAttrs[0].name.replace(/^xmlns:/, "") + ":";

        const images = toArray(this.document.root.getElementsByTagName("image"));
        for (let img of images) {
            const href = img.getAttribute(xlinkPrefix + "href");
            if (!/^[a-z]+:|^[/#]/.test(href)) {
                img.setAttribute(xlinkPrefix + "href", `${location}/${href}`);
            }
        }
    }

    onBackendChange(fileDescriptor) {
        const _ = this.gettext;

        if (fileDescriptor === this.svgFileDescriptor) {
            switch (this.controller.getPreference("reloadMode")) {
                case "auto":
                    this.controller.info(_("Document was changed. Reloading."));
                    this.reload();
                    break;

                case "onfocus":
                    if (this.backend.hasFocus) {
                        this.controller.info(_("Document was changed. Reloading."));
                        this.reload();
                    }
                    else {
                        this.backend.once("focus", () => this.reload());
                    }
                    break;

                default:
                    this.controller.info(_("Document was changed."));
            }
        }
    }

    /*
     * Open the JSON file with the given name at the given location.
     * If the file exists, load it.
     * It it does not exist, create it.
     */
    openJSONFile(name, location) {
        const _ = this.gettext;

        this.backend.find(name, location, fileDescriptor => {
            if (fileDescriptor) {
                this.backend.load(fileDescriptor);
            }
            else {
                // If no JSON file is available, attempt to extract
                // presentation data from the SVG document, assuming
                // it has been generated from Sozi 13 or earlier.
                // Then save the extracted data to a JSON file.
                upgradeFromSVG(this.presentation, this.controller);

                // Select the first frame
                if (this.presentation.frames.length) {
                    this.controller.info(_("Document was imported from Sozi 13 or earlier."));
                }

                this.backend.create(name, location, "application/json", this.getJSONData(), fileDescriptor => {
                    this.autosaveJSON(fileDescriptor);
                });

                this.controller.onLoad(this);
            }
        });
    }

    /*
     * Create the exported HTML file if it does not exist.
     */
    createHTMLFile(name, location) {
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
    }

    /*
     * Create the presenter HTML file if it does not exist.
     */
    createPresenterHTMLFile(name, location, htmlFileName) {
        this.backend.find(name, location, fileDescriptor => {
            if (fileDescriptor) {
                this.backend.save(fileDescriptor, this.exportPresenterHTML(htmlFileName));
            }
            else {
                this.backend.create(name, location, "text/html", this.exportPresenterHTML(htmlFileName));
            }
        });
    }

    /*
     * Load the presentation and set the initial state
     * of the editor using the given JSON data.
     */
    loadJSONData(data) {
        const storable = JSON.parse(data);
        upgradeFromStorable(storable);
        this.presentation.fromStorable(storable);
        this.controller.fromStorable(storable);
        this.selection.fromStorable(storable);
        this.controller.onLoad(this);
    }

    /*
     * Configure autosaving for presentation data
     * and editor state.
     */
    autosaveJSON(fileDescriptor) {
        if (this.reloading) {
            return;
        }

        this.backend.autosave(fileDescriptor, () => this.jsonNeedsSaving, () => this.getJSONData());

        const _ = this.gettext;

        this.backend.addListener("save", savedFileDescriptor => {
            if (fileDescriptor === savedFileDescriptor) {
                this.jsonNeedsSaving = false;
                this.controller.info(Jed.sprintf(_("Saved %s."), this.backend.getName(fileDescriptor)));
            }
        });
    }

    /*
     * Configure autosaving for HTML export.
     */
    autosaveHTML(fileDescriptor) {
        if (this.reloading) {
            return;
        }

        this.backend.autosave(fileDescriptor, () => this.htmlNeedsSaving, () => this.exportHTML());

        const _ = this.gettext;

        this.backend.addListener("save", savedFileDescriptor => {
            if (fileDescriptor === savedFileDescriptor) {
                this.htmlNeedsSaving = false;
                this.controller.emit("repaint"); // TODO move this to controller
                this.controller.info(Jed.sprintf(_("Saved %s."), this.backend.getName(fileDescriptor)));
            }
        });
    }

    /*
     * Extract the data to save from the current presentation
     * and the current editor state.
     * Return it as a JSON string.
     */
    getJSONData() {
        const storable = {};
        for (let object of [this.presentation, this.selection, this.controller]) {
            const partial = object.toStorable();
            for (let key in partial) {
                storable[key] = partial[key];
            }
        }
        return JSON.stringify(storable, null, "  ");
    }

    /*
     * Generate the content of the exported HTML file.
     */
    exportHTML() {
        return nunjucks.render("player.html", {
            svg: this.document.asText,
            pres: this.presentation,
            json: JSON.stringify(this.presentation.toMinimalStorable())
        });
    }

    /*
     * Generate the content of the presenter HTML file.
     */
    exportPresenterHTML(htmlFileName) {
        return nunjucks.render("presenter.html", {
            pres: this.presentation,
            soziHtml: htmlFileName
        });
    }
}
