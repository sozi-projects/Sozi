namespace("sozi.editor.view", function (exports) {
    "use strict";

    var Field = sozi.model.Object.clone({
        element: null,
        isFrameField: false,
        propertyName: "",
        selection: null,
        
        init: function (selection, elementId, propertyName) {
            this.element = $("#sozi-editor-view-properties #" + elementId);
            this.isFrameField = /^frame/.test(elementId);
            this.propertyName = propertyName;
            this.selection = selection;

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
                this.selection.selectedFrames.forEach(function (frame) {
                    if (this.isFrameField) {
                        frame[this.propertyName] = this.convertFromField(value);
                    }
                    else {
                        this.selection.selectedLayers.forEach(function (layer) {
                            frame.layerProperties.at(layer.index)[this.propertyName] = this.convertFromField(value);
                        }, this);
                    }
                }, this);
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
                    this.selection.selectedLayers.forEach(function (layer, layerIndex) {
                        var current = frame.layerProperties.at(layer.index)[this.propertyName];
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
        
        init: function (selection, elementId, propertyName, min, max, factor) {
            Field.init.call(this, selection, elementId, propertyName);
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
        
        init: function (selection, elementId, propertyName, acceptsEmpty) {
            Field.init.call(this, selection, elementId, propertyName);
            this.acceptsEmpty = acceptsEmpty;
            return this;
        },
        
        validate: function (value) {
            return this.acceptsEmpty || value.length;
        }
    });

    exports.Properties = sozi.model.Object.clone({
        fields: {own: []},
        
        init: function (pres, selection) {
            this.fields.push(
                StringField.clone().init(selection, "frame-title", "title", true),
                StringField.clone().init(selection, "frame-id", "frameId", false),
                Field.clone().init(selection, "frame-list", "showInFrameList"),
                NumericField.clone().init(selection, "frame-timeout", "timeoutMs", 0, null, 1000),
                Field.clone().init(selection, "frame-timeout-enable", "timeoutEnable"),
                NumericField.clone().init(selection, "frame-transition-duration", "transitionDurationMs", 0, null, 1000),
                Field.clone().init(selection, "layer-link", "link"),
                Field.clone().init(selection, "layer-clip", "clip"),
                StringField.clone().init(selection, "layer-reference-id", "referenceElementId", true),
                Field.clone().init(selection, "layer-reference-auto", "referenceElementAuto"),
                Field.clone().init(selection, "layer-reference-hide", "referenceElementHide"),
                StringField.clone().init(selection, "layer-transition-timing-function", "transitionTimingFunction", false),
                NumericField.clone().init(selection, "layer-transition-relative-zoom", "transitionRelativeZoom", null, null, 0.01),
                StringField.clone().init(selection, "layer-transition-path-id", "transitionPathId", true),
                Field.clone().init(selection, "layer-transition-path-hide", "transitionPathHide")
            );

            $("#layer-reference-id-fit").click(function () {
                var frame = selection.currentFrame;
                if (frame) {
                    selection.selectedLayers.forEach(function (layer, layerIndex) {
                        var id = frame.layerProperties.at(layerIndex).referenceElementId;
                        var elt = pres.svgRoot.getElementById(id);
                        if (elt) {
                            frame.cameraStates.at(layerIndex).setAtElement(elt, 0, 0, 1, 0);
                        }
                    });
                }
            });

            selection.addListener("change", this.render, this);
            pres.frames.addListener("add", this.onAddFrame, this);
            
            return this;
        },

        render: function () {
            this.fields.forEach(function (field) {
                field.render();
            });
        },

        onAddFrame: function (collection, frame) {
            frame.addListener("change", this.render, this);
            frame.layerProperties.addListener("add", this.onAddLayer, this);
            frame.layerProperties.forEach(function (layer) {
                this.onAddLayer(frame.layerProperties, layer);
            }, this);
        },

        onAddLayer: function (collection, layer) {
            layer.addListener("change", this.render, this);
        }
    });
});
