/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import h from "virtual-dom/h";
import {VirtualDOMView} from "./VirtualDOMView";

export const Properties = Object.create(VirtualDOMView);

Properties.init = function (container, selection, controller, timeline, locale) {
    VirtualDOMView.init.call(this, container, controller);

    this.selection = selection;
    this.gettext = s => locale.gettext(s);
    this.timeline = timeline;

    return this;
};

Properties.render = function () {
    const _ = this.gettext;

    const c = this.controller;

    const timeoutMsDisabled = c.getFrameProperty("timeoutEnable").every(value => !value);
    const outlineElementIdDisabled = c.getLayerProperty("outlineElementAuto").every(value => value);

    const layersToCopy = {
        __select_a_layer__: _("Select a layer to copy")
    };
    if (this.timeline.hasDefaultLayer) {
        layersToCopy.__default__ = _("Default");
    }
    this.timeline.editableLayers.forEach(l => {
        layersToCopy[l.groupId] = l.label;
    });

    return h("div.properties", [
        h("h1", _("Frame")),

        h("div.btn-group", [
                this.renderToggleField(h("i.fa.fa-list"), _("Show in frame list"), "showInFrameList", c.getFrameProperty, c.setFrameProperty),
                this.renderToggleField("#", _("Show frame number"), "showFrameNumber", c.getFrameProperty, c.setFrameProperty)
        ]),

        h("label", {for: "field-title"}, _("Title")),
        this.renderTextField("title", false, c.getFrameProperty, c.setFrameProperty, true),

        h("label", {for: "field-frameId"}, _("Id")),
        this.renderTextField("frameId", false, c.getFrameProperty, c.setFrameProperty, false),

        h("label", {for: "field-timeoutMs"}, [
            _("Timeout (seconds)"),
            this.renderToggleField(h("i.fa.fa-check-square-o"), _("Timeout enable"), "timeoutEnable", c.getFrameProperty, c.setFrameProperty)
        ]),
        this.renderNumberField("timeoutMs", timeoutMsDisabled, c.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),

        h("h1", _("Layer")),

        h("div.btn-group", [
            this.renderToggleField(h("i.fa.fa-link"), _("Link to previous frame"), "link", c.getLayerProperty, c.setLayerProperty),
            this.renderToggleField(h("i.fa.fa-crop"), _("Clip"), "clipped", c.getCameraProperty, c.setCameraProperty),
            h("button", {
                title: _("Reset layer geometry"),
                onclick() { c.resetLayer(); }
            }, h("i.fa.fa-eraser"))
        ]),

        h("label", {for: "field-layerToCopy"}, _("Copy layer")),
        this.renderSelectField("layerToCopy", () => ["__select_a_layer__"], (prop, groupId) => {
            c.copyLayer(groupId);
            document.getElementById("field-layerToCopy").firstChild.selected = true;
        }, layersToCopy),

        h("label", {for: "field-outlineElementId"}, [
            _("Outline element Id"),
            h("span.btn-group", [
                // TODO: onclick, update reference element immediately
                this.renderToggleField(h("i.fa.fa-magic"), _("Autoselect element"), "outlineElementAuto", c.getLayerProperty, c.setLayerProperty),
                this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide element"), "outlineElementHide", c.getLayerProperty, c.setLayerProperty),
                h("button", {
                    title: _("Fit to element"),
                    onclick() { c.fitElement(); }
                }, h("i.fa.fa-arrows-alt"))
            ])
        ]),
        this.renderTextField("outlineElementId", outlineElementIdDisabled, c.getLayerProperty, c.setLayerProperty, true),

        h("label", {for: "field-opacity"}, _("Layer opacity")),
        this.renderRangeField("opacity", c.getCameraProperty, c.setCameraProperty, 0, 1, 0.1),

        h("h1", _("Transition")),

        h("label", {for: "field-transitionDurationMs"}, _("Duration (seconds)")),
        this.renderNumberField("transitionDurationMs", false, c.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),

        h("label", {for: "field-transitionTimingFunction"}, _("Timing function")),
        this.renderSelectField("transitionTimingFunction", c.getLayerProperty, c.setLayerProperty, {
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
        this.renderNumberField("transitionRelativeZoom", false, c.getLayerProperty, c.setLayerProperty, true, 1, 0.01),

        h("label", {for: "field-transitionPathId"}, [
            _("Path Id"),
            this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide path"), "transitionPathHide", c.getLayerProperty, c.setLayerProperty)
        ]),
        this.renderTextField("transitionPathId", false, c.getLayerProperty, c.setLayerProperty, true)
    ]);
};

Properties.renderTextField = function (property, disabled, getter, setter, acceptsEmpty) {
    const c = this.controller;

    const values = getter.call(c, property);
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[0] : "";

    return h("input", {
        id: "field-" + property,
        type: "text",
        value,
        className,
        disabled,
        onchange() {
            const value = this.value;
            if (acceptsEmpty || value.length) {
                setter.call(c, property, value);
            }
        }
    });
};

Properties.renderNumberField = function (property, disabled, getter, setter, signed, step, factor) {
    const c = this.controller;

    const values = getter.call(c, property);
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[0] / factor : 0; // TODO use default value

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
            const value = parseFloat(this.value);
            if (!isNaN(value) && (signed || value >= 0)) {
                setter.call(c, property, value * factor);
            }
        }
    });
};

Properties.renderRangeField = function (property, getter, setter, min, max, step) {
    const c = this.controller;

    const values = getter.call(c, property);
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[0] : (min + max) / 2; // TODO use default value

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
            const value = parseFloat(this.value);
            if (!isNaN(value) && value >= min && value <= max) {
                setter.call(c, property, value);
            }
        }
    });
};

Properties.renderToggleField = function (label, title, property, getter, setter) {
    const c = this.controller;

    const values = getter.call(c, property);
    let className = values.length > 1 ? "multiple" : "";
    const value = values.length >= 1 ? values[0] : false; // TODO use default value
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
    const c = this.controller;

    const values = getter.call(c, property);
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[0] : options[0];

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
