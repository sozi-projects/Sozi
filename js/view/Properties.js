/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", function (exports) {
    "use strict";

    var Field = sozi.model.Object.clone({
        element: null,
        isFrameField: false,
        isLayerField: false,
        isCameraField: false,
        propertyName: "",
        selection: null,

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
            this.render();
        },

        render: function () {
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
                        var current = obj.at(layer.index)[this.propertyName];
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
    });

    var NumericField = Field.clone({
        min: 0,
        max: 100,
        factor: 1,

        init: function (controller, selection, elementId, propertyName, min, max, factor) {
            Field.init.call(this, controller, selection, elementId, propertyName);
            this.min = min;
            this.max = max;
            this.factor = factor;
            return this;
        },

        convertToField: function (value) {
            return (value / this.factor).toString();
        },

        convertFromField: function (value) {
            return parseFloat(value) * this.factor;
        },

        validate: function (value) {
            value = parseFloat(value);
            return !isNaN(value) &&
                (this.min === null || value >= this.min) &&
                (this.max === null || value <= this.max);
        }
    });

    var StringField = Field.clone({
        acceptsEmpty: false,

        init: function (controller, selection, elementId, propertyName, acceptsEmpty) {
            Field.init.call(this, controller, selection, elementId, propertyName);
            this.acceptsEmpty = acceptsEmpty;
            return this;
        },

        validate: function (value) {
            return this.acceptsEmpty || value.length;
        }
    });

    exports.Properties = sozi.model.Object.clone({
        fields: {own: []},

        init: function (presentation, selection, controller) {
            this.fields.push(
                StringField.clone().init(controller, selection, "frame-title", "title", true),
                StringField.clone().init(controller, selection, "frame-id", "frameId", false),
                Field.clone().init(controller, selection, "frame-list", "showInFrameList"),
                NumericField.clone().init(controller, selection, "frame-timeout", "timeoutMs", 0, null, 1000),
                Field.clone().init(controller, selection, "frame-timeout-enable", "timeoutEnable"),
                NumericField.clone().init(controller, selection, "frame-transition-duration", "transitionDurationMs", 0, null, 1000),
                Field.clone().init(controller, selection, "layer-link", "link"),
                Field.clone().init(controller, selection, "camera-clipped", "clipped"),
                StringField.clone().init(controller, selection, "layer-reference-id", "referenceElementId", true),
                Field.clone().init(controller, selection, "layer-reference-auto", "referenceElementAuto"),
                Field.clone().init(controller, selection, "layer-reference-hide", "referenceElementHide"),
                StringField.clone().init(controller, selection, "layer-transition-timing-function", "transitionTimingFunction", false),
                NumericField.clone().init(controller, selection, "layer-transition-relative-zoom", "transitionRelativeZoom", null, null, 0.01),
                StringField.clone().init(controller, selection, "layer-transition-path-id", "transitionPathId", true),
                Field.clone().init(controller, selection, "layer-transition-path-hide", "transitionPathHide")
            );

            $("#layer-reference-id-fit").click(controller.fitElement.bind(controller));

            controller.addListener("repaint", this.render.bind(this));

            return this;
        },

        render: function () {
            this.fields.forEach(function (field) {
                field.render();
            });
        }
    });
});
