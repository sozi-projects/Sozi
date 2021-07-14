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

/** Replace the extension in a file name.
 *
 * @param {string} fileName - The name of a file.
 * @param {string} ext - The new extension.
 * @returns {string} - A file name with the new extension.
 */
function replaceFileExtWith(fileName, ext) {
    return fileName.replace(/\.[^/.]+$/, ext);
}

/** File read/write manager. */
export class Storage {
    /** Initialize a storage manager for a presentation.
     *
     * @param {module:Controller.Controller} controller - The controller that manages the current editor.
     * @param {module:model/Presentation.Presentation} presentation - The Sozi presentation opened in the editor.
     * @param {module:model/Selection.Selection} selection - The object that represents the selection in the timeline.
     */
    constructor(controller, presentation, selection) {
        /** The controller that manages the current editor.
         *
         * @type {module:Controller.Controller}
         */
        this.controller = controller;

        /** The current SVG document.
         *
         * @default
         * @type {module:svg/SVGDocumentWrapper.SVGDocumentWrapper}
         */
        this.document = null;

        /** The Sozi presentation opened in the editor.
         *
         * @type {module:model/Presentation.Presentation}
         */
        this.presentation = presentation;

        /** The object that represents the selection in the timeline.
         *
         * @type {module:model/Selection.Selection}
         */
        this.selection = selection;

        /** The current execution platform backend.
         *
         * @type {module:backend/AbstractBackend.AbstractBackend}
         */
        this.backend = null;

        /** The descriptor of the current SVG document file.
         *
         * @default
         * @type {any}
         */
        this.svgFileDescriptor  = null;

        /** The descriptor of the presentation HTML file.
         *
         * @default
         * @type {any}
         */
        this.htmlFileDescriptor = null;

        /** The descriptor of the presentation JSON file.
         *
         * @default
         * @type {any}
         */
        this.jsonFileDescriptor = null;

        /** Do we need to update the presentation JSON file?
         *
         * This property is true when the {@linkcode module:Controller.presentationChange|presentationChange}
         * or the {@linkcode module:Controller.editorStateChange|editorStateChange} event is detected.
         *
         * @default
         * @type {boolean}
         */
        this.jsonNeedsSaving = false;

        /** Do we need to update the presentation HTML file?
         *
         * This property is true when the {@linkcode module:Controller.presentationChange|presentationChange} event is detected.
         *
         * @default
         * @type {boolean}
         */
        this.htmlNeedsSaving = false;

        // Adjust the template path depending on the target platform.
        // In the web browser, __dirname is set to "/src/js". The leading "/" will result
        // in an incorrect URL if the app is not hosted at the root of its domain.
        console.log(`__dirname=${__dirname}`);
        const templatePath = __dirname === "/build/browser/src/js" ? "/src/templates" : path.join(__dirname, "..", "templates");

        nunjucks.configure(templatePath, {
            watch: false,
            autoescape: false
        });

        controller.on("presentationChange", () => {
            this.jsonNeedsSaving = this.htmlNeedsSaving = true;
        });

        controller.on("editorStateChange",  () => {
            this.jsonNeedsSaving = true;
        });

        controller.on("blur", () => {
            if (this.backend && controller.getPreference("saveMode") === "onblur") {
                this.backend.doAutosave();
            }
        });
    }

    /** Finalize the initialization of the application.
     *
     * Show a load button for each supported {@link module:backend/AbstractBackend.AbstractBackend|backend} in the preview area.
     * Create an instance of each supported backend.
     */
    activate() {
        for (let backend of backendList) {
            const listItem = document.createElement("li");
            document.querySelector("#sozi-editor-view-preview ul").appendChild(listItem);

            const backendInstance = new backend(this.controller, listItem);
        }
    }

    /** Save the presentation.
     *
     * This method delegates the operation to the current {@link module:backend/AbstractBackend.AbstractBackend|backend} instance and triggers
     *
     * @returns {Promise} - A promise that will be resolved when the operation completes.
     *
     * @see {@linkcode module:backend/AbstractBackend.AbstractBackend#doAutosave}
     */
    save() {
        return this.backend.doAutosave();
    }

