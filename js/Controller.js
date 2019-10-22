/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Frame, LayerProperties} from "./model/Presentation";
import {CameraState} from "./model/CameraState";
import {EventEmitter} from "events";

const UNDO_STACK_LIMIT = 100;

export class Controller extends EventEmitter {

    constructor(preferences, presentation, selection, viewport, player, locale) {
        super();

        this.storage        = null; // Set in onLoad()
        this.preferences    = preferences;
        this.presentation   = presentation;
        this.selection      = selection;
        this.viewport       = viewport;
        this.player         = player;
        this.gettext        = s => locale.gettext(s);
        this.editableLayers = [];
        this.defaultLayers  = [];

        this.undoStack      = [];
        this.redoStack      = [];

        this.addListener("repaint", () => this.onRepaint());
    }

    toStorable() {
        return {
            editableLayers: this.editableLayers.map(layer => layer.groupId)
        };
    }

    fromStorable(storable) {
        this.editableLayers = [];

        if ("editableLayers" in storable) {
            for (let groupId of storable.editableLayers) {
                const layer = this.presentation.getLayerWithId(groupId);
                if (layer && this.editableLayers.indexOf(layer) < 0) {
                    this.editableLayers.push(layer);
                }
            }
        }
    }

    info(body, force=false) {
        if (this.preferences.enableNotifications || force) {
            const _ = this.gettext;
            new Notification(_("Sozi (Information)"), {body, silent: true});
        }
    }

    error(body) {
        const _ = this.gettext;
        new Notification(_("Sozi (Error)"), {body});
    }

    onRepaint() {
        if (this.selection.currentFrame && this.selection.currentFrame !== this.player.currentFrame) {
            if (this.preferences.animateTransitions) {
                this.player.moveToFrame(this.selection.currentFrame);
            }
            else {
                this.player.jumpToFrame(this.selection.currentFrame);
            }
        }
    }

    onLoad(storage) {
        this.storage = storage;

        storage.backend.loadPreferences(this.preferences);

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

        this.defaultLayers = [];

        for (let layer of this.presentation.layers) {
            if (this.editableLayers.indexOf(layer) < 0) {
                this.defaultLayers.push(layer);
            }
        }

        this.emit("ready");

        // Apply the preferences (will trigger a repaint of the editor views).
        this.applyPreferences();
    }

    save() {
        this.storage.save();
        this.emit("repaint");
    }

    reload() {
        this.storage.reload();
    }

    setSVGDocument(svgDocument) {
        this.presentation.setSVGDocument(svgDocument);
        this.emit("loadSVG");
        this.presentation.setInitialCameraState();
    }

