
namespace("sozi.editor.view", function (exports) {
    "use strict";

    exports.Timeline = sozi.model.Object.create({

        init: function (editor) {
            sozi.model.Object.init.call(this);

            this.editor = editor;

            this.render();

            document.querySelector("#add-frame").addEventListener("click", function () {
                editor.selectFrame(editor.addFrame());
            }, false);

            var renderCallback = this.bind(this.render);
            editor.addListener("layerAdded", renderCallback);
            editor.addListener("frameAdded", renderCallback);
            editor.addListener("selectionChanged", renderCallback);

            return this;
        },

        onAddLayer: function (evt) {
            var layer = this.editor.presentation.layers[evt.target.value];
            this.editor.addLayer(layer);
            this.editor.toggleLayerSelection(layer);
        },

        onFrameSelect: function (evt) {
            var frame = this.editor.presentation.frames[evt.target.dataset.frameIndex];
            if (evt.ctrlKey) {
                this.editor.toggleFrameSelection(frame);
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.editor.selectFrame(frame);
                this.editor.selectAllLayers();
            }
        },

        onLayerSelect: function (evt) {
            var layerIndex = evt.target.parentNode.dataset.layerIndex;
            var layer = layerIndex >= 0 ? this.editor.presentation.layers[layerIndex] : null;
            if (evt.ctrlKey) {
                this.editor.toggleLayerSelection(layer);
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.editor.selectLayer(layer);
                this.editor.selectAllFrames();
            }
        },

        onCellSelect: function (evt) {
            var layerIndex = evt.target.parentNode.dataset.layerIndex;
            var layer = layerIndex >= 0 ? this.editor.presentation.layers[layerIndex] : null;
            var frame = this.editor.presentation.frames[evt.target.dataset.frameIndex];
            if (evt.ctrlKey) {
                this.editor.toggleFrameLayerSelection(layer, frame);
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.editor.selectLayer(layer);
                this.editor.selectFrame(frame);
            }
        },

        render: function () {
            document.querySelector("#timeline").innerHTML = nunjucks.render("templates/sozi.editor.view.Timeline.html", {
                editor: this.editor
            });

            document.querySelector("#layer-select").addEventListener("change", this.bind(this.onAddLayer), false);

            Array.prototype.slice.call(document.querySelectorAll("#timeline .frame-index")).forEach(function (th) {
                th.addEventListener("click", this.bind(this.onFrameSelect), false);
            }, this);

            Array.prototype.slice.call(document.querySelectorAll("#timeline .layer-label")).forEach(function (th) {
                th.addEventListener("click", this.bind(this.onLayerSelect), false);
            }, this);

            Array.prototype.slice.call(document.querySelectorAll("#timeline td")).forEach(function (td) {
                td.addEventListener("click", this.bind(this.onCellSelect), false);
            }, this);
        }
    });
});
