namespace("sozi.editor.view", function (exports) {
    "use strict";

    exports.Properties = sozi.model.Object.create({

        fields: {
            "frame-title": "title",
            "frame-id": "frameId",
            "frame-timeout": {
                get: function (frame) {
                    return frame.timeoutMs / 1000;
                },
                set: function (frame, value) {
                    frame.timeoutMs = value * 1000;
                }
            },
            "frame-timeout-enable": "timeoutEnable",
            "transition-duration": {
                get: function (frame) {
                    return frame.transitionDurationMs / 1000;
                },
                set: function (frame, value) {
                    frame.transitionDurationMs = value * 1000;
                }
            }

        },

        init: function (pres, selection) {
            sozi.model.Object.init.call(this);

            this.selection = selection;

            pres.addListener("frameChanged", this.render, this);
            selection.addListener("changed", this.render, this);

            for (var id in this.fields) {
                this.setupChangeHandler(id);
            }
            return this;
        },

        setupChangeHandler: function (id) {
            var attr = this.fields[id];
            var self = this;
            $("#right #" + id).change(function () {
                var fieldValue = $(this).attr("type") === "checkbox" ?
                    $(this).prop("checked") :
                    $(this).val();
                self.selection.selectedFrames.forEach(function (frame) {
                    if (typeof attr === "string") {
                        frame[attr] = fieldValue;
                    }
                    else {
                        attr.set(frame, fieldValue);
                    }
                });
            });
        },

        render: function () {
            for (var id in this.fields) {
                var attr = this.fields[id];
                var elt = $("#right #" + id);

                elt.removeClass("multiple").prop("disabled", false).val("");

                if (this.selection.selectedFrames.length) {
                    var fieldValue = null;
                    this.selection.selectedFrames.forEach(function (frame, index) {
                        var attrValue = typeof attr === "string" ?
                            frame[attr] :
                            attr.get(frame);
                        if (!index) {
                            fieldValue = attrValue;
                        }
                        else if (fieldValue !== attrValue) {
                            fieldValue = null;
                        }
                    });
                    if (fieldValue === null) {
                        elt.addClass("multiple");
                    }
                    else if (elt.attr("type") === "checkbox") {
                        elt.prop("checked", fieldValue);
                    }
                    else {
                        elt.val(fieldValue);
                    }
                }
                else {
                    elt.prop("disabled", true);
                }
            }
        }
    });
});
