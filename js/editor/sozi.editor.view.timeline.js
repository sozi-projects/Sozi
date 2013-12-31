
namespace("sozi.editor.view", function (exports) {
    "use strict";

    exports.timeline = sozi.model.Object.create({

        init: function (pres) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;

            // Fill layer selector
            var htmlLayerSelect = document.querySelector("#layer-select");

            for (var layerId in pres.layers) {
                var layer = pres.layers[layerId];
                if (!layer.auto) {
                    htmlLayerSelect.insertAdjacentHTML("beforeend", "<option value='" + layerId + "'>" + layer.label + "</option>");
                }
            }

            htmlLayerSelect.addEventListener("change", this.bind(this.onAddLayer), false);
            document.querySelector("#add-frame").addEventListener("click", this.bind(this.onAddFrame), false);

            return this;
        },

        onAddLayer: function () {
            // Add row to the timeline for the selected layer
            var htmlLayerSelect = document.querySelector("#layer-select");
            var layerId = htmlLayerSelect.value;
            var layerLabel = this.presentation.layers[layerId].label;
            htmlLayerSelect.parentNode.parentNode.insertAdjacentHTML("beforebegin", "<tr id='timeline-" + layerId + "'><th>" + layerLabel + "</th></tr>");

            // Remove layer from drop-down list
            htmlLayerSelect.removeChild(htmlLayerSelect.querySelector("option[value='" + layerId + "']"));
        },

        onAddFrame: function (frame, frameIndex) {
            // TODO implement timeline.onAddFrame
        }
    });
});
