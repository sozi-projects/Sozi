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
                this.selectedFrames.push(pres.frames.at(0));
            }
            this.selectedLayers.pushAll(pres.layers);

            pres.frames.addListener("remove", this.onRemoveFrame, this);

            return this;
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
        onRemoveFrame: function (collection, frame, index) {
            this.selectedFrames.remove(frame);
        }
    });
});