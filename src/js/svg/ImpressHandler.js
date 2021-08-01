/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {addSVGHandler, DefaultSVGHandler} from "./SVGDocumentWrapper";

const SOFFICE_NS = "http://sun.com/xmlns/staroffice/presentation";
const OOO_NS     = "http://xml.openoffice.org/svg/export";

/** LibreOffice Impress SVG handler.
 *
 * @extends module:svg/DefaultSVGHandler.DefaultSVGHandler
 */
export class ImpressHandler extends DefaultSVGHandler {

    /** @inheritdoc */
    static matches(svgRoot) {
        return svgRoot.getAttribute("xmlns:presentation") === SOFFICE_NS &&
               svgRoot.getAttribute("xmlns:ooo") === OOO_NS
    }

    /** @inheritdoc */
    static transform(svgRoot) {
        const ds = svgRoot.querySelector("g.DummySlide");
        ds.parentNode.removeChild(ds);
        
        const sg = svgRoot.querySelector("g.SlideGroup");
        const g = sg.querySelector("g.Slide");
        sg.parentNode.replaceChild(g, sg);
    }
}

addSVGHandler("Impress", ImpressHandler);
