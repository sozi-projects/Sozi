/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {handlers} from "./SVGDocument";

// Constant: the Inkscape namespace
var INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

handlers.push({
    name: "Inkscape",

    canProcess(svgRoot) {
        return svgRoot.getAttribute("xmlns:inkscape") === INKSCAPE_NS;
    },

    transform(svgRoot) {
        return this;
    },

    isLayer(svgElement) {
        return svgElement.getAttribute("inkscape:groupmode") === "layer";
    },

    getLabel(svgElement) {
        return svgElement.getAttribute("inkscape:label");
    }
});
