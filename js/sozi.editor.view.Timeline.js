
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

            selection.addListener("changed", this.render, this);

            pres.layers.forEach(function (layer) {
                layer.addListener("visibilityChanged", this.render, this);
            }, this);

            return this;
        },

        addFrame: function () {
            var index = this.selection.currentFrame ?
                this.presentation.frames.indexOf(this.selection.currentFrame) + 1 :
                this.presentation.frames.length;
            this.presentation.addFrame(sozi.editor.view.Preview.state, index);
        },

        frameAdded: function (presentation, frame) {
            this.render();
            this.selection.selectFrames([frame]);
        },

        addLayer: function (layerIndex) {
            var layer = this.presentation.layers[layerIndex];
            this.editableLayers.push(layer);
            this.defaultLayers.splice(this.defaultLayers.indexOf(layer), 1);
            this.render();
            this.selection.addLayer(layer);
            return this;
        },

        removeLayer: function (layerIndex) {
            var layer = this.presentation.layers[layerIndex];
            this.selection.removeLayer(layer);
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
                return this.selection.hasLayer(layer);
            }, this);
        },

        updateFrameSelection: function (evt, frameIndex) {
            var frame = this.presentation.frames[frameIndex];
            if (evt.ctrlKey) {
                this.selection.toggleFrame(frame);
            }
            else if (evt.shiftKey) {
                this.selection.toggleFramesTo(frame);
            }
            else {
                this.selection.selectFrames([frame]);
                this.selection.selectLayers(this.presentation.layers);
            }
        },

        updateLayerSelection: function (evt, layerIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers[layerIndex]] :
                this.defaultLayers;
            if (evt.ctrlKey) {
                layers.forEach(function (layer) {
                    this.selection.toggleLayer(layer);
                }, this);
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.selection.selectLayers(layers);
                this.selection.selectFrames(this.presentation.frames);
            }
        },

        updateLayerAndFrameSelection: function (evt, layerIndex, frameIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers[layerIndex]] :
                this.defaultLayers;
            var frame = this.presentation.frames[frameIndex];
            if (evt.ctrlKey) {
                var layersAreSelected = layers.every(function (layer) {
                    return this.selection.hasLayer(layer);
                }, this);
                var frameIsSelected = this.selection.hasFrame(frame);
                if (layersAreSelected && frameIsSelected) {
                    layers.forEach(function (layer) {
                        this.selection.removeLayer(layer);
                    }, this);
                    this.selection.removeFrame(frame);
                }
                else {
                    layers.forEach(function (layer) {
                        this.selection.addLayer(layer);
                    }, this);
                    this.selection.addFrame(frame);
                }
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.selection.selectLayers(layers);
                this.selection.selectFrames([frame]);
            }
        },

        updateLayerVisibility: function (layerIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers[layerIndex]] :
                this.defaultLayers;
            layers.forEach(function (layer) {
                layer.isVisible = !layer.isVisible;
                this.selection.removeLayer(layer);
            }, this);
        },

        render: function () {
            var self = this;

            $("#timeline").html(nunjucks.render("templates/sozi.editor.view.Timeline.html", this));

            $("#add-frame").click(this.bind(this.addFrame));

            $("#add-layer").change(function () {
                self.addLayer(this.value);
            });

            $("#timeline .layer-label .remove").click(function () {
                self.removeLayer(this.parentNode.parentNode.dataset.layerIndex);
            });

            $("#timeline .frame-index, #timeline .frame-title").click(function (evt) {
                self.updateFrameSelection(evt, this.dataset.frameIndex);
            });

            $("#timeline .layer-label").click(function (evt) {
                self.updateLayerSelection(evt, this.parentNode.dataset.layerIndex);
            });

            $("#timeline td").click(function (evt) {
                self.updateLayerAndFrameSelection(evt, this.parentNode.dataset.layerIndex, this.dataset.frameIndex);
            });

            $("#timeline .layer-label .visibility").click(function (evt) {
                self.updateLayerVisibility(this.parentNode.parentNode.dataset.layerIndex);
                evt.stopPropagation();
            });
        }
    });
});
