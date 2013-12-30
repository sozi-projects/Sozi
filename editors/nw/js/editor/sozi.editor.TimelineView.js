
namespace("sozi.editor", function (exports) {
    "use strict";
    
    exports.TimelineView = sozi.model.Object.create({
    
        init: function (doc) {
            sozi.model.Object.init.call(this);
            
            this.document = doc;
            
            // Fill layer selector
            var htmlLayerSelect = document.querySelector("#layer");
            
            for (var layerId in doc.layers) {
                var layer = doc.layers[layerId];
                if (!layer.auto) {
                    var htmlOptionText = document.createTextNode(layer.label);

                    var htmlOption = document.createElement("option");
                    htmlOption.setAttribute("value", layerId);
                    htmlOption.appendChild(htmlOptionText);

                    htmlLayerSelect.appendChild(htmlOption);
                }
            }
            
            htmlLayerSelect.addEventListener("change", this.bind(this.onAddLayer), false);
            
            return this;
        },
        
        onAddLayer: function () {
            // TODO remove layer from selector
            console.log("Add layer: " + document.querySelector("#layer").value);
        }
    });
});
