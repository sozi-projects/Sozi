namespace("sozi.editor.model", function (exports) {
    "use strict";

    exports.Editor = sozi.model.Object.create({
        init: function (pres) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;
            this.aspect = {num: 4, den: 3};
            this.selectedFrames = pres.frames.length ? [pres.frames[0]] : [];

            this.layers = [];
            this.selectedLayers = ["default"];
            this.defaultLayers = pres.layers.slice();

            return this;
        },

        setAspectRatio: function (num, den) {
            if (num > 0 && den > 0) {
                this.aspect.num = num;
                this.aspect.den = den;
                this.fire("aspectRatioChanged", num, den);
            }
            return this;
        },

        addLayer: function (layer) {
            this.layers.push(layer);
            this.defaultLayers.splice(this.defaultLayers.indexOf(layer), 1);
            this.fire("layerAdded", layer);
            this.addLayerToSelection(layer);
            return this;
        },

        removeLayer: function (layer) {
            this.removeLayerFromSelection(layer);
            this.layers.splice(this.layers.indexOf(layer), 1);
            this.defaultLayers.push(layer);
            this.fire("layerRemoved", layer);
            return this;
        },

        layerIsSelected: function (layer) {
            return this.selectedLayers.indexOf(layer) >= 0;
        },

        addLayerToSelection: function (layer) {
            if (!this.layerIsSelected(layer)) {
                this.selectedLayers.push(layer);
                this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            }
            return this;
        },

        removeLayerFromSelection: function (layer) {
            var layerIndex = this.selectedLayers.indexOf(layer);
            if (layerIndex >= 0) {
                this.selectedLayers.splice(layerIndex, 1);
                if (!this.selectedLayers.length) {
                    this.selectedLayers.push("default");
                }
                this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            }
            return this;
        },

        toggleLayerSelection: function (layer) {
            if (this.layerIsSelected(layer)) {
                this.removeLayerFromSelection(layer);
            }
            else {
                this.addLayerToSelection(layer);
            }
            return this;
        },

        selectLayer: function (layer) {
            this.selectedLayers = [layer];
            this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            return this;
        },

        selectAllLayers: function () {
            this.selectedLayers = ["default"].concat(this.layers);
            this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            return this;
        },

        get defaultLayersAreVisible() {
            return this.defaultLayers.some(function (layer) {
                return layer.isVisible;
            });
        },

        toggleLayerVisibility: function (layer) {
            if (layer !== "default") {
                layer.isVisible = !layer.isVisible;
            }
            else {
                this.defaultLayers.forEach(function (layer) {
                    layer.isVisible = !layer.isVisible;
                });
            }
            this.fire("visibilityChanged", layer);
            return this;
        },

        addFrame: function () {
            var index = this.selectedFrames.length ?
                this.presentation.frames.indexOf(this.selectedFrames[this.selectedFrames.length - 1]) + 1 :
                this.presentation.frames.length;
            var frame = this.presentation.addFrame(sozi.editor.view.Preview.state, index);
            this.fire("frameAdded", frame, index);
            this.selectFrame(frame);
            return frame;
        },

        frameIsSelected: function (frame) {
            return this.selectedFrames.indexOf(frame) >= 0;
        },

        frameIsCurrent: function (frame) {
            return this.currentFrame === frame;
        },

        get currentFrame() {
            if (this.selectedFrames.length) {
                return this.selectedFrames[this.selectedFrames.length - 1];
            }
            return null;
        },

        addFrameToSelection: function (frame) {
            if (!this.frameIsSelected(frame)) {
                this.selectedFrames.push(frame);
                this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            }
            return this;
        },

        removeFrameFromSelection: function (frame) {
            var frameIndex = this.selectedFrames.indexOf(frame);
            if (frameIndex >= 0) {
                this.selectedFrames.splice(frameIndex, 1);
                this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            }
            return this;
        },

        toggleFrameSelection: function (frame) {
            if (this.frameIsSelected(frame)) {
                this.removeFrameFromSelection(frame);
            }
            else {
                this.addFrameToSelection(frame);
            }
            return this;
        },

        /*
         * Mark a frame as selected.
         *
         * Parameters:
         *    - frame: The frame to select
         *
         * Fires:
         *    - selectionChanged(array)
         *
         * Returns:
         *    - The current object.
         */
        selectFrame: function (frame) {
            this.selectedFrames = [frame];
            this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            return this;
        },

        /*
         * Mark all frames as selected.
         *
         * Fires:
         *    - selectionChanged(array)
         *
         * Returns:
         *    - The current object.
         */
        selectAllFrames: function () {
            this.selectedFrames = this.presentation.frames.slice();
            this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            return this;
        },

        toggleFrameSequenceSelection: function (frame) {
            if (!this.selectedFrames.length) {
                this.toggleFrameSelection(frame);
            }
            else {
                var endIndex = frame.index;
                var startIndex = this.currentFrame.index;
                var inc = startIndex <= endIndex ? 1 : -1;
                for (var i = startIndex + inc; startIndex <= endIndex ? i <= endIndex : i >= endIndex; i += inc) {
                    this.toggleFrameSelection(this.presentation.frames[i]);
                }
            }
            return this;
        },

        toggleLayerAndFrameSelection: function (layer, frame) {
            var layerIsSelected = this.layerIsSelected(layer);
            var frameIsSelected = this.frameIsSelected(frame);
            if (layerIsSelected && frameIsSelected) {
                this.removeLayerFromSelection(layer);
                this.removeFrameFromSelection(frame);
            }
            else {
                if (!layerIsSelected) {
                    this.addLayerToSelection(layer);
                }
                if (!frameIsSelected) {
                    this.addFrameToSelection(frame);
                }
            }
            return this;
        }
    });
});