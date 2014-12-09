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
    exports.Selection = {

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
        init: function (presentation) {
            this.presentation = presentation;
            this.selectedFrames = [];
            this.selectedLayers = [];
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
                this.selectedFrames = [];
                storable.selectedFrames.forEach(function (frameId) {
                    var frame = this.presentation.getFrameWithId(frameId);
                    if (frame) {
                        this.selectedFrames.push(frame);
                    }
                }, this);
            }

            if ("selectedLayers" in storable) {
                this.selectedLayers = [];
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
            return this.selectedFrames.length ?
                this.selectedFrames[this.selectedFrames.length - 1] :
                null;
        },

        hasFrames: function (frames) {
            return frames.every(function (frame) {
                return this.selectedFrames.indexOf(frame) >= 0;
            }, this);
        },

        addFrame: function (frame) {
            if (this.selectedFrames.indexOf(frame) < 0) {
                this.selectedFrames.push(frame);
            }
        },

        removeFrame: function (frame) {
            var index = this.selectedFrames.indexOf(frame);
            if (index >= 0) {
                this.selectedFrames.splice(index, 1);
            }
        },

        toggleFrameSelection: function (frame) {
            var index = this.selectedFrames.indexOf(frame);
            if (index >= 0) {
                this.selectedFrames.splice(index, 1);
            }
            else {
                this.selectedFrames.push(frame);
            }
        },

        hasLayers: function (layers) {
            return layers.every(function (layer) {
                return this.selectedLayers.indexOf(layer) >= 0;
            }, this);
        },

        addLayer: function (layer) {
            if (this.selectedLayers.indexOf(layer) < 0) {
                this.selectedLayers.push(layer);
            }
        },

        removeLayer: function (layer) {
            var index = this.selectedLayers.indexOf(layer);
            if (index >= 0) {
                this.selectedLayers.splice(index, 1);
            }
        },

        toggleLayerSelection: function (layer) {
            var index = this.selectedLayers.indexOf(layer);
            if (index >= 0) {
                this.selectedLayers.splice(index, 1);
            }
            else {
                this.selectedLayers.push(layer);
            }
        }
    };
});
