/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/*
 * A Selection instance holds the currently selected
 * frames and layers of the presentation.
 *
 * Events:
 *  - change: when the content of the selection has changed
 */
export class Selection {

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
    constructor(presentation) {
        this.presentation = presentation;
        this.selectedFrames = [];
        this.selectedLayers = [];
    }

    toStorable() {
        return {
            selectedFrames: this.selectedFrames.map(frame => frame.frameId),
            selectedLayers: this.selectedLayers.map(layer => layer.groupId)
        };
    }

    fromStorable(storable) {
        if ("selectedFrames" in storable) {
            this.selectedFrames = [];
            for (let frameId of storable.selectedFrames) {
                const frame = this.presentation.getFrameWithId(frameId);
                if (frame) {
                    this.selectedFrames.push(frame);
                }
            }
        }

        if ("selectedLayers" in storable) {
            this.selectedLayers = [];
            for (let groupId of storable.selectedLayers) {
                const layer = this.presentation.getLayerWithId(groupId);
                if (layer) {
                    this.selectedLayers.push(layer);
                }
            }
        }
    }

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
    }

    hasFrames(frames) {
        return frames.every(frame => this.selectedFrames.indexOf(frame) >= 0);
    }

    addFrame(frame) {
        if (this.selectedFrames.indexOf(frame) < 0) {
            this.selectedFrames.push(frame);
        }
    }

    removeFrame(frame) {
        const index = this.selectedFrames.indexOf(frame);
        if (index >= 0) {
            this.selectedFrames.splice(index, 1);
        }
    }

    toggleFrameSelection(frame) {
        const index = this.selectedFrames.indexOf(frame);
        if (index >= 0) {
            this.selectedFrames.splice(index, 1);
        }
        else {
            this.selectedFrames.push(frame);
        }
    }

    hasLayers(layers) {
        return layers.every(layer => this.selectedLayers.indexOf(layer) >= 0);
    }

    addLayer(layer) {
        if (this.selectedLayers.indexOf(layer) < 0) {
            this.selectedLayers.push(layer);
        }
    }

    removeLayer(layer) {
        const index = this.selectedLayers.indexOf(layer);
        if (index >= 0) {
            this.selectedLayers.splice(index, 1);
        }
    }

    toggleLayerSelection(layer) {
        const index = this.selectedLayers.indexOf(layer);
        if (index >= 0) {
            this.selectedLayers.splice(index, 1);
        }
        else {
            this.selectedLayers.push(layer);
        }
    }
}
