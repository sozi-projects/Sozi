/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {handlers} from "./SVGDocument";

// Constant: the Inkscape namespace
var INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

handlers.push({
    name: "Adobe Illustrator",

    canProcess(svgRoot) {
        return /^http:\/\/ns.adobe.com\/AdobeIllustrator/.test(svgRoot.getAttribute("xmlns:i"));
    },

    transform(svgRoot) {
        Array.prototype.slice.call(svgRoot.childNodes).forEach(svgNode => {
            if (svgNode.localName === "switch") {
                // Remove first foreignObject child node
                var foreignObject = svgNode.firstElementChild;
                if (foreignObject && foreignObject.localName === "foreignObject") {
                    svgNode.removeChild(foreignObject);
                }
                // Unwrap main group
                var mainGroup = svgNode.firstElementChild;
                if (!mainGroup || mainGroup.localName !== "g" || mainGroup.getAttribute("i:extraneous") !== "self") {
                    mainGroup = svgNode;
                }
                Array.prototype.slice.call(mainGroup.childNodes).forEach(childNode => {
                    svgRoot.insertBefore(childNode, svgNode);
                });
                // Remove switch element
                svgRoot.removeChild(svgNode);
            }
        });
        return this;
    },

    isLayer(svgElement) {
        return svgElement.getAttribute("i:layer") === "yes";
    },

    getLabel(svgElement) {
        return null;
    }
});
