/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/** The SVG namespace URI.
 *
 * @readonly
 * @default
 * @type {string}
 */
const SVG_NS = "http://www.w3.org/2000/svg";

/** The names of the SVG elements recognized as "drawable".
 *
 * When isolated elements of these types are found, they are
 * automatically added to specific layers.
 *
 * @readonly
 * @type {string[]}
 */
const DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
    "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

/** A dictionary of SVG handlers.
 *
 * @default
 * @type {object}
 */
const handlers = {};

/** Add an SVG handler to the dictionary of supported handlers.
 *
 * @param {string} name - The name of the handler to add.
 * @param {module:svg/SVGDocumentWrapper.DefaultSVGHandler} handler - The handler to add.
 */
export function addSVGHandler(name, handler) {
    handlers[name] = handler;
}

/** Base class for SVG handlers.
 *
 * An SVG handler provides support for SVG documents created by a given
 * authoring application.
 */
export class DefaultSVGHandler {
    /** Check that an SVG document has been created with a given application.
     *
     * @param {SVGSVGElement} svgRoot - The root SVG element to check.
     * @returns {boolean} - `true` if the given SVG root has been created by the application handled by this class.
     */
    static matches(svgRoot) {
        return true;
    }

    /** Preprocess an SVG document.
     *
     * This method will transform an SVG document to make it suitable for
     * the Sozi editor.
     *
     * Typical transformations consist in removing unsupported XML elements,
     * or fixing properties that could conflict with Sozi.
     *
     * @param {SVGSVGElement} svgRoot - The root SVG element to check.
     */
    static transform(svgRoot) {
    }

    /** Check whether an SVG group represents a layer.
     *
     * The concept of layer is not specified in the SVG standard.
     * This method will check the given element against the implementation
     * of layers according to a given application.
     *
     * @param {SVGGElement} svgElement - A group to check.
     * @returns {boolean} - `true` if the given element represents a layer.
     */
    static isLayer(svgElement) {
        return true;
    }

    /** Get the label of a layer represented by the given SVG group.
     *
     * If a group has been identified as a layer, this method will
     * return the name/title/label of this layer if it exists.
     *
     * @param {SVGGElement} svgElement - A group to check.
     * @returns {?string} - The label of the layer.
     */
    static getLabel(svgElement) {
        return null;
    }
}

/** SVG document wrapper. */
export class SVGDocumentWrapper {

    /** Initialize a new wrapper for a given SVG root element.
     *
     * @param {SVGSVGElement} svgRoot - An SVG root element.
     */
    constructor(svgRoot) {
        /** A serialized representation of the current SVG document.
         *
         * @type {string}
         */
        this.asText = "";

        /** The SVG handler class for the current SVG document.
         *
         * @type {Function}
         */
        this.handler = DefaultSVGHandler;

        /** The current SVG root element.
         *
         * @type {SVGSVGElement}
         */
        this.root = svgRoot;

        // Prevent event propagation on hyperlinks
        for (let link of this.root.getElementsByTagName("a")) {
            link.addEventListener("mousedown", evt => evt.stopPropagation(), false);
        }
    }

    /** Does the current root element belong to a valid SVG document?
     *
     * @readonly
     * @type {boolean}
     */
    get isValidSVG() {
        return this.root instanceof SVGSVGElement;
    }

    /** Check whether an SVG element represents a layer.
     *
     * The given node is a valid layer if it has the following characteristics:
     * - it is an SVG group element,
     * - it has an ID that has not been met before,
     * - it is recognized as a layer by the current SVG handler.
     *
     * @param {Node} svgNode - An XML node to check.
     * @returns {boolean} - `true` if the given node represents a layer.
     */
    isLayer(svgNode) {
        return svgNode instanceof SVGGElement &&
            svgNode.hasAttribute("id") &&
            this.handler.isLayer(svgNode);
    }

