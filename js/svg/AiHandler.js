/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "../utils";
import {registerHandler, DefaultHandler} from "./SVGDocumentWrapper";

export class AiHandler extends DefaultHandler {

    static matches(svgRoot) {
        return /^http:\/\/ns.adobe.com\/AdobeIllustrator/.test(svgRoot.getAttribute("xmlns:i")) &&
               toArray(svgRoot.childNodes).some(svgNode => svgNode instanceof SVGSwitchElement);
    }

    static transform(svgRoot) {
        toArray(svgRoot.getElementsByTagName("switch")).forEach(svgSwitch => {
            // Remove first foreignObject child node
            const svgForeignObject = svgSwitch.firstElementChild;
            if (svgForeignObject && svgForeignObject instanceof SVGForeignObjectElement &&
                svgForeignObject.hasAttribute("requiredExtensions") &&
                svgForeignObject.getAttribute("requiredExtensions").startsWith("http://ns.adobe.com/AdobeIllustrator")) {
                // Remove foreign objet element
                svgSwitch.removeChild(svgForeignObject);

                // Unwrap main group
                let svgGroup = svgSwitch.firstElementChild;
                if (!svgGroup || svgGroup instanceof SVGGElement || svgGroup.getAttribute("i:extraneous") !== "self") {
                    svgGroup = svgSwitch;
                }
                toArray(svgGroup.childNodes).forEach(childNode => {
                    svgSwitch.parentNode.insertBefore(childNode, svgSwitch);
                });

                // Remove switch element
                svgSwitch.parentNode.removeChild(svgSwitch);
            }
        });
    }

    static isLayer(svgElement) {
        return svgElement.getAttribute("i:layer") === "yes";
    }
}

registerHandler("Adobe Illustrator", AiHandler);
