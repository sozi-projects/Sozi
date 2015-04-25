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

    var timeoutMsDisabled = this.getFrameProperty("timeoutEnable").every(value => !value);
    var referenceElementIdDisabled = this.getLayerProperty("referenceElementAuto").every(value => value);

    return h("div.properties", [
        h("h1", _("Frame")),

        h("div", [
            h("span.btn-group", [
                this.renderToggleField(h("i.fa.fa-list"), _("Show in frame list"), "showInFrameList", this.getFrameProperty, c.setFrameProperty),
                this.renderToggleField("#", _("Show frame number"), "showFrameNumber", this.getFrameProperty, c.setFrameProperty)
            ]),
            h("span.btn-group", [
                this.renderToggleField(h("i.fa.fa-link"), _("Link to previous frame"), "link", this.getLayerProperty, c.setLayerProperty),
                this.renderToggleField(h("i.fa.fa-crop"), _("Clip"), "clipped", this.getCameraProperty, c.setCameraProperty)
            ])
        ]),
        
        h("label", {for: "field-title"}, _("Title")),
        this.renderTextField("title", false, this.getFrameProperty, c.setFrameProperty, true),

        h("label", {for: "field-frameId"}, _("Id")),
        this.renderTextField("frameId", false, this.getFrameProperty, c.setFrameProperty, false),

        h("label", {for: "field-timeoutMs"}, [
            _("Timeout (seconds)"),
            this.renderToggleField(h("i.fa.fa-check"), _("Timeout enable"), "timeoutEnable", this.getFrameProperty, c.setFrameProperty)
        ]),
        this.renderNumberField("timeoutMs", timeoutMsDisabled, this.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),

        h("label", {for: "field-referenceElementId"}, [
            _("Reference element Id"),
            h("span.btn-group", [
                // TODO: onclick, update reference element immediately
                this.renderToggleField(h("i.fa.fa-magic"), _("Autoselect element"), "referenceElementAuto", this.getLayerProperty, c.setLayerProperty),
                this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide element"), "referenceElementHide", this.getLayerProperty, c.setLayerProperty),
                h("button", {
                    title: _("Fit to element"),
                    onclick() { c.fitElement(); }
                }, h("i.fa.fa-arrows-alt"))
            ])
        ]),
        this.renderTextField("referenceElementId", referenceElementIdDisabled, this.getLayerProperty, c.setLayerProperty, true),

        h("label", {for: "field-opacity"}, _("Layer opacity")),
        this.renderRangeField("opacity", this.getCameraProperty, c.setCameraProperty, 0, 1, 0.1),

        h("h1", _("Transition")),

        h("label", {for: "field-transitionDurationMs"}, _("Duration (seconds)")),
        this.renderNumberField("transitionDurationMs", false, this.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),

        h("label", {for: "field-transitionTimingFunction"}, _("Timing function")),
        this.renderSelectField("transitionTimingFunction", this.getLayerProperty, c.setLayerProperty, {
            "linear": "Linear",
            "ease": "Ease",
            "easeIn": "Ease in",
            "easeOut": "Ease out",
            "easeInOut": "Ease in-out",
            "stepStart": "Step start",
            "stepEnd": "Step end",
            "stepMiddle": "Step middle"
        }),

        h("label", {for: "field-transitionRelativeZoom"}, _("Relative zoom (%)")),
        this.renderNumberField("transitionRelativeZoom", false, this.getLayerProperty, c.setLayerProperty, true, 1, 0.01),

        h("label", {for: "field-transitionPathId"}, [
            _("Path Id"),
            this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide path"), "transitionPathHide", this.getLayerProperty, c.setLayerProperty)
        ]),
        this.renderTextField("transitionPathId", false, this.getLayerProperty, c.setLayerProperty, true)
    ]);
};

Properties.renderTextField = function (property, disabled, getter, setter, acceptsEmpty) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length >= 1 ? values[0] : "";

    return h("input", {
        id: "field-" + property,
        type: "text",
        value,
        className,
        disabled,
        onchange() {
            var value = this.value;
            if (acceptsEmpty || value.length) {
                setter.call(c, property, value);
            }
        }
    });
};

Properties.renderNumberField = function (property, disabled, getter, setter, signed, step, factor) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length >= 1 ? values[0] / factor : 0; // TODO use default value

    return h("input", {
        id: "field-" + property,
        type: "number",
        value,
        className,
        disabled,
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

Properties.renderRangeField = function (property, getter, setter, min, max, step) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length >= 1 ? values[0] : (min + max) / 2; // TODO use default value

    return h("input", {
        id: "field-" + property,
        type: "range",
        title: value,
        min,
        max,
        step,
        value,
        className,
        onchange() {
            var value = parseFloat(this.value);
            if (!isNaN(value) && value >= min && value <= max) {
                setter.call(c, property, value);
            }
        }
    });
};

Properties.renderToggleField = function (label, title, property, getter, setter) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : "";
    var value = values.length >= 1 ? values[0] : false; // TODO use default value
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

Properties.renderSelectField = function (property, getter, setter, options) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var value = values.length >= 1 ? values[0] : options[0];

    return h("select", {
            id: "field-" + property,
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

// TODO: move these methods to Controller

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
