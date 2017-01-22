/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import h from "virtual-dom/h";
import createElement from "virtual-dom/create-element";
import diff from "virtual-dom/diff";
import patch from "virtual-dom/patch";

export let VirtualDOMView = {

    init(container, controller) {
        this.container = container;
        this.controller = controller;

        this.vtree = h("div");
        this.rootNode = createElement(this.vtree, {document});
        container.appendChild(this.rootNode);

        const repaintHandler = this.repaint.bind(this);
        controller.addListener("repaint", repaintHandler);
        window.addEventListener("resize", repaintHandler);

        return this;
    },

    repaint() {
        let vtree = this.render();
        this.rootNode = patch(this.rootNode, diff(this.vtree, vtree));
        this.vtree = vtree;
    },

    render() {
        return h("div");
    }
};
