/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Frame, LayerProperties} from "./model/Presentation";
import {CameraState} from "./model/CameraState";
import {EventEmitter} from "events";

export var Controller = Object.create(EventEmitter.prototype);

var UNDO_STACK_LIMIT = 100;

Controller.init = function (storage, presentation, selection, viewport) {
    EventEmitter.call(this);

    this.storage = storage;
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
    this.updateCameraSelection();

    this.emit("ready");

    // Trigger a repaint of the editor views.
    this.emit("repaint");
};

Controller.save = function () {
    this.storage.save();
    this.emit("repaint");
};

Controller.reload = function () {
    this.storage.reload();
};

Controller.setSVGDocument = function (svgDocument) {
    this.presentation.init(svgDocument);
    this.emit("loadSVG");
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
    var frame = Object.create(Frame);

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
    if (frameIndex > 0) {
        frame.layerProperties.forEach(layer => {
            layer.link = true;
        });
    }

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

    // Save layer properties for first selected frame
    var firstFrameLinkValues = [];
    framesByIndex[0].layerProperties.forEach(layer => {
        firstFrameLinkValues.push(layer.link);
    });


    this.perform(
        function onDo() {
            // Unlink first selected frame before moving it
            framesByIndex[0].layerProperties.forEach(layer => {
                layer.link = false;
            });

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
            // Restore layer properties for the first selected frame
            framesByIndex[0].layerProperties.forEach((layer, i) => {
                layer.link = firstFrameLinkValues[i];
            });
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

Controller.updateCameraSelection = function () {
    this.viewport.cameras.forEach(camera => {
        camera.selected = this.selection.hasLayers([camera.layer]);
    });
};

Controller.selectLayers = function (layers) {
    this.selection.selectedLayers = layers.slice();
    this.updateCameraSelection();
    this.emit("editorStateChange");
    this.emit("repaint");
};

Controller.addLayerToSelection = function (layer) {
    if (!this.selection.hasLayers([layer])) {
        this.selection.addLayer(layer);
        this.updateCameraSelection();
        this.emit("editorStateChange");
        this.emit("repaint");
    }
};

Controller.removeLayerFromSelection = function (layer) {
    if (this.selection.hasLayers([layer])) {
        this.selection.removeLayer(layer);
        this.updateCameraSelection();
        this.emit("editorStateChange");
        this.emit("repaint");
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
        this.updateCameraSelection();
    }

    // Trigger a repaint of the editor views.
    this.emit("editorStateChange");
    this.emit("repaint");
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
        // TODO toggle from last selected layer to current
    }
    else {
        this.selection.selectedLayers = layers.slice();
        this.selection.selectedFrames = this.presentation.frames.slice();
    }

    this.updateCameraSelection();

    // Trigger a repaint of the editor views.
    this.emit("editorStateChange");
    this.emit("repaint");
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
        // TODO toggle from last selected layer to current
    }
    else {
        this.selection.selectedLayers = layers.slice();
        this.selection.selectedFrames = [frame];
    }

    this.updateCameraSelection();

    // Trigger a repaint of the editor views.
    this.emit("editorStateChange");
    this.emit("repaint");
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
    this.emit("editorStateChange");
    this.emit("repaint");
};

Controller.fitElement = function () {
    var currentFrame = this.selection.currentFrame;
    if (currentFrame) {
        var savedFrame = Object.create(Frame).initFrom(currentFrame);
        var modifiedFrame = Object.create(Frame).initFrom(currentFrame);

        var hasReferenceElement = false;
        this.selection.selectedLayers.forEach(layer => {
            var id = currentFrame.layerProperties[layer.index].referenceElementId;
            var elt = this.presentation.document.root.getElementById(id);
            if (elt) {
                hasReferenceElement = true;
                modifiedFrame.cameraStates[layer.index].setAtElement(elt);
            }
        });

        if (hasReferenceElement) {
            this.perform(
                function onDo() {
                    currentFrame.setAtStates(modifiedFrame.cameraStates);
                    this.presentation.updateLinkedLayers();
                },
                function onUndo() {
                    currentFrame.setAtStates(savedFrame.cameraStates);
                    this.presentation.updateLinkedLayers();
                },
                false,
                ["presentationChange", "repaint"]
            );
        }
    }
};

Controller.getFrameProperty = function (property) {
    var values = [];

    this.selection.selectedFrames.forEach(frame => {
        var current = frame[property];
        if (values.indexOf(current) < 0) {
            values.push(current);
        }
    });

    return values;
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

Controller.getLayerProperty = function (property) {
    var values = [];

    this.selection.selectedFrames.forEach(frame => {
        this.selection.selectedLayers.forEach(layer => {
            var current = frame.layerProperties[layer.index][property];
            if (values.indexOf(current) < 0) {
                values.push(current);
            }
        });
    });

    return values;
};

Controller.setLayerProperty = function (propertyName, propertyValue) {
    var selectedFrames = this.selection.selectedFrames.slice();
    var selectedLayers = this.selection.selectedLayers.slice();
    var savedValues = selectedFrames.map(
        frame => selectedLayers.map(
            layer => frame.layerProperties[layer.index][propertyName]
        )
    );

    var link = propertyName === "link" && propertyValue;

    if (link) {
        var savedCameraStates = selectedFrames.map(
            frame => selectedLayers.map(
                layer => Object.create(CameraState).initFrom(frame.cameraStates[layer.index])
            )
        );
    }

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
                    if (link) {
                        frame.cameraStates[layer.index].initFrom(savedCameraStates[frameIndex][layerIndex]);
                    }
                });
            });

            this.presentation.updateLinkedLayers();
        },
        false,
        ["presentationChange", "repaint"]
    );
};

