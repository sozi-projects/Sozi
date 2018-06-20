/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import h from "virtual-dom/h";
import {VirtualDOMView} from "./VirtualDOMView";
import {remote} from "electron";

export const Properties = Object.create(VirtualDOMView);

function asArray(v) {
    return v instanceof Array ? v : [v];
}

Properties.init = function (container, selection, controller, timeline, locale) {
    VirtualDOMView.init.call(this, container, controller);

    this.selection = selection;
    this.gettext = s => locale.gettext(s);
    this.timeline = timeline;
    this.preferencesMode = false;

    return this;
};

Properties.togglePreferencesMode = function () {
    this.preferencesMode = !this.preferencesMode;
    this.repaint();
};

Properties.render = function () {
    return this.preferencesMode ? this.renderPreferences() : this.renderPresentationProperties();
};

Properties.renderPreferences = function () {
    const _ = this.gettext;
    const c = this.controller;

    const ACTION_LABELS = {
        fitElement: _("Fit to element"),
        resetLayer: _("Reset layer geometry"),
        addFrame: _("Create a new frame"),
        save: _("Save the presentation"),
        redo: _("Redo"),
        undo: _("Undo"),
        focusTitleField: _("Focus the frame title"),
        reload: _("Reload the SVG document"),
        toggleFullscreen: _("Toggle full-screen mode"),
        toggleDevTools: _("Toggle the developer tools")
    };

    let shortcuts = [];
    for (let action in ACTION_LABELS) {
        shortcuts.push(h("label", {for: `field-${action}`}, ACTION_LABELS[action]));
        shortcuts.push(this.renderTextField(action, false, c.getShortcut, c.setShortcut, true));
    }

    return h("div.properties", [
        h("h1", _("User interface")),
        h("label", {for: "field-fontSize"}, _("Font size")),
        this.renderNumberField("fontSize", false, c.getPreference, c.setPreference, false, 1, 1),
        h("label", {for: "field-enableNotifications"}, [
            _("Enable notifications on save and reload"),
            this.renderToggleField(h("i.fa.fa-check-square-o"), _("Enable notifications"), "enableNotifications", c.getPreference, c.setPreference)
        ]),
        h("h1", _("Behavior")),
        h("label", {for: "field-animateTransitions"}, [
            _("Preview transition animations"),
            this.renderToggleField(h("i.fa.fa-check-square-o"), _("Enable animated transitions"), "animateTransitions", c.getPreference, c.setPreference)
        ]),
        h("h1", _("Keyboard shortcuts"))
    ].concat(shortcuts));
};

Properties.renderPresentationProperties = function () {
    const _ = this.gettext;
    const c = this.controller;

    const timeoutMsDisabled = c.getFrameProperty("timeoutEnable").every(value => !value);
    const showInFrameListDisabled = c.getFrameProperty("showInFrameList").every(value => !value);
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

        h("label", {for: "field-titleLevel"}, _("Title level in frame list")),
        this.renderRangeField("titleLevel", showInFrameListDisabled, c.getFrameProperty, c.setFrameProperty, 0, 4, 1),

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
        this.renderSelectField("layerToCopy", () => "__select_a_layer__", (prop, groupId) => {
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
                    disabled: !c.canFitElement(),
                    onclick() { c.fitElement(); }
                }, h("i.fa.fa-arrows-alt"))
            ])
        ]),
        this.renderTextField("outlineElementId", outlineElementIdDisabled, c.getLayerProperty, c.setLayerProperty, true),

        h("label", {for: "field-opacity"}, _("Layer opacity")),
        this.renderRangeField("opacity", false, c.getCameraProperty, c.setCameraProperty, 0, 1, 0.1),

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
        this.renderTextField("transitionPathId", false, c.getLayerProperty, c.setLayerProperty, true),

        h("h1", _("Player")),

        h("div", [
            _("Allow to control the presentation"),
            h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseNavigation", c.getPresentationProperty, c.setPresentationProperty),
                    this.renderToggleField(h("i.fa.fa-keyboard-o"), _("using the keyboard"), "enableKeyboardNavigation", c.getPresentationProperty, c.setPresentationProperty)
            ])
        ]),

        h("div", [
            _("Allow to move the camera"),
            this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseTranslation", c.getPresentationProperty, c.setPresentationProperty)
        ]),

        h("div", [
            _("Allow to rotate the camera"),
            h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseRotation", c.getPresentationProperty, c.setPresentationProperty),
                    this.renderToggleField(h("i.fa.fa-keyboard-o"), _("using the keyboard"), "enableKeyboardRotation", c.getPresentationProperty, c.setPresentationProperty)
            ])
        ]),

        h("div", [
            _("Allow to zoom"),
            h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseZoom", c.getPresentationProperty, c.setPresentationProperty),
                    this.renderToggleField(h("i.fa.fa-keyboard-o"), _("using the keyboard"), "enableKeyboardZoom", c.getPresentationProperty, c.setPresentationProperty)
            ])
        ]),

        h("h1", _("Video/Audio")),

        h("label", {for: "field-video"}, _("Video (mp4)")),
        this.renderFileField("video", false, c.getPresentationProperty, c.setPresentationProperty, false, _("Add video")),
        h("label", {for: "field-videoPosition"}, _("Select video position")),
        this.renderSelectField("videoPosition", c.getPresentationProperty, c.setPresentationProperty, {
            "0" : "Top Left",
            "1" : "Top Right",
            "2" : "Bottom Left",
            "3" : "Bottom Right"
        }),

        h("label", {for: "field-videoWidth"}, _("Video width")),
        this.renderNumberField("videoWidth", true, c.getPresentationProperty, c.setPresentationProperty, false, 1, 1),

        h("label", {for: "field-videoHeight"}, _("Video height")),
        this.renderNumberField("videoHeight", true, c.getPresentationProperty, c.setPresentationProperty, false, 1, 1),

    ]);
};

