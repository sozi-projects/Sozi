namespace("sozi.editor.model", function (exports) {
    "use strict";

    exports.Editor = sozi.model.Object.create({
        init: function (pres) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;
            this.aspect = {num: 4, den: 3};
            this.layers = [];
            this.selectedFrames = pres.frames.length ? [pres.frames[0]] : [];
            this.selectedLayers = [];
            this.defaultLayers = pres.layers.slice();
            this.defaultLayersSelected = true;

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
            return this;
        },

        selectAllLayers: function () {
            this.selectedLayers = this.layers.slice();
            this.defaultLayersSelected = true;
            this.fire("selectionChanged", this.defaultLayersSelected, this.selectedLayers, this.selectedFrames);
            return this;
        },

        selectLayer: function (layer) {
            if (layer === null) {
                this.defaultLayersSelected = true;
                this.selectedLayers = [];
            }
            else {
                this.defaultLayersSelected = false;
                this.selectedLayers = [layer];
            }
            this.fire("selectionChanged", this.defaultLayersSelected, this.selectedLayers, this.selectedFrames);
            return this;
        },

        deselectLayer: function (layer) {
            if (this.layerIsSelected(layer)) {
                this.toggleLayerSelection(layer);
            }
            return this;
        },

        toggleLayerSelection: function (layer) {
            if (layer === null) {
                this.defaultLayersSelected = !this.defaultLayersSelected || !this.selectedLayers.length;
            }
            else {
                var layerIndex = this.selectedLayers.indexOf(layer);
                if (layerIndex < 0) {
                    this.selectedLayers.push(layer);
                }
                else {
                    this.selectedLayers.splice(layerIndex, 1);
                    if (!this.selectedLayers.length) {
                        this.defaultLayersSelected = true;
                    }
                }
            }
            this.fire("selectionChanged", this.defaultLayersSelected, this.selectedLayers, this.selectedFrames);
            return this;
        },

        get defaultLayersAreVisible() {
            return this.defaultLayers.some(function (layer) {
                return layer.isVisible;
            });
        },

        toggleLayerVisibility: function (layer) {
            if (layer) {
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

        layerIsSelected: function (layer) {
            return !layer && this.defaultLayersSelected || this.selectedLayers.indexOf(layer) >= 0;
        },

        addFrame: function () {
            var index = this.selectedFrames.length ?
                this.presentation.frames.indexOf(this.selectedFrames[this.selectedFrames.length - 1]) + 1 :
                this.presentation.frames.length;
            var frame = this.presentation.addFrame(sozi.editor.view.Preview.state, index);
            this.fire("frameAdded", frame, index);
            return frame;
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
            this.fire("selectionChanged", this.defaultLayersSelected, this.selectedLayers, this.selectedFrames);
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
            this.fire("selectionChanged", this.defaultLayersSelected, this.selectedLayers, this.selectedFrames);
            return this;
        },

        toggleFrameSelection: function (frame) {
            var frameIndex = this.selectedFrames.indexOf(frame);
            if (frameIndex < 0) {
                this.selectedFrames.push(frame);
            }
            else {
                this.selectedFrames.splice(frameIndex, 1);
            }
            this.fire("selectionChanged", this.defaultLayersSelected, this.selectedLayers, this.selectedFrames);
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

        toggleFrameLayerSelection: function (layer, frame) {
            var layerIsSelected = this.layerIsSelected(layer);
            var frameIsSelected = this.frameIsSelected(frame);
            if (layerIsSelected === frameIsSelected) {
                this.toggleLayerSelection(layer);
                this.toggleFrameSelection(frame);
            }
            else if (layerIsSelected) {
                this.toggleFrameSelection(frame);
            }
            else if (frameIsSelected) {
                this.toggleLayerSelection(layer);
            }

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
        }
    });
});