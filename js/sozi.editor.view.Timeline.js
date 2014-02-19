
namespace("sozi.editor.view", function (exports) {
    "use strict";

    exports.Timeline = sozi.model.Object.create({

        init: function (editor) {
            sozi.model.Object.init.call(this);

            this.editor = editor;

            this.render();

            var renderCallback = this.bind(this.render);
            editor.addListener("layerAdded", renderCallback);
            editor.addListener("layerRemoved", renderCallback);
            editor.addListener("frameAdded", renderCallback);
            editor.addListener("selectionChanged", renderCallback);
            editor.addListener("visibilityChanged", renderCallback);

            return this;
        },

        render: function () {
            var editor = this.editor;

            $("#timeline").html(nunjucks.render("templates/sozi.editor.view.Timeline.html", {
                editor: editor
            }));

            $("#add-frame").click(function () {
                editor.addFrame();
            });

            $("#add-layer").change(function () {
                editor.addLayer(editor.presentation.layers[this.value]);
            });

            $("#timeline .frame-index, #timeline .frame-title").click(function (evt) {
                var frame = editor.presentation.frames[this.dataset.frameIndex];
                if (evt.ctrlKey) {
                    editor.toggleFrameSelection(frame);
                }
                else if (evt.shiftKey) {
                    editor.toggleFrameSequenceSelection(frame);
                }
                else {
                    editor.selectFrame(frame);
                    editor.selectAllLayers();
                }
            });

            $("#timeline .layer-label").click(function (evt) {
                var layerIndex = this.parentNode.dataset.layerIndex;
                var layer = layerIndex >= 0 ? editor.presentation.layers[layerIndex] : "default";
                if (evt.ctrlKey) {
                    editor.toggleLayerSelection(layer);
                }
                else if (evt.shiftKey) {
                    // TODO toggle from last selected to current
                }
                else {
                    editor.selectLayer(layer);
                    editor.selectAllFrames();
                }
            });

            $("#timeline td").click(function (evt) {
                var layerIndex = this.parentNode.dataset.layerIndex;
                var layer = layerIndex >= 0 ? editor.presentation.layers[layerIndex] : "default";
                var frame = editor.presentation.frames[this.dataset.frameIndex];
                if (evt.ctrlKey) {
                    editor.toggleLayerAndFrameSelection(layer, frame);
                }
                else if (evt.shiftKey) {
                    // TODO toggle from last selected to current
                }
                else {
                    editor.selectLayer(layer);
                    editor.selectFrame(frame);
                }
            });

            $("#timeline .layer-label .visibility").click(function (evt) {
                var layerIndex = this.parentNode.parentNode.dataset.layerIndex;
                var layer = layerIndex >= 0 ? editor.presentation.layers[layerIndex] : "default";
                editor.toggleLayerVisibility(layer);
                editor.deselectLayer(layer);
                evt.stopPropagation();
            });

            $("#timeline .layer-label .remove").click(function () {
                editor.removeLayer(editor.presentation.layers[this.parentNode.parentNode.dataset.layerIndex]);
            });
        }
    });
});
