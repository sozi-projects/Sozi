/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Frame, LayerProperties} from "./model/Presentation";
import {CameraState} from "./model/CameraState";
import {EventEmitter} from "events";

const UNDO_STACK_LIMIT = 100;

/** Sozi editor UI controller.
 *
 * A Controller instance manages the user interface of the editor and updates
 * the presentation data in reaction to user actions.
 *
 * @category editor
 * @extends EventEmitter
 */
export class Controller extends EventEmitter {

    /** Construct a new Sozi editor UI controller.
     *
     * @param {Preferences} preferences - The object that holds the user settings of the editor.
     * @param {Presentation} presentation - The Sozi presentation opened in the editor.
     * @param {Selection} selection - The object that represents the selection in the timeline.
     * @param {Viewport} viewport - The object that displays a preview of the presentation.
     * @param {Player} player - The object that animates the presentation.
     * @param {Jed} locale - The object that manages the translations.
     */
    constructor(preferences, presentation, selection, viewport, player, locale) {
        super();

        /** The object that manages the file I/O, set in {@linkcode Controller#onLoad|onLoad}.
         * @type {Storage} */
        this.storage = null;

        /** The object that holds the user settings of the editor.
         * @type {Preferences} */
        this.preferences = preferences;

        /** The Sozi presentation opened in the editor.
         * @type {Presentation} */
        this.presentation = presentation;

        /** The object that represents the selection in the timeline.
         * @type {Selection} */
        this.selection = selection;

        /** The object that displays a preview of the presentation.
         * @type {Viewport} */
        this.viewport = viewport;

        /** The object that animates the presentation.
         * @type {Player} */
        this.player = player;

        /** The function that returns translated text in the current language.
         *
         * @param {string} s - The text to translate.
         * @return {string} The translated text.
         */
        this.gettext = s => locale.gettext(s);

        /** The layers that have been added to the timeline.
         * @type {Layer[]} */
        this.editableLayers = [];

        /** The layers that fall in the "default" row of the timeline.
         * @type {Layer[]} */
        this.defaultLayers = [];

        /** The stack of operations that can be undone.
         * @type {Array} */
        this.undoStack = [];

        /** The stack of operations that can be redone.
         * @type {Array} */
        this.redoStack = [];

        this.addListener("repaint", () => this.onRepaint());
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * This method will save the IDs of the editable layers managed by this controller.
     *
     * @return {Object} A plain object with the properties that need to be saved.
     */
    toStorable() {
        return {
            editableLayers: this.editableLayers.map(layer => layer.groupId)
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * This method will build the list of editable layers managed by this controller,
     * from a list of group IDs provided by the given object.
     *
     * @param {Object} storable - A plain object with the properties to copy.
     */
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

    /** Show a notification with an information message.
     *
     * @param {string} body - The message to display.
     * @param {boolean} force - Ignore the user preferences for notifications.
     */
    info(body, force=false) {
        if (this.preferences.enableNotifications || force) {
            const _ = this.gettext;
            new Notification(_("Sozi (Information)"), {body, silent: true});
        }
    }

    /** Show a notification with an error message.
     *
     * @param {string} body - The message to display.
     */
    error(body) {
        const _ = this.gettext;
        new Notification(_("Sozi (Error)"), {body});
    }

    /** Update the visible frame on repaint.
     *
     * This method is called each time this controller emits the "repaint" event.
     * If the {@link Selection#currentFrame|currently selected frame} is different
     * from the {@link Player#currentFrame|currently visible frame},
     * it will move to the selected frame.
     *
     * @listens Controller#repaint
     */
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

    /** Finalize the loading of a presentation.
     *
     * This method is called by a {@linkcode Storage} instance when the SVG and JSON files
     * of a presentation have been loaded.
     * It sets a default {@link Controller#selection|selection} if needed,
     * shows the {@link Selection#currentFrame|current frame}, loads
     * and applies the user {@link Controller#preferences|preferences}.
     *
     * @param {Storage} storage - A storage management object.
     *
     * @fires Controller#ready
     */
    onLoad(storage) {
        this.storage = storage;

        // Load the preferences.
        this.preferences.load();

        // If no frame is selected, select the first frame.
        if (!this.selection.selectedFrames.length && this.presentation.frames.length) {
            this.selection.addFrame(this.presentation.frames[0]);
        }

        // If no layer is selected, select all layers.
        if (!this.selection.selectedLayers.length) {
            this.selection.selectedLayers = this.presentation.layers.slice();
        }

        // Show the currently selected frame, if applicable.
        if (this.selection.currentFrame) {
            this.player.jumpToFrame(this.selection.currentFrame);
        }

        // Mark the cameras as selected for the selected frames.
        this.updateCameraSelection();

        // Collect all layers that are not in the editable set
        // into the "default" layer set.
        this.defaultLayers = [];
        for (let layer of this.presentation.layers) {
            if (this.editableLayers.indexOf(layer) < 0) {
                this.defaultLayers.push(layer);
            }
        }

        /** Signals that the editor is ready.
         * @event Controller#ready */
        this.emit("ready");

        // Apply the preferences (will trigger a repaint of the editor views).
        this.applyPreferences();
    }

    /** Save the presentation.
     *
     * This method delegates the operation to its {@linkcode Storage} instance and triggers
     * a repaint so that the UI shows the correct "saved" status.
     *
     * @fires Controller#repaint
     */
    save() {
        this.storage.save();

        /** Signals that the editor UI needs to be repainted.
         * @event Controller#repaint */
        this.emit("repaint");
    }

    /** Reload the presentation.
     *
     * This method delegates the operation to its {@linkcode Storage} instance.
     */
    reload() {
        this.storage.reload();
    }

    /** Add a new frame to the presentation.
     *
     * A new frame is added to the presentation after the
     * {@link Selection#currentFrame|currently selected frame}.
     * If no frame is selected, the new frame is added at the
     * end of the presentation.
     *
     * This operation can be undone.
     *
     * @fires Controller#presentationChange
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
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

    /** Delete the selected frames from the presentation.
     *
     * This operation can be undone.
     *
     * @fires Controller#presentationChange
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
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

    /** Move the selected frames to the given location.
     *
     * This operation can be undone.
     *
     * @param {number} toFrameIndex - The new index of the first frame in the selection.
     *
     * @fires Controller#presentationChange
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
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

    /** Select the cameras corresponding to the selected layers.
     *
     * For each selected layer, this method sets the {@linkcode Camera#selected|selected} property of
     * the corresponding camera in the current viewport.
     */
    updateCameraSelection() {
        for (let camera of this.viewport.cameras) {
            camera.selected = this.selection.hasLayers([camera.layer]);
        }
    }

    /** Add a layer to the timeline.
     *
     * This method takes a layers from the "default" layer set and moves it
     * to the "editable" layer set.
     *
     * This operation modifies the editor state and does not affect the actual presentation.
     * It does not provide an "Undo" action.
     *
     * @param {number} layerIndex - The index of the layer to add.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
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

    /** Add all layers to the timeline.
     *
     * This method takes all layers from the "default" layer set and moves them
     * to the "editable" layer set.
     *
     * This operation modifies the editor state and does not affect the actual presentation.
     * It does not provide an "Undo" action.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
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

    /** Remove a layer from the timeline.
     *
     * This method takes a layers from the "editable" layer list and moves it
     * to the "default" layer set.
     *
     * This operation modifies the editor state and does not affect the actual presentation.
     * It does not provide an "Undo" action.
     *
     * @param {number} layerIndex - The index of the layer to remove.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
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

    /** Get the layers at the given index.
     *
     * This method will return an array containing either a single layer,
     * or the layers in the "default" set.
     *
     * @param {number} layerIndex - The index of the layer to get, or a negative number for the "default" layers.
     * @return {Layer[]} The layer(s) at the given index.
     */
    getLayersAtIndex(layerIndex) {
        return layerIndex >= 0 ?
            [this.presentation.layers[layerIndex]] :
            this.defaultLayers;
    }

    /** `true` if all layers in the "default" set are selected.
     *
     * @type {boolean}
     */
    get defaultLayersAreSelected() {
        return this.defaultLayers.every(layer => this.selection.selectedLayers.indexOf(layer) >= 0);
    }

    /** `true` if there is at least one layer in the "default" set.
     *
     * @type {boolean}
     */
    get hasDefaultLayer() {
        return this.defaultLayers.length > 1 ||
               this.defaultLayers.length > 0 && this.defaultLayers[0].svgNodes.length;
    }

    /** Select the given layers.
     *
     * This methods adds the given layers to the selection and removes
     * the other previously selected layers.
     *
     * @param {Layer[]} layers - The layers to select.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
    selectLayers(layers) {
        this.selection.selectedLayers = layers.slice();
        this.updateCameraSelection();
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /** Add a layer to the selection.
     *
     * This method adds the given layer to the selection if it is not
     * already present.
     *
     * @param {Layer} layer - The layer to select.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
    addLayerToSelection(layer) {
        if (!this.selection.hasLayers([layer])) {
            this.selection.addLayer(layer);
            this.updateCameraSelection();
            this.emit("editorStateChange");
            this.emit("repaint");
        }
    }

    /** Remove a layer from the selection.
     *
     * This method removes the given layer to the selection if it is present.
     *
     * @param {Layer} layer - The layer to deselect.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
    removeLayerFromSelection(layer) {
        if (this.selection.hasLayers([layer])) {
            this.selection.removeLayer(layer);
            this.updateCameraSelection();
            this.emit("editorStateChange");
            this.emit("repaint");
        }
    }

    /** Select a single frame.
     *
     * This method adds the frame at the given index to the selection,
     * and removes the other previously selected frames.
     *
     * @param {number} index - The index of the frame to select. A negative number counts backwards from the end.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
    selectFrame(index) {
        if (index < 0) {
            index = this.presentation.frames.length + index;
        }
        this.updateLayerAndFrameSelection(false, false, this.selection.selectedLayers, index);
    }

    /** Select all frames.
     *
     * This methods adds all the frames of the presentation to the selection.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
    selectAllFrames() {
        this.selection.selectedFrames = this.presentation.frames.slice();
        this.updateCameraSelection();
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /** Select a specific frame at a relative location from the {@link Selection#currentFrame|current frame}.
     *
     * The absolute index of the frame to select is the sum of the {@link Selection#currentFrame|current frame}
     * index and the given relative index.
     *
     * @param {number} relativeIndex - The relative location of the frame to select with respect to the current frame.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
     */
    selectRelativeFrame(relativeIndex) {
        if (this.selection.currentFrame) {
            const lastIndex = this.presentation.frames.length - 1;
            let targetIndex = this.selection.currentFrame.index + relativeIndex;
            targetIndex = targetIndex < 0 ? 0 : (targetIndex > lastIndex ? lastIndex : targetIndex);
            this.updateLayerAndFrameSelection(false, false, this.selection.selectedLayers, targetIndex);
        }
    }

    /** Update the selection with the given frame.
     *
     * This method adds or removes frames to/from the selection depending on the
     * selection mode specified by the parameters `single` and `sequence`.
     * If `single` and `sequence` are false, select only the given frame and all layers.
     *
     * @param {boolean} single - If true, add or remove one frame to/from the selection.
     * @param {boolean} sequence - If true, add or remove consecutive frames, starting from the {@link Selection#currentFrame|current frame} up/down to the given index.
     * @param {number} frameIndex - The index of a frame in the presentation.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
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

        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /** Update the selection with the given layer.
     *
     * This method adds or removes layers to/from the selection depending on the
     * selection mode specified by the parameters `single` and `sequence`.
     * If `single` and `sequence` are false, select only the given layers and all frames.
     *
     * @todo Sequence mode is not supported yet.

     * @param {boolean} single - If true, add or remove the given layers to/from the selection.
     * @param {boolean} sequence - If true, add or remove consecutive layers, starting from the current layer up/down to the given layers.
     * @param {Layer[]} layers - The layers to select or deselect.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
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

        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /** Update the selection with the given layers and a given frame.
     *
     * This method adds or removes frames and layers to/from the selection depending
     * on the selection mode specified by the parameters `single` and `sequence`.
     * If `single` and `sequence` are false, select only the given frame and layers.
     *
     * @todo Sequence mode is not supported for layers.
     *
     * @param {boolean} single - If true, add or remove the given layers and frame to/from the selection.
     * @param {boolean} sequence - If true, add or remove consevutive frames and layers starting from the {@link Selection#currentFrame|current frame} and layer.
     * @param {Layer[]} layers - The layers to select or deselect.
     * @param {number} frameIndex - The index of the frame in the presentation
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
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

        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /** Toggle the visibility of the given layers.
     *
     * If the layers becomes visible, they are added to the selection,
     * otherwise, they are removed from the selection.
     *
     * @param {Layer[]} layers - The layers to show or hide.
     *
     * @fires Controller#editorStateChange
     * @fires Controller#repaint
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

        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /** Reset the selected layers to their initial state.
     *
     * This method puts all selected layers, in all selected frames,
     * in the same state as if the SVG was just opened.
     * Users can perform this operation to recover from a sequence of transformations
     * that resulted in an undesired layer state.
     *
     * This operation can be undone.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
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

    /** Copy the properties of a given layer into the selected layers.
     *
     * This method copies the layer properties and geometrical transformations
     * for the given layer in the selected frames, into the selected layers
     * in the same frames.
     *
     * This operation can be undone.
     *
     * @param {number} groupId - The ID of the SVG group for the layer to copy.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
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

        // Find the layer to copy.
        // If the given group id corresponds to the "default" layer set,
        // choose the first layer that contains an SVG element.
        // Otherwise, choose the layer with the given id.
        const layerToCopy = groupId == "__default__" ?
            this.defaultLayers.filter(layer => layer.svgNodes.length > 0)[0] :
            this.presentation.getLayerWithId(groupId);
        if (!layerToCopy || !layerToCopy.svgNodes.length) {
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

    /** `true` if the "Fit Element" function is available.
     *
     * This property is `true` when the outline element of each selected layer belongs to this layer.
     *
     * @type {boolean}
     */
    get canFitElement() {
        return this.selection.selectedFrames.length === 1 &&
               this.selection.selectedLayers.length >= 1 &&
               this.selection.selectedLayers.every(layer => {
                   const id = this.selection.currentFrame.layerProperties[layer.index].outlineElementId;
                   const elt = this.presentation.document.root.getElementById(id);
                   return elt && this.selection.selectedLayers.some(l => l.contains(elt));
               });
    }

    /** Fit each layer so that its outline element fills the viewport.
     *
     * This method applies a transformation to each selected layer in the
     * {@link Selection#currentFrame|current frame} so that the outline element
     * of each layer fills the current viewport.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
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

    /** Get a property of the current presentation.
     *
     * This method is used in the {@link Properties} view to assign getters
     * to HTML fields that represent presentation properties.
     *
     * @param {string} property - The name of the property to get.
     * @return The value of the property.
     */
    getPresentationProperty(property) {
        return this.presentation[property];
    }

    /** Set a property of the current presentation.
     *
     * This method is used in the {@link Properties} view to assign setters
     * to HTML fields that represent presentation properties.
     *
     * This operation can be undone.
     *
     * @param {string} property - The name of the property to set.
     * @param propertyValue - The new value of the property.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
    setPresentationProperty(property, propertyValue) {
        const pres = this.presentation;
        const savedValue = pres[property];

        this.perform(
            function onDo() {
                pres[property] = propertyValue;
            },
            function onUndo() {
                pres[property] = savedValue;
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    /** Get a property of the selected frames.
     *
     * This method is used in the {@link Properties} view to assign getters
     * to HTML fields that represent frame properties.
     *
     * @param {string} property - The name of the property to get.
     * @return {Array} The values of the property in the selected frames.
     */
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

    /** Set a property of the selected frames.
     *
     * This method is used in the {@link Properties} view to assign setters
     * to HTML fields that represent frame properties.
     *
     * This operation can be undone.
     *
     * @param {string} property - The name of the property to set.
     * @param propertyValue - The new value of the property.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
    setFrameProperty(property, propertyValue) {
        const savedValues = this.selection.selectedFrames.map(frame => [frame, frame[property]]);

        this.perform(
            function onDo() {
                for (let [frame, value] of savedValues) {
                    frame[property] = propertyValue;
                }
            },
            function onUndo() {
                for (let [frame, value] of savedValues) {
                    frame[property] = value;
                }
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    /** Get a property of the selected layers in the selected frames.
     *
     * This method is used in the {@link Properties} view to assign getters
     * to HTML fields that represent layer properties.
     *
     * @param {string} property - The name of the property to get.
     * @return {Array} The values of the property in the selected layers.
     */
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

    /** Set a property of the selected layers in the selected frames.
     *
     * This method is used in the {@link Properties} view to assign setters
     * to HTML fields that represent layer properties.
     *
     * This operation can be undone.
     *
     * @param {string} property - The name of the property to set.
     * @param propertyValue - The new value of the property.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
    setLayerProperty(property, propertyValue) {
        const selectedFrames = this.selection.selectedFrames.slice();
        const selectedLayers = this.selection.selectedLayers.slice();
        const savedValues = selectedFrames.map(
            frame => selectedLayers.map(
                layer => frame.layerProperties[layer.index][property]
            )
        );

        const link = property === "link" && propertyValue;

        const savedCameraStates = selectedFrames.map(
            frame => selectedLayers.map(
                layer => new CameraState(frame.cameraStates[layer.index])
            )
        );

        this.perform(
            function onDo() {
                for (let frame of selectedFrames) {
                    for (let layer of selectedLayers) {
                        frame.layerProperties[layer.index][property] = propertyValue;
                    }
                }

                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    selectedLayers.forEach((layer, layerIndex) => {
                        frame.layerProperties[layer.index][property] = savedValues[frameIndex][layerIndex];
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

    /** Get a property of the selected cameras in the selected frames.
     *
     * This method is used in the {@link Properties} view to assign getters
     * to HTML fields that represent camera properties.
     *
     * @param {string} property - The name of the property to get.
     * @return {Array} The values of the property in the selected cameras.
     */
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

    /** Set a property of the selected cameras in the selected frames.
     *
     * This method is used in the {@link Properties} view to assign setters
     * to HTML fields that represent camera properties.
     *
     * This operation can be undone.
     *
     * @param {string} property - The name of the property to set.
     * @param propertyValue - The new value of the property.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
    setCameraProperty(property, propertyValue) {
        const selectedFrames = this.selection.selectedFrames.slice();
        const selectedLayers = this.selection.selectedLayers.slice();

        const savedValues = selectedFrames.map(
            frame => selectedLayers.map(
                layer => ({
                    prop: frame.cameraStates[layer.index][property],
                    link: frame.layerProperties[layer.index].link
                })
            )
        );

        this.perform(
            function onDo() {
                for (let frame of selectedFrames) {
                    for (let layer of selectedLayers) {
                        frame.cameraStates[layer.index][property] = propertyValue;
                        frame.layerProperties[layer.index].link = false;
                    }
                }

                this.presentation.updateLinkedLayers();
            },
            function onUndo() {
                selectedFrames.forEach((frame, frameIndex) => {
                    selectedLayers.forEach((layer, layerIndex) => {
                        frame.cameraStates[layer.index][property] = savedValues[frameIndex][layerIndex].prop;
                        frame.layerProperties[layer.index].link = savedValues[frameIndex][layerIndex].link;
                    });
                });

                this.presentation.updateLinkedLayers();
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    /** Update the cameras in the current selection based on the current viewport state.
     *
     * This method is called after a user action that modifies the cameras in the
     * viewport. It copies the camera states of the viewport to the camera states
     * of the selected layers of the presentation.
     *
     * This operation can be undone.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
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

    /** Set the given element as the outline element of the selected layers in the current frame.
     *
     * This operation can be undone.
     *
     * @param {SVGElement} outlineElement - The element to use as an outline of the selected layers.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
    setOutlineElement(outlineElement) {
        const currentFrame = this.selection.currentFrame;
        if (currentFrame) {
            const properties = this.selection.selectedLayers.map(layer => {
                const layerProperties    = currentFrame.layerProperties[layer.index];
                const savedProperties    = new LayerProperties(layerProperties);
                const modifiedProperties = new LayerProperties(layerProperties);

                // Mark the modified layers as unlinked in the current frame
                modifiedProperties.link = false;

                modifiedProperties.outlineElementAuto = false;
                modifiedProperties.outlineElementId = outlineElement.getAttribute("id");

                return {layerProperties, savedProperties, modifiedProperties};
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

    /** Set the width component (numerator) of the current aspect ratio of the preview area.
     *
     * This operation can be undone.
     *
     * @param {number} width - The desired width.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
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

    /** Set the height component (denominator) of the current aspect ratio of the preview area.
     *
     * This operation can be undone.
     *
     * @param {number} height - The desired height.
     *
     * @fires Controller#presentationChange
     * @fires Controller#repaint
     */
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

    /** Set the effect of dragging in the preview area.
     *
     * @see Viewport#dragMode
     *
     * @param {string} dragMode - The new drag mode.
     *
     * @fires Controller#repaint
     */
    setDragMode(dragMode) {
        this.viewport.dragMode = dragMode;
        this.emit("repaint");
    }

    /** Get a property of the preferences object.
     *
     * This method is used in the {@link Properties} view to assign getters
     * to HTML fields that represent preferences.
     *
     * @param {string} property - The name of the property to get.
     * @return The values of the property in the preferences.
     */
    getPreference(key) {
        return this.preferences[key];
    }

    /** Set a property of the preferences object.
     *
     * This method is used in the {@link Properties} view to assign setters
     * to HTML fields that represent preferences.
     *
     * This operation cannot be undone.
     *
     * @param {string} property - The name of the property to set.
     * @param propertyValue - The new value of the property.
     *
     * @fires Controller#repaint
     */
    setPreference(key, value) {
        this.preferences[key] = value;
        this.applyPreferences();
    }

    /** Get the keyboard shortcut for a given action.
     *
     * This method is used in the {@link Properties} view to assign getters
     * to HTML fields that represent keyboard shortcut preferences.
     *
     * @param {string} action - A supported keyboard action name.
     * @return {string} A shortcut definition.
     */
    getShortcut(action) {
        return this.preferences.keys[action];
    }

    /** Set a keyboard shortcut for a given action.
     *
     * This method is used in the {@link Properties} view to assign setters
     * to HTML fields that represent keyboard shortcut preferences.
     *
     * This operation cannot be undone.
     *
     * @param {string} action - A supported keyboard action name.
     * @param value - A shortcut definition.
     */
    setShortcut(action, value) {
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
        this.preferences.keys[action] = value;
    }

    /** Update the user interface after modifying the preferences.
     *
     * @fires Controller#repaint
     */
    applyPreferences() {
        if (this.preferences.fontSize > 0) {
            document.body.style.fontSize = this.preferences.fontSize + "pt";
        }
        this.emit("repaint");
    }

    /** Perform an operation with undo/redo support.
     *
     * This method call `onDo`, adds an operation record to the
     * {@link Controller#undoStack|undo stack}, and clears the
     * {@link Controller#undoStack|redo stack}.
     *
     * @param {function()} onDo - The function that performs the operation.
     * @param {function()} onUndo - The function that undoes the operation.
     * @param {boolean} updateSelection - If `true`, restore the selection when undoing.
     * @param {string[]} events - Emit the given events when performing of undoing the operation.
     */
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

    /** Undo an operation.
     *
     * This method pops and executes an operation from the {@link Controller#undoStack|undo stack}.
     * It updates the selection and emits events as specified in the corresponding
     * call to {@link Controller#peform}.
     * The operation record is pushed to the {@link Controller#redoStack|redo stack}
     */
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

    /** Redo an operation.
     *
     * This method pops and executes an operation from the {@link Controller#undoStack|redo stack}.
     * It updates the selection and emits events as specified in the corresponding
     * call to {@link Controller#peform}.
     * The operation record is pushed to the {@link Controller#redoStack|undo stack}
     */
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
