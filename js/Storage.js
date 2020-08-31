/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {SVGDocumentWrapper} from "./svg/SVGDocumentWrapper";
import {backendList} from "./backend/AbstractBackend";
import nunjucks from "nunjucks";
import Jed from "jed";
import {upgradeFromSVG, upgradeFromStorable} from "./upgrade";
import path from "path";

function replaceFileExtWith(fileName, ext) {
    return fileName.replace(/\.[^/.]+$/, ext);
}

/** File read/write manager.
 *
 * @extends EventEmitter
 * @todo Add documentation.
 */
export class Storage {

    constructor(controller, presentation, selection) {
        this.controller         = controller;
        this.document           = null;
        this.presentation       = presentation;
        this.selection          = selection;
        this.backend            = backendList[0];
        this.svgFileDescriptor  = null;
        this.htmlFileDescriptor = null;
        this.jsonFileDescriptor = null;
        this.jsonNeedsSaving    = false;
        this.htmlNeedsSaving    = false;

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

        controller.addListener("blur", () => {
            if (this.backend && controller.getPreference("saveMode") === "onblur") {
                this.backend.doAutosave();
            }
        });
    }

    activate() {
        for (let backend of backendList) {
            const listItem = document.createElement("li");
            document.querySelector("#sozi-editor-view-preview ul").appendChild(listItem);

            const backendInstance = new backend(this.controller, listItem);
        }
    }

    save() {
        return this.backend.doAutosave();
    }

    reload() {
        this.save().then(
            () => this.backend.load(this.svgFileDescriptor)
        ).then(
            data => this.loadSVGData(data)
        );
    }

    setSVGFile(fileDescriptor, backend) {
        this.svgFileDescriptor = fileDescriptor;
        this.backend           = backend;
        this.backend.load(this.svgFileDescriptor).then(data => this.loadSVGData(data));
    }

    loadSVGData(data) {
        const _        = this.controller.gettext;
        const name     = this.backend.getName(this.svgFileDescriptor);
        const location = this.backend.getLocation(this.svgFileDescriptor);

        this.document = SVGDocumentWrapper.fromString(data);
        if (this.document.isValidSVG) {
            this.resolveRelativeURLs(location);
            this.presentation.setSVGDocument(this.document);
            this.openJSONFile(replaceFileExtWith(name, ".sozi.json"), location);
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
        const xlinkNsAttrs = Array.from(this.document.root.attributes).filter(a => a.value === XLINK_NS);
        if (!xlinkNsAttrs.length) {
            return;
        }
        const xlinkPrefix = xlinkNsAttrs[0].name.replace(/^xmlns:/, "") + ":";

        for (let img of this.document.root.getElementsByTagName("image")) {
            const href = img.getAttribute(xlinkPrefix + "href");
            if (!/^[a-z]+:|^[/#]/.test(href)) {
                img.setAttribute(xlinkPrefix + "href", `${location}/${href}`);
            }
        }
    }

    /*
     * Open the JSON file with the given name at the given location.
     * If the file exists, load it.
     * It it does not exist, create it.
     *
     * Returns a promise.
     */
    openJSONFile(name, location) {
        const _ = this.controller.gettext;

        return this.backend.find(name, location).then(
            // Load presentation data and editor state from JSON file.
            fileDescriptor => this.backend.load(fileDescriptor).then(
                data => {
                    this.loadJSONData(data);
                    return fileDescriptor;
                }
            ),
            err => {
                // If no JSON file is available, attempt to extract
                // presentation data from the SVG document, assuming
                // it has been generated from Sozi 13 or earlier.
                // Then save the extracted data to a JSON file.
                upgradeFromSVG(this.presentation, this.controller);

                // Select the first frame
                if (this.presentation.frames.length) {
                    this.controller.info(_("Document was imported from Sozi 13 or earlier."));
                }

                return this.backend.create(name, location, "application/json", this.getJSONData());
            }
        ).then(
            fileDescriptor => {
                if (!this.jsonFileDescriptor) {
                    this.jsonFileDescriptor = fileDescriptor;
                    this.backend.autosave(fileDescriptor, () => this.jsonNeedsSaving, () => this.getJSONData());
                }

                this.controller.onLoad();

                const svgName           = this.backend.getName(this.svgFileDescriptor);
                const htmlFileName      = replaceFileExtWith(svgName, ".sozi.html");
                const presenterFileName = replaceFileExtWith(svgName, "-presenter.sozi.html");
                this.createHTMLFile(htmlFileName, location);
                this.createPresenterHTMLFile(presenterFileName, location, htmlFileName);
            }
        );
    }

    /*
     * Create the exported HTML file if it does not exist.
     *
     * Returns a promise.
     */
    createHTMLFile(name, location) {
        return this.backend.find(name, location).then(
            fileDescriptor => this.backend.save(fileDescriptor, this.exportHTML()),
            err => this.backend.create(name, location, "text/html", this.exportHTML())
        ).then(
            fileDescriptor => {
                if (!this.htmlFileDescriptor) {
                    this.htmlFileDescriptor = fileDescriptor;
                    this.backend.autosave(fileDescriptor, () => this.htmlNeedsSaving, () => this.exportHTML());
                }
            }
        );
    }

    /*
     * Create the presenter HTML file if it does not exist.
     *
     * Returns a promise.
     */
    createPresenterHTMLFile(name, location, htmlFileName) {
        return this.backend.find(name, location).then(
            fileDescriptor => {
                this.backend.save(fileDescriptor, this.exportPresenterHTML(htmlFileName));
            },
            err => {
                this.backend.create(name, location, "text/html", this.exportPresenterHTML(htmlFileName));
            }
        );
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
    }

    onSave(fileDescriptor) {
        const _ = this.controller.gettext;

        if (this.backend.sameFile(fileDescriptor, this.jsonFileDescriptor)) {
            this.jsonNeedsSaving = false;
        }
        else if (this.backend.sameFile(fileDescriptor, this.htmlFileDescriptor)) {
            this.htmlNeedsSaving = false;
        }

        this.controller.emit("repaint"); // TODO move this to controller
        this.controller.info(Jed.sprintf(_("Saved %s."), this.backend.getName(fileDescriptor)));
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
            json: JSON.stringify(this.presentation.toMinimalStorable()),
            customCSS: this.readCustomFiles(".css"),
            customJS: this.readCustomFiles(".js")
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

    toRelativePath(filePath) {
        const svgLoc = this.backend.getLocation(this.svgFileDescriptor);
        return path.relative(svgLoc, filePath);
    }

    readCustomFiles(ext) {
        const svgLoc = this.backend.getLocation(this.svgFileDescriptor);
        const paths = this.presentation.customFiles.filter(path => path.endsWith(ext));
        const contents = paths.map(relPath => {
            const absPath = path.join(svgLoc, relPath);
            return this.backend.loadSync(absPath);
        });
        return contents.join("\n");
    }
}
