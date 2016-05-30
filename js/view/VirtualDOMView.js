/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import h from "virtual-dom/h";
import createElement from "virtual-dom/create-element";
import diff from "virtual-dom/diff";
import patch from "virtual-dom/patch";
import $ from "jquery";

export var VirtualDOMView = {

    init(container, controller) {
        this.container = container;
        this.controller = controller;

        this.vtree = h("div");
        this.rootNode = createElement(this.vtree, {document});
        container.appendChild(this.rootNode);

        controller.addListener("repaint", this.repaint.bind(this));
        $(window).resize(this.repaint.bind(this));

        return this;
    },

    repaint() {
        var vtree = this.render();
        this.rootNode = patch(this.rootNode, diff(this.vtree, vtree));
        this.vtree = vtree;
    },

    render() {
        return h("div");
    }
};
