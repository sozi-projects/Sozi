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

export function registerHandler(name, handler) {
    handlers[name] = handler;
}

export const DefaultHandler = {
    matches(svgRoot) {
        return true;
    },

    transform(svgRoot) {
        return this;
    },

    isLayer(svgElement) {
        return true;
    },

    getLabel(svgElement) {
        return null;
    }
};

export const SVGDocumentWrapper = {
    asText: "",
    root: undefined,
    handler: DefaultHandler,

    init(svgRoot) {
        this.root = svgRoot;

        // Prevent event propagation on hyperlinks
        const links = toArray(this.root.getElementsByTagName("a"));
        links.forEach(link => {
            link.addEventListener("mousedown", evt => evt.stopPropagation(), false);
        });

        return this;
    },

    get isValidSVG() {
        return this.root instanceof SVGSVGElement;
    },

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
    },

    initFromString(data) {
        this.root = new DOMParser().parseFromString(data, "image/svg+xml").documentElement;

        this.handler = DefaultHandler;
        for (let name in handlers) {
            if (handlers[name].matches(this.root)) {
                console.log(`Using handler: ${name}`);
                this.handler = handlers[name];
                break;
            }
        }

        // Check that the root is an SVG element
        if (this.isValidSVG) {
            // Apply handler-specific transformations
            this.handler.transform(this.root);

            // Remove attributes that prevent correct rendering
            this.removeViewbox();

            // Remove any existing script inside the SVG DOM tree
            this.removeScripts();

            // Disable hyperlinks
            this.disableHyperlinks();

            // Fix <switch> elements from Adobe Illustrator
            const aiHandler = handlers["Adobe Illustrator"];
            if (aiHandler && this.handler !== aiHandler) {
                aiHandler.transform(this.root);
            }

            // Wrap isolated elements into groups
            let svgWrapper = document.createElementNS(SVG_NS, "g");

            // Get all child nodes of the SVG root.
            // Make a copy of root.childNodes before modifying the document.
            toArray(this.root.childNodes).forEach(svgNode => {
                // Remove text nodes and comments
                if (svgNode.tagName === undefined) {
                    this.root.removeChild(svgNode);
                }
                // Reorganize drawable SVG elements into top-level groups
                else if (DRAWABLE_TAGS.indexOf(svgNode.localName) >= 0) {
                    // If the current node is not a layer,
                    // add it to the current wrapper.
                    if (!this.isLayer(svgNode)) {
                        svgWrapper.appendChild(svgNode);
                    }
                    // If the current node is a layer and the current
                    // wrapper contains elements, insert the wrapper
                    // into the document and create a new empty wrapper.
                    else if (svgWrapper.firstChild) {
                        this.root.insertBefore(svgWrapper, svgNode);
                        svgWrapper = document.createElementNS(SVG_NS, "g");
                    }
                }
            });

            // If the current wrapper layer contains elements,
            // add it to the document.
            if (svgWrapper.firstChild) {
                this.root.appendChild(svgWrapper);
            }
        }

        this.asText = new XMLSerializer().serializeToString(this.root);

        return this;
    },

    removeViewbox() {
        this.root.removeAttribute("viewBox");
        this.root.style.width = this.root.style.height = "100%";
    },

    removeScripts() {
        const scripts = toArray(this.root.getElementsByTagName("script"));
        scripts.forEach(script => {
            script.parentNode.removeChild(script);
        });
    },

    disableHyperlinks() {
        const links = toArray(this.root.getElementsByTagName("a"));
        links.forEach(link => {
            link.addEventListener("click", evt => evt.preventDefault(), false);
        });
    }
};