    /** Parse the given string into a new SVG document wrapper.
     *
     * This method will also apply several preprocessing operations,
     * some generic and some specific to a SVG handler.
     *
     * @param {string} data - A string containing a serialized SVG document.
     * @returns {module:svg/SVGDocumentWrapper.SVGDocumentWrapper} - A new SVG document wrapper.
     *
     * @see {@linkcode module:svg/SVGDocumentWrapper.DefaultSVGHandler.transform}
     */
    static fromString(data) {
        const svgRoot = new DOMParser().parseFromString(data, "image/svg+xml").documentElement;
        const doc = new SVGDocumentWrapper(svgRoot);

        for (let name in handlers) {
            if (handlers[name].matches(svgRoot)) {
                console.log(`Using handler: ${name}`);
                doc.handler = handlers[name];
                break;
            }
        }

        // Check that the root is an SVG element
        if (doc.isValidSVG) {
            // Apply handler-specific transformations
            doc.handler.transform(svgRoot);

            // Remove attributes that prevent correct rendering
            doc.removeViewbox();

            // Remove any existing script inside the SVG DOM tree
            doc.removeScripts();

            // Disable hyperlinks
            doc.disableHyperlinks();

            // Fix <switch> elements from Adobe Illustrator.
            // We do not import AiHandler in this module to avoid a circular dependency.
            const AiHandler = handlers["Adobe Illustrator"];
            if (doc.handler !== AiHandler) {
                AiHandler.transform(svgRoot);
            }

            // Wrap isolated elements into groups
            let svgWrapper = document.createElementNS(SVG_NS, "g");

            // Get all child nodes of the SVG root.
            // Make a copy of svgRoot.childNodes before modifying the document.
            for (let svgNode of Array.from(svgRoot.childNodes)) {
                // Remove text nodes and comments
                if (svgNode.tagName === undefined) {
                    svgRoot.removeChild(svgNode);
                }
                // Reorganize drawable SVG elements into top-level groups
                else if (DRAWABLE_TAGS.indexOf(svgNode.localName) >= 0) {
                    // If the current node is not a layer,
                    // add it to the current wrapper.
                    if (!doc.isLayer(svgNode)) {
                        svgWrapper.appendChild(svgNode);
                    }
                    // If the current node is a layer and the current
                    // wrapper contains elements, insert the wrapper
                    // into the document and create a new empty wrapper.
                    else if (svgWrapper.firstChild) {
                        svgRoot.insertBefore(svgWrapper, svgNode);
                        svgWrapper = document.createElementNS(SVG_NS, "g");
                    }
                }
            }

            // If the current wrapper layer contains elements,
            // add it to the document.
            if (svgWrapper.firstChild) {
                svgRoot.appendChild(svgWrapper);
            }
        }

        doc.asText = new XMLSerializer().serializeToString(svgRoot);

        return doc;
    }

    /** Remove the `viewBox` attribute from the SVG root element.
     *
     * This attribute conflicts with the Sozi viewport.
     * This method also sets the dimensions of the SVG root to 100%.
     */
    removeViewbox() {
        this.root.removeAttribute("viewBox");
        this.root.style.width = this.root.style.height = "100%";
    }

    /** Remove the scripts embedded in the SVG.
     *
     * The presentation editor operates on static SVG documents.
     * Third-party scripts are removed because they could interfere with the editor.
     *
     * Custom scripts can be added into the generated HTML via the
     * presentation editor.
     */
    removeScripts() {
        // Make a copy of root.childNodes before modifying the document.
        const scripts = Array.from(this.root.getElementsByTagName("script"));
        for (let script of scripts) {
            script.parentNode.removeChild(script);
        }
    }

    /** Disable the hyperlinks inside the document.
     *
     * Hyperlinks are disabled in the editor only.
     * This operation does not affect the saved presentation.
     *
     * @param {boolean} [styled=false] - If `true`, disable the hand-shaped mouse cursor over links.
     */
    disableHyperlinks(styled=false) {
        for (let link of this.root.getElementsByTagName("a")) {
            link.addEventListener("click", evt => evt.preventDefault(), false);
            if (styled) {
                link.style.cursor = "default";
            }
        }
    }
}
