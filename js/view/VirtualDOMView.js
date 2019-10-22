/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {render} from "inferno";
import {h} from "inferno-hyperscript";

export class VirtualDOMView {

    constructor(container, controller) {
        this.container = container;
        this.controller = controller;
        this.state = {};

        const repaintHandler = () => this.repaint();
        controller.addListener("repaint", repaintHandler);
        window.addEventListener("resize", repaintHandler);

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    repaint() {
        render(this.render(), this.container, () => {
            for (let prop in this.state) {
                const elt = document.getElementById("field-" + prop);
                if (elt) {
                    for (let attr in this.state[prop]) {
                        elt[attr] = this.state[prop][attr];
                    }
                }
            }
        });
    }

    render() {
        return h("div");
    }
}