    /** Reload the SVG document.
     *
     * This method is called automatically or on user demand when the SVG
     * document has changed.
     * It saves the presentation and reloads it completely with the new
     * SVG content.
     */
    async reload() {
        await this.save();
        const data = await this.backend.load(this.svgFileDescriptor);
        await this.loadSVGData(data);
    }

    /** Assign an SVG file descriptor and backend.
     *
     * This method is called when opening a new SVG file.
     *
     * @param {any} fileDescriptor - A descriptor of the SVG file.
     * @param {module:backend/AbstractBackend.AbstractBackend} backend - The selected backend to manage the presentation files.
     */
    async setSVGFile(fileDescriptor, backend) {
        this.svgFileDescriptor = fileDescriptor;
        this.backend           = backend;
        const data = await this.backend.load(this.svgFileDescriptor);
        await this.loadSVGData(data);
    }

    /** Load the content of an SVG document.
     *
     * This method creates an {@link module:svg/SVGDocumentWrapper.SVGDocumentWrapper| SVG document wrapper}
     * with the given data and assigns it to the current presentation.
     * Then it loads the presentation data from a JSON file in the same folder.
     *
     * @param {string} data  - The content of an SVG file, as text.
     */
    async loadSVGData(data) {
        const _        = this.controller.gettext;
        const name     = this.backend.getName(this.svgFileDescriptor);
        const location = this.backend.getLocation(this.svgFileDescriptor);

        this.document = SVGDocumentWrapper.fromString(data);
        if (this.document.isValidSVG) {
            this.resolveRelativeURLs(location);
            this.presentation.setSVGDocument(this.document);
            await this.openJSONFile(replaceFileExtWith(name, ".sozi.json"), location);
        }
        else {
            this.controller.error(_("Document is not valid SVG."));
        }
    }

    /** Fix the href attribute of linked images when the target URL is relative.
     *
     * In linked images, the `href` attribute can be either an absolute URL
     * or a path relative to the location of the SVG file.
     * But in the presentation editor, URLs are relative to the location of
     * the `index.html` file of the application.
     * For this reason, we modify image URLs by prefixing all relative URLs
     * with the actual location of the SVG file.
     *
     * @param {string} location - The path or URL of the folder containing the current SVG file.
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

    /** Open presentation data from a JSON file.
     *
     * It the file does not exist, it is created and populated with the current
     * presentation data.
     *
     * @param {string} name - The name of the JSON file to open.
     * @param {any} location - The location of the file (backend-dependent).
     */
    async openJSONFile(name, location) {
        const _ = this.controller.gettext;

        let fileDescriptor;
        try {
            // Load presentation data and editor state from JSON file.
            fileDescriptor = await this.backend.find(name, location);
            const data = await this.backend.load(fileDescriptor);
            this.loadJSONData(data);
        }
        catch (err) {
            // If no JSON file is available, attempt to extract
            // presentation data from the SVG document, assuming
            // it has been generated from Sozi 13 or earlier.
            // Then save the extracted data to a JSON file.
            upgradeFromSVG(this.presentation, this.controller);

            // If the document contains frames, it means it was imported from Sozi 13.
            if (this.presentation.frames.length) {
                this.controller.info(_("Document was imported from Sozi 13 or earlier."));
            }

            // Create a JSON file for the presentation data.
            fileDescriptor = await this.backend.create(name, location, "application/json", this.getJSONData());
        }

        if (!this.jsonFileDescriptor) {
            this.jsonFileDescriptor = fileDescriptor;
            this.backend.autosave(fileDescriptor, () => this.jsonNeedsSaving, () => this.getJSONData());
        }

        this.controller.onLoad();

        const svgName           = this.backend.getName(this.svgFileDescriptor);
        const htmlFileName      = replaceFileExtWith(svgName, ".sozi.html");
        const presenterFileName = replaceFileExtWith(svgName, "-presenter.sozi.html");
        const narratedFileName  = replaceFileExtWith(svgName, ".narrated.sozi.html");
        // TODO Save only if SVG is more recent than HTML.
        this.createHTMLFile(htmlFileName, location);
        this.createPresenterHTMLFile(presenterFileName, location, htmlFileName);
        this.createNarratedHTMLFile(narratedFileName, location, htmlFileName);
    }

