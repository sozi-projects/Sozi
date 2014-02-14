
namespace("sozi.editor.view", function (exports) {
    "use strict";

    exports.Timeline = sozi.model.Object.create({

        init: function (editor) {
            sozi.model.Object.init.call(this);

            // Fill layer selector
            var htmlLayerSelect = document.querySelector("#layer-select");

            for (var layerId in exports.Preview.layers) {
                var layer = exports.Preview.layers[layerId];
                if (!layer.auto) {
                    htmlLayerSelect.insertAdjacentHTML("beforeend", "<option value='" + layerId + "'>" + layer.label + "</option>");
                }
            }

            htmlLayerSelect.addEventListener("change", function () {
                editor.addLayer(htmlLayerSelect.value);
            }, false);

            document.querySelector("#add-frame").addEventListener("click", function () {
                editor.presentation.addFrame();
            }, false);

            editor.addListener("addLayer", this);
            editor.addListener("selectFrames", this);
            editor.presentation.addListener("addFrame", this);

            return this;
        },

        addLayer: function (editor, layer) {
            var htmlLayerSelect = document.querySelector("#layer-select");

            // Add row to the timeline for the selected layer
            htmlLayerSelect.parentNode.parentNode.insertAdjacentHTML("beforebegin", "<tr id='timeline-" + layer.id + "'><th>" + layer.label + "</th></tr>");

            // Remove layer from drop-down list
            htmlLayerSelect.removeChild(htmlLayerSelect.querySelector("option[value='" + layer.id + "']"));
        },

        addFrame: function (pres, frame, index) {
            // TODO implement timeline.addFrame
            console.log("timeline.addFrame");
        },

        selectFrames: function (editor, frames) {
            // TODO implement timeline.selectFrames
            console.log("timeline.selectFrames");
        }
    });
});
