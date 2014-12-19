/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", function (exports) {
    "use strict";

    var h = require("virtual-dom/h");

    var Toolbar = Object.create(sozi.editor.view.VirtualDOMView);

    Toolbar.init = function (container, presentation, viewport, controller) {
        sozi.editor.view.VirtualDOMView.init.call(this, container, controller);

        this.presentation = presentation;
        this.viewport = viewport;

        return this;
    };

    Toolbar.render = function () {
        var c = this.controller;
        var v = this.viewport;
        return h("div", [
            h("span.group", [
                "Aspect ratio: ",
                h("input.aspect", {
                    type: "number",
                    pattern: "\\d+",
                    min: "1",
                    step: "1",
                    size: "3",
                    value: this.presentation.aspectWidth,
                    onchange: function () {
                        var width = parseInt(this.value);
                        if (!width.isNaN) {
                            c.setAspectWidth(width);
                        }
                    }
                }),
                ":",
                h("input.aspect", {
                    type: "number",
                    pattern: "\\d+",
                    min: "1",
                    step: "1",
                    size: "3",
                    value: this.presentation.aspectHeight,
                    onchange: function () {
                        var height = parseInt(this.value);
                        if (!height.isNaN) {
                            c.setAspectHeight(height);
                        }
                    }
                })
            ]),
            h("span.group", [
                h("input", {
                    name: "sozi-editor-preview-mode",
                    type: "radio",
                    title: "Move the camera (hold Alt to zoom, Shift to rotate)",
                    checked: v.dragMode === "translate",
                    onclick: function () { v.dragMode = "translate"; }
                }),
                h("i.fa.fa-arrows"),
                h("input", {
                    name: "sozi-editor-preview-mode",
                    type: "radio",
                    title: "Zoom in/out (you can also hold the Alt key in Move mode)",
                    checked: v.dragMode === "scale",
                    onclick: function () { v.dragMode = "scale"; }
                }),
                h("i.fa.fa-expand"),
                h("input", {
                    name: "sozi-editor-preview-mode",
                    type: "radio",
                    title: "Rotate (you can also hold the Shift key in Move mode)",
                    checked: v.dragMode === "rotate",
                    onclick: function () { v.dragMode = "rotate"; }
                }),
                h("i.fa.fa-rotate-left"),
                h("input", {
                    name: "sozi-editor-preview-mode",
                    type: "radio",
                    title: "Clip",
                    checked: v.dragMode === "clip",
                    onclick: function () { v.dragMode = "clip"; }
                }),
                h("i.fa.fa-pencil-square")
            ]),
            h("span.group", [
                h("button", {
                    title: "Undo",
                    onclick: c.undo.bind(c)
                }, h("i.fa.fa-undo")),
                h("button", {
                    title: "Redo",
                    onclick: c.redo.bind(c)
                }, h("i.fa.fa-repeat"))
            ])
        ]);
    };

    exports.Toolbar = Toolbar;
});