Controller.getCameraProperty = function (property) {
    var values = [];

    this.selection.selectedFrames.forEach(frame => {
        this.selection.selectedLayers.forEach(layer => {
            var current = frame.cameraStates[layer.index][property];
            if (values.indexOf(current) < 0) {
                values.push(current);
            }
        });
    });

    return values;
};

Controller.setCameraProperty = function (propertyName, propertyValue) {
    var selectedFrames = this.selection.selectedFrames.slice();
    var selectedLayers = this.selection.selectedLayers.slice();

    var savedValues = selectedFrames.map(
        frame => selectedLayers.map(
            layer => ({
                prop: frame.cameraStates[layer.index][propertyName],
                link: frame.layerProperties[layer.index].link
            })
        )
    );

    this.perform(
        function onDo() {
            selectedFrames.forEach(frame => {
                selectedLayers.forEach(layer => {
                    frame.cameraStates[layer.index][propertyName] = propertyValue;
                    frame.layerProperties[layer.index].link = false;
                });
            });

            this.presentation.updateLinkedLayers();
        },
        function onUndo() {
            selectedFrames.forEach((frame, frameIndex) => {
                selectedLayers.forEach((layer, layerIndex) => {
                    frame.cameraStates[layer.index][propertyName] = savedValues[frameIndex][layerIndex].prop;
                    frame.layerProperties[layer.index].link = savedValues[frameIndex][layerIndex].link;
                });
            });

            this.presentation.updateLinkedLayers();
        },
        false,
        ["presentationChange", "repaint"]
    );
};

Controller.updateCameraStates = function () {
    var currentFrame = this.selection.currentFrame;
    if (currentFrame) {
        var savedFrame = Object.create(Frame).initFrom(currentFrame);
        var modifiedFrame = Object.create(Frame).initFrom(currentFrame);

        this.viewport.cameras.forEach(camera => {
            if (camera.selected) {
                var cameraIndex = this.viewport.cameras.indexOf(camera);
                var layerProperties = modifiedFrame.layerProperties[cameraIndex];

                // Update the camera states of the current frame
                modifiedFrame.cameraStates[cameraIndex].initFrom(camera);

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

        this.perform(
            function onDo() {
                currentFrame.initFrom(modifiedFrame, true);
                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                currentFrame.initFrom(savedFrame, true);
                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "repaint"]
        );
    }
};

Controller.setReferenceElement = function (referenceElement) {
    var currentFrame = this.selection.currentFrame;
    if (currentFrame) {
        var properties = this.viewport.cameras.map((camera, cameraIndex) => {
            if (camera.selected) {
                var layerProperties = currentFrame.layerProperties[cameraIndex];
                var savedProperties = Object.create(LayerProperties).initFrom(layerProperties);
                var modifiedProperties = Object.create(LayerProperties).initFrom(layerProperties);

                // Mark the modified layers as unlinked in the current frame
                modifiedProperties.link = false;

                modifiedProperties.referenceElementAuto = false;
                modifiedProperties.referenceElementId = referenceElement.getAttribute("id");

                return {layerProperties, savedProperties, modifiedProperties};
            }
        });

        this.perform(
            function onDo() {
                properties.forEach(p => {
                    if (p) {
                        p.layerProperties.initFrom(p.modifiedProperties);
                    }
                });
                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                properties.forEach(p => {
                    if (p) {
                        p.layerProperties.initFrom(p.savedProperties);
                    }
                });
                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "repaint"]
        );
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

Controller.setDragMode = function (dragMode) {
    this.viewport.dragMode = dragMode;
    this.emit("repaint");
};

Controller.perform = function (onDo, onUndo, updateSelection, events) {
    var action = {onDo, onUndo, updateSelection, events};
    if (updateSelection) {
        action.selectedFrames = this.selection.selectedFrames.slice();
        action.selectedLayers = this.selection.selectedLayers.slice();
    }
    this.undoStack.push(action);
    while (this.undoStack.length > UNDO_STACK_LIMIT) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    onDo.call(this);
    events.forEach(evt => { this.emit(evt); });
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
    action.events.forEach(evt => { this.emit(evt); });
};

Controller.redo = function () {
    if (!this.redoStack.length) {
        return;
    }
    var action = this.redoStack.pop();
    this.undoStack.push(action);
    action.onDo.call(this);
    action.events.forEach(evt => { this.emit(evt); });
};
