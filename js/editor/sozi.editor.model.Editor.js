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
            this.defaultLayerSelected = true;

            return this;
        },

        setAspectRatio: function (num, den) {
            if (num > 0 && den > 0) {
                this.aspect.num = num;
                this.aspect.den = den;
                this.fire("setAspectRatio", num, den);
            }
            return this;
        },

        addLayer: function (layer) {
            this.layers.push(layer);
            this.fire("addLayer", layer);
            return this;
        },

        selectAllLayers: function () {
            this.selectedLayers = this.layers;
            this.defaultLayerSelected = true;
            this.fire("selectionChanged");
            return this;
        },

        /*
         * Deselect all managed layers.
         * Unmanaged layers are selected automatically.
         */
        deselectAllLayers: function () {
            this.selectedLayers = [];
            this.defaultLayerSelected = true;
            this.fire("selectionChanged");
            return this;
        },

        selectLayer: function (layer) {
            if (layer === null) {
                this.defaultLayerSelected = true;
                this.selectedLayers = [];
            }
            else {
                this.defaultLayerSelected = false;
                this.selectedLayers = [layer];
            }
            this.fire("selectionChanged");
            return this;
        },

        toggleLayerSelection: function (layer) {
            if (layer === null) {
                if (!this.defaultLayerSelected) {
                    this.defaultLayerSelected = true;
                }
                else if (this.selectedLayers.length) {
                    this.defaultLayerSelected = false;
                }
            }
            else {
                var index = this.selectedLayers.indexOf(layer);
                if (index < 0) {
                    this.selectedLayers.push(layer);
                }
                else {
                    this.selectedLayers.splice(index, 1);
                }
                if (!this.selectedLayers.length) {
                    this.defaultLayerSelected = true;
                }
            }
            this.fire("selectionChanged");
            return this;
        },

        addFrame: function () {
            var index = this.selectedFrames.length ?
                this.presentation.frames.indexOf(this.selectedFrames[this.selectedFrames.length - 1]) + 1 :
                this.presentation.frames.length;
            var frame = this.presentation.addFrame(sozi.editor.view.Preview.cameras, index);
            this.fire("addFrame", frame, index);
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
            this.selectedFrames = this.presentation.frames;
            this.fire("selectionChanged");
            return this;
        },

        /*
         * Mark all frames as deselected.
         *
         * Fires:
         *    - selectionChanged(array)
         *
         * Returns:
         *    - The current object.
         */
        deselectAllFrames: function () {
            this.selectedFrames = [];
            this.fire("selectionChanged");
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
            this.fire("selectionChanged");
            return this;
        },

        toggleFrameSelection: function (frame) {
            var index = this.selectedFrames.indexOf(frame);
            if (index < 0) {
                this.selectedFrames.push(frame);
            }
            else {
                this.selectedFrames.splice(index, 1);
            }
            this.fire("selectionChanged");
            return this;
        },

        isSelected: function (layer, frame) {
            return this.selectedFrames.indexOf(frame) >= 0 &&
                (!layer && this.defaultLayerSelected ||
                 this.selectedLayers.indexOf(layer) >= 0);
        },

        isCurrent: function (frame) {
            return this.selectedFrames[this.selectedFrames.length - 1] === frame;
        }
    });
});