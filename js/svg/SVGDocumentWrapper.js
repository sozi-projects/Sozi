/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "../utils";

// Constant: the SVG namespace
const SVG_NS = "http://www.w3.org/2000/svg";

// Constant: The SVG element names that can be found in layers
const DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
    "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

const handlers = {};

export function addSVGHandler(name, handler) {
    handlers[name] = handler;
}

export class DefaultSVGHandler {
    static matches(svgRoot) {
        return true;
    }

    static transform(svgRoot) {
    }

    static isLayer(svgElement) {
        return true;
    }

    static getLabel(svgElement) {
        return null;
    }
}

export class SVGDocumentWrapper {
    constructor(svgRoot) {
        this.asText  = "";
        this.handler = DefaultSVGHandler;
        this.root    = svgRoot;

        // Prevent event propagation on hyperlinks
        const links = toArray(this.root.getElementsByTagName("a"));
        for (let link of links) {
            link.addEventListener("mousedown", evt => evt.stopPropagation(), false);
        }
    }

    get isValidSVG() {
        return this.root instanceof SVGSVGElement;
    }

    /*
     * The given node is a valid layer if it has the following characteristics:
     *    - it is an SVG group element
     *    - it has an id that has not been met before
     *    - it is recognized as a layer by the current SVG handler
     */
    isLayer(svgNode) {
        return svgNode instanceof SVGGElement &&
            svgNode.hasAttribute("id") &&
            this.handler.isLayer(svgNode);
    }

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
            // Make a copy of root.childNodes before modifying the document.
            toArray(svgRoot.childNodes).forEach(svgNode => {
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
            });

            // If the current wrapper layer contains elements,
            // add it to the document.
            if (svgWrapper.firstChild) {
                svgRoot.appendChild(svgWrapper);
            }
        }

        doc.asText = new XMLSerializer().serializeToString(svgRoot);

        return doc;
    }

    removeViewbox() {
        this.root.removeAttribute("viewBox");
        this.root.style.width = this.root.style.height = "100%";
    }

    removeScripts() {
        const scripts = toArray(this.root.getElementsByTagName("script"));
        for (let script of scripts) {
            script.parentNode.removeChild(script);
        }
    }

    disableHyperlinks() {
        const links = toArray(this.root.getElementsByTagName("a"));
        for (let link of links) {
            link.addEventListener("click", evt => evt.preventDefault(), false);
        }
    }
}
