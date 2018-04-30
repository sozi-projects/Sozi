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

    var timeoutMsDisabled = c.getFrameProperty("timeoutEnable").every(value => !value);
    var referenceElementIdDisabled = c.getLayerProperty("referenceElementAuto").every(value => value);

    var notesInformation = [
        _("Basic formatting supported:"),
        "",
        _("Ctrl+b: Bold"),
        _("Ctrl+i: Italic"),
        _("Ctrl+u: Underline"),
        _("Ctrl+0: Paragraph"),
        _("Ctrl+1: Big header"),
        _("Ctrl+2: Medium header"),
        _("Ctrl+3: Small header"),
        _("Ctrl+l: List"),
        _("Ctrl+n: Numbered list")
    ];

    return h("div.properties", [
        h("h1", _("Frame")),

        h("div", [
            h("span.btn-group", [
                this.renderToggleField(h("i.fa.fa-list"), _("Show in frame list"), "showInFrameList", c.getFrameProperty, c.setFrameProperty),
                this.renderToggleField("#", _("Show frame number"), "showFrameNumber", c.getFrameProperty, c.setFrameProperty)
            ]),
            h("span.btn-group", [
                this.renderToggleField(h("i.fa.fa-link"), _("Link to previous frame"), "link", c.getLayerProperty, c.setLayerProperty),
                this.renderToggleField(h("i.fa.fa-crop"), _("Clip"), "clipped", c.getCameraProperty, c.setCameraProperty)
            ])
        ]),
        
        h("label", {for: "field-title"}, _("Title")),
        this.renderTextField("title", false, c.getFrameProperty, c.setFrameProperty, true),

        h("label", {for: "field-frameId"}, _("ID")),
        this.renderTextField("frameId", false, c.getFrameProperty, c.setFrameProperty, false),

        h("label", {for: "field-timeoutMs"}, [
            _("Timeout (seconds)"),
            this.renderToggleField(h("i.fa.fa-check-square-o"), _("Timeout enable"), "timeoutEnable", c.getFrameProperty, c.setFrameProperty)
        ]),
        this.renderNumberField("timeoutMs", timeoutMsDisabled, c.getFrameProperty, c.setFrameProperty, false, 0.1, 1000),

        h("label", {for: "field-referenceElementId"}, [
            _("Reference element ID"),
            h("span.btn-group", [
                // TODO: onclick, update reference element immediately
                this.renderToggleField(h("i.fa.fa-magic"), _("Autoselect element"), "referenceElementAuto", c.getLayerProperty, c.setLayerProperty),
                this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide element"), "referenceElementHide", c.getLayerProperty, c.setLayerProperty),
                h("button", {
                    title: _("Fit to element"),
                    onclick() { c.fitElement(); }
                }, h("i.fa.fa-arrows-alt"))
            ])
        ]),
        this.renderTextField("referenceElementId", referenceElementIdDisabled, c.getLayerProperty, c.setLayerProperty, true),

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
            _("Path ID"),
            this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide path"), "transitionPathHide", c.getLayerProperty, c.setLayerProperty)
        ]),
        this.renderTextField("transitionPathId", false, c.getLayerProperty, c.setLayerProperty, true),

        h("h1", _("Notes")),
        h("div", [
            h("span.btn-group", [
                this.renderFormatButton("formatDelete", _("Delete notes"), "delete", null, h("i.fa.fa-trash")),
                /*this.renderFormatButton("formatBold", _("Bold"), "bold", null, h("i.fa.fa-bold")),
                this.renderFormatButton("formatItalic", _("Italic"), "italic", null, h("i.fa.fa-italic")),
                this.renderFormatButton("formatUnderline", _("Underline"), "underline", null, h("i.fa.fa-underline")),
                this.renderFormatButton("formatInsertUnorderedList", _("Insert unordered list"), "insertUnorderedList", null, h("i.fa.fa-list-ul")),
                this.renderFormatButton("formatInsertOrderedList", _("Insert ordered list"), "insertOrderedList", null, h("i.fa.fa-list-ol")),
                this.renderFormatButton("formatAlignLeft", _("Align left"), "justifyLeft", null, h("i.fa.fa-align-left")),
                this.renderFormatButton("formatAlignCenter", _("Align center"), "justifyCenter", null, h("i.fa.fa-align-center")),
                this.renderFormatButton("formatAlignRight", _("Align right"), "justifyRight", null, h("i.fa.fa-align-right")),
                this.renderFormatButton("formatHeading", _("Header"), "heading", "H1", "H1"),
                this.renderFormatButton("formatParagraph", _("Paragraph"), "paragraph", "P", "P")
                */
                h("button", {
                    title: _("Notes information"),
                    onclick() { $.notify(notesInformation.join("\n"), "info"); }
                }, h("i.fa.fa-info"))
            ])
        ]),
        this.renderRichTextField("notes", "", false, c.getFrameProperty, c.setFrameProperty, true),
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

Properties.renderRichTextField = function (property, title, disabled, getter, setter, acceptsEmpty) {
    var c = this.controller;

    var values = getter.call(this, property);
    var className = values.length > 1 ? "multiple" : undefined;
    var innerHTML = values.length >= 1 ? values[0] : "";

    return h("section", {
        id: "field-" + property,
        contentEditable: true,
        innerHTML,
        className,
        title,
        disabled,
        onblur() {
            var value = this.innerHTML;
            if ( acceptsEmpty || value.length) {
                setter.call(c, property, value);
            }
        },
        // Mapping buttons to perform text formatting is problematic, since the
        // RichTextField loses focus and emits the onblur event. Mapping 
        // keyboard commands works nice though.
        onkeydown(e) {
            if (e.ctrlKey) {
                switch(e.keyCode) {
                    case 48: // Ctrl + 0
                        document.execCommand('formatBlock', false, '<DIV>');
                        break;
                    case 49: // Ctrl + 1
                        document.execCommand('formatBlock', false, '<H1>');
                        break;
                    case 50: // Ctrl + 2
                        document.execCommand('formatBlock', false, '<H2>');
                        break;
                    case 51: // Ctrl + 3
                        document.execCommand('formatBlock', false, '<H3>');
                        break;
                    case 76: // Ctrl + l 
                        document.execCommand('insertUnorderedList', false, null);
                        break;
                    case 78: // Ctrl + n
                        document.execCommand('insertOrderedList', false, null);
                        break;
                    // Ctrl + (b|i|u|c|x|v) works automatically
                }
            }
        }
    });
};

// This function is redundant unless we add some more formatting buttons. Doing 
// that turns out to be a bit problematic since the RichTextField loses focus 
// and saves the content. The selected text is affected in a negative way. It's 
// kept just in case for now.
Properties.renderFormatButton = function (property, title, dataCommand, dataValue, label) {
    return h("button", {
        id: "field-" + property,
        title,
        class: "format-button",
        onclick(e) {
            var fieldNotes = document.querySelector("#field-notes");
            switch(dataCommand)
            {
                case 'delete':
                    fieldNotes.innerHTML = "";
                    break;
                case 'heading':
                case 'paragraph':
                    document.execCommand('formatBlock', false, '<'+dataValue+'>');
                    break;
                                
                default:
                    document.execCommand(dataCommand, false, dataValue);
            }
            fieldNotes.focus();
            e.preventDefault();
            return false; // To prevent focus
        }
    }, label);
};