    /** Create the presentation HTML file if it does not exist.
     *
     * @param {string} name - The name of the HTML file to create.
     * @param {any} location - The location of the file (backend-dependent).
     */
    async createHTMLFile(name, location) {
        let fileDescriptor;
        try {
            fileDescriptor = await this.backend.find(name, location);
            if (this.controller.preferences.saveMode !== "manual") {
                this.backend.save(fileDescriptor, this.exportHTML());
            }
        }
        catch (err) {
            fileDescriptor = await this.backend.create(name, location, "text/html", this.exportHTML());
        }

        if (!this.htmlFileDescriptor) {
            this.htmlFileDescriptor = fileDescriptor;
            this.backend.autosave(fileDescriptor, () => this.htmlNeedsSaving, () => this.exportHTML());
        }
    }

    /** Create the presenter console HTML file if it does not exist.
     *
     * @param {string} name - The name of the HTML file to create.
     * @param {any} location - The location of the file (backend-dependent).
     * @param {string} htmlFileName - The name of the presentation HTML file.
     */
    async createPresenterHTMLFile(name, location, htmlFileName) {
        try {
            const fileDescriptor = await this.backend.find(name, location);
            await this.backend.save(fileDescriptor, this.exportPresenterHTML(htmlFileName));
        }
        catch (err) {
            await this.backend.create(name, location, "text/html", this.exportPresenterHTML(htmlFileName));
        }
    }

    /** Create the narrated HTML file if it does not exist.
     *
     * @param {string} name - The name of the HTML file to create.
     * @param {any} location - The location of the file (backend-dependent).
     * @param {string} htmlFileName - The name of the presentation HTML file.
     */
    async createNarratedHTMLFile(name, location, htmlFileName) {
        try {
            const fileDescriptor = await this.backend.find(name, location);
            await this.backend.save(fileDescriptor, this.exportNarratedHTML(htmlFileName));
        }
        catch (err) {
            await this.backend.create(name, location, "text/html", this.exportNarratedHTML(htmlFileName));
        }
    }

    /**  Load the presentation data and set the initial state of the editor.
     *
     * @param {object} data - An object containing presentation data and the editor state, as loaded from a JSON file.
     */
    loadJSONData(data) {
        const storable = JSON.parse(data);
        upgradeFromStorable(storable);
        this.presentation.fromStorable(storable);
        this.controller.fromStorable(storable);
        this.selection.fromStorable(storable);
    }

    /** Finalize a save operation.
     *
     * This method is called by the current backend when a save operation has
     * completed.
     *
     * @param {any} fileDescriptor - A descriptor of the file that was saved.
     *
     * @fires module:Controller.repaint
     */
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

    /** Extract the data to save from the current presentation and the current editor state.
     *
     * @returns {string} - A JSON representation of the presentation data and editor state.
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

    /** Generate the content of the presentation HTML file.
     *
     * The result is derived from the `player.html` template.
     * It contains a copy of the following items:
     * - the SVG document,
     * - the presentation data needed by the player,
     * - a copy of the custom style sheets and scripts.
     *
     * @returns {string} - An HTML document content, as text.
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

    /** Generate the content of the presenter console HTML file.
     *
     * The result is derived from the `presenter.html` template.
     *
     * @param {string} htmlFileName - The name of the presentation HTML file to play.
     * @returns {string} - An HTML document content, as text.
     */
    exportPresenterHTML(htmlFileName) {
        return nunjucks.render("presenter.html", {
            pres: this.presentation,
            soziHtml: htmlFileName
        });
    }

    /** Generate the content of the narrated HTML file.
     *
     * The result is derived from the `narrated.html` template.
     *
     * @param {string} htmlFileName - The name of the presentation HTML file to play.
     * @returns {string} - An HTML document content, as text.
     */
    exportNarratedHTML(htmlFileName) {
        return nunjucks.render("narrated.html", {
            pres: this.presentation,
            soziHtml: htmlFileName
        });
    }

    /** Get the path of a file relative to the location of the current SVG file.
     *
     * @param {string} filePath - The path of a file.
     * @returns {string} - The path of the same file, relative to the location of the current SVG file.
     */
    toRelativePath(filePath) {
        const svgLoc = this.backend.getLocation(this.svgFileDescriptor);
        return path.relative(svgLoc, filePath);
    }

    /** Read custom files to include in the presentation HTML.
     *
     * @param {string} ext - The extension of the files to read.
     * @returns {string} - The concatenated content of all the files read.
     */
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
