namespace("sozi.editor.model", function (exports) {
    "use strict";

    exports.Selection = sozi.model.Object.create({
        init: function (pres) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;

            this.selectFrames(pres.frames.length ? [pres.frames[0]] : []);
            this.selectLayers(pres.layers);

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
                this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            }
            return this;
        },

        toggleLayerSelection: function (layers) {
            layers.forEach(function (layer) {
                if (this.layerIsSelected(layer)) {
                    this.removeLayerFromSelection(layer);
                }
                else {
                    this.addLayerToSelection(layer);
                }
            }, this);
            return this;
        },

        selectLayers: function (layers) {
            this.selectedLayers = layers.slice();
            this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            return this;
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
        selectFrames: function (frames) {
            this.selectedFrames = frames.slice();
            this.fire("selectionChanged", this.selectedLayers, this.selectedFrames);
            return this;
        },

        toggleFrameSelectionTo: function (frame) {
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

        toggleLayersAndFrameSelection: function (layers, frame) {
            var layersAreSelected = layers.every(function (layer) {
                return this.layerIsSelected(layer);
            }, this);
            var frameIsSelected = this.frameIsSelected(frame);
            if (layersAreSelected && frameIsSelected) {
                layers.forEach(function (layer) {
                    this.removeLayerFromSelection(layer);
                }, this);
                this.removeFrameFromSelection(frame);
            }
            else {
                layers.forEach(function (layer) {
                    this.addLayerToSelection(layer);
                }, this);
                this.addFrameToSelection(frame);
            }
            return this;
        }
    });
});