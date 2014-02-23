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

        hasLayer: function (layer) {
            return this.selectedLayers.indexOf(layer) >= 0;
        },

        addLayer: function (layer) {
            if (!this.hasLayer(layer)) {
                this.selectedLayers.push(layer);
                this.fire("changed");
            }
            return this;
        },

        removeLayer: function (layer) {
            var layerIndex = this.selectedLayers.indexOf(layer);
            if (layerIndex >= 0) {
                this.selectedLayers.splice(layerIndex, 1);
                this.fire("changed");
            }
            return this;
        },

        toggleLayer: function (layer) {
            if (this.hasLayer(layer)) {
                this.removeLayer(layer);
            }
            else {
                this.addLayer(layer);
            }
            return this;
        },

        selectLayers: function (layers) {
            this.selectedLayers = layers.slice();
            this.fire("changed");
            return this;
        },

        hasFrame: function (frame) {
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

        addFrame: function (frame) {
            if (!this.hasFrame(frame)) {
                this.selectedFrames.push(frame);
                this.fire("changed");
            }
            return this;
        },

        removeFrame: function (frame) {
            var frameIndex = this.selectedFrames.indexOf(frame);
            if (frameIndex >= 0) {
                this.selectedFrames.splice(frameIndex, 1);
                this.fire("changed");
            }
            return this;
        },

        toggleFrame: function (frame) {
            if (this.hasFrame(frame)) {
                this.removeFrame(frame);
            }
            else {
                this.addFrame(frame);
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
         *    - changed(array)
         *
         * Returns:
         *    - The current object.
         */
        selectFrames: function (frames) {
            this.selectedFrames = frames.slice();
            this.fire("changed");
            return this;
        },

        toggleFramesTo: function (frame) {
            if (!this.selectedFrames.length) {
                this.toggleFrame(frame);
            }
            else {
                var endIndex = frame.index;
                var startIndex = this.currentFrame.index;
                var inc = startIndex <= endIndex ? 1 : -1;
                for (var i = startIndex + inc; startIndex <= endIndex ? i <= endIndex : i >= endIndex; i += inc) {
                    this.toggleFrame(this.presentation.frames[i]);
                }
            }
            return this;
        }
    });
});