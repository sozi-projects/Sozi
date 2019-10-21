/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {h} from "inferno-hyperscript";
import {VirtualDOMView} from "./VirtualDOMView";

function asArray(v) {
    return v instanceof Array ? v : [v];
}

export class Properties extends VirtualDOMView {

    constructor(container, selection, controller, locale) {
        super(container, controller);

        this.selection       = selection;
        this.gettext         = s => locale.gettext(s);
        this.preferencesMode = false;
    }

    togglePreferencesMode() {
        this.preferencesMode = !this.preferencesMode;
        this.repaint();
    }

    render() {
        return this.preferencesMode ? this.renderPreferences() : this.renderPresentationProperties();
    }

    renderPreferences() {
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
                this.renderToggleField(h("i.far.fa-check-square"), _("Enable notifications"), "enableNotifications", c.getPreference, c.setPreference)
            ]),
            h("label", {for: "field-saveMode"}, _("Save the presentation")),
            this.renderSelectField("saveMode", c.getPreference, c.setPreference, {
                onblur: _("When Sozi loses the focus"),
                manual: _("Manually")
            }),
            h("label", {for: "field-reloadMode"}, _("Reload the SVG document")),
            this.renderSelectField("reloadMode", c.getPreference, c.setPreference, {
                auto:    _("Automatically"),
                onfocus: _("When Sozi gets the focus"),
                manual:  _("Manually")
            }),
            h("h1", _("Behavior")),
            h("label", {for: "field-animateTransitions"}, [
                _("Preview transition animations"),
                this.renderToggleField(h("i.far.fa-check-square"), _("Enable animated transitions"), "animateTransitions", c.getPreference, c.setPreference)
            ]),
            h("h1", _("Keyboard shortcuts"))
        ].concat(shortcuts));
    }

    renderHelp(text, onclick) {
        return h("span.help", {title: text, onclick}, h("i.fas.fa-question-circle"));
    }

    renderPresentationProperties() {
        const _ = this.gettext;
        const c = this.controller;

        const NOTES_HELP = [
            _("Basic formatting supported:"),
            "",
            _("Ctrl+B: Bold"),
            _("Ctrl+I: Italic"),
            _("Ctrl+U: Underline"),
            _("Ctrl+0: Paragraph"),
            _("Ctrl+1: Big header"),
            _("Ctrl+2: Medium header"),
            _("Ctrl+3: Small header"),
            _("Ctrl+L: List"),
            _("Ctrl+N: Numbered list")
        ];

        const timeoutMsDisabled = c.getFrameProperty("timeoutEnable").every(value => !value);
        const showInFrameListDisabled = c.getFrameProperty("showInFrameList").every(value => !value);
        const outlineElementIdDisabled = c.getLayerProperty("outlineElementAuto").every(value => value);

        const layersToCopy = {
            __select_a_layer__: _("Select a layer to copy")
        };
        if (this.controller.hasDefaultLayer) {
            layersToCopy.__default__ = _("Default");
        }
        this.controller.editableLayers.forEach(l => {
            layersToCopy[l.groupId] = l.label;
        });

        return h("div.properties", [
            h("h1", _("Frame")),

            h("div.btn-group", [
                    this.renderToggleField(h("i.fas.fa-list"), _("Show in frame list"), "showInFrameList", c.getFrameProperty, c.setFrameProperty),
                    this.renderToggleField(h("i.fas.fa-hashtag"), _("Show frame number"), "showFrameNumber", c.getFrameProperty, c.setFrameProperty)
            ]),

            h("label", {for: "field-title"}, _("Title")),
            this.renderTextField("title", false, c.getFrameProperty, c.setFrameProperty, true),

            h("label", {for: "field-titleLevel"}, _("Title level in frame list")),
            this.renderRangeField("titleLevel", showInFrameListDisabled, c.getFrameProperty, c.setFrameProperty, 0, 4, 1),

            h("label", {for: "field-frameId"}, _("Id")),
            this.renderTextField("frameId", false, c.getFrameProperty, c.setFrameProperty, false),

            h("label", {for: "field-timeoutMs"}, [
                _("Timeout (seconds)"),
                this.renderToggleField(h("i.far.fa-clock"), _("Timeout enable"), "timeoutEnable", c.getFrameProperty, c.setFrameProperty)
            ]),
            this.renderNumberField("timeoutMs", timeoutMsDisabled, c.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),

            h("h1", _("Layer")),

            h("div.btn-group", [
                this.renderToggleField(h("i.fas.fa-link"), _("Link to previous frame"), "link", c.getLayerProperty, c.setLayerProperty),
                this.renderToggleField(h("i.fas.fa-crop"), _("Clip"), "clipped", c.getCameraProperty, c.setCameraProperty),
                h("button", {
                    title: _("Reset layer geometry"),
                    onclick() { c.resetLayer(); }
                }, h("i.fas.fa-eraser"))
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
                    this.renderToggleField(h("i.fas.fa-magic"), _("Autoselect element"), "outlineElementAuto", c.getLayerProperty, c.setLayerProperty),
                    this.renderToggleField(h("i.far.fa-eye-slash"), _("Hide element"), "outlineElementHide", c.getLayerProperty, c.setLayerProperty),
                    h("button", {
                        title: _("Fit to element"),
                        disabled: !c.canFitElement(),
                        onclick() { c.fitElement(); }
                    }, h("i.fas.fa-arrows-alt"))
                ])
            ]),
            this.renderTextField("outlineElementId", outlineElementIdDisabled, c.getLayerProperty, c.setLayerProperty, true),

            h("label", {for: "field-opacity"}, _("Layer opacity")),
            this.renderRangeField("opacity", false, c.getCameraProperty, c.setCameraProperty, 0, 1, 0.1),

            h("h1", [_("Transition"), this.renderHelp(_("Configure the animation when moving to the selected frames."))]),

            h("label", {for: "field-transitionDurationMs"}, _("Duration (seconds)")),
            this.renderNumberField("transitionDurationMs", false, c.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),

            h("label", {for: "field-transitionTimingFunction"}, _("Timing function")),
            this.renderSelectField("transitionTimingFunction", c.getLayerProperty, c.setLayerProperty, {
                "linear":     _("Linear"),
                "ease":       _("Ease"),
                "easeIn":     _("Ease in"),
                "easeOut":    _("Ease out"),
                "easeInOut":  _("Ease in-out"),
                "stepStart":  _("Step start"),
                "stepEnd":    _("Step end"),
                "stepMiddle": _("Step middle")
            }),

            h("label", {for: "field-transitionRelativeZoom"}, _("Relative zoom (%)")),
            this.renderNumberField("transitionRelativeZoom", false, c.getLayerProperty, c.setLayerProperty, true, 1, 0.01),

            h("label", {for: "field-transitionPathId"}, [
                _("Path Id"),
                this.renderToggleField(h("i.far.fa-eye-slash"), _("Hide path"), "transitionPathHide", c.getLayerProperty, c.setLayerProperty)
            ]),
            this.renderTextField("transitionPathId", false, c.getLayerProperty, c.setLayerProperty, true),

            h("h1", [_("Notes"), this.renderHelp(_("Edit presenter notes. Click here to show the list of formatting shortcuts."), () => c.info(NOTES_HELP.join("\n"), true))]),

            this.renderRichTextField("notes", false, c.getFrameProperty, c.setFrameProperty, true),

            h("h1", _("Player")),

            h("div", [
                _("Support the browser's \"Back\" (🡰) button to move to the previous frame"),
                this.renderToggleField(h("i.fas.fa-history"), _("Moving from one frame to another will change the content of the location bar automatically."), "updateURLOnFrameChange", c.getPresentationProperty, c.setPresentationProperty)
            ]),

            h("div", [
                _("Allow to control the presentation"),
                h("span.btn-group", [
                        this.renderToggleField(h("i.fas.fa-mouse-pointer"), _("using the mouse"), "enableMouseNavigation", c.getPresentationProperty, c.setPresentationProperty),
                        this.renderToggleField(h("i.fas.fa-keyboard"), _("using the keyboard"), "enableKeyboardNavigation", c.getPresentationProperty, c.setPresentationProperty)
                ])
            ]),

            h("div", [
                _("Allow to move the camera"),
                this.renderToggleField(h("i.fas.fa-mouse-pointer"), _("using the mouse"), "enableMouseTranslation", c.getPresentationProperty, c.setPresentationProperty)
            ]),

            h("div", [
                _("Allow to rotate the camera"),
                h("span.btn-group", [
                        this.renderToggleField(h("i.fas.fa-mouse-pointer"), _("using the mouse"), "enableMouseRotation", c.getPresentationProperty, c.setPresentationProperty),
                        this.renderToggleField(h("i.fas.fa-keyboard"), _("using the keyboard"), "enableKeyboardRotation", c.getPresentationProperty, c.setPresentationProperty)
                ])
            ]),

            h("div", [
                _("Allow to zoom"),
                h("span.btn-group", [
                        this.renderToggleField(h("i.fas.fa-mouse-pointer"), _("using the mouse"), "enableMouseZoom", c.getPresentationProperty, c.setPresentationProperty),
                        this.renderToggleField(h("i.fas.fa-keyboard"), _("using the keyboard"), "enableKeyboardZoom", c.getPresentationProperty, c.setPresentationProperty)
                ])
            ])
        ]);
    }

    renderTextField(property, disabled, getter, setter, acceptsEmpty) {
        const c = this.controller;

        const values = asArray(getter.call(c, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {value: values.length >= 1 ? values[values.length - 1] : ""};

        return h("input", {
            id: "field-" + property,
            type: "text",
            className,
            disabled,
            onchange() {
                const value = this.value;
                if (acceptsEmpty || value.length) {
                    setter.call(c, property, value);
                }
            }
        });
    }

    renderRichTextField(property, disabled, getter, setter, acceptsEmpty) {
        const c = this.controller;

        const values = asArray(getter.call(c, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {innerHTML: values.length >= 1 ? values[values.length - 1] : ""};

        return h("section", {
            id: "field-" + property,
            contentEditable: true,
            className,
            disabled,
            onblur() {
                const value = this.innerHTML;
                if (acceptsEmpty || value.length) {
                    setter.call(c, property, value);
                }
            },
            onkeydown(evt) {
                if (evt.ctrlKey) {
                    switch(evt.keyCode) {
                        case 48: // Ctrl+0
                            document.execCommand("formatBlock", false, "<P>");
                            break;
                        case 49: // Ctrl+1
                            document.execCommand("formatBlock", false, "<H1>");
                            break;
                        case 50: // Ctrl+2
                            document.execCommand("formatBlock", false, "<H2>");
                            break;
                        case 51: // Ctrl+3
                            document.execCommand("formatBlock", false, "<H3>");
                            break;
                        case 76: // Ctrl+L
                            document.execCommand("insertUnorderedList", false, null);
                            break;
                        case 78: // Ctrl+N
                            document.execCommand("insertOrderedList", false, null);
                            break;
                        default:
                            return;
                        // Natively supported shortcuts:
                        // Ctrl+B|I|U : Bold, Italic, Underline
                        // Ctrl+A     : Select all
                        // Ctrl+C|X|V : Copy, Cut, Paste
                    }
                    evt.stopPropagation();
                }
            }
        });
    }

    renderNumberField(property, disabled, getter, setter, signed, step, factor) {
        const c = this.controller;

        const values = asArray(getter.call(c, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {value: values.length >= 1 ? values[values.length - 1] / factor : 0}; // TODO use default value

        return h("input", {
            id: "field-" + property,
            type: "number",
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
    }

    renderRangeField(property, disabled, getter, setter, min, max, step) {
        const c = this.controller;

        const values = asArray(getter.call(c, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {value: values.length >= 1 ? values[values.length - 1] : (min + max) / 2}; // TODO use default value

        return h("input", {
            id: "field-" + property,
            type: "range",
            title: this.state[property].value,
            min,
            max,
            step,
            className,
            disabled,
            onchange() {
                const value = parseFloat(this.value);
                if (!isNaN(value) && value >= min && value <= max) {
                    setter.call(c, property, value);
                }
            }
        });
    }

    renderToggleField(label, title, property, getter, setter) {
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
    }

    renderSelectField(property, getter, setter, options) {
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
    }
}
