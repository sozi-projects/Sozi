
namespace("sozi.editor.view", function (exports) {
    "use strict";

    /*
     * The Timeline view shows a table where columns represent frames
     * and rows represent layers.
     * The user can choose to manipulate only a subset of the layers of the document.
     * The other layers are grouped into a "Default" row.
     *
     * The Timeline view allows the user to:
     *  - choose editable layers from the document
     *  - show/hide layers
     *  - create/delete/reorder frames
     *  - add/remove layers and frames to/from the selection
     *
     * See also:
     *  - templates/sozi.editor.Timeline.html
     */
    exports.Timeline = sozi.model.Object.create({

        /*
         * Initialize a Timeline view.
         *
         * The view is rendered and event handlers are set up.
         *
         * Parameters:
         *  - pres: a presentation object
         *  - selection: a selection object
         *
         * Returns:
         *  - The current view
         */
        init: function (pres, selection) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;
            this.selection = selection;

            this.editableLayers = [];
            this.defaultLayers = pres.layers.slice();

            this.render();

            pres.addListener("frameAdded", this);

            selection.addListener("changed", this.render, this);

            pres.layers.forEach(function (layer) {
                layer.addListener("visibilityChanged", this.render, this);
            }, this);

            return this;
        },

        /*
         * Action: Add a frame to the presentation.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * A new frame is added to the presentation after the
         * currently selected frame (see Selection.currentFrame).
         * If no frame is selected, the new frame is added at the
         * end of the presentation.
         */
        addFrame: function () {
            var index = this.selection.currentFrame ?
                this.presentation.frames.indexOf(this.selection.currentFrame) + 1 :
                this.presentation.frames.length;
            this.presentation.addFrame(sozi.editor.view.Preview.state, index);
        },

        /*
         * Event handler: A frame was added to the presentation.
         *
         * This method is called when a new frame has been added
         * to the presentation (see Presentation event: frameAdded).
         *
         * The current view is updated and the selection is set to the
         * new frame.
         *
         * Parameters:
         *  - presentation: The presentation that fired the event
         *  - frame: The new frame
         */
        frameAdded: function (presentation, frame) {
            this.render();
            this.selection.selectFrames([frame]);
        },

        /*
         * Action: Add a layer to the current view.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The layer at the given index is added to the current view
         * and to the selection.
         * The current view is updated.
         *
         * Parameters:
         *  - layerIndex: The index of a layer in the presentation
         */
        addLayer: function (layerIndex) {
            var layer = this.presentation.layers[layerIndex];
            this.editableLayers.push(layer);
            this.defaultLayers.splice(this.defaultLayers.indexOf(layer), 1);
            this.render();
            this.selection.addLayer(layer);
        },

        /*
         * Action: Remove a layer from the current view.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The layer at the given index is removed from the current view
         * and from the selection.
         * The current view is updated.
         *
         * Parameters:
         *  - layerIndex: The index of a layer in the presentation
         */
        removeLayer: function (layerIndex) {
            var layer = this.presentation.layers[layerIndex];
            this.selection.removeLayer(layer);
            this.editableLayers.splice(this.editableLayers.indexOf(layer), 1);
            this.defaultLayers.push(layer);
            this.render();
        },

        /*
         * Check whether "default" layers are visible.
         *
         * Returns:
         *  - true if at least one "default" layer is visible, else false
         */
        get defaultLayersAreVisible() {
            return this.defaultLayers.some(function (layer) {
                return layer.isVisible;
            });
        },

        /*
         * Check whether "default" layers are selected.
         *
         * Returns:
         *  - true if all "default" layers are selected, else false
         */
        get defaultLayersAreSelected() {
            return this.defaultLayers.every(function (layer) {
                return this.selection.hasLayer(layer);
            }, this);
        },

        /*
         * Action: Update the selection for a given frame.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The result of this action depends in the following
         * modifier keys:
         *  - Ctrl: toggle the selection status of the given frame
         *  - Shift: toggle a sequence of frames to the given frame
         *  - No modifier: set the selection to the given frame and all layers
         *
         * Parameters:
         *  - evt: The DOM event of the user action
         *  - frameIndex: The index of a frame in the presentation
         */
        updateFrameSelection: function (evt, frameIndex) {
            var frame = this.presentation.frames[frameIndex];
            if (evt.ctrlKey) {
                this.selection.toggleFrame(frame);
            }
            else if (evt.shiftKey) {
                this.selection.toggleFramesTo(frame);
            }
            else {
                this.selection.selectFrames([frame]);
                this.selection.selectLayers(this.presentation.layers);
            }
        },

        /*
         * Action: Update the selection for a given layer.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The result of this action depends in the following
         * modifier keys:
         *  - Ctrl: toggle the selection status of the given layer
         *  - Shift: toggle a sequence of layers to the given layer
         *  - No modifier: set the selection to the given layer and all frames
         *
         * Parameters:
         *  - evt: The DOM event of the user action
         *  - layerIndex: The index of a layer in the presentation
         */
        updateLayerSelection: function (evt, layerIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers[layerIndex]] :
                this.defaultLayers;
            if (evt.ctrlKey) {
                layers.forEach(function (layer) {
                    this.selection.toggleLayer(layer);
                }, this);
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.selection.selectLayers(layers);
                this.selection.selectFrames(this.presentation.frames);
            }
        },

        /*
         * Action: Update the selection for a given layer and a given frame.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The result of this action depends in the following
         * modifier keys:
         *  - Ctrl: toggle the selection status of the given layer and frame.
         *          If both are selected, they are removed from the selection.
         *          If at least one is not selected, they are added to the selection.
         *  - Shift: toggle a sequence of layers and frames to the given layer and frame
         *  - No modifier: set the selection to the given layer and frame
         *
         * Parameters:
         *  - evt: The DOM event of the user action
         *  - layerIndex: The index of a layer in the presentation
         *  - frameIndex: The index of a frame in the presentation
         */
        updateLayerAndFrameSelection: function (evt, layerIndex, frameIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers[layerIndex]] :
                this.defaultLayers;
            var frame = this.presentation.frames[frameIndex];
            if (evt.ctrlKey) {
                var layersAreSelected = layers.every(function (layer) {
                    return this.selection.hasLayer(layer);
                }, this);
                var frameIsSelected = this.selection.hasFrame(frame);
                if (layersAreSelected && frameIsSelected) {
                    layers.forEach(function (layer) {
                        this.selection.removeLayer(layer);
                    }, this);
                    this.selection.removeFrame(frame);
                }
                else {
                    layers.forEach(function (layer) {
                        this.selection.addLayer(layer);
                    }, this);
                    this.selection.addFrame(frame);
                }
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.selection.selectLayers(layers);
                this.selection.selectFrames([frame]);
            }
        },

        /*
         * Action: Change the visibility of the given layer.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * Toggle the visibility of the given layer.
         * If the layer becomes visible, it is added to the selection,
         * otherwise, it is removed from the selection.
         *
         * Parameters:
         *  - layerIndex: The index of a layer in the presentation
         */
        updateLayerVisibility: function (layerIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers[layerIndex]] :
                this.defaultLayers;
            layers.forEach(function (layer) {
                layer.isVisible = !layer.isVisible;
                if (layer.isVisible) {
                    this.selection.addLayer(layer);
                }
                else {
                    this.selection.removeLayer(layer);
                }
            }, this);
        },

        /*
         * Render the current view.
         *
         * The timeline is rendered with respect to the current state of
         * the presentation and the selection.
         * Event handlers are attached to UI elements.
         */
        render: function () {
            var self = this;

            $("#timeline").html(nunjucks.render("templates/sozi.editor.view.Timeline.html", this));

            $("#add-frame").click(this.bind(this.addFrame));

            $("#add-layer").change(function () {
                self.addLayer(this.value);
            });

            $("#timeline .layer-label .remove").click(function () {
                self.removeLayer(this.parentNode.parentNode.dataset.layerIndex);
            });

            $("#timeline .frame-index, #timeline .frame-title").click(function (evt) {
                self.updateFrameSelection(evt, this.dataset.frameIndex);
            });

            $("#timeline .layer-label").click(function (evt) {
                self.updateLayerSelection(evt, this.parentNode.dataset.layerIndex);
            });

            $("#timeline td").click(function (evt) {
                self.updateLayerAndFrameSelection(evt, this.parentNode.dataset.layerIndex, this.dataset.frameIndex);
            });

            $("#timeline .layer-label .visibility").click(function (evt) {
                self.updateLayerVisibility(this.parentNode.parentNode.dataset.layerIndex);
                evt.stopPropagation();
            });
        }
    });
});