    /*
     * Add a frame to the presentation.
     *
     * A new frame is added to the presentation after the
     * currently selected frame (see Selection.currentFrame).
     * If no frame is selected, the new frame is added at the
     * end of the presentation.
     */
    addFrame() {
        let frame, frameIndex;

        if (this.selection.currentFrame) {
            // If a frame is selected, insert the new frame after.
            frame = new Frame(this.selection.currentFrame);
            frameIndex = this.selection.currentFrame.index + 1;
        }
        else {
            // If no frame is selected, copy the state of the current viewport
            // and add the new frame at the end of the presentation.
            frame = new Frame(this.presentation);
            frame.setAtStates(this.viewport.cameras);
            frameIndex = this.presentation.frames.length;
        }

        // Set the 'link' flag to all layers in the new frame.
        if (frameIndex > 0) {
            for (let layer of frame.layerProperties) {
                layer.link = true;
            }
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
    }

    /*
     * Delete selected frames.
     */
    deleteFrames() {
        // Sort the selected frames by presentation order.
        const framesByIndex = this.selection.selectedFrames.map(f => [f, f.index]).sort((a, b) => a[1] - b[1]);

        this.perform(
            function onDo() {
                // Remove the selected frames and clear the selection.
                // We don't use the saved index here because the actual index
                // will change as frames are deleted.
                for (let [frame, index] of framesByIndex) {
                    this.presentation.frames.splice(frame.index, 1);
                }
                this.selection.selectedFrames = [];
                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                // Restore the deleted frames to their original locations.
                for (let [frame, index] of framesByIndex) {
                    this.presentation.frames.splice(index, 0, frame);
                }
                this.presentation.updateLinkedLayers();
            },
            true,
            ["presentationChange", "editorStateChange", "repaint"]
        );
    }

    /*
     * Move frames.
     *
     * Move all selected frames to the given frame index.
     *
     * Parameters:
     *  - toFrameIndex: The index of the destination
     */
    moveFrames(toFrameIndex) {
        // Sort the selected frames by presentation order.
        const framesByIndex = this.selection.selectedFrames.slice().sort((a, b) => a.index - b.index);
        const frameIndices = framesByIndex.map(frame => frame.index);

        // Compute the new target frame index after the selection has been removed.
        for (let frame of framesByIndex) {
            if (frame.index < toFrameIndex) {
                toFrameIndex --;
            }
        }

        // Keep a copy of the current frame list for the Undo operation.
        const savedFrames = this.presentation.frames.slice();

        // Create a new frame list by removing the selected frames
        // and inserting them at the target frame index.
        const reorderedFrames = this.presentation.frames.filter(frame => !this.selection.hasFrames([frame]));
        Array.prototype.splice.apply(reorderedFrames, [toFrameIndex, 0].concat(framesByIndex));

        // Identify the frames and layers that must be unlinked after the move operation.
        // If a linked frame is moved after a frame to which it was not previously linked,
        // then it will be unlinked.
        const unlink = reorderedFrames.flatMap((frame, frameIndex) =>
            frame.layerProperties.filter((layer, layerIndex) =>
                layer.link && (frameIndex === 0 || !frame.isLinkedTo(reorderedFrames[frameIndex - 1], layerIndex))
            )
        );

        this.perform(
            function onDo() {
                this.presentation.frames = reorderedFrames;
                for (let layer of unlink) {
                    layer.link = false;
                }
                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                for (let layer of unlink) {
                    layer.link = true;
                }
                this.presentation.frames = savedFrames;
                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "editorStateChange", "repaint"]
        );
    }

    updateCameraSelection() {
        for (let camera of this.viewport.cameras) {
            camera.selected = this.selection.hasLayers([camera.layer]);
        }
    }

    addLayer(layerIndex) {
        const layer = this.presentation.layers[layerIndex];
        if (this.editableLayers.indexOf(layer) < 0) {
            this.editableLayers.push(layer);
        }

        const layerIndexInDefaults = this.defaultLayers.indexOf(layer);
        if (layerIndexInDefaults >= 0) {
            this.defaultLayers.splice(layerIndexInDefaults, 1);
        }

        this.addLayerToSelection(layer);

        // Force a repaint even if the controller
        // did not modify the selection
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    addAllLayers() {
        for (let layer of this.defaultLayers.slice()) {
            if (layer.auto) {
                continue;
            }

            this.editableLayers.push(layer);

            const layerIndexInDefaults = this.defaultLayers.indexOf(layer);
            this.defaultLayers.splice(layerIndexInDefaults, 1);

            this.addLayerToSelection(layer);
        }

        // Force a repaint even if the controller
        // did not modify the selection
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    removeLayer(layerIndex) {
        const layer = this.presentation.layers[layerIndex];

        const layerIndexInEditable = this.editableLayers.indexOf(layer);
        this.editableLayers.splice(layerIndexInEditable, 1);

        if (this.defaultLayersAreSelected) {
            this.addLayerToSelection(layer);
        }
        else if (this.selection.selectedLayers.length > 1) {
            this.removeLayerFromSelection(layer);
        }
        else {
            this.selectLayers(this.defaultLayers);
        }

        this.defaultLayers.push(layer);

        // Force a repaint even if the controller
        // did not modify the selection
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    getLayersAtIndex(layerIndex) {
        return layerIndex >= 0 ?
            [this.presentation.layers[layerIndex]] :
            this.defaultLayers;
    }

    get defaultLayersAreSelected() {
        return this.defaultLayers.every(layer => this.selection.selectedLayers.indexOf(layer) >= 0);
    }

    get hasDefaultLayer() {
        return this.defaultLayers.length > 1 ||
               this.defaultLayers.length > 0 && this.defaultLayers[0].svgNodes.length;
    }

    get refLayerInDefault() {
        for (let layer of this.defaultLayers) {
            if (layer.svgNodes.length) {
                return layer;
            }
        }
        return this.defaultLayers[0];
    }

    selectLayers(layers) {
        this.selection.selectedLayers = layers.slice();
        this.updateCameraSelection();
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    addLayerToSelection(layer) {
        if (!this.selection.hasLayers([layer])) {
            this.selection.addLayer(layer);
            this.updateCameraSelection();
            this.emit("editorStateChange");
            this.emit("repaint");
        }
    }

    removeLayerFromSelection(layer) {
        if (this.selection.hasLayers([layer])) {
            this.selection.removeLayer(layer);
            this.updateCameraSelection();
            this.emit("editorStateChange");
            this.emit("repaint");
        }
    }

    /*
     * Select a specific frame.
     *
     * Parameters:
     *  - index: select the frame at this particular index
     *           A negative number counts backwards from the end
     */
    selectFrame(index) {
        if (index < 0) {
            index = this.presentation.frames.length + index;
        }
        this.updateLayerAndFrameSelection(false, false, this.selection.selectedLayers, index);
    }

    /*
     * Select all frames.
     */
    selectAllFrames() {
        this.selection.selectedFrames = this.presentation.frames.slice();
        this.updateCameraSelection();

        // Trigger a repaint of the editor views.
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /*
     * Select a specific frame.
     *
     * Parameters:
     *  - relativeIndex: select the frame at this offset relative to the current frame
     */
    selectRelativeFrame(relativeIndex) {
        if (this.selection.currentFrame) {
            const lastIndex = this.presentation.frames.length - 1;
            let targetIndex = this.selection.currentFrame.index + relativeIndex;
            targetIndex = targetIndex < 0 ? 0 : (targetIndex > lastIndex ? lastIndex : targetIndex);
            this.updateLayerAndFrameSelection(false, false, this.selection.selectedLayers, targetIndex);
        }
    }

    /*
     * Update the selection for a given frame.
     *
     * Parameters:
     *  - single: toggle the selection status of the given frame
     *  - sequence: toggle a sequence of frames to the given frame
     *  - frameIndex: The index of a frame in the presentation
     */
    updateFrameSelection(single, sequence, frameIndex) {
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
    }

    /*
     * Update the selection for a given layer.
     *
     * Parameters:
     *  - single: toggle the selection status of the given layer
     *  - sequence: toggle a sequence of layers to the given layer
     *  - layers: The layers to select
     */
    updateLayerSelection(single, sequence, layers) {
        if (single) {
            for (let layer of layers) {
                this.selection.toggleLayerSelection(layer);
            }
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
    }

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
    updateLayerAndFrameSelection(single, sequence, layers, frameIndex) {
        const frame = this.presentation.frames[frameIndex];
        if (single) {
            if (this.selection.hasLayers(layers) && this.selection.hasFrames([frame])) {
                for (let layer of layers) {
                    this.selection.removeLayer(layer);
                }
                this.selection.removeFrame(frame);
            }
            else {
                for (let layer of layers) {
                    this.selection.addLayer(layer);
                }
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
    }

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
    updateLayerVisibility(layers) {
        for (let layer of layers) {
            layer.isVisible = !layer.isVisible;
            if (layer.isVisible) {
                this.selection.addLayer(layer);
            }
            else {
                this.selection.removeLayer(layer);
            }
        }

        // Trigger a repaint of the editor views.
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    resetLayer() {
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
                layer => new CameraState(frame.cameraStates[layer.index])
            )
        );

        this.perform(
            function onDo() {
                for (let frame of selectedFrames) {
                    for (let layer of selectedLayers) {
                        frame.cameraStates[layer.index].copy(this.presentation.initialCameraState);
                        frame.layerProperties[layer.index].link = false;
                    }

                    this.presentation.updateLinkedLayers();
                }
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    selectedLayers.forEach((layer, layerIndex) => {
                        frame.cameraStates[layer.index].copy(savedCameraStates[frameIndex][layerIndex]);
                        frame.layerProperties[layer.index].link = savedValues[frameIndex][layerIndex].link;
                    });

                    this.presentation.updateLinkedLayers();
                });
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    copyLayer(groupId) {
        const selectedFrames = this.selection.selectedFrames.slice();
        const selectedLayers = this.selection.selectedLayers.slice();
        const savedValues = selectedFrames.map(
            frame => selectedLayers.map(
                layer => new LayerProperties(frame.layerProperties[layer.index])
            )
        );

        const savedCameraStates = selectedFrames.map(
            frame => selectedLayers.map(
                layer => new CameraState(frame.cameraStates[layer.index])
            )
        );

        const layerToCopy = groupId == "__default__" ? this.refLayerInDefault : this.presentation.getLayerWithId(groupId);
        if (!layerToCopy) {
            return;
        }

        this.perform(
            function onDo() {
                for (let frame of selectedFrames) {
                    for (let layer of selectedLayers) {
                        if (layer != layerToCopy) {
                            frame.layerProperties[layer.index].copy(frame.layerProperties[layerToCopy.index]);
                            frame.cameraStates[layer.index].copy(frame.cameraStates[layerToCopy.index]);
                            if (frame.index === 0 || !this.selection.hasFrames([this.presentation.frames[frame.index - 1]])) {
                                frame.layerProperties[layer.index].link = false;
                            }
                        }
                    }
                }
                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    selectedLayers.forEach((layer, layerIndex) => {
                        frame.layerProperties[layer.index].copy(savedValues[frameIndex][layerIndex]);
                        frame.cameraStates[layer.index].copy(savedCameraStates[frameIndex][layerIndex]);
                    });
                });
                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    canFitElement() {
        return this.selection.selectedFrames.length === 1 &&
               this.selection.selectedLayers.length >= 1 &&
               this.selection.selectedLayers.every(layer => {
                   const id = this.selection.currentFrame.layerProperties[layer.index].outlineElementId;
                   const elt = this.presentation.document.root.getElementById(id);
                   return elt && this.selection.selectedLayers.some(l => l.contains(elt));
               });
    }

    fitElement() {
        const currentFrame = this.selection.currentFrame;
        if (currentFrame) {
            const savedFrame    = new Frame(currentFrame, true);
            const modifiedFrame = new Frame(currentFrame, true);

            // Compute the offsets of each layer relative to the outline elements.
            const offsets = {};
            for (let layer of this.selection.selectedLayers) {
                const id = currentFrame.layerProperties[layer.index].outlineElementId;
                const elt = this.presentation.document.root.getElementById(id);
                if (elt && layer.contains(elt)) {
                    offsets[id] = modifiedFrame.cameraStates[layer.index].offsetFromElement(elt);
                }
            }

            // Apply the offsets to each layer
            for (let layer of this.selection.selectedLayers) {
                const id = currentFrame.layerProperties[layer.index].outlineElementId;
                if (offsets[id]) {
                    modifiedFrame.cameraStates[layer.index].applyOffset(offsets[id]).resetClipping();
                }
            }

            if (Object.keys(offsets).length) {
                this.perform(
                    function onDo() {
                        currentFrame.setAtStates(modifiedFrame.cameraStates);
                        for (let layer of this.selection.selectedLayers) {
                            currentFrame.layerProperties[layer.index].link = false;
                        }
                        this.presentation.updateLinkedLayers();
                    },
                    function onUndo() {
                        currentFrame.copy(savedFrame);
                        this.presentation.updateLinkedLayers();
                    },
                    false,
                    ["presentationChange", "repaint"]
                );
            }
        }
    }

    getPresentationProperty(property) {
        return this.presentation[property];
    }

    setPresentationProperty(propertyName, propertyValue) {
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
    }

    getFrameProperty(property) {
        const values = [];

        for (let frame of this.selection.selectedFrames) {
            const current = frame[property];
            if (values.indexOf(current) < 0) {
                values.push(current);
            }
        }

        return values;
    }

    setFrameProperty(propertyName, propertyValue) {
        const savedValues = this.selection.selectedFrames.map(frame => [frame, frame[propertyName]]);

        this.perform(
            function onDo() {
                for (let [frame, value] of savedValues) {
                    frame[propertyName] = propertyValue;
                }
            },
            function onUndo() {
                for (let [frame, value] of savedValues) {
                    frame[propertyName] = value;
                }
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    getLayerProperty(property) {
        const values = [];

        for (let frame of this.selection.selectedFrames) {
            for (let layer of this.selection.selectedLayers) {
                const current = frame.layerProperties[layer.index][property];
                if (values.indexOf(current) < 0) {
                    values.push(current);
                }
            }
        }

        return values;
    }

    setLayerProperty(propertyName, propertyValue) {
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
                layer => new CameraState(frame.cameraStates[layer.index])
            )
        );

        this.perform(
            function onDo() {
                for (let frame of selectedFrames) {
                    for (let layer of selectedLayers) {
                        frame.layerProperties[layer.index][propertyName] = propertyValue;
                    }
                }

                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    selectedLayers.forEach((layer, layerIndex) => {
                        frame.layerProperties[layer.index][propertyName] = savedValues[frameIndex][layerIndex];
                        if (link) {
                            frame.cameraStates[layer.index].copy(savedCameraStates[frameIndex][layerIndex]);
                        }
                    });
                });

                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    getCameraProperty(property) {
        const values = [];

        for (let frame of this.selection.selectedFrames) {
            for (let layer of this.selection.selectedLayers) {
                const current = frame.cameraStates[layer.index][property];
                if (values.indexOf(current) < 0) {
                    values.push(current);
                }
            }
        }

        return values;
    }

    setCameraProperty(propertyName, propertyValue) {
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
                for (let frame of selectedFrames) {
                    for (let layer of selectedLayers) {
                        frame.cameraStates[layer.index][propertyName] = propertyValue;
                        frame.layerProperties[layer.index].link = false;
                    }
                }

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
    }

    updateCameraStates() {
        const currentFrame = this.selection.currentFrame;
        if (currentFrame) {
            const savedFrame    = new Frame(currentFrame, true);
            const modifiedFrame = new Frame(currentFrame, true);

            let outlineElt = null, outlineScore = null;

            this.viewport.cameras.forEach((camera, cameraIndex) => {
                if (camera.selected) {
                    // Update the camera states of the current frame
                    modifiedFrame.cameraStates[cameraIndex].copy(camera);

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
                    currentFrame.copy(modifiedFrame, true);
                    this.presentation.updateLinkedLayers();
                },
                function onUndo() {
                    currentFrame.copy(savedFrame, true);
                    this.presentation.updateLinkedLayers();
                },
                false,
                ["presentationChange", "repaint"]
            );
        }
    }

    setOutlineElement(outlineElement) {
        const currentFrame = this.selection.currentFrame;
        if (currentFrame) {
            const properties = this.viewport.cameras.map((camera, cameraIndex) => {
                if (camera.selected) {
                    const layerProperties    = currentFrame.layerProperties[cameraIndex];
                    const savedProperties    = new LayerProperties(layerProperties);
                    const modifiedProperties = new LayerProperties(layerProperties);

                    // Mark the modified layers as unlinked in the current frame
                    modifiedProperties.link = false;

                    modifiedProperties.outlineElementAuto = false;
                    modifiedProperties.outlineElementId = outlineElement.getAttribute("id");

                    return {layerProperties, savedProperties, modifiedProperties};
                }
            });

            this.perform(
                function onDo() {
                    for (let p of properties) {
                        if (p) {
                            p.layerProperties.copy(p.modifiedProperties);
                        }
                    }
                    this.presentation.updateLinkedLayers();
                },
                function onUndo() {
                    for (let p of properties) {
                        if (p) {
                            p.layerProperties.copy(p.savedProperties);
                        }
                    }
                    this.presentation.updateLinkedLayers();
                },
                false,
                ["presentationChange", "repaint"]
            );
        }
    }

    setAspectWidth(width) {
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
    }

    setAspectHeight(height) {
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
    }

    setDragMode(dragMode) {
        this.viewport.dragMode = dragMode;
        this.emit("repaint");
    }

    getPreference(key) {
        return this.preferences[key];
    }

    setPreference(key, value) {
        this.preferences[key] = value;
        this.applyPreferences();
    }

    getShortcut(key) {
        return this.preferences.keys[key];
    }

    setShortcut(key, value) {
        // Find occurrences of modifier keys in the given value.
        let ctrl  = /\bCtrl\s*\+/i.test(value);
        let alt   = /\bAlt\s*\+/i.test(value);
        let shift = /\bShift\s*\+/i.test(value);

        // Remove all occurrences of modifier keys and spaces in the given value.
        value = value.replace(/\bCtrl\s*\+\s*/gi, "");
        value = value.replace(/\bAlt\s*\+\s*/gi, "");
        value = value.replace(/\bShift\s*\+\s*/gi, "");
        value = value.replace(/\s/g, "").toUpperCase();
        if (value.length === 0) {
            return;
        }

        // Rewrite the shortcut in standard order.
        if (shift) {
            value = "Shift+" + value;
        }
        if (alt) {
            value = "Alt+" + value;
        }
        if (ctrl) {
            value = "Ctrl+" + value;
        }
        this.preferences.keys[key] = value;
    }

    applyPreferences() {
        if (this.preferences.fontSize > 0) {
            document.body.style.fontSize = this.preferences.fontSize + "pt";
        }
        this.emit("repaint");
    }

    perform(onDo, onUndo, updateSelection, events) {
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
        for (let evt of events) {
            this.emit(evt);
        }
    }

    undo() {
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
        for (let evt of action.events) {
            this.emit(evt);
        }
    }

    redo() {
        if (!this.redoStack.length) {
            return;
        }
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        action.onDo.call(this);
        for (let evt of action.events) {
            this.emit(evt);
        }
    }
}
