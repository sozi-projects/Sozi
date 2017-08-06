/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import h from "virtual-dom/h";
import {VirtualDOMView} from "./VirtualDOMView";
import {Properties} from "./Properties";
import screenfull from "screenfull";
import pkg from "../../package.json";

export const Toolbar = Object.create(VirtualDOMView);

Toolbar.init = function (container, storage, presentation, viewport, controller, locale) {
    VirtualDOMView.init.call(this, container, controller);

    this.storage = storage;
    this.presentation = presentation;
    this.viewport = viewport;
    this.gettext = s => locale.gettext(s);

    return this;
};

Toolbar.render = function () {
    const _ = this.gettext;
    const c = this.controller;
    const v = this.viewport;
    const t = this;

    return h("div", [
        h("span.group", [
            _("Aspect ratio: "),
            h("input.aspect", {
                type: "number",
                pattern: "\\d+",
                min: "1",
                step: "1",
                size: "3",
                value: this.presentation.aspectWidth,
                onchange() {
                    const width = parseInt(this.value);
                    if (!width.isNaN) {
                        c.setAspectWidth(width);
                    }
                }
            }),
            " : ",
            h("input.aspect", {
                type: "number",
                pattern: "\\d+",
                min: "1",
                step: "1",
                size: "3",
                value: this.presentation.aspectHeight,
                onchange() {
                    const height = parseInt(this.value);
                    if (!height.isNaN) {
                        c.setAspectHeight(height);
                    }
                }
            })
        ]),
        h("span.group.btn-group", [
            h("button", {
                title: _("Move the selected layers (hold Alt to zoom, Shift to rotate)"),
                className: v.dragMode === "translate" ? "active" : "",
                onclick() { c.setDragMode("translate"); }
            }, h("i.fa.fa-arrows")),
            h("button", {
                title: _("Zoom in/out on the selected layers (you can also hold the Alt key in Move mode)"),
                className: v.dragMode === "scale" ? "active" : "",
                onclick() { c.setDragMode("scale"); }
            }, h("i.fa.fa-expand")),
            h("button", {
                title: _("Rotate the selected layers (you can also hold the Shift key in Move mode)"),
                className: v.dragMode === "rotate" ? "active" : "",
                onclick() { c.setDragMode("rotate"); }
            }, h("i.fa.fa-rotate-left")),
            h("button", {
                title: _("Clip"),
                className: v.dragMode === "clip" ? "active" : "",
                onclick() { c.setDragMode("clip"); }
            }, h("i.fa.fa-crop"))
        ]),
        h("span.group.btn-group", [
            h("button", {
                title: _("Undo (Ctrl-Z)"),
                disabled: c.undoStack.length ? undefined : "disabled",
                onclick() { c.undo(); }
            }, h("i.fa.fa-reply")), // "reply" icon preferred to the official "undo" icon
            h("button", {
                title: _("Redo (Ctrl-Y)"),
                disabled: c.redoStack.length ? undefined : "disabled",
                onclick() { c.redo(); }
            }, h("i.fa.fa-share")) // "share" icon preferred to the official "redo" icon
        ]),
        h("span.group",
            h("button", {
                title: screenfull.isFullscreen ? _("Disable full-screen mode (F11)") : _("Enable full-screen mode (F11)"),
                id: "btn-fullscreen",
                className: screenfull.isFullscreen ? "active" : undefined,
                disabled: !screenfull.enabled,
                onclick() { screenfull.toggle(document.documentElement); }
            }, h("i.fa.fa-desktop"))
        ),
        h("span.group.btn-group", [
            h("button", {
                title: _("Save the presentation (Ctrl-S)"),
                disabled: this.storage.htmlNeedsSaving ? undefined : "disabled",
                onclick() { c.save(); }
            }, h("i.fa.fa-download")), // "download" icon preferred to the official "save" icon
            h("button", {
                title: _("Reload the SVG document (F5)"),
                onclick() { c.reload(); }
            }, h("i.fa.fa-refresh"))
        ]),
        h("span.group.btn-group", [
            h("button", {
                title: _("Preferences"),
                className: Properties.preferencesMode ? "active" : undefined,
                onclick() { Properties.togglePreferencesMode(); t.repaint(); }
            }, h("i.fa.fa-sliders")),
            h("button", {
                title: _("Information"),
                onclick() { new Notification(_("Sozi (Information)"), {body: `Sozi ${pkg.version}`, silent: true}); }
            }, h("i.fa.fa-info"))
        ])
    ]);
};
