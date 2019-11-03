/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/** Selection in the timeline of the Sozi editor.
 *
 * A Selection instance holds the currently selected
 * frames and layers of the presentation.
 *
 * @category model
 */
export class Selection {

    /** Create an empty selection for a given presentation.
     *
     * @param {Presentation} presentation - A Sozi presentation object
     */
    constructor(presentation) {
        /** The presentation where selections happen.
         * @type {Presentation} */
        this.presentation = presentation;

        /** The list of selected frames.
         * @type {Frame[]} */
        this.selectedFrames = [];

        /** The list of selected layers.
         * @type {Layer[]} */
        this.selectedLayers = [];
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * @return A plain object with the properties that need to be saved.
     */
    toStorable() {
        return {
            selectedFrames: this.selectedFrames.map(frame => frame.frameId),
            selectedLayers: this.selectedLayers.map(layer => layer.groupId)
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {Object} storable A plain object with the properties to copy.
     */
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

    /** The frame that was selected last, `null` if no frame is selected.
     *
     * @type {Frame}
     */
    get currentFrame() {
        return this.selectedFrames.length ?
            this.selectedFrames[this.selectedFrames.length - 1] :
            null;
    }

    /** Check whether this selection contains the given frames.
     *
     * @param {Frame[]} frames - The frames to check.
     * @return `true` if all the given frames are selected.
     */
    hasFrames(frames) {
        return frames.every(frame => this.selectedFrames.indexOf(frame) >= 0);
    }

    /** Add a frame to this selection.
     *
     * @param {Frame} frame - The frame to add.
     */
    addFrame(frame) {
        if (this.selectedFrames.indexOf(frame) < 0) {
            this.selectedFrames.push(frame);
        }
    }

    /** Remove a frame from this selection.
     *
     * @param {Frame} frame - The frame to remove.
     */
    removeFrame(frame) {
        const index = this.selectedFrames.indexOf(frame);
        if (index >= 0) {
            this.selectedFrames.splice(index, 1);
        }
    }

    /** Add or remove the given frame to/from this selection.
     *
     * If the frame is not selected, add it to the selection,
     * otherwise, remove it.
     *
     * @param {Frame} frame - The frame to add or remove.
     */
    toggleFrameSelection(frame) {
        const index = this.selectedFrames.indexOf(frame);
        if (index >= 0) {
            this.selectedFrames.splice(index, 1);
        }
        else {
            this.selectedFrames.push(frame);
        }
    }

    /** Check whether this selection contains the given layers.
     *
     * @param {Layer[]} layers - The layers to check.
     * @return `true` if all the given layers are selected.
     */
    hasLayers(layers) {
        return layers.every(layer => this.selectedLayers.indexOf(layer) >= 0);
    }

    /** Add a layer to this selection.
     *
     * @param {Layer} layer - The layer to add.
     */
    addLayer(layer) {
        if (this.selectedLayers.indexOf(layer) < 0) {
            this.selectedLayers.push(layer);
        }
    }

    /** Remove a layer from this selection.
     *
     * @param {Layer} layer - The layer to remove.
     */
    removeLayer(layer) {
        const index = this.selectedLayers.indexOf(layer);
        if (index >= 0) {
            this.selectedLayers.splice(index, 1);
        }
    }

    /** Add or remove the given layer to/from this selection.
     *
     * If the layer is not selected, add it to the selection,
     * otherwise, remove it.
     *
     * @param {Layer} layer - The layer to add or remove.
     */
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
