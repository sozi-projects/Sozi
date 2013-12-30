
namespace("sozi.editor", function (exports) {
    "use strict";

    exports.TimelineView = sozi.model.Object.create({

        init: function (doc) {
            sozi.model.Object.init.call(this);

            this.document = doc;

            // Fill layer selector
            var htmlLayerSelect = document.querySelector("#layer-select");

            for (var layerId in doc.layers) {
                var layer = doc.layers[layerId];
                if (!layer.auto) {
                    htmlLayerSelect.insertAdjacentHTML("beforeend", "<option value='" + layerId + "'>" + layer.label + "</option>");
                }
            }

            htmlLayerSelect.addEventListener("change", this.bind(this.onAddLayer), false);

            return this;
        },

        onAddLayer: function () {
            // Add row to the timeline for the selected layer
            var htmlLayerSelect = document.querySelector("#layer-select");
            var layerId = htmlLayerSelect.value;
            var layerLabel = this.document.layers[layerId].label;
            htmlLayerSelect.parentNode.parentNode.insertAdjacentHTML("beforebegin", "<tr id='timeline-" + layerId + "'><th>" + layerLabel + "</th></tr>");

            // Remove layer from drop-down list
            htmlLayerSelect.removeChild(htmlLayerSelect.querySelector("option[value='" + layerId + "']"));
        }
    });
});
