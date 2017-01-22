/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "../utils";
import {registerHandler, DefaultHandler} from "./SVGDocumentWrapper";

const AiHandler = Object.create(DefaultHandler);

AiHandler.matches = function (svgRoot) {
    return /^http:\/\/ns.adobe.com\/AdobeIllustrator/.test(svgRoot.getAttribute("xmlns:i"));
};

AiHandler.transform = function (svgRoot) {
    toArray(svgRoot.childNodes).forEach(svgNode => {
        if (svgNode.localName === "switch") {
            // Remove first foreignObject child node
            const foreignObject = svgNode.firstElementChild;
            if (foreignObject && foreignObject.localName === "foreignObject") {
                svgNode.removeChild(foreignObject);
            }
            // Unwrap main group
            let mainGroup = svgNode.firstElementChild;
            if (!mainGroup || mainGroup.localName !== "g" || mainGroup.getAttribute("i:extraneous") !== "self") {
                mainGroup = svgNode;
            }
            toArray(mainGroup.childNodes).forEach(childNode => {
                svgRoot.insertBefore(childNode, svgNode);
            });
            // Remove switch element
            svgRoot.removeChild(svgNode);
        }
    });
    return this;
};

AiHandler.isLayer = function (svgElement) {
    return svgElement.getAttribute("i:layer") === "yes";
};

registerHandler("Adobe Illustrator", AiHandler);
