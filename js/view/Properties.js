/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import h from "virtual-dom/h";
import {VirtualDOMView} from "./VirtualDOMView";

export var Properties = Object.create(VirtualDOMView);

Properties.init = function (container, selection, controller, locale) {
    VirtualDOMView.init.call(this, container, controller);

    this.selection = selection;
    this.gettext = locale.gettext.bind(locale);

    return this;
};

Properties.render = function () {
    var _ = this.gettext;
    
    var c = this.controller;
    return h("div.properties", [
        h("h1", _("Frame")),

        h("table", [
            h("tr", [
                h("th", _("Title")),
                h("td", this.renderTextField("title", this.getFrameProperty, c.setFrameProperty, true))
            ]),
            h("tr", [
                h("th", _("Id")),
                h("td", this.renderTextField("frameId", this.getFrameProperty, c.setFrameProperty, false))
            ]),
            h("tr", [
                h("th"),
                h("td", h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-list"), _("Show in frame list"), "showInFrameList", this.getFrameProperty, c.setFrameProperty),
                    this.renderToggleField("#", _("Show frame number"), "showFrameNumber", this.getFrameProperty, c.setFrameProperty)
                ]))
            ]),
            h("tr", [
                h("th", _("Timeout (seconds)")),
                h("td", this.renderNumberField("timeoutMs", this.getFrameProperty, c.setFrameProperty, false, 0.1, 1000)),
                h("td", this.renderToggleField(h("i.fa.fa-check"), _("Timeout enable"), "timeoutEnable", this.getFrameProperty, c.setFrameProperty))
            ]),
            h("tr", [
                h("th", _("Reference element Id")),
                h("td", this.renderTextField("referenceElementId", this.getLayerProperty, c.setLayerProperty, true)),
                h("td", h("span.btn-group", [
                    // TODO: onclick, update reference element immediately
                    this.renderToggleField(h("i.fa.fa-magic"), _("Autoselect element"), "referenceElementAuto", this.getLayerProperty, c.setLayerProperty),
                    this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide element"), "referenceElementHide", this.getLayerProperty, c.setLayerProperty),
                    h("button", {
                        title: _("Fit to element"),
                        onclick() { c.fitElement(); }
                    }, h("i.fa.fa-arrows-alt"))
                ]))
            ]),
            h("tr", [
                h("th"),
                h("td", h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-link"), _("Link to previous frame"), "link", this.getLayerProperty, c.setLayerProperty),
                    this.renderToggleField(h("i.fa.fa-crop"), _("Clip"), "clipped", this.getCameraProperty, c.setCameraProperty)
                ]))
            ]),
        ]),

        h("h1", _("Transition")),

        h("table", [
            h("tr", [
                h("th", _("Duration (seconds)")),
                h("td", this.renderNumberField("transitionDurationMs", this.getFrameProperty, c.setFrameProperty, false, 0.1, 1000))
            ]),
            h("tr", [
                h("th", _("Timing function")),
                h("td",
                    this.renderSelectField("transitionTimingFunction", this.getLayerProperty, c.setLayerProperty, {
                        "linear": "Linear",
                        "ease": "Ease",
                        "easeIn": "Ease in",
                        "easeOut": "Ease out",
                        "easeInOut": "Ease in-out",
                        "stepStart": "Step start",
                        "stepEnd": "Step end",
                        "stepMiddle": "Step middle"
                    })
                )
            ]),
            h("tr", [
                h("th", _("Relative zoom (%)")),
                h("td", this.renderNumberField("transitionRelativeZoom", this.getLayerProperty, c.setLayerProperty, true, 1, 0.01))
            ]),
            h("tr", [
                h("th", _("Path Id")),
                h("td", this.renderTextField("transitionPathId", this.getLayerProperty, c.setLayerProperty, true)),
                h("td", this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide path"), "transitionPathHide", this.getLayerProperty, c.setLayerProperty))
            ]),
        ])
    ]);
};

Properties.renderTextField = function (property, getter, setter, acceptsEmpty) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length != 1 ? "" : values[0];

    return h("input", {
        type: "text",
        value,
        className,
        onchange() {
            var value = this.value;
            if (acceptsEmpty || value.length) {
                setter.call(c, property, value);
            }
        }
    });
};

Properties.renderToggleField = function (label, title, property, getter, setter) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : "";
    var value = values.length != 1 ? undefined : values[0];
    if (value) {
        className += " active";
    }

    return h("button", {
        className,
        title,
        onclick() {
            setter.call(c, property, !value);
        }
    }, label);
};

Properties.renderNumberField = function (property, getter, setter, signed, step, factor) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length != 1 ? 0 : values[0] / factor;

    return h("input", {
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
    });
};

Properties.renderSelectField = function (property, getter, setter, options) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length != 1 ? options[0] : values[0];

    return h("select", {
            className,
            onchange() {
                setter.call(c, property, this.value);
            }
        }, Object.keys(options).map(optionValue => h("option", {
                value: optionValue,
                selected: value === optionValue
            }, options[optionValue])
        )
    );
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
