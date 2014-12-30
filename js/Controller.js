namespace("sozi.editor", exports => {
    "use strict";

    var Controller = Object.create(EventEmitter.prototype);

    Controller.init = function (presentation, selection, viewport) {
        this.presentation = presentation;
        this.selection = selection;
        this.viewport = viewport;

        this.undoStack = [];
        this.redoStack = [];

        return this;
    };

    Controller.onLoad = function () {
        if (!this.selection.selectedFrames.length && this.presentation.frames.length) {
            this.selection.addFrame(this.presentation.frames[0]);
        }
        if (!this.selection.selectedLayers.length) {
            this.selection.selectedLayers = this.presentation.layers.slice();
        }

        this.emitEvent("load");

        // Trigger a repaint of the editor views.
        this.emitEvent("repaint");
    };

    /*
     * Add a frame to the presentation.
     *
     * A new frame is added to the presentation after the
     * currently selected frame (see Selection.currentFrame).
     * If no frame is selected, the new frame is added at the
     * end of the presentation.
     */
    Controller.addFrame = function () {
        var frameIndex;

        // Create a new frame
        var frame = Object.create(sozi.model.Frame);

        if (this.selection.currentFrame) {
            // If a frame is selected, insert the new frame after.
            frame.initFrom(this.selection.currentFrame);
            frameIndex = this.selection.currentFrame.index + 1;
        }
        else {
            // If no frame is selected, copy the state of the current viewport
            // and add the new frame at the end of the presentation.
            frame.init(this.presentation).setAtStates(this.viewport.cameras);
            frameIndex = this.presentation.frames.length;
        }

        // Set the 'link' flag to all layers in the new frame.
        frame.layerProperties.forEach(layer => {
            layer.link = true;
        });

        this.perform(
            function onDo() {
                this.presentation.frames.splice(frameIndex, 0, frame);
                this.presentation.updateLinkedLayers();
                this.selection.selectedFrames = [frame];
            },
            function onUndo() {
                this.presentation.frames.splice(frameIndex, 1);
                this.presentation.updateLinkedLayers();
            },
            true,
            ["presentationChange", "editorStateChange", "repaint"]
        );
    };

    /*
     * Delete selected frames.
     */
    Controller.deleteFrames = function () {
        // Sort the selected frames by presentation order.
        var framesByIndex = this.selection.selectedFrames.slice().sort((a, b) => a.index - b.index);
        var frameIndices = framesByIndex.map(frame => frame.index);

        this.perform(
            function onDo() {
                // Remove the selected frames and clear the selection.
                framesByIndex.forEach(frame => {
                    this.presentation.frames.splice(frame.index, 1);
                });
                this.selection.selectedFrames = [];
                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                // Restore the deleted frames to their original locations.
                framesByIndex.forEach((frame, i) => {
                    this.presentation.frames.splice(frameIndices[i], 0, frame);
                });
                this.presentation.updateLinkedLayers();
            },
            true,
            ["presentationChange", "editorStateChange", "repaint"]
        );
    };

    /*
     * Move frames.
     *
     * Move all selected frames to the given frame index.
     *
     * Parameters:
     *  - toFrameIndex: The index of the destination
     */
    Controller.moveFrames = function (toFrameIndex) {
        // Sort the selected frames by presentation order.
        var framesByIndex = this.selection.selectedFrames.slice().sort((a, b) => a.index - b.index);
        var frameIndices = framesByIndex.map(frame => frame.index);
        framesByIndex.forEach(frame => {
            if (frame.index < toFrameIndex) {
                toFrameIndex --;
            }
        });

        this.perform(
            function onDo() {
                // Move the selected frames to the given index.
                framesByIndex.forEach(frame => {
                    this.presentation.frames.splice(frame.index, 1);
                });
                framesByIndex.forEach((frame, i) => {
                    this.presentation.frames.splice(toFrameIndex + i, 0, frame);
                });
                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                // Move the selected frames to their original locations.
                framesByIndex.forEach(frame => {
                    this.presentation.frames.splice(frame.index, 1);
                });
                framesByIndex.forEach((frame, i) => {
                    this.presentation.frames.splice(frameIndices[i], 0, frame);
                });
                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "editorStateChange", "repaint"]
        );
    };

    Controller.selectLayers = function (layers) {
        this.selection.selectedLayers = layers.slice();
        this.emitEvent("editorStateChange");
        this.emitEvent("repaint");
    };

    Controller.addLayerToSelection = function (layer) {
        if (!this.selection.hasLayers([layer])) {
            this.selection.addLayer(layer);
            this.emitEvent("editorStateChange");
            this.emitEvent("repaint");
        }
    };

    Controller.removeLayerFromSelection = function (layer) {
        if (this.selection.hasLayers([layer])) {
            this.selection.removeLayer(layer);
            this.emitEvent("editorStateChange");
            this.emitEvent("repaint");
        }
    };

    /*
     * Update the selection for a given frame.
     *
     * Parameters:
     *  - single: toggle the selection status of the given frame
     *  - sequence: toggle a sequence of frames to the given frame
     *  - frameIndex: The index of a frame in the presentation
     */
    Controller.updateFrameSelection = function (single, sequence, frameIndex) {
        var frame = this.presentation.frames[frameIndex];
        if (single) {
            this.selection.toggleFrameSelection(frame);
        }
        else if (sequence) {
            if (!this.selection.selectedFrames.length) {
                this.selection.addFrame(frame);
            }
            else {
                var endIndex = frame.index;
                var startIndex = this.selection.currentFrame.index;
                var inc = startIndex <= endIndex ? 1 : -1;
                for (var i = startIndex + inc; startIndex <= endIndex ? i <= endIndex : i >= endIndex; i += inc) {
                    this.selection.toggleFrameSelection(this.presentation.frames[i]);
                }
            }
        }
        else {
            this.selection.selectedLayers = this.presentation.layers.slice();
            this.selection.selectedFrames = [frame];
            this.viewport.cameras.forEach(camera => {
                camera.selected = true;
            });
        }

        // Trigger a repaint of the editor views.
        this.emitEvent("editorStateChange");
        this.emitEvent("repaint");
    };

    /*
     * Update the selection for a given layer.
     *
     * Parameters:
     *  - single: toggle the selection status of the given layer
     *  - sequence: toggle a sequence of layers to the given layer
     *  - layerIndex: The index of a layer in the presentation
     */
    Controller.updateLayerSelection = function (single, sequence, layers) {
        if (single) {
            layers.forEach(layer => {
                this.selection.toggleLayerSelection(layer);
            });
        }
        else if (sequence) {
            // TODO toggle from last selected to current
        }
        else {
            this.selection.selectedLayers = layers.slice();
            this.selection.selectedFrames = this.presentation.frames.slice();
        }

        // A camera is selected if its layer belongs to the list of selected layers
        // or if its layer is not managed and the default layer is selected.
        this.viewport.cameras.forEach(camera => {
            camera.selected = this.selection.hasLayers([camera.layer]);
        });

        // Trigger a repaint of the editor views.
        this.emitEvent("editorStateChange");
        this.emitEvent("repaint");
    };

    /*
     * Update the selection for a given layer and a given frame.
     *
     * Parameters:
     *  - single: toggle the selection status of the given frame and layer.
     *          If both are selected, they are removed from the selection.
     *          If at least one is not selected, they are added to the selection.
     *  - sequence: toggle a sequence of frames and layers to the given frame and layer.
     *  - layers: A set of layers
     *  - frameIndex: The index of a frame in the presentation
     */
    Controller.updateLayerAndFrameSelection = function (single, sequence, layers, frameIndex) {
        var frame = this.presentation.frames[frameIndex];
        if (single) {
            if (this.selection.hasLayers(layers) && this.selection.hasFrames([frame])) {
                layers.forEach(layer => {
                    this.selection.removeLayer(layer);
                });
                this.selection.removeFrame(frame);
            }
            else {
                layers.forEach(layer => {
                    this.selection.addLayer(layer);
                });
                this.selection.addFrame(frame);
            }
        }
        else if (sequence) {
            // TODO toggle from last selected to current
        }
        else {
            this.selection.selectedLayers = layers.slice();
            this.selection.selectedFrames = [frame];
        }

        // A camera is selected if its layer belongs to the list of selected layers
        // or if its layer is not managed and the default layer is selected.
        this.viewport.cameras.forEach(camera => {
            camera.selected = this.selection.hasLayers([camera.layer]);
        });

        // Trigger a repaint of the editor views.
        this.emitEvent("editorStateChange");
        this.emitEvent("repaint");
    };

    /*
     * Change the visibility of the given layer.
     *
     * Toggle the visibility of the given layer.
     * If the layer becomes visible, it is added to the selection,
     * otherwise, it is removed from the selection.
     *
     * Parameters:
     *  - layerIndex: The index of a layer in the presentation
     */
    Controller.updateLayerVisibility = function (layers) {
        layers.forEach(layer => {
            layer.isVisible = !layer.isVisible;
            if (layer.isVisible) {
                this.selection.addLayer(layer);
            }
            else {
                this.selection.removeLayer(layer);
            }
        });

        // Trigger a repaint of the editor views.
        this.emitEvent("editorStateChange");
        this.emitEvent("repaint");
    };

    Controller.fitElement = function () {
        // TODO add undo/redo

        var frame = this.selection.currentFrame;
        if (frame) {
            this.selection.selectedLayers.forEach(layer => {
                var layerIndex = layer.index;
                var id = frame.layerProperties[layerIndex].referenceElementId;
                var elt = this.presentation.svgRoot.getElementById(id);
                if (elt) {
                    frame.cameraStates[layerIndex].setAtElement(elt);
                }
            });

            this.presentation.updateLinkedLayers();

            // Trigger a repaint of the editor views.
            this.emitEvent("presentationChange");
            this.emitEvent("repaint");
        }
    };

    Controller.setFrameProperty = function (propertyName, propertyValue) {
        var selectedFrames = this.selection.selectedFrames.slice();
        var savedValues = selectedFrames.map(frame => frame[propertyName]);

        this.perform(
            function onDo() {
                selectedFrames.forEach(frame => {
                    frame[propertyName] = propertyValue;
                });
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    frame[propertyName] = savedValues[frameIndex];
                });
            },
            false,
            ["presentationChange", "repaint"]
        );
    };

    Controller.setLayerProperty = function (propertyName, propertyValue) {
        var selectedFrames = this.selection.selectedFrames.slice();
        var selectedLayers = this.selection.selectedLayers.slice();
        var savedValues = selectedFrames.map(
            frame => selectedLayers.map(
                layer => frame.layerProperties[layer.index][propertyName]
            )
        );

        this.perform(
            function onDo() {
                selectedFrames.forEach(frame => {
                    selectedLayers.forEach(layer => {
                        frame.layerProperties[layer.index][propertyName] = propertyValue;
                    });
                });

                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    selectedLayers.forEach((layer, layerIndex) => {
                        frame.layerProperties[layer.index][propertyName] = savedValues[frameIndex][layerIndex];
                    });
                });

                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "repaint"]
        );
    };

    Controller.setCameraProperty = function (propertyName, propertyValue) {
        var selectedFrames = this.selection.selectedFrames.slice();
        var selectedLayers = this.selection.selectedLayers.slice();
        var savedValues = selectedFrames.map(
            frame => selectedLayers.map(
                layer => frame.cameraStates[layer.index][propertyName]
            )
        );

        this.perform(
            function onDo() {
                selectedFrames.forEach(frame => {
                    selectedLayers.forEach(layer => {
                        frame.cameraStates[layer.index][propertyName] = propertyValue;
                    });
                });

                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    selectedLayers.forEach((layer, layerIndex) => {
                        frame.cameraStates[layer.index][propertyName] = savedValues[frameIndex][layerIndex];
                    });
                });

                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "repaint"]
        );
    };

    Controller.updateCameraStates = function () {
        // TODO add undo/redo

        var frame = this.selection.currentFrame;
        if (frame) {
            this.viewport.cameras.forEach(camera => {
                if (camera.selected) {
                    var cameraIndex = this.viewport.cameras.indexOf(camera);
                    var layerProperties = frame.layerProperties[cameraIndex];

                    // Update the camera states of the current frame
                    frame.cameraStates[cameraIndex].initFrom(camera);

                    // Mark the modified layers as unlinked in the current frame
                    layerProperties.link = false;

                    // Choose reference SVG element for frame
                    if (layerProperties.referenceElementAuto) {
                        var refElt = camera.getCandidateReferenceElement();
                        if (refElt) {
                            layerProperties.referenceElementId = refElt.getAttribute("id");
                        }
                    }
                }
            });

            this.presentation.updateLinkedLayers();

            // Trigger a repaint of the editor views.
            this.emitEvent("presentationChange");
            this.emitEvent("repaint");
        }
    };

    Controller.setReferenceElement = function (cameraIndex, referenceElement) {
        // TODO add undo/redo

        var frame = this.selection.currentFrame;
        if (frame) {
            var layerProperties = frame.layerProperties[cameraIndex];

            // Mark the modified layers as unlinked in the current frame
            layerProperties.link = false;

            layerProperties.referenceElementAuto = false;
            layerProperties.referenceElementId = referenceElement.getAttribute("id");

            this.presentation.updateLinkedLayers();

            // Trigger a repaint of the editor views.
            this.emitEvent("presentationChange");
            this.emitEvent("repaint");
        }
    };

    Controller.setAspectWidth = function (width) {
        var widthPrev = this.presentation.aspectWidth;
        this.perform(
            function onDo() {
                this.presentation.aspectWidth = width;
            },
            function onUndo() {
                this.presentation.aspectWidth = widthPrev;
            },
            false,
            ["presentationChange", "repaint"]
        );
    };

    Controller.setAspectHeight = function (height) {
        var heightPrev = this.presentation.aspectHeight;
        this.perform(
            function onDo() {
                this.presentation.aspectHeight = height;
            },
            function onUndo() {
                this.presentation.aspectHeight = heightPrev;
            },
            false,
            ["presentationChange", "repaint"]
        );
    };

    Controller.perform = function (onDo, onUndo, updateSelection, events) {
        var action = {
            onDo: onDo,
            onUndo: onUndo,
            updateSelection: updateSelection,
            events: events
        };
        if (updateSelection) {
            action.selectedFrames = this.selection.selectedFrames.slice();
            action.selectedLayers = this.selection.selectedLayers.slice();
        }
        this.undoStack.push(action);
        this.redoStack = [];
        onDo.call(this);
        events.forEach(evt => { this.emitEvent(evt); });
    };

    Controller.undo = function () {
        if (!this.undoStack.length) {
            return;
        }
        var action = this.undoStack.pop();
        this.redoStack.push(action);
        action.onUndo.call(this);
        if (action.updateSelection) {
            this.selection.selectedFrames = action.selectedFrames.slice();
            this.selection.selectedLayers = action.selectedLayers.slice();
        }
        action.events.forEach(evt => { this.emitEvent(evt); });
    };

    Controller.redo = function () {
        if (!this.redoStack.length) {
            return;
        }
        var action = this.redoStack.pop();
        this.undoStack.push(action);
        action.onDo.call(this);
        action.events.forEach(evt => { this.emitEvent(evt); });
    };

    exports.Controller = Controller;
});
