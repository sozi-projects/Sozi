/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {render} from "inferno";
import {h} from "inferno-hyperscript";
import {EventEmitter} from "events";

/** Type for Virtual DOM nodes.
 *
 * @external VNode
 */

/** Base class for editor views using the virtual DOM.
 *
 * @extends EventEmitter
 */
export class VirtualDOMView extends EventEmitter {

    /** Initialize a new virtual DOM view.
     *
     * @param {HTMLElement} container - The HTML element that will contain this preview area.
     * @param {module:Controller.Controller} controller - The controller that manages the current editor.
     */
    constructor(container, controller) {
        super();

        /** The HTML element that will contain this preview area.
         *
         * @type {HTMLElement} */
        this.container = container;

        /** The controller that manages the current editor.
         *
         * @type {module:Controller.Controller} */
        this.controller = controller;

        /** Form field values that need to be set after rendering.
         *
         * @type {object} */
        this.state = {};

        const repaintHandler = () => this.repaint();
        controller.on("repaint", repaintHandler);
        window.addEventListener("resize", repaintHandler);

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    /** Repaint this view.
     *
     * This will render the current view using the result of {@linkcode module:view/VirtualDOMView.VirtualDOMView#render|render}.
     *
     * @listens resize
     * @listens module:Controller.repaint
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
     * @returns {VNode} - A virtual DOM tree for this view.
     */
    render() {
        return h("div");
    }
}
