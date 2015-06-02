/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {registerHandler, DefaultHandler} from "./SVGDocument";

// Constant: the Inkscape namespace
var INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

var InkscapeHandler = Object.create(DefaultHandler);

InkscapeHandler.matches = function (svgRoot) {
    return svgRoot.getAttribute("xmlns:inkscape") === INKSCAPE_NS;
};

InkscapeHandler.isLayer = function (svgElement) {
    return svgElement.getAttribute("inkscape:groupmode") === "layer";
};

InkscapeHandler.getLabel = function (svgElement) {
    return svgElement.getAttribute("inkscape:label");
};

registerHandler("Inkscape", InkscapeHandler);
