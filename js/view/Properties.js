/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", function (exports) {
    "use strict";

    var Field = {

        init: function (controller, selection, elementId, propertyName) {
            this.element = $("#sozi-editor-view-properties #" + elementId);
            this.isFrameField = /^frame/.test(elementId);
            this.isLayerField = /^layer/.test(elementId);
            this.isCameraField = /^camera/.test(elementId);
            this.propertyName = propertyName;
            this.selection = selection;
            this.controller = controller;

            var self = this;
            this.element.change(function () {
                var value = $(this).attr("type") === "checkbox" ?
                    $(this).prop("checked") :
                    $(this).val();
                self.enter(value);
            });

            return this;
        },

        enter: function (value) {
            if (this.validate(value)) {
                var propertyValue = this.convertFromField(value);
                if (this.isFrameField) {
                    this.controller.setFrameProperty(this.propertyName, propertyValue);
                }
                else if (this.isLayerField) {
                    this.controller.setLayerProperty(this.propertyName, propertyValue);
                }
                else {
                    this.controller.setCameraProperty(this.propertyName, propertyValue);
                }
            }
            this.repaint();
        },

        repaint: function () {
            // Clear and disable field
            this.element.removeClass("multiple").prop("disabled", true).val("");

            var value = null;
            var multiple = false;

            this.selection.selectedFrames.forEach(function (frame, frameIndex) {
                if (this.isFrameField) {
                    var current = frame[this.propertyName];
                    if (!frameIndex) {
                        value = current;
                    }
                    else if (value !== current) {
                        multiple = true;
                    }
                }
                else {
                    var obj = this.isLayerField ? frame.layerProperties : frame.cameraStates;
                    this.selection.selectedLayers.forEach(function (layer, layerIndex) {
                        var current = obj[layer.index][this.propertyName];
                        if (!frameIndex && !layerIndex) {
                            value = current;
                        }
                        else if (value !== current) {
                            multiple = true;
                        }
                    }, this);
                }
            }, this);

            if (value !== null) {
                if (multiple) {
                    this.element.addClass("multiple");
                }
                else if (this.element.attr("type") === "checkbox") {
                    this.element.prop("checked", value);
                }
                else {
                    this.element.val(this.convertToField(value));
                }
                this.element.prop("disabled", false);
            }
        },

        convertToField: function (value) {
            return value;
        },

        convertFromField: function (value) {
            return value;
        },

        validate: function (value) {
            return true;
        }
    };

    var NumericField = Object.create(Field);

    NumericField.init = function (controller, selection, elementId, propertyName, min, max, factor) {
        Field.init.call(this, controller, selection, elementId, propertyName);
        this.min = min;
        this.max = max;
        this.factor = factor;
        return this;
    };

    NumericField.convertToField = function (value) {
        return (value / this.factor).toString();
    };

    NumericField.convertFromField = function (value) {
        return parseFloat(value) * this.factor;
    };

    NumericField.validate = function (value) {
        value = parseFloat(value);
        return !isNaN(value) &&
            (this.min === null || value >= this.min) &&
            (this.max === null || value <= this.max);
    };


    var StringField = Object.create(Field);

    StringField.acceptsEmpty = false;

    StringField.init = function (controller, selection, elementId, propertyName, acceptsEmpty) {
        Field.init.call(this, controller, selection, elementId, propertyName);
        this.acceptsEmpty = acceptsEmpty;
        return this;
    };

    StringField.validate = function (value) {
        return this.acceptsEmpty || value.length;
    };


    exports.Properties = {

        init: function (presentation, selection, controller) {
            this.fields = [
                Object.create(StringField).init(controller, selection, "frame-title", "title", true),
                Object.create(StringField).init(controller, selection, "frame-id", "frameId", false),
                Object.create(Field).init(controller, selection, "frame-list", "showInFrameList"),
                Object.create(NumericField).init(controller, selection, "frame-timeout", "timeoutMs", 0, null, 1000),
                Object.create(Field).init(controller, selection, "frame-timeout-enable", "timeoutEnable"),
                Object.create(NumericField).init(controller, selection, "frame-transition-duration", "transitionDurationMs", 0, null, 1000),
                Object.create(Field).init(controller, selection, "layer-link", "link"),
                Object.create(Field).init(controller, selection, "camera-clipped", "clipped"),
                Object.create(StringField).init(controller, selection, "layer-reference-id", "referenceElementId", true),
                Object.create(Field).init(controller, selection, "layer-reference-auto", "referenceElementAuto"),
                Object.create(Field).init(controller, selection, "layer-reference-hide", "referenceElementHide"),
                Object.create(StringField).init(controller, selection, "layer-transition-timing-function", "transitionTimingFunction", false),
                Object.create(NumericField).init(controller, selection, "layer-transition-relative-zoom", "transitionRelativeZoom", null, null, 0.01),
                Object.create(StringField).init(controller, selection, "layer-transition-path-id", "transitionPathId", true),
                Object.create(Field).init(controller, selection, "layer-transition-path-hide", "transitionPathHide")
            ];

            $("#layer-reference-id-fit").click(controller.fitElement.bind(controller));

            controller.addListener("repaint", this.repaint.bind(this));

            return this;
        },

        repaint: function () {
            this.fields.forEach(function (field) {
                field.repaint();
            });
        }
    };
});
