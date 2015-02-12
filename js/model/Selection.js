/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * The Selection object holds the currently selected
 * frames and layers of the presentation.
 *
 * Events:
 *  - change: when the content of the selection has changed
 */
export var Selection = {

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
    init(presentation) {
        this.presentation = presentation;
        this.selectedFrames = [];
        this.selectedLayers = [];
        return this;
    },

    toStorable() {
        return {
            selectedFrames: this.selectedFrames.map(frame => frame.frameId),
            selectedLayers: this.selectedLayers.map(layer => layer.groupId)
        };
    },

    fromStorable(storable) {
        if ("selectedFrames" in storable) {
            this.selectedFrames = [];
            storable.selectedFrames.forEach(frameId => {
                var frame = this.presentation.getFrameWithId(frameId);
                if (frame) {
                    this.selectedFrames.push(frame);
                }
            });
        }

        if ("selectedLayers" in storable) {
            this.selectedLayers = [];
            storable.selectedLayers.forEach(groupId => {
                var layer = this.presentation.getLayerWithId(groupId);
                if (layer) {
                    this.selectedLayers.push(layer);
                }
            });
        }
    },

    /*
     * Get the last selected frame.
     *
     * Returns:
     *  - The frame that has been selected last, null if no frame is selected.
     */
    get currentFrame() {
        return this.selectedFrames.length ?
            this.selectedFrames[this.selectedFrames.length - 1] :
            null;
    },

    hasFrames(frames) {
        return frames.every(frame => this.selectedFrames.indexOf(frame) >= 0);
    },

    addFrame(frame) {
        if (this.selectedFrames.indexOf(frame) < 0) {
            this.selectedFrames.push(frame);
        }
    },

    removeFrame(frame) {
        var index = this.selectedFrames.indexOf(frame);
        if (index >= 0) {
            this.selectedFrames.splice(index, 1);
        }
    },

    toggleFrameSelection(frame) {
        var index = this.selectedFrames.indexOf(frame);
        if (index >= 0) {
            this.selectedFrames.splice(index, 1);
        }
        else {
            this.selectedFrames.push(frame);
        }
    },

    hasLayers(layers) {
        return layers.every(layer => this.selectedLayers.indexOf(layer) >= 0);
    },

    addLayer(layer) {
        if (this.selectedLayers.indexOf(layer) < 0) {
            this.selectedLayers.push(layer);
        }
    },

    removeLayer(layer) {
        var index = this.selectedLayers.indexOf(layer);
        if (index >= 0) {
            this.selectedLayers.splice(index, 1);
        }
    },

    toggleLayerSelection(layer) {
        var index = this.selectedLayers.indexOf(layer);
        if (index >= 0) {
            this.selectedLayers.splice(index, 1);
        }
        else {
            this.selectedLayers.push(layer);
        }
    }
};
