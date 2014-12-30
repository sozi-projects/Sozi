/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", exports => {
    "use strict";

    var h = require("virtual-dom/h");
    var createElement = require("virtual-dom/create-element");
    var diff = require("virtual-dom/diff");
    var patch = require("virtual-dom/patch");

    exports.VirtualDOMView = {

        init: function (container, controller) {
            this.container = container;
            this.controller = controller;

            this.vtree = h("div");
            this.rootNode = createElement(this.vtree, {document: document});
            container.appendChild(this.rootNode);

            controller.addListener("repaint", this.repaint.bind(this));

            return this;
        },

        repaint: function () {
            var vtree = this.render();
            this.rootNode = patch(this.rootNode, diff(this.vtree, vtree));
            this.vtree = vtree;
        },

        render: function () {
            return h("div");
        }
    };
});
