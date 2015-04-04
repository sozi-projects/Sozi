/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import h from "virtual-dom/h";
import {VirtualDOMView} from "./VirtualDOMView";

export var Properties = Object.create(VirtualDOMView);

Properties.init = function (container, selection, controller, i18n) {
    VirtualDOMView.init.call(this, container, controller);

    this.selection = selection;
    this.gettext = i18n.gettext.bind(i18n);

    return this;
};

Properties.render = function () {
    var _ = this.gettext;
    
    var c = this.controller;
    return h("form", [
        h("h1", _("Frame")),

        h("table", [
            this.renderTextField(_("Title"), "title", this.getFrameProperty, c.setFrameProperty, true),
            this.renderTextField(_("Id"), "frameId", this.getFrameProperty, c.setFrameProperty, false),
            this.renderCheckboxField(_("Show in frame list"), "showInFrameList", this.getFrameProperty, c.setFrameProperty),
            this.renderCheckboxField(_("Show frame number"), "showFrameNumber", this.getFrameProperty, c.setFrameProperty),
            this.renderNumberField(_("Timeout (sec)"), "timeoutMs", this.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),
            this.renderCheckboxField(_("Timeout enable"), "timeoutEnable", this.getFrameProperty, c.setFrameProperty),
            this.renderCheckboxField(_("Link to previous frame"), "link", this.getLayerProperty, c.setLayerProperty),
            this.renderCheckboxField(_("Clip"), "clipped", this.getCameraProperty, c.setCameraProperty),
            this.renderTextField(_("Reference element Id"), "referenceElementId", this.getLayerProperty, c.setLayerProperty, true),
            h("tr", [
                h("th"),
                h("td", h("input", {
                    type: "button",
                    value: _("Fit to element"),
                    onclick: c.fitElement.bind(c)
                }))
            ]),
            this.renderCheckboxField(_("Autoselect element"), "referenceElementAuto", this.getLayerProperty, c.setLayerProperty),
            this.renderCheckboxField(_("Hide element"), "referenceElementHide", this.getLayerProperty, c.setLayerProperty)
        ]),

        h("h1", _("Transition")),

        h("table", [
            this.renderNumberField(_("Duration (sec)"), "transitionDurationMs", this.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),
            this.renderSelectField(_("Timing function"), "transitionTimingFunction", this.getLayerProperty, c.setLayerProperty, {
                "linear": "Linear",
                "ease": "Ease",
                "easeIn": "Ease in",
                "easeOut": "Ease out",
                "easeInOut": "Ease in-out",
                "stepStart": "Step start",
                "stepEnd": "Step end",
                "stepMiddle": "Step middle"
            }),
            this.renderNumberField(_("Relative zoom (%)"), "transitionRelativeZoom", this.getLayerProperty, c.setLayerProperty, true, 1, 0.01),
            this.renderTextField(_("Path Id"), "transitionPathId", this.getLayerProperty, c.setLayerProperty, true),
            this.renderCheckboxField(_("Hide path"), "transitionPathHide", this.getLayerProperty, c.setLayerProperty)
        ])
    ]);
};

Properties.renderTextField = function (label, property, getter, setter, acceptsEmpty) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length != 1 ? "" : values[0];

    return h("tr", [
        h("th", label),
        h("td", h("input", {
            type: "text",
            value,
            className,
            onchange() {
                var value = this.value;
                if (acceptsEmpty || value.length) {
                    setter.call(c, property, value);
                }
            }
        }))
    ]);
};

Properties.renderCheckboxField = function (label, property, getter, setter) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length != 1 ? undefined : values[0];

    return h("tr", [
        h("th", label),
        h("td", h("input", {
            type: "checkbox",
            className,
            checked: value ? "checked" : undefined,
            onchange() {
                setter.call(c, property, this.checked);
            }
        }))
    ]);
};

Properties.renderNumberField = function (label, property, getter, setter, signed, step, factor) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length != 1 ? 0 : values[0] / factor;

    return h("tr", [
        h("th", label),
        h("td", h("input", {
            type: "number",
            value,
            className,
            min: signed ? undefined : 0,
            step,
            pattern: "[+-]?\\d+(\\.\\d+)?",
            onchange() {
                var value = parseFloat(this.value);
                if (!isNaN(value) && (signed || value >= 0)) {
                    setter.call(c, property, value * factor);
                }
            }
        }))
    ]);
};

Properties.renderSelectField = function (label, property, getter, setter, options) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length != 1 ? options[0] : values[0];

    return h("tr", [
        h("th", label),
        h("td",
            h("select", {
                className,
                onchange() {
                    setter.call(c, property, this.value);
                }
            }, Object.keys(options).map(optionValue => h("option", {
                    value: optionValue,
                    selected: value === optionValue
                }, options[optionValue])
            ))
        )
    ]);
};

Properties.getFrameProperty = function (property) {
    var values = [];

    this.selection.selectedFrames.forEach(frame => {
        var current = frame[property];
        if (values.indexOf(current) < 0) {
            values.push(current);
        }
    });

    return values;
};

Properties.getLayerProperty = function (property) {
    var values = [];

    this.selection.selectedFrames.forEach(frame => {
        this.selection.selectedLayers.forEach(layer => {
            var current = frame.layerProperties[layer.index][property];
            if (values.indexOf(current) < 0) {
                values.push(current);
            }
        });
    });

    return values;
};

Properties.getCameraProperty = function (property) {
    var values = [];

    this.selection.selectedFrames.forEach(frame => {
        this.selection.selectedLayers.forEach(layer => {
            var current = frame.cameraStates[layer.index][property];
            if (values.indexOf(current) < 0) {
                values.push(current);
            }
        });
    });

    return values;
};