Properties.renderTextField = function (property, disabled, getter, setter, acceptsEmpty) {
    const c = this.controller;

    const values = asArray(getter.call(c, property));
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[values.length - 1] : "";

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

    const values = asArray(getter.call(c, property));
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[values.length - 1] / factor : 0; // TODO use default value

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

Properties.renderRangeField = function (property, disabled, getter, setter, min, max, step) {
    const c = this.controller;

    const values = asArray(getter.call(c, property));
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[values.length - 1] : (min + max) / 2; // TODO use default value

    return h("input", {
        id: "field-" + property,
        type: "range",
        title: value,
        min,
        max,
        step,
        value,
        className,
        disabled,
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

    const values = asArray(getter.call(c, property));
    let className = values.length > 1 ? "multiple" : "";
    const value = values.length >= 1 ? values[values.length - 1] : false; // TODO use default value
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

    const values = asArray(getter.call(c, property));
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[values.length - 1] : options[0];

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

Properties.renderFileField = function (property, disabled, getter, setter, acceptsEmpty, title) {
    const c = this.controller;
console.log(title);
    const values = asArray(getter.call(c, property));
    const className = values.length > 1 ? "multiple" : undefined;
    const value = values.length >= 1 ? values[values.length - 1] : "";

    return h("button", {
        id: "field-" + property,
        className,
        title,
        onclick() {
            let files = remote.dialog.showOpenDialog({
                title: "Choose video",
                filters: [{name: "Video file", extensions: ["mp4"], multiSelections: false}],
                properties: ["openFile"]
            });

            files = files[0].split('/');

            const file = files[files.length - 1];

            if (file) {
                // decidir si leemos el video y guardamos el binario en el JSON o guardamos la URL
                // para que lo cargue cada vez que se inicie la presentacion. Ahora hace lo 2o
                setter.call(c, property, file);
                document.getElementById("field-videoWidth").disabled = false;
                document.getElementById("field-videoHeight").disabled = false;
            }
        }
        // onchange() {
        //     const files = remote.dialog.showOpenDialog({
        //         title: _("Choose video lol"),
        //         filters: [{name: _("Video file lol"), extensions: ["mp4"], multiSelections: false}],
        //         properties: ["openFile"]
        //     });
        //     // if (files) {
        //     //     this.load(files[0]);
        //     // }
        //     if (files.length > 1) {
        //         // only 1
        //     }

        //     const file = files[0];

        //     if (file.type !== "video/mp4") {
        //         // type supported
        //     }

        //     const value = file.name;

        //     if (acceptsEmpty || file.size) {
        //         // decidir si leemos el video y guardamos el binario en el JSON o guardamos la URL
        //         // para que lo cargue cada vez que se inicie la presentacion. Ahora hace lo 2o
        //         setter.call(c, property, value);
        //         document.getElementById("field-videoWidth").disabled = false;
        //         document.getElementById("field-videoHeight").disabled = false;
        //     }
        // }
    }, h("i.fa.fa-folder-open-o"));
};
