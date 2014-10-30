/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.model", function (exports) {
    "use strict";

    /*
     * The Selection object holds the currently selected
     * frames and layers of the presentation.
     *
     * Events:
     *  - change: when the content of the selection has changed
     */
    exports.Selection = sozi.model.Object.clone({
        
        presentation: null,
        selectedFrames: [],
        selectedLayers: [],
        
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
            this.presentation = pres;

            if (pres.frames.length) {
                this.selectedFrames.push(pres.frames.first);
            }
            this.selectedLayers.pushAll(pres.layers);

            pres.frames.addListener("remove", this.onRemoveFrame, this);
            pres.layers.addListener("add", this.onAddLayer, this);
            pres.layers.addListener("remove", this.onRemoveLayer, this);

            return this;
        },

        toStorable: function () {
            return {
                selectedFrames: this.selectedFrames.map(function (frame) {
                    return frame.frameId;
                }),
                selectedLayers: this.selectedLayers.map(function (layer) {
                    return layer.groupId;
                })
            };
        },

        fromStorable: function (storable) {
            if ("selectedFrames" in storable) {
                this.selectedFrames.clear();
                storable.selectedFrames.forEach(function (frameId) {
                    var frame = this.presentation.getFrameWithId(frameId);
                    if (frame) {
                        this.selectedFrames.push(frame);
                    }
                }, this);
            }

            if ("selectedLayers" in storable) {
                this.selectedLayers.clear();
                storable.selectedLayers.forEach(function (groupId) {
                    var layer = this.presentation.getLayerWithId(groupId);
                    if (layer) {
                        this.selectedLayers.push(layer);
                    }
                }, this);
            }
        },

        /*
         * Get the last selected frame.
         *
         * Returns:
         *  - The frame that has been selected last, null if no frame is selected.
         */
        get currentFrame() {
            if (this.selectedFrames.length) {
                return this.selectedFrames.last;
            }
            return null;
        },

        /*
         * Event handler: Frames deleted from presentation.
         *
         * This method is called when a presentation object
         * fires the "framesDeleted" event.
         *
         * Parameters:
         *  - collection: The collection that fired the event
         *  - frame: The removed frame
         *  - index: The index of the removed frame in the collection
         */
        onRemoveFrame: function (collection, frame) {
            this.selectedFrames.remove(frame);
        },
        
        onAddLayer: function (collection, layer) {
            this.selectedLayers.push(layer);
        },
        
        onRemoveLayer: function (collection, layer) {
            this.selectedLayers.remove(layer);
        }
    });
});
