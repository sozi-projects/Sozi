/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {addSVGHandler, DefaultSVGHandler} from "./SVGDocumentWrapper";

/** Adobe Illustrator SVG handler.
 *
 * @category svg
 * @extends DefaultSVGHandler
 * @todo Add documentation.
 */
export class AiHandler extends DefaultSVGHandler {

    static matches(svgRoot) {
        return /^http:\/\/ns.adobe.com\/AdobeIllustrator/.test(svgRoot.getAttribute("xmlns:i")) &&
               Array.from(svgRoot.childNodes).some(svgNode => svgNode instanceof SVGSwitchElement);
    }

    static transform(svgRoot) {
        for (let svgSwitch of Array.from(svgRoot.getElementsByTagName("switch"))) {
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
                // Make a copy of svgGroup.childNodes before modifying the document.
                for (let childNode of Array.from(svgGroup.childNodes)) {
                    svgSwitch.parentNode.insertBefore(childNode, svgSwitch);
                }

                // Remove switch element
                svgSwitch.parentNode.removeChild(svgSwitch);
            }
        }
    }

    static isLayer(svgElement) {
        return svgElement.getAttribute("i:layer") === "yes";
    }
}

addSVGHandler("Adobe Illustrator", AiHandler);
