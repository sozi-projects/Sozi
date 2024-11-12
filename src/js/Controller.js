/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {Storage} from "./Storage";
import {Frame, LayerProperties} from "./model/Presentation";
import {CameraState} from "./model/CameraState";
import {EventEmitter} from "events";
import * as i18n from "./i18n";
import * as exporter from "./exporter";

/** The maximum size of the undo stack.
 *
 * @readonly
 * @default
 * @type {number}
 */
const UNDO_STACK_LIMIT = 100;

/** Signals that the presentation data has changed.
 *
 * @event module:Controller.presentationChange
 */

/** Signals that the editor state data has changed.
 *
 * @event module:Controller.editorStateChange
 */

/** Signals that the editor UI needs to be repainted.
 *
 * @event module:Controller.repaint
 */

/** Signals that the current editor window has received the focus.
 *
 * @event module:Controller.focus
 */

/** Signals that the current editor window has lost the focus.
 *
 * @event module:Controller.blur
 */

/** Sozi editor UI controller.
 *
 * A Controller instance manages the user interface of the editor and updates
 * the presentation data in reaction to user actions.
 *
 * @extends EventEmitter
 */
export class Controller extends EventEmitter {

    /** Initialize a new Sozi editor UI controller.
     *
     * @param {module:model/Preferences.Preferences} preferences - The object that holds the user settings of the editor.
     * @param {module:model/Presentation.Presentation} presentation - The Sozi presentation opened in the editor.
     * @param {module:model/Selection.Selection} selection - The object that represents the selection in the timeline.
     * @param {module:player/Viewport.Viewport} viewport - The object that displays a preview of the presentation.
     * @param {module:player/Player.Player} player - The object that animates the presentation.
     */
    constructor(preferences, presentation, selection, viewport, player) {
        super();

        /** The function that returns translated text in the current language.
         *
         * @param {string} s - The text to translate.
         * @returns {string} The translated text.
         */
        this.gettext = s => s;

        /** The object that holds the user settings of the editor.
         *
         * @type {module:model/Preferences.Preferences}
         */
        this.preferences = preferences;

        /** The Sozi presentation opened in the editor.
         *
         * @type {module:model/Presentation.Presentation}
         */
        this.presentation = presentation;

        /** The object that represents the selection in the timeline.
         *
         * @type {module:model/Selection.Selection}
         */
        this.selection = selection;

        /** The object that displays a preview of the presentation.
         *
         * @type {module:player/Viewport.Viewport}
         */
        this.viewport = viewport;

        /** The object that animates the presentation.
         *
         * @type {module:player/Player.Player}
         */
        this.player = player;

        /** The object that manages the file I/O.
         *
         * @type {module:Storage.Storage}
         */
        this.storage = new Storage(this, presentation, selection);

        /** The layers that have been added to the timeline.
         *
         * @type {module:model/Presentation.Layer[]}
         */
        this.editableLayers = [];

        /** The layers that fall in the "default" row of the timeline.
         *
         * @type {module:model/Presentation.Layer[]}
         */
        this.defaultLayers = [];

        /** The stack of operations that can be undone.
         *
         * @type {Array}
         */
        this.undoStack = [];

        /** The stack of operations that can be redone.
         *
         * @type {Array}
         */
        this.redoStack = [];

        /** The timeout ID of the current notification.
         *
         * @type {?number}
         */
        this.notificationTimeout = null;

        /** True if the current window has the focus.
         *
         * @type {boolean}
         */
        this.hasFocus = false;

        /** True if an export operation is in progress.
         *
         * @default
         * @type {boolean}
         */
        this.exporting = false;

        window.addEventListener("focus", () => {
            this.hasFocus = true;
            this.emit("focus");
        });

        window.addEventListener("blur", () => {
            this.hasFocus = false;
            this.emit("blur");
        });

        this.on("repaint", () => this.onRepaint());
        player.on("frameChange", () => this.onFrameChange());
    }

    /** Finalize the initialization of the application.
     *
     * Load and apply the user preferences.
     * Activate the storage instance.
     */
    activate() {
        this.preferences.load();
        this.applyPreferences();
        this.storage.activate();
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains all the properties needed by the editor to restore
     * the state of this instance.
     *
     * @returns {object} - A plain object with the properties needed by the editor.
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
     * @param {object} storable - A plain object with the properties to copy.
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

    /** Show a notification.
     *
     * The presentation editor does not use the operating system's notification
     * system.
     * This method will display a notification inside the application.
     *
     * A notification will be hidden after a given time.
     * Consecutive notifications are concatenated if they happen in a short period of time.
     *
     * @param {string} severity - The severity of the event to signal (`"error"` or `"info"`).
     * @param {string} body - An HTML string to show in the notification area.
     */
    showNotification(severity, body) {
        const _ = this.gettext;
        const msg = document.getElementById("message");
        if (this.notificationTimeout === null) {
            msg.querySelector(".body").innerHTML = "";
        }
        else {
            clearTimeout(this.notificationTimeout);
        }

        msg.querySelector(".title").innerHTML =
            severity === "error" ? _('<i class="fa fa-exclamation-triangle"></i> Error')
                                 : _('<i class="fa fa-info-circle"></i> Information');

        msg.querySelector(".body").innerHTML  += `<div>${body}</div>`;
        msg.classList.add("visible", severity);
        this.notificationTimeout = setTimeout(() => this.hideNotification(), 5000);
    }

    /** Hide all notifications. */
    hideNotification() {
        const msg = document.getElementById("message");
        msg.classList.remove("visible", "info", "error");
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = null;
    }

    /** Show a notification with an information message.
     *
     * @param {string} body - The message to display.
     * @param {boolean} force - Ignore the user preferences for notifications.
     */
    info(body, force=false) {
        if (this.preferences.enableNotifications || force) {
            this.showNotification("info", body);
        }
    }

    /** Show a notification with an error message.
     *
     * @param {string} body - The message to display.
     */
    error(body) {
        this.showNotification("error", body);
    }

    /** Update the visible frame on repaint.
     *
     * This method is called each time this controller emits the "repaint" event.
     * If the {@link module:model/Selection.Selection#currentFrame|currently selected frame} is different
     * from the {@link module:player/Player.Player#currentFrame|currently visible frame},
     * it will move to the selected frame.
     *
     * @listens module:Controller.repaint
     */
    onRepaint() {
        if (this.selection.currentFrame && (this.selection.currentFrame !== this.player.currentFrame || this.player.animator.running)) {
            if (this.preferences.animateTransitions) {
                this.player.moveToFrame(this.selection.currentFrame);
            }
            else {
                this.player.jumpToFrame(this.selection.currentFrame);
            }
        }
    }

    /** On frame change, recompute the reference element.
     *
     * @listens module:player/Player.frameChange
     */
    onFrameChange() {
        let changed = false;
        for (let layer of this.presentation.layers) {
            const layerProperties = this.selection.currentFrame.layerProperties[layer.index];
            if (layer.isVisible) {
                // Update the reference SVG element if applicable.
                const {element} = this.viewport.cameras[layer.index].getCandidateReferenceElement();
                if (element && element !== layerProperties.referenceElement) {
                    layerProperties.referenceElementId = element.getAttribute("id");
                    changed = true;
                }
            }
        }
        if (changed) {
            this.emit("repaint");
        }
    }

    /** Finalize the loading of a presentation.
     *
     * This method is called by a {@linkcode module:Storage.Storage|Storage} instance when the SVG and JSON files
     * of a presentation have been loaded.
     * It sets a default {@link module:Controller.Controller#selection|selection} if needed,
     * and shows the {@link module:model/Selection.Selection#currentFrame|current frame}.
     */
    onLoad() {
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

        this.emit("repaint");
    }

    /** Process an SVG document change event.
     *
     * Depending on the user preferences, this method will reload the
     * presentation, or prompt the user.
     *
     * @param {any} fileDescriptor - The file that changed recently.
     */
    onFileChange(fileDescriptor) {
        const _ = this.gettext;
        const doReload = () => {
            this.info(_("Document was changed. Reloading."));
            this.reload();
        };

        if (this.storage.backend.sameFile(fileDescriptor, this.storage.svgFileDescriptor)) {
            switch (this.getPreference("reloadMode")) {
                case "auto": doReload(); break;
                case "onfocus":
                    if (this.hasFocus) {
                        doReload();
                    }
                    else {
                        this.once("focus", doReload);
                    }
                    break;
                default: this.info(_("Document was changed."));
            }
        }
    }

    /** Save the presentation.
     *
     * This method delegates the operation to its {@linkcode module:Storage.Storage|Storage} instance and triggers
     * a repaint so that the UI shows the correct "saved" status.
     *
     * @fires module:Controller.repaint
     *
     * @see {@linkcode module:Storage.Storage#save}
     */
    async save() {
        await this.storage.save();
        this.emit("repaint");
    }

    /** Reload the presentation.
     *
     * This method delegates the operation to its {@linkcode module:Storage.Storage|Storage} instance.
     */
    reload() {
        this.storage.reload();
    }

    /** Add a custom stylesheet or script to the current presentation.
     *
     * This action supports undo and redo.
     *
     * @param {string} path - The path of the file to add.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    addCustomFile(path) {
        this.perform(
            function onDo() {
                this.presentation.customFiles.push(this.storage.toRelativePath(path));
            },
            function onUndo() {
                this.presentation.customFiles.pop();
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    /** Remove a custom stylesheet or script from the current presentation.
     *
     * This action supports undo and redo.
     *
     * @param {number} index - The index of the entry to remove in the custom file list.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    removeCustomFile(index) {
        const fileName = this.presentation.customFiles[index];
        this.perform(
            function onDo() {
                this.presentation.customFiles.splice(index, 1);
            },
            function onUndo() {
                this.presentation.customFiles.splice(index, 0, fileName);
            },
            false,
            ["presentationChange", "repaint"]
        );
    }

    /** Get the list of custom stylesheets and scripts added to the current presentation.
     *
     * @returns {string[]} - An array of file paths.
     */
    getCustomFiles() {
        return this.presentation.customFiles;
    }

    /** Add a new frame to the presentation.
     *
     * A new frame is added to the presentation after the
     * {@link module:model/Selection.Selection#currentFrame|currently selected frame}.
     * If no frame is selected, the new frame is added at the
     * end of the presentation.
     *
     * This action supports undo and redo.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * This action supports undo and redo.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * This action supports undo and redo.
     *
     * @param {number} toFrameIndex - The new index of the first frame in the selection.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * For each selected layer, this method sets the {@linkcode module:player/Camera.Camera#selected|selected} property of
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
     * This action does not support undo and redo.
     *
     * @param {number} layerIndex - The index of the layer to add.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * This action does not support undo and redo.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * This action does not support undo and redo.
     *
     * @param {number} layerIndex - The index of the layer to remove.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @returns {module:model/Presentation.Layer[]} The layer(s) at the given index.
     */
    getLayersAtIndex(layerIndex) {
        return layerIndex >= 0 ?
            [this.presentation.layers[layerIndex]] :
            this.defaultLayers;
    }

    /** `true` if all layers in the "default" set are selected.
     *
     * @readonly
     * @type {boolean}
     */
    get defaultLayersAreSelected() {
        return this.defaultLayers.every(layer => this.selection.selectedLayers.indexOf(layer) >= 0);
    }

    /** `true` if there is at least one layer in the "default" set.
     *
     * @readonly
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
     * @param {module:model/Presentation.Layer[]} layers - The layers to select.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @param {module:model/Presentation.Layer} layer - The layer to select.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @param {module:model/Presentation.Layer} layer - The layer to deselect.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
     */
    selectAllFrames() {
        this.selection.selectedFrames = this.presentation.frames.slice();
        this.updateCameraSelection();
        this.emit("editorStateChange");
        this.emit("repaint");
    }

    /** Select a specific frame at a relative location from the {@link module:model/Selection.Selection#currentFrame|current frame}.
     *
     * The absolute index of the frame to select is the sum of the {@link module:model/Selection.Selection#currentFrame|current frame}
     * index and the given relative index.
     *
     * @param {number} relativeIndex - The relative location of the frame to select with respect to the current frame.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @param {boolean} sequence - If true, add or remove consecutive frames, starting from the {@link module:model/Selection.Selection#currentFrame|current frame} up/down to the given index.
     * @param {number} frameIndex - The index of a frame in the presentation.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     *
     * @param {boolean} single - If true, add or remove the given layers to/from the selection.
     * @param {boolean} sequence - If true, add or remove consecutive layers, starting from the current layer up/down to the given layers.
     * @param {module:model/Presentation.Layer[]} layers - The layers to select or deselect.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @param {boolean} sequence - If true, add or remove consevutive frames and layers starting from the {@link module:model/Selection.Selection#currentFrame|current frame} and layer.
     * @param {module:model/Presentation.Layer[]} layers - The layers to select or deselect.
     * @param {number} frameIndex - The index of the frame in the presentation
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * @param {module:model/Presentation.Layer[]} layers - The layers to show or hide.
     *
     * @fires module:Controller.editorStateChange
     * @fires module:Controller.repaint
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
     * This action supports undo and redo.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
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
     * This action supports undo and redo.
     *
     * @param {number} groupId - The ID of the SVG group for the layer to copy.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
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
     * @readonly
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

    /** Find and assign an outline element to the current frame in the selected layers.
     *
     * @see {@linkcode module:player/Camera.Camera#getCandidateReferenceElement}
     * @see {@linkcode module:Controller.Controller#setOutlineElement}
     */
    autoselectOutlineElement() {
        const currentFrame = this.selection.currentFrame;
        if (!currentFrame) {
            return;
        }

        let outlineElt = null, outlineScore = null;

        for (let layer of this.selection.selectedLayers) {
            const {element, score} = this.viewport.cameras[layer.index].getCandidateReferenceElement();
            if (element && (outlineScore === null || score < outlineScore)) {
                outlineElt   = element;
                outlineScore = score;
            }
        }

        if (outlineElt) {
            this.setOutlineElement(outlineElt);
        }
    }

    /** Use the element with the user-provided ID as an outline element.
     *
     * @see {@linkcode module:Controller.Controller#setOutlineElement}
     */
    fitElement() {
        const outlineElementId = this.getLayerProperty("outlineElementId");
        const outlineElt = this.presentation.document.root.getElementById(outlineElementId);
        if (outlineElt) {
            this.setOutlineElement(outlineElt);
        }
    }

    /** Get a property of the current presentation.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign getters
     * to HTML fields that represent presentation properties.
     *
     * @param {string} property - The name of the property to get.
     * @returns {any} - The value of the property.
     */
    getPresentationProperty(property) {
        return this.presentation[property];
    }

    /** Set a property of the current presentation.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign setters
     * to HTML fields that represent presentation properties.
     *
     * This action supports undo and redo.
     *
     * @param {string} property - The name of the property to set.
     * @param {any} newValue - The new value of the property.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    setPresentationProperty(property, newValue) {
        const pres = this.presentation;
        const savedValue = pres[property];

        this.perform(
            function onDo() {
                pres[property] = newValue;
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
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign getters
     * to HTML fields that represent frame properties.
     *
     * @param {string} property - The name of the property to get.
     * @returns {Array} The values of the property in the selected frames.
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
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign setters
     * to HTML fields that represent frame properties.
     *
     * This action supports undo and redo.
     *
     * @param {string} property - The name of the property to set.
     * @param {any} newValue - The new value of the property.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    setFrameProperty(property, newValue) {
        const savedValues = this.selection.selectedFrames.map(frame => [frame, frame[property]]);

        this.perform(
            function onDo() {
                for (let [frame, value] of savedValues) {
                    frame[property] = newValue;
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
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign getters
     * to HTML fields that represent layer properties.
     *
     * @param {string} property - The name of the property to get.
     * @returns {Array} The values of the property in the selected layers.
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
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign setters
     * to HTML fields that represent layer properties.
     *
     * This action supports undo and redo.
     *
     * @param {string} property - The name of the property to set.
     * @param {any} newValue - The new value of the property.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    setLayerProperty(property, newValue) {
        if (property === "outlineElementId") {
            const outlineElt = this.presentation.document.root.getElementById(newValue);
            if (outlineElt) {
                this.setOutlineElement(outlineElt);
            }
            return;
        }

        const selectedFrames = this.selection.selectedFrames.slice();
        const selectedLayers = this.selection.selectedLayers.slice();
        const savedValues = selectedFrames.map(
            frame => selectedLayers.map(
                layer => frame.layerProperties[layer.index][property]
            )
        );

        const link = property === "link" && newValue;

        const savedCameraStates = selectedFrames.map(
            frame => selectedLayers.map(
                layer => new CameraState(frame.cameraStates[layer.index])
            )
        );

        this.perform(
            function onDo() {
                for (let frame of selectedFrames) {
                    for (let layer of selectedLayers) {
                        frame.layerProperties[layer.index][property] = newValue;
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
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign getters
     * to HTML fields that represent camera properties.
     *
     * @param {string} property - The name of the property to get.
     * @returns {Array} The values of the property in the selected cameras.
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
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign setters
     * to HTML fields that represent camera properties.
     *
     * This action supports undo and redo.
     *
     * @param {string} property - The name of the property to set.
     * @param {any} newValue - The new value of the property.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    setCameraProperty(property, newValue) {
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
                        frame.cameraStates[layer.index][property] = newValue;
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
     * This action supports undo and redo.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    updateCameraStates() {
        const currentFrame = this.selection.currentFrame;
        if (!currentFrame) {
            return;
        }

        const savedFrame    = new Frame(currentFrame);
        const modifiedFrame = new Frame(currentFrame);

        for (let layer of this.selection.selectedLayers) {
            const camera = this.viewport.cameras[layer.index];

            // Update the camera states of the current frame
            modifiedFrame.cameraStates[layer.index].copy(camera);

            // We will update the layer properties corresponding to the
            // current camera in the modified frame
            const layerProperties = modifiedFrame.layerProperties[layer.index];

            // Mark the modified layers as unlinked in the current frame
            layerProperties.link = false;

            // Update the reference SVG element if applicable.
            const {element} = camera.getCandidateReferenceElement();
            if (element) {
                layerProperties.referenceElementId = element.getAttribute("id");
            }
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

    /** Set the given element as the outline element of the selected layers in the current frame.
     *
     * This action supports undo and redo.
     *
     * @param {SVGElement} outlineElement - The element to use as an outline of the selected layers.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
     */
    setOutlineElement(outlineElement) {
        const currentFrame = this.selection.currentFrame;
        if (!currentFrame) {
            return;
        }

        const savedFrame    = new Frame(currentFrame);
        const modifiedFrame = new Frame(currentFrame);

        // Find the layer that contains the given element
        let outlineLayerGroup = outlineElement;
        while (outlineLayerGroup.parentNode.parentNode.parentNode !== this.presentation.document.root) {
            outlineLayerGroup = outlineLayerGroup.parentNode;
        }
        const outlineLayer = this.presentation.getLayerWithId(outlineLayerGroup.id);

        // Compute the offset in that layer.
        const outlineState = currentFrame.cameraStates[outlineLayer.index];
        const outlineAngle = outlineState.angle;
        const offset       = outlineState.offsetFromElement(outlineElement);

        // Compute the scaling factor to apply.
        const outlineCam   = this.viewport.cameras[outlineLayer.index];
        const outlineScale = outlineCam.scale;
        outlineCam.applyOffset(offset);
        const scalingFactor = outlineCam.scale / outlineScale;

        for (let layer of this.selection.selectedLayers) {
            const cameraState = modifiedFrame.cameraStates[layer.index];

            if (layer === outlineLayer) {
                cameraState.applyOffset(offset);
            }
            else {
                const camera   = this.viewport.cameras[layer.index];
                const angleRad = (cameraState.angle - outlineAngle) * Math.PI / 180;
                const si       = Math.sin(angleRad) * outlineScale / camera.scale;
                const co       = Math.cos(angleRad) * outlineScale / camera.scale;

                cameraState.applyOffset({
                    deltaX:       offset.deltaX * co - offset.deltaY * si,
                    deltaY:       offset.deltaX * si + offset.deltaY * co,
                    widthFactor:  scalingFactor,
                    heightFactor: scalingFactor,
                    deltaAngle:   offset.deltaAngle
                });
            }

            cameraState.resetClipping();

            const layerProperties            = modifiedFrame.layerProperties[layer.index];
            layerProperties.link             = false;
            layerProperties.outlineElementId = outlineElement.getAttribute("id");
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

    /** Set the width component (numerator) of the current aspect ratio of the preview area.
     *
     * This action supports undo and redo.
     *
     * @param {number} width - The desired width.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
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
     * This action supports undo and redo.
     *
     * @param {number} height - The desired height.
     *
     * @fires module:Controller.presentationChange
     * @fires module:Controller.repaint
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
     * @param {string} dragMode - The new drag mode.
     *
     * @fires module:Controller.repaint
     *
     * @see {@linkcode module:player/Viewport.Viewport#dragMode}
     */
    setDragMode(dragMode) {
        this.viewport.dragMode = dragMode;
        this.emit("repaint");
    }

    /** Get a property of the preferences object.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign getters
     * to HTML fields that represent preferences.
     *
     * @param {string} key - The name of the property to get.
     * @returns {any} - The value of the property in the preferences.
     */
    getPreference(key) {
        return this.preferences[key];
    }

    /** Set a property of the preferences object.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign setters
     * to HTML fields that represent preferences.
     *
     * This operation cannot be undone.
     *
     * @param {string} key - The name of the property to set.
     * @param {any} newValue - The new value of the property.
     *
     * @fires module:Controller.repaint
     */
    setPreference(key, newValue) {
        this.preferences[key] = newValue;
        this.applyPreferences({[key]: true});
    }

    /** Get an application setting.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign getters
     * to HTML fields that represent preferences.
     *
     * @param {string} key - The name of the property to get.
     * @returns {any} - The value of the property in the application settings.
     */
    getAppSetting(key) {
        return this.storage.backend.getAppSetting(key);
    }

    /** Set a property of the application settings.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign setters
     * to HTML fields that represent preferences.
     *
     * This operation cannot be undone.
     *
     * @param {string} key - The name of the property to set.
     * @param {any} newValue - The new value of the property.
     *
     * @fires module:Controller.repaint
     */
    setAppSetting(key, newValue) {
        this.storage.backend.setAppSetting(key, newValue);
        this.emit("repaint");
    }

    /** Get the keyboard shortcut for a given action.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign getters
     * to HTML fields that represent keyboard shortcut preferences.
     *
     * @param {string} action - A supported keyboard action name.
     * @returns {string} - A shortcut definition.
     */
    getShortcut(action) {
        return this.preferences.keys[action];
    }

    /** Set a keyboard shortcut for a given action.
     *
     * This method is used in the {@linkcode module:view/Properties.Properties|Properties} view to assign setters
     * to HTML fields that represent keyboard shortcut preferences.
     *
     * This operation cannot be undone.
     *
     * @param {string} action - A supported keyboard action name.
     * @param {any} newValue - A shortcut definition.
     */
    setShortcut(action, newValue) {
        // Find occurrences of modifier keys in the given value.
        let ctrl  = /\bCtrl\s*\+/i.test(newValue);
        let alt   = /\bAlt\s*\+/i.test(newValue);
        let shift = /\bShift\s*\+/i.test(newValue);

        // Remove all occurrences of modifier keys and spaces in the given value.
        newValue = newValue.replace(/\bCtrl\s*\+\s*/gi, "");
        newValue = newValue.replace(/\bAlt\s*\+\s*/gi, "");
        newValue = newValue.replace(/\bShift\s*\+\s*/gi, "");
        newValue = newValue.replace(/\s/g, "").toUpperCase();
        if (newValue.length === 0) {
            return;
        }

        // Rewrite the shortcut in standard order.
        if (shift) {
            newValue = "Shift+" + newValue;
        }
        if (alt) {
            newValue = "Alt+" + newValue;
        }
        if (ctrl) {
            newValue = "Ctrl+" + newValue;
        }
        this.preferences.keys[action] = newValue;
    }

    /** Update the user interface after modifying the preferences.
     *
     * @param {string|object} changed - A dictionay that maps changed property names to a boolean `true`.
     *
     * @fires module:Controller.repaint
     */
    applyPreferences(changed="all") {
        if ((changed === "all" || changed.fontSize) && this.preferences.fontSize > 0) {
            document.body.style.fontSize = this.preferences.fontSize + "pt";
        }

        if (changed === "all" || changed.language) {
            const locale = i18n.init(this.preferences.language);
            this.gettext = s => locale.gettext(s);
        }

        this.emit("repaint");
    }

    /** Toggle the "exporting" state */
    toggleExportState() {
        this.exporting = !this.exporting;
        this.emit("repaint");
    }

    /** Export the current presentation to PDF. */
    async exportToPDF() {
        const _ = this.gettext;
        this.toggleExportState();
        await this.save();
        try {
            await exporter.exportToPDF(this.presentation, this.storage.htmlFileDescriptor);
            this.info(_("Presentation was exported to PDF."));
        }
        catch (e) {
            this.error(_("Failed to write PDF file."));
            console.log(e);
        }
        this.toggleExportState();
    }

    /** Export the current presentation to PPTX. */
    async exportToPPTX() {
        const _ = this.gettext;
        this.toggleExportState();
        await this.save();
        try {
            await exporter.exportToPPTX(this.presentation, this.storage.htmlFileDescriptor);
            this.info(_("Presentation was exported to PPTX."));
        }
        catch (e) {
            this.error(_("Failed to write PPTX file."));
            console.log(e);
        }
        this.toggleExportState();
    }

    /** Export the current presentation to video. */
    async exportToVideo() {
        const _ = this.gettext;
        this.toggleExportState();
        await this.save();
        try {
            await exporter.exportToVideo(this.presentation, this.storage.htmlFileDescriptor);
            this.info(_("Presentation was exported to video."));
        }
        catch (e) {
            this.error(_("Failed to write video file."));
            console.log(e);
        }
        this.toggleExportState();
    }

    /** Perform an operation with undo/redo support.
     *
     * This method call `onDo`, adds an operation record to the
     * {@link module:Controller.Controller#undoStack|undo stack}, and clears the
     * {@link module:Controller.Controller#undoStack|redo stack}.
     *
     * @param {function():void} onDo - The function that performs the operation.
     * @param {function():void} onUndo - The function that undoes the operation.
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
     * This method pops and executes an operation from the {@link module:Controller.Controller#undoStack|undo stack}.
     * It updates the selection and emits events as specified in the corresponding
     * call to {@linkcode module:Controller.Controller#peform|perform}.
     * The operation record is pushed to the {@link module:Controller.Controller#redoStack|redo stack}
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
     * This method pops and executes an operation from the {@link module:Controller.Controller#undoStack|redo stack}.
     * It updates the selection and emits events as specified in the corresponding
     * call to {@linkcode module:Controller.Controller#peform|perform}.
     * The operation record is pushed to the {@link module:Controller.Controller#redoStack|undo stack}
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
