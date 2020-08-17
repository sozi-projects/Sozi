/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {render} from "inferno";
import {h} from "inferno-hyperscript";

/** Base class for editor views using the virtual DOM.
 */
export class VirtualDOMView {

    /** Create a new virtual DOM view.
     *
     * @param {HTMLElement} container - The parent HTML element that will contain this view.
     * @param {module:Controller.Controller} controller - The controller that will manage the user actions from this view.
     */
    constructor(container, controller) {
        /** The parent HTML element that will contain this view.
         * @type {HTMLElement} */
        this.container = container;

        /** The controller that will manage the user actions from this view.
         * @type {module:Controller.Controller} */
        this.controller = controller;

        /** Form field values that need to be set after rendering.
         * @type {Object} */
        this.state = {};

        const repaintHandler = () => this.repaint();
        controller.addListener("repaint", repaintHandler);
        window.addEventListener("resize", repaintHandler);

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    /** Repaint this view.
     *
     * This will render the current view using the result of {@link VirtualDOMView#render}.
     */
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

    /** Render this view as a virtual DOM tree.
     *
     * @return A virtual DOM tree for this view.
     */
    render() {
        return h("div");
    }
}
