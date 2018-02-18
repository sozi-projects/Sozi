/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Frame, LayerProperties} from "./model/Presentation";
import {CameraState} from "./model/CameraState";
import {EventEmitter} from "events";

export const Controller = Object.create(EventEmitter.prototype);

const UNDO_STACK_LIMIT = 100;

Controller.init = function (storage, preferences, presentation, selection, timeline, viewport, player, locale) {
    EventEmitter.call(this);

    this.storage = storage;
    this.preferences = preferences;
    this.presentation = presentation;
    this.selection = selection;
    this.timeline = timeline;
    this.viewport = viewport;
    this.player = player;
    this.gettext = s => locale.gettext(s);

    this.undoStack = [];
    this.redoStack = [];

    this.addListener("repaint", () => this.onRepaint());

    return this;
};

Controller.info = function (body, force=false) {
    if (this.preferences.enableNotifications || force) {
        const _ = this.gettext;
        new Notification(_("Sozi (Information)"), {body, silent: true});
    }
};

Controller.error = function (body) {
    const _ = this.gettext;
    new Notification(_("Sozi (Error)"), {body});
};

Controller.onRepaint = function () {
    if (this.selection.currentFrame && this.selection.currentFrame !== this.player.currentFrame) {
        if (this.preferences.animateTransitions) {
            this.player.moveToFrame(this.selection.currentFrame);
        }
        else {
            this.player.jumpToFrame(this.selection.currentFrame);
        }
    }
};

Controller.onLoad = function () {
    this.storage.backend.loadPreferences(this.preferences);

    if (!this.selection.selectedFrames.length && this.presentation.frames.length) {
        this.selection.addFrame(this.presentation.frames[0]);
    }
    if (!this.selection.selectedLayers.length) {
        this.selection.selectedLayers = this.presentation.layers.slice();
    }
    if (this.selection.currentFrame) {
        this.player.jumpToFrame(this.selection.currentFrame);
    }
    this.updateCameraSelection();

    this.emit("ready");

    // Apply the preferences (will trigger a repaint of the editor views).
    this.applyPreferences();
};

Controller.save = function () {
    this.storage.save();
    this.emit("repaint");
};

Controller.reload = function () {
    this.storage.reload();
};

Controller.setSVGDocument = function (svgDocument) {
    this.presentation.init();
    this.presentation.setSVGDocument(svgDocument);
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
    // Create a new frame
    const frame = Object.create(Frame);

    let frameIndex;

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
    const framesByIndex = this.selection.selectedFrames.slice().sort((a, b) => a.index - b.index);
    const frameIndices = framesByIndex.map(frame => frame.index);

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
    const framesByIndex = this.selection.selectedFrames.slice().sort((a, b) => a.index - b.index);
    const frameIndices = framesByIndex.map(frame => frame.index);

    // Compute the new target frame index after the selection has been removed.
    framesByIndex.forEach(frame => {
        if (frame.index < toFrameIndex) {
            toFrameIndex --;
        }
    });

    // Keep a copy of the current frame list for the Undo operation.
    const savedFrames = this.presentation.frames.slice();

    // Create a new frame list by removing the selected frames
    // and inserting them at the target frame index.
    const reorderedFrames = this.presentation.frames.filter(frame => !this.selection.hasFrames([frame]));
    Array.prototype.splice.apply(reorderedFrames, [toFrameIndex, 0].concat(framesByIndex));

    // Identify the frames and layers that must be unlinked after the move operation.
    // If a linked frame is moved after a frame to which it was not previously linked,
    // then it will be unlinked.
    const unlink = reorderedFrames.map((frame, frameIndex) =>
        frame.layerProperties.map((layer, layerIndex) =>
            layer.link && (frameIndex === 0 || !frame.isLinkedTo(reorderedFrames[frameIndex - 1], layerIndex))
        )
    );

    this.perform(
        function onDo() {
            this.presentation.frames = reorderedFrames;
            this.presentation.frames.forEach((frame, frameIndex) => {
                frame.layerProperties.forEach((layer, layerIndex) => {
                    if (unlink[frameIndex][layerIndex]) {
                        layer.link = false;
                    }
                });
            });
            this.presentation.updateLinkedLayers();
        },
        function onUndo() {
            this.presentation.frames.forEach((frame, frameIndex) => {
                frame.layerProperties.forEach((layer, layerIndex) => {
                    if (unlink[frameIndex][layerIndex]) {
                        layer.link = true;
                    }
                });
            });
            this.presentation.frames = savedFrames;
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
 * Select a specific frame.
 *
 * Parameters:
 *  - index: select the frame at this particular index
 *           A negative number counts backwards from the end
 */
Controller.selectFrame = function (index) {
    if (index < 0) {
        index = this.presentation.frames.length + index;
    }
    this.updateLayerAndFrameSelection(false, false, this.selection.selectedLayers, index);
};

/*
 * Select all frames.
 */
Controller.selectAllFrames = function () {
    this.selection.selectedFrames = this.presentation.frames.slice();
    this.updateCameraSelection();

    // Trigger a repaint of the editor views.
    this.emit("editorStateChange");
    this.emit("repaint");
};

/*
 * Select a specific frame.
 *
 * Parameters:
 *  - relativeIndex: select the frame at this offset relative to the current frame
 */
Controller.selectRelativeFrame = function (relativeIndex) {
    if (this.selection.currentFrame) {
        const lastIndex = this.presentation.frames.length - 1;
        let targetIndex = this.selection.currentFrame.index + relativeIndex;
        targetIndex = targetIndex < 0 ? 0 : (targetIndex > lastIndex ? lastIndex : targetIndex);
        this.updateLayerAndFrameSelection(false, false, this.selection.selectedLayers, targetIndex);
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
    const frame = this.presentation.frames[frameIndex];
    if (single) {
        this.selection.toggleFrameSelection(frame);
    }
    else if (sequence) {
        if (!this.selection.selectedFrames.length) {
            this.selection.addFrame(frame);
        }
        else {
            const startIndex = this.selection.currentFrame.index;
            const inc = startIndex <= frameIndex ? 1 : -1;
            for (let i = startIndex + inc; startIndex <= frameIndex ? i <= frameIndex : i >= frameIndex; i += inc) {
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
 *  - layers: The layers to select
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
    const frame = this.presentation.frames[frameIndex];
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
            const startIndex = this.selection.currentFrame.index;
            const inc = startIndex <= frameIndex ? 1 : -1;
            for (let i = startIndex + inc; startIndex <= frameIndex ? i <= frameIndex : i >= frameIndex; i += inc) {
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

Controller.resetLayer = function () {
    const selectedFrames = this.selection.selectedFrames.slice();
    const selectedLayers = this.selection.selectedLayers.slice();

    const savedValues = selectedFrames.map(
        frame => selectedLayers.map(
            layer => ({
                link: frame.layerProperties[layer.index].link
            })
        )
    );

    const savedCameraStates = selectedFrames.map(
        frame => selectedLayers.map(
            layer => Object.create(CameraState).initFrom(frame.cameraStates[layer.index])
        )
    );

    this.perform(
        function onDo() {
            selectedFrames.forEach(frame => {
                selectedLayers.forEach(layer => {
                    frame.cameraStates[layer.index].initFrom(this.presentation.initialCameraState);
                    frame.layerProperties[layer.index].link = false;
                });

                this.presentation.updateLinkedLayers();
            });
        },
        function onUndo() {
            selectedFrames.forEach((frame, frameIndex) => {
                selectedLayers.forEach((layer, layerIndex) => {
                    frame.cameraStates[layer.index].initFrom(savedCameraStates[frameIndex][layerIndex]);
                    frame.layerProperties[layer.index].link = savedValues[frameIndex][layerIndex].link;
                });

                this.presentation.updateLinkedLayers();
            });
        },
        false,
        ["presentationChange", "repaint"]
    );
};

Controller.copyLayer = function (groupId) {
    const selectedFrames = this.selection.selectedFrames.slice();
    const selectedLayers = this.selection.selectedLayers.slice();
    const savedValues = selectedFrames.map(
        frame => selectedLayers.map(
            layer => Object.create(LayerProperties).initFrom(frame.layerProperties[layer.index])
        )
    );

    const savedCameraStates = selectedFrames.map(
        frame => selectedLayers.map(
            layer => Object.create(CameraState).initFrom(frame.cameraStates[layer.index])
        )
    );

    const layerToCopy = groupId == "__default__" ? this.timeline.refLayerInDefault : this.presentation.getLayerWithId(groupId);
    if (!layerToCopy) {
        return;
    }

    this.perform(
        function onDo() {
            selectedFrames.forEach(frame => {
                selectedLayers.forEach(layer => {
                    if (layer != layerToCopy) {
                        frame.layerProperties[layer.index].initFrom(frame.layerProperties[layerToCopy.index]);
                        frame.cameraStates[layer.index].initFrom(frame.cameraStates[layerToCopy.index]);
                        if (frame.index === 0 || !this.selection.hasFrames([this.presentation.frames[frame.index - 1]])) {
                            frame.layerProperties[layer.index].link = false;
                        }
                    }
                });
            });
            this.presentation.updateLinkedLayers();
        },
        function onUndo() {
            selectedFrames.forEach((frame, frameIndex) => {
                selectedLayers.forEach((layer, layerIndex) => {
                    frame.layerProperties[layer.index].initFrom(savedValues[frameIndex][layerIndex]);
                    frame.cameraStates[layer.index].initFrom(savedCameraStates[frameIndex][layerIndex]);
                });
            });
            this.presentation.updateLinkedLayers();
        },
        false,
        ["presentationChange", "repaint"]
    );
};

Controller.canFitElement = function () {
    return this.selection.selectedFrames.length === 1 &&
           this.selection.selectedLayers.length >= 1 &&
           this.selection.selectedLayers.every(layer => {
               const id = this.selection.currentFrame.layerProperties[layer.index].outlineElementId;
               const elt = this.presentation.document.root.getElementById(id);
               return elt && this.selection.selectedLayers.some(l => l.contains(elt));
           });
};

Controller.fitElement = function () {
    const currentFrame = this.selection.currentFrame;
    if (currentFrame) {
        const savedFrame = Object.create(Frame).initFrom(currentFrame, true);
        const modifiedFrame = Object.create(Frame).initFrom(currentFrame, true);

        // Compute the offsets of each layer relative to the outline elements.
        const offsets = {};
        this.selection.selectedLayers.forEach(layer => {
            const id = currentFrame.layerProperties[layer.index].outlineElementId;
            const elt = this.presentation.document.root.getElementById(id);
            if (elt && layer.contains(elt)) {
                offsets[id] = modifiedFrame.cameraStates[layer.index].offsetFromElement(elt);
            }
        });

        // Apply the offsets to each layer
        this.selection.selectedLayers.forEach(layer => {
            const id = currentFrame.layerProperties[layer.index].outlineElementId;
            if (offsets[id]) {
                modifiedFrame.cameraStates[layer.index].applyOffset(offsets[id]).resetClipping();
            }
        });

        if (Object.keys(offsets).length) {
            this.perform(
                function onDo() {
                    currentFrame.setAtStates(modifiedFrame.cameraStates);
                    this.selection.selectedLayers.forEach(layer => {
                        currentFrame.layerProperties[layer.index].link = false;
                    });
                    this.presentation.updateLinkedLayers();
                },
                function onUndo() {
                    currentFrame.initFrom(savedFrame);
                    this.presentation.updateLinkedLayers();
                },
                false,
                ["presentationChange", "repaint"]
            );
        }
    }
};

Controller.getPresentationProperty = function (property) {
    return this.presentation[property];
};

Controller.setPresentationProperty = function (propertyName, propertyValue) {
    const pres = this.presentation;
    const savedValue = pres[propertyName];

    this.perform(
        function onDo() {
            pres[propertyName] = propertyValue;
        },
        function onUndo() {
            pres[propertyName] = savedValue;
        },
        false,
        ["presentationChange", "repaint"]
    );
};

Controller.getFrameProperty = function (property) {
    const values = [];

    this.selection.selectedFrames.forEach(frame => {
        const current = frame[property];
        if (values.indexOf(current) < 0) {
            values.push(current);
        }
    });

    return values;
};

Controller.setFrameProperty = function (propertyName, propertyValue) {
    const selectedFrames = this.selection.selectedFrames.slice();
    const savedValues = selectedFrames.map(frame => frame[propertyName]);

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
    const values = [];

    this.selection.selectedFrames.forEach(frame => {
        this.selection.selectedLayers.forEach(layer => {
            const current = frame.layerProperties[layer.index][property];
            if (values.indexOf(current) < 0) {
                values.push(current);
            }
        });
    });

    return values;
};

Controller.setLayerProperty = function (propertyName, propertyValue) {
    const selectedFrames = this.selection.selectedFrames.slice();
    const selectedLayers = this.selection.selectedLayers.slice();
    const savedValues = selectedFrames.map(
        frame => selectedLayers.map(
            layer => frame.layerProperties[layer.index][propertyName]
        )
    );

    const link = propertyName === "link" && propertyValue;

    const savedCameraStates = selectedFrames.map(
        frame => selectedLayers.map(
            layer => Object.create(CameraState).initFrom(frame.cameraStates[layer.index])
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
    const values = [];

    this.selection.selectedFrames.forEach(frame => {
        this.selection.selectedLayers.forEach(layer => {
            const current = frame.cameraStates[layer.index][property];
            if (values.indexOf(current) < 0) {
                values.push(current);
            }
        });
    });

    return values;
};

Controller.setCameraProperty = function (propertyName, propertyValue) {
    const selectedFrames = this.selection.selectedFrames.slice();
    const selectedLayers = this.selection.selectedLayers.slice();

    const savedValues = selectedFrames.map(
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
    const currentFrame = this.selection.currentFrame;
    if (currentFrame) {
        const savedFrame = Object.create(Frame).initFrom(currentFrame);
        const modifiedFrame = Object.create(Frame).initFrom(currentFrame);

        let outlineElt = null, outlineScore = null;

        this.viewport.cameras.forEach((camera, cameraIndex) => {
            if (camera.selected) {
                // Update the camera states of the current frame
                modifiedFrame.cameraStates[cameraIndex].initFrom(camera);

                // We will update the layer properties corresponding to the
                // current camera in the modified frame
                const layerProperties = modifiedFrame.layerProperties[cameraIndex];

                // Mark the modified layers as unlinked in the current frame
                layerProperties.link = false;

                // Update the reference SVG element if applicable.
                const {element, score} = camera.getCandidateReferenceElement();
                if (element && element.hasAttribute("id")) {
                    layerProperties.referenceElementId = element.getAttribute("id");
                    if (outlineScore === null || score < outlineScore) {
                        outlineElt = element;
                        outlineScore = score;
                    }
                }
            }
        });

        if (outlineElt) {
            this.viewport.cameras.forEach((camera, cameraIndex) => {
                if (camera.selected) {
                    const layerProperties = modifiedFrame.layerProperties[cameraIndex];
                    if (layerProperties.outlineElementAuto) {
                        layerProperties.outlineElementId = outlineElt.getAttribute("id");
                    }
                }
            });
        }

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

Controller.setOutlineElement = function (outlineElement) {
    const currentFrame = this.selection.currentFrame;
    if (currentFrame) {
        const properties = this.viewport.cameras.map((camera, cameraIndex) => {
            if (camera.selected) {
                const layerProperties = currentFrame.layerProperties[cameraIndex];
                const savedProperties = Object.create(LayerProperties).initFrom(layerProperties);
                const modifiedProperties = Object.create(LayerProperties).initFrom(layerProperties);

                // Mark the modified layers as unlinked in the current frame
                modifiedProperties.link = false;

                modifiedProperties.outlineElementAuto = false;
                modifiedProperties.outlineElementId = outlineElement.getAttribute("id");

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
    const widthPrev = this.presentation.aspectWidth;
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
    const heightPrev = this.presentation.aspectHeight;
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

Controller.getPreference = function (key) {
    return this.preferences[key];
};

Controller.setPreference = function (key, value) {
    this.preferences[key] = value;
    this.applyPreferences();
};

Controller.applyPreferences = function () {
    if (this.preferences.fontSize > 0) {
        document.body.style.fontSize = this.preferences.fontSize + "pt";
    }
    this.emit("repaint");
};

Controller.perform = function (onDo, onUndo, updateSelection, events) {
    const action = {onDo, onUndo, updateSelection, events};
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
    const action = this.undoStack.pop();
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
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    action.onDo.call(this);
    action.events.forEach(evt => { this.emit(evt); });
};
