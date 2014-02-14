namespace("sozi.editor.model", function (exports) {

    exports.Editor = sozi.model.Object.create({
        init: function (pres) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;
            this.aspect = {num: 4, den: 3};
            this.layers = [];
            this.selectedFrames = [];

            return this;
        },

        setAspectRatio: function (num, den) {
            if (num > 0 && den > 0) {
                this.aspect.num = num;
                this.aspect.den = den;
                this.fire("setAspectRatio", num, den);
            }
        },

        addLayer: function (id) {
            var layer = sozi.editor.view.Preview.layers[id];
            this.layers.push(layer);
            this.fire("addLayer", layer);
        },

        /*
         * Mark all frames as selected.
         *
         * Fires:
         *    - selectFrame(frameIndex)
         *
         * Returns:
         *    - The current object.
         */
        selectAllFrames: function () {
            this.selectedFrames = this.presentation.frames;
            this.fire("selectFrames", this.selectedFrames);
            return this;
        },

        /*
         * Mark all frames as deselected.
         *
         * Fires:
         *    - deselectFrame(frameIndex)
         *
         * Returns:
         *    - The current object.
         */
        deselectAllFrames: function () {
            this.selectedFrames = [];
            this.fire("selectFrames", this.selectedFrames);
            return this;
        },

        /*
         * Mark a frame as selected.
         *
         * Parameters:
         *    - frameIndex: The index of the frame to select
         *
         * Fires:
         *    - selectFrame(frameIndex)
         *
         * Returns:
         *    - The current object.
         */
        toggleFrameSelection: function (frame) {
            var index = this.selectedFrames.indexOf(frame);
            if (index < 0) {
                this.selectedFrames.push(frame);
            }
            else {
                this.selectedFrames.splice(index, 1);
            }
            this.fire("selectFrames", this.selectedFrames);
            return this;
        }
    });
});