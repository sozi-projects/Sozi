
namespace("sozi.editor.view", function (exports) {
    "use strict";

    exports.Timeline = sozi.model.Object.create({

        init: function (pres, selection) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;
            this.selection = selection;

            this.editableLayers = [];
            this.defaultLayers = pres.layers.slice();

            this.render();

            pres.addListener("frameAdded", this);

            var renderCallback = this.bind(this.render);
            selection.addListener("selectionChanged", renderCallback);

            pres.layers.forEach(function (layer) {
                layer.addListener("visibilityChanged", renderCallback);
            });

            return this;
        },

        addLayer: function (layer) {
            this.editableLayers.push(layer);
            this.defaultLayers.splice(this.defaultLayers.indexOf(layer), 1);
            this.render();
            this.selection.addLayerToSelection(layer);
            return this;
        },

        removeLayer: function (layer) {
            this.selection.removeLayerFromSelection(layer);
            this.editableLayers.splice(this.editableLayers.indexOf(layer), 1);
            this.defaultLayers.push(layer);
            this.render();
            return this;
        },

        get defaultLayersAreVisible() {
            return this.defaultLayers.some(function (layer) {
                return layer.isVisible;
            });
        },

        get defaultLayersAreSelected() {
            return this.defaultLayers.every(function (layer) {
                return this.selection.layerIsSelected(layer);
            }, this);
        },

        toggleLayerVisibility: function (layer) {
            if (layer === "default") {
                this.defaultLayers.forEach(function (layer) {
                    layer.isVisible = !layer.isVisible;
                });
            }
            else {
                layer.isVisible = !layer.isVisible;
            }
            return this;
        },

        frameAdded: function (presentation, frame) {
            this.render();
            this.selection.selectFrames([frame]);
        },

        render: function () {
            var self = this;

            $("#timeline").html(nunjucks.render("templates/sozi.editor.view.Timeline.html", this));

            $("#add-frame").click(function () {
                var index = self.selection.currentFrame ?
                    self.presentation.frames.indexOf(self.selection.currentFrame) + 1 :
                    self.presentation.frames.length;
                self.presentation.addFrame(sozi.editor.view.Preview.state, index);
            });

            $("#add-layer").change(function () {
                self.addLayer(self.presentation.layers[this.value]);
            });

            $("#timeline .frame-index, #timeline .frame-title").click(function (evt) {
                var frame = self.presentation.frames[this.dataset.frameIndex];
                if (evt.ctrlKey) {
                    self.selection.toggleFrameSelection(frame);
                }
                else if (evt.shiftKey) {
                    self.selection.toggleFrameSelectionTo(frame);
                }
                else {
                    self.selection.selectFrames([frame]);
                    self.selection.selectLayers(self.presentation.layers);
                }
            });

            $("#timeline .layer-label").click(function (evt) {
                var layerIndex = this.parentNode.dataset.layerIndex;
                var layers = layerIndex >= 0 ?
                    [self.presentation.layers[layerIndex]] :
                    self.defaultLayers;
                if (evt.ctrlKey) {
                    self.selection.toggleLayerSelection(layers);
                }
                else if (evt.shiftKey) {
                    // TODO toggle from last selected to current
                }
                else {
                    self.selection.selectLayers(layers);
                    self.selection.selectFrames(self.presentation.frames);
                }
            });

            $("#timeline td").click(function (evt) {
                var layerIndex = this.parentNode.dataset.layerIndex;
                var layers = layerIndex >= 0 ?
                    [self.presentation.layers[layerIndex]] :
                    self.defaultLayers;
                var frame = self.presentation.frames[this.dataset.frameIndex];
                if (evt.ctrlKey) {
                    self.selection.toggleLayersAndFrameSelection(layers, frame);
                }
                else if (evt.shiftKey) {
                    // TODO toggle from last selected to current
                }
                else {
                    self.selection.selectLayers(layers);
                    self.selection.selectFrames([frame]);
                }
            });

            $("#timeline .layer-label .visibility").click(function (evt) {
                var layerIndex = this.parentNode.parentNode.dataset.layerIndex;
                var layers = layerIndex >= 0 ?
                    [self.presentation.layers[layerIndex]] :
                    self.defaultLayers;
                layers.forEach(function (layer) {
                    self.toggleLayerVisibility(layer);
                    self.selection.removeLayerFromSelection(layer);
                });
                evt.stopPropagation();
            });

            $("#timeline .layer-label .remove").click(function () {
                self.removeLayer(self.presentation.layers[this.parentNode.parentNode.dataset.layerIndex]);
            });
        }
    });
});
