namespace("sozi.editor.model", function (exports) {
    "use strict";

    /*
     * The Selection object holds the currently selected
     * frames and layers of the presentation.
     *
     * Events:
     *  - changed: when the content of the selection has changed
     */
    exports.Selection = sozi.model.Object.create({

        /*
         * Initialize a selection for a given presentation.
         *
         * The selection is initialized with the first frame
         * and all layers.
         *
         * Parameters:
         *  - pres: A Sozi presentation object
         *
         * Returns:
         *  - The current selection object
         */
        init: function (pres) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;

            this.selectFrames(pres.frames.length ? [pres.frames[0]] : []);
            this.selectLayers(pres.layers);

            pres.addListener("framesDeleted", this);

            return this;
        },

        /*
         * Check whether the given layer is selected.
         *
         * Parameters:
         *  - layer: A layer object
         *
         * Returns:
         *  - true if the layer is selected, else false
         */
        hasLayer: function (layer) {
            return this.selectedLayers.indexOf(layer) >= 0;
        },

        /*
         * Add the given layer to the current selection.
         *
         * If the layer is already selected, this method
         * has no effect.
         *
         * Parameters:
         *  - layer: A layer object
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        addLayer: function (layer) {
            if (!this.hasLayer(layer)) {
                this.selectedLayers.push(layer);
                this.fire("changed");
            }
            return this;
        },

        /*
         * Remove the given layer from the current selection.
         *
         * If the layer does not belong to the selection,
         * this method has no effect.
         *
         * Parameters:
         *  - layer: A layer object
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        removeLayer: function (layer) {
            var layerIndex = this.selectedLayers.indexOf(layer);
            if (layerIndex >= 0) {
                this.selectedLayers.splice(layerIndex, 1);
                this.fire("changed");
            }
            return this;
        },

        /*
         * Toggle the status of the given layer in the current selection.
         *
         * If the layer is already selected, it is removed from the selection.
         * If the layer is not already selected, it is added to the selection.
         *
         * Parameters:
         *  - layer: A layer object
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        toggleLayer: function (layer) {
            if (this.hasLayer(layer)) {
                this.removeLayer(layer);
            }
            else {
                this.addLayer(layer);
            }
            return this;
        },

        /*
         * Select the given layers.
         *
         * All layers from the given array are added to the selection.
         * Previously selected layers that do not belong to the given
         * array are removed from the current selection.
         *
         * Parameters:
         *  - layers: an array of layer objects
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        selectLayers: function (layers) {
            this.selectedLayers = layers.slice();
            this.fire("changed");
            return this;
        },

        /*
         * Check whether the given frame is selected.
         *
         * Parameters:
         *  - frame: a frame object
         *
         * Returns:
         *  - true if the frame belongs to the current selection, else false
         */
        hasFrame: function (frame) {
            return this.selectedFrames.indexOf(frame) >= 0;
        },

        /*
         * Check whether the given frame is the last selected frame.
         *
         * Parameters:
         *  - frame: a frame object
         *
         * Returns:
         *  - true if the given frame has been selected last, else false
         */
        frameIsCurrent: function (frame) {
            return this.currentFrame === frame;
        },

        /*
         * Get the last selected frame.
         *
         * Returns:
         *  - The frame that has been selected last, null if no frame is selected.
         */
        get currentFrame() {
            if (this.selectedFrames.length) {
                return this.selectedFrames[this.selectedFrames.length - 1];
            }
            return null;
        },

        /*
         * Add the given frame to the current selection.
         *
         * If the frame is already selected, this method
         * has no effect.
         *
         * Parameters:
         *  - frame: A frame object
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        addFrame: function (frame) {
            if (!this.hasFrame(frame)) {
                this.selectedFrames.push(frame);
                this.fire("changed");
            }
            return this;
        },

        /*
         * Remove the given frame from the current selection.
         *
         * If the frame is not already selected, this method
         * has no effect.
         *
         * Parameters:
         *  - frame: A frame object
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        removeFrame: function (frame) {
            var frameIndex = this.selectedFrames.indexOf(frame);
            if (frameIndex >= 0) {
                this.selectedFrames.splice(frameIndex, 1);
                this.fire("changed");
            }
            return this;
        },

        /*
         * Toggle the status of the given frame in the current selection.
         *
         * If the frame is already selected, it is removed from the selection.
         * If the frame is not already selected, it is added to the selection.
         *
         * Parameters:
         *  - frame: A frame object
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
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
         * Select the given frames.
         *
         * All frames from the given array are added to the selection.
         * Previously selected frames that do not belong to the given
         * array are removed from the current selection.
         *
         * Parameters:
         *  - frames: an array of frame objects
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        selectFrames: function (frames) {
            this.selectedFrames = frames.slice();
            this.fire("changed");
            return this;
        },

        /*
         * Toggle the status of a sequence of frames in the current selection.
         *
         * If the selection is empty, then the given frame is selected.
         * If the selection is not empty, the sequence starts at a frame
         * next to the current frame and ends at the given frame:
         *  - If the given frame comes after the current frame in the presentation order,
         *    then the sequence starts at the frame after the current,
         *  - otherwise, the sequence starts at the frame before the current.
         *
         * Parameters:
         *  - frame: A frame object
         *
         * Fires:
         *  - changed
         *
         * Returns:
         *  - The current selection object
         */
        toggleFramesTo: function (frame) {
            if (!this.selectedFrames.length) {
                this.addFrame(frame);
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
        },

        /*
         * Event handler: Frames deleted from presentation.
         *
         * This method is called when a presentation object
         * fires the "framesDeleted" event.
         *
         * Parameters:
         *  - pres: The presentation that fired the event
         *  - frames: An array of frames.
         */
        framesDeleted: function (pres, frames) {
            frames.forEach(function (frame) {
                this.removeFrame(frame);
            }, this);
        }
    });
});