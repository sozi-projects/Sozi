
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
            }
            this.editor.selectAllLayers();
        },

        onLayerSelect: function (evt) {
            var index = parseInt(evt.target.parentNode.dataset.layerIndex, 10);
            var layer = index >= 0 ? this.editor.presentation.layers[index] : null;
            if (evt.ctrlKey) {
                this.editor.toggleLayerSelection(layer);
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.editor.selectLayer(layer);
            }
            this.editor.selectAllFrames();
        },

        render: function () {
            document.querySelector("#timeline").innerHTML = nunjucks.render("templates/sozi.editor.view.Timeline.html", {
                editor: this.editor
            });

            document.querySelector("#layer-select").addEventListener("change", this.bind(this.onAddLayer), false);

            Array.prototype.slice.call(document.querySelectorAll(".frame-index")).forEach(function (th) {
                th.addEventListener("click", this.bind(this.onFrameSelect), false);
            }, this);

            Array.prototype.slice.call(document.querySelectorAll(".layer-label")).forEach(function (th) {
                th.addEventListener("click", this.bind(this.onLayerSelect), false);
            }, this);
        }
    });
});
