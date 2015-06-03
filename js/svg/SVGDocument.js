/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "../utils";

// Constant: the SVG namespace
var SVG_NS = "http://www.w3.org/2000/svg";

// Constant: The SVG element names that can be found in layers
var DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
    "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

var handlers = {};

export function registerHandler(name, handler) {
    handlers[name] = handler;
}

export var DefaultHandler = {
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

export var SVGDocument = {
    asText: "",
    root: undefined,
    handler: DefaultHandler,

    init(svgRoot) {
        this.root = svgRoot;
        this.handler = DefaultHandler;
        for (var name in handlers) {
            if (handlers[name].matches(svgRoot)) {
                console.log(`Using handler: ${name}`);
                this.handler = handlers[name];
                break;
            }
        }
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

    import(data) {
        this.asText = "";
        this.root = undefined;

        // Create a DOM tree from the given textual data
        var div = document.createElement("div");
        div.innerHTML = data;

        // Remove everything before the first element
        while (div.firstChild !== div.firstElementChild) {
            div.removeChild(div.firstChild);
        }

        // Now, the first child of the div is the SVG root
        this.init(div.firstChild);

        // Check that the root is an SVG element
        if (this.isValidSVG) {
            // Apply handler-specific transformations
            this.handler.transform(this.root);

            // Remove attributes that prevent correct rendering
            this.root.removeAttribute("viewBox");
            this.root.style.width = this.root.style.height = "auto";

            // Remove any existing script inside the SVG DOM tree
            var scripts = toArray(this.root.getElementsByTagName("script"));
            scripts.forEach(script => {
                script.parentNode.removeChild(script);
            });

            // Prevent event propagation on hyperlinks
            var links = toArray(this.root.getElementsByTagName("a"));
            links.forEach(link => {
                link.addEventListener("mousedown", evt => evt.stopPropagation(), false);
            });

            // TODO Transform xlink:href attributes to replace relative URLs with absolute URLs

            // Wrap isolated elements into groups
            var svgWrapper = document.createElementNS(SVG_NS, "g");

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

            this.asText = div.innerHTML;

            return this;
        }
    }
};
