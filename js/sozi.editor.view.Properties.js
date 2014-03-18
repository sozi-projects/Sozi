namespace("sozi.editor.view", function (exports) {
    "use strict";

    exports.Properties = sozi.model.Object.create({

        frameFields: {
            "frame-title": "title",
            "frame-id": "frameId",
            "frame-list": "showInFrameList",
            "frame-timeout": {
                get: function (frame) {
                    return frame.timeoutMs / 1000;
                },
                set: function (frame, value) {
                    frame.timeoutMs = value * 1000;
                }
            },
            "frame-timeout-enable": "timeoutEnable",
            "frame-transition-duration": {
                get: function (frame) {
                    return frame.transitionDurationMs / 1000;
                },
                set: function (frame, value) {
                    frame.transitionDurationMs = value * 1000;
                }
            }
        },
        
        layerFields: {
            "layer-clip" : "clip",
            "layer-reference-id": "referenceElementId",
            "layer-reference-hide": "referenceElementHide",
            "layer-transition-timing-function": "transitionTimingFunction",
            "layer-transition-relative-zoom": {
                get: function (frame) {
                    return frame.transitionRelativeZoom * 100;
                },
                set: function (frame, value) {
                    frame.transitionRelativeZoom = value / 100;
                }
            },
            "layer-transition-path-id": "transitionPathId",
            "layer-transition-path-hide": "transitionPathHide"
        },

        init: function (pres, selection) {
            sozi.model.Object.init.call(this);

            this.selection = selection;

            pres.addListener("frameChanged", this.render, this);
            selection.addListener("changed", this.render, this);

            for (var frameFieldId in this.frameFields) {
                this.setupChangeHandler(frameFieldId, this.frameFields[frameFieldId], false);
            }
            for (var layerFieldId in this.layerFields) {
                this.setupChangeHandler(layerFieldId, this.layerFields[layerFieldId], true);
            }
            return this;
        },

        setupChangeHandler: function (id, attr, isLayer) {
            var self = this;
            $("#right #" + id).change(function () {
                var fieldValue = $(this).attr("type") === "checkbox" ?
                    $(this).prop("checked") :
                    $(this).val();
                self.selection.selectedFrames.forEach(function (frame) {
                    if (!isLayer) {
                        if (typeof attr === "string") {
                            frame[attr] = fieldValue;
                        }
                        else {
                            attr.set(frame, fieldValue);
                        }
                    }
                    else {
                        self.selection.selectedLayers.forEach(function (layer) {
                            var layerProperties = frame.layerProperties[layer.index];
                            if (typeof attr === "string") {
                                layerProperties[attr] = fieldValue;
                            }
                            else {
                                attr.set(layerProperties, fieldValue);
                            }
                        });
                    }
                });
            });
        },

        render: function () {
            function disable(elt) {
                elt.removeClass("multiple").prop("disabled", true).val("");
            }
            
            function updateFieldValue(previous, attr, prop, isFirst) {
                var next = typeof attr === "string" ? prop[attr] : attr.get(prop);
                if (isFirst) {
                    return next;
                }
                if (previous !== next) {
                    return null;
                }
                return previous;
            }
            
            function updateFieldElement(elt, value) {
                if (value === null) {
                    elt.addClass("multiple");
                }
                else if (elt.attr("type") === "checkbox") {
                    elt.prop("checked", value);
                }
                else {
                    elt.val(value);
                }
                elt.prop("disabled", false);
            }
            
            for (var frameFieldId in this.frameFields) {
                var frameAttr = this.frameFields[frameFieldId];
                var frameFieldElt = $("#right #" + frameFieldId);

                disable(frameFieldElt);

                if (this.selection.selectedFrames.length) {
                    var frameFieldValue = null;
                    this.selection.selectedFrames.forEach(function (frame, frameIndex) {
                        frameFieldValue = updateFieldValue(frameFieldValue, frameAttr, frame, !frameIndex);
                    });
                    updateFieldElement(frameFieldElt, frameFieldValue);
                }
            }
            for (var layerFieldId in this.layerFields) {
                var layerAttr = this.layerFields[layerFieldId];
                var layerFieldElt = $("#right #" + layerFieldId);

                disable(layerFieldElt);

                if (this.selection.selectedFrames.length && this.selection.selectedLayers.length) {
                    var layerFieldValue = null;
                    this.selection.selectedFrames.forEach(function (frame, frameIndex) {
                        this.selection.selectedLayers.forEach(function (layer, layerIndex) {
                            layerFieldValue = updateFieldValue(layerFieldValue, layerAttr, frame.layerProperties[layer.index], !frameIndex && !layerIndex);
                        });
                    }, this);
                    updateFieldElement(layerFieldElt, layerFieldValue);
                }
            }
        }
    });
});
