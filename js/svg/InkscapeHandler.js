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

InkscapeHandler.transform = function (svgRoot) {
    var pageColor = "#ffffff";
    var pageOpacity = "0";

    // Get page color and opacity from Inkscape document properties
    var namedViews = svgRoot.getElementsByTagName("sodipodi:namedview");
    for (var i = 0; i < namedViews.length; i ++) {
        if (namedViews[i].hasAttribute("pagecolor")) {
            pageColor = namedViews[i].getAttribute("pagecolor");
            if (namedViews[i].hasAttribute("inkscape:pageopacity")) {
                pageOpacity = namedViews[i].getAttribute("inkscape:pageopacity");
            }
            break;
        }
    }

    // Extract RGB assuming page color is in 6-digit hex format
    var [, red, green, blue] = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(pageColor);

    var style = document.createElement("style");
    style.innerHTML = `svg {
        background: rgba(${parseInt(red, 16)}, ${parseInt(green, 16)}, ${parseInt(blue, 16)}, ${pageOpacity});
    }`;
    svgRoot.insertBefore(style, svgRoot.firstChild);
};

InkscapeHandler.isLayer = function (svgElement) {
    return svgElement.getAttribute("inkscape:groupmode") === "layer";
};

InkscapeHandler.getLabel = function (svgElement) {
    return svgElement.getAttribute("inkscape:label");
};

registerHandler("Inkscape", InkscapeHandler);
