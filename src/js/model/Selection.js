/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/** Selection in the timeline of the Sozi editor.
 *
 * A Selection instance holds the currently selected
 * frames and layers of the presentation.
 */
export class Selection {

    /** Create an empty selection for a given presentation.
     *
     * @param {module:model/Presentation.Presentation} presentation - A Sozi presentation object
     */
    constructor(presentation) {
        /** The presentation where selections happen.
         *
         * @type {module:model/Presentation.Presentation}
         */
        this.presentation = presentation;

        /** The list of selected frames.
         *
         * @default
         * @type {module:model/Presentation.Frame[]}
         */
        this._selectedFrames = [];

        /** The list of selected layers.
         *
         * @default
         * @type {module:model/Presentation.Layer[]}
         */
        this._selectedLayers = [];

        /** Set for O(1) frame lookup.
         *
         * @type {Set<module:model/Presentation.Frame>}
         */
        this._selectedFrameSet = new Set();

        /** Set for O(1) layer lookup.
         *
         * @type {Set<module:model/Presentation.Layer>}
         */
        this._selectedLayerSet = new Set();
    }

    /** @type {module:model/Presentation.Frame[]} */
    get selectedFrames() {
        return this._selectedFrames;
    }

    set selectedFrames(arr) {
        this._selectedFrames = arr;
        this._selectedFrameSet = new Set(arr);
    }

    /** @type {module:model/Presentation.Layer[]} */
    get selectedLayers() {
        return this._selectedLayers;
    }

    set selectedLayers(arr) {
        this._selectedLayers = arr;
        this._selectedLayerSet = new Set(arr);
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains all the properties needed by the editor to restore
     * the state of this instance.
     *
     * @returns {object} - A plain object with the properties needed by the editor.
     */
    toStorable() {
        return {
            selectedFrames: this._selectedFrames.map(frame => frame.frameId),
            selectedLayers: this._selectedLayers.map(layer => layer.groupId)
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {object} storable - A plain object with the properties to copy.
     */
    fromStorable(storable) {
        if ("selectedFrames" in storable) {
            this._selectedFrames = [];
            this._selectedFrameSet = new Set();
            for (let frameId of storable.selectedFrames) {
                const frame = this.presentation.getFrameWithId(frameId);
                if (frame) {
                    this._selectedFrames.push(frame);
                    this._selectedFrameSet.add(frame);
                }
            }
        }

        if ("selectedLayers" in storable) {
            this._selectedLayers = [];
            this._selectedLayerSet = new Set();
            for (let groupId of storable.selectedLayers) {
                const layer = this.presentation.getLayerWithId(groupId);
                if (layer) {
                    this._selectedLayers.push(layer);
                    this._selectedLayerSet.add(layer);
                }
            }
        }
    }

    /** The frame that was selected last, `null` if no frame is selected.
     *
     * @type {module:model/Presentation.Frame}
     */
    get currentFrame() {
        return this._selectedFrames.length ?
            this._selectedFrames[this._selectedFrames.length - 1] :
            null;
    }

    /** Check whether this selection contains the given frames.
     *
     * @param {module:model/Presentation.Frame[]} frames - The frames to check.
     * @returns {boolean} - `true` if all the given frames are selected.
     */
    hasFrames(frames) {
        return frames.every(frame => this._selectedFrameSet.has(frame));
    }

    /** Check if a single frame is selected.
     *
     * @param {module:model/Presentation.Frame} frame - The frame to check.
     * @returns {boolean} - `true` if the given frame is selected.
     */
    hasFrame(frame) {
        return this._selectedFrameSet.has(frame);
    }

    /** Add a frame to this selection.
     *
     * @param {module:model/Presentation.Frame} frame - The frame to add.
     */
    addFrame(frame) {
        if (!this._selectedFrameSet.has(frame)) {
            this._selectedFrames.push(frame);
            this._selectedFrameSet.add(frame);
        }
    }

    /** Remove a frame from this selection.
     *
     * @param {module:model/Presentation.Frame} frame - The frame to remove.
     */
    removeFrame(frame) {
        if (this._selectedFrameSet.delete(frame)) {
            const index = this._selectedFrames.indexOf(frame);
            if (index >= 0) {
                this._selectedFrames.splice(index, 1);
            }
        }
    }

    /** Add or remove the given frame to/from this selection.
     *
     * If the frame is not selected, add it to the selection,
     * otherwise, remove it.
     *
     * @param {module:model/Presentation.Frame} frame - The frame to add or remove.
     */
    toggleFrameSelection(frame) {
        if (this._selectedFrameSet.has(frame)) {
            this._selectedFrameSet.delete(frame);
            const index = this._selectedFrames.indexOf(frame);
            if (index >= 0) {
                this._selectedFrames.splice(index, 1);
            }
        }
        else {
            this._selectedFrames.push(frame);
            this._selectedFrameSet.add(frame);
        }
    }

    /** Check whether this selection contains the given layers.
     *
     * @param {module:model/Presentation.Layer[]} layers - The layers to check.
     * @returns {boolean} - `true` if all the given layers are selected.
     */
    hasLayers(layers) {
        return layers.every(layer => this._selectedLayerSet.has(layer));
    }

    /** Check if a single layer is selected.
     *
     * @param {module:model/Presentation.Layer} layer - The layer to check.
     * @returns {boolean} - `true` if the given layer is selected.
     */
    hasLayer(layer) {
        return this._selectedLayerSet.has(layer);
    }

    /** Add a layer to this selection.
     *
     * @param {module:model/Presentation.Layer} layer - The layer to add.
     */
    addLayer(layer) {
        if (!this._selectedLayerSet.has(layer)) {
            this._selectedLayers.push(layer);
            this._selectedLayerSet.add(layer);
        }
    }

    /** Remove a layer from this selection.
     *
     * @param {module:model/Presentation.Layer} layer - The layer to remove.
     */
    removeLayer(layer) {
        if (this._selectedLayerSet.delete(layer)) {
            const index = this._selectedLayers.indexOf(layer);
            if (index >= 0) {
                this._selectedLayers.splice(index, 1);
            }
        }
    }

    /** Add or remove the given layer to/from this selection.
     *
     * If the layer is not selected, add it to the selection,
     * otherwise, remove it.
     *
     * @param {module:model/Presentation.Layer} layer - The layer to add or remove.
     */
    toggleLayerSelection(layer) {
        if (this._selectedLayerSet.has(layer)) {
            this._selectedLayerSet.delete(layer);
            const index = this._selectedLayers.indexOf(layer);
            if (index >= 0) {
                this._selectedLayers.splice(index, 1);
            }
        }
        else {
            this._selectedLayers.push(layer);
            this._selectedLayerSet.add(layer);
        }
    }
}
