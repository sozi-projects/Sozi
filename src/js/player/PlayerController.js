/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {EventEmitter} from "events";

/** The mouse button for the drag action.
 *
 * 0 is the left button.
 *
 * @readonly
 * @default
 * @type {number}
 */
const DRAG_BUTTON = 0;

/** The minimum distance to detect a drag action, in pixels.
 *
 * @readonly
 * @default
 * @type {number}
 */
const DRAG_THRESHOLD_PX = 5;

/** The zoom step factor for user zoom action (keyboard and mouse wheel).
 *
 * @readonly
 * @default
 * @type {number}
 */
const SCALE_FACTOR = 1.05;

/** The rotation step angle for user rotate action (keyboard and mouse wheel), in degrees.
 *
 * @readonly
 * @default
 * @type {number}
 */
const ROTATE_STEP = 5;

/** The delay after the last mouse wheel event to consider that the wheel action is terminated, in milliseconds.
 *
 * @readonly
 * @default
 * @type {number}
 */
const WHEEL_TIMEOUT_MS = 200;

/** Signals that a user action will make the presentation jump to another frame.
 *
 * The event is emitted before the transition.
 * Its argument is the target frame.
 *
 * @event module:player/PlayerController.jumpToFrame
 * @type {module:model/Presentation.Frame}
 */

/** Signals that a user action will make the presentation move to another frame.
 *
 * The event is emitted before the transition.
 * Its argument is the target frame.
 *
 * @event module:player/PlayerController.moveToFrame
 * @type {module:model/Presentation.Frame}
 */

/** Signals that a user action will make the presentation move to another frame in *preview* mode.
 *
 * The event is emitted before the transition.
 * Its argument is the target frame.
 *
 * @event module:player/PlayerController.previewFrame
 * @type {module:model/Presentation.Frame}
 */

/** Signals that a user action will trigger the "view all" feature.
 *
 * The event is emitted before the transition.
 *
 * @event module:player/PlayerController.viewAll
 */

/** Signals that a user action has paused the presentation.
 *
 * @event module:player/PlayerController.pause
 */

/** Signals that a user action has toggled the blank screen status.
 *
 * When emitted, the argument indicates the new blank screen status.
 *
 * @event module:player/PlayerController.toggleBlankScreen
 * @type {boolean}
 */

/** Signals that a user action will change the zoom level.
 *
 * The event is emitted before applying the transformation.
 *
 * @event module:player/PlayerController.zoom
 * @type {object}
 * @property {number} factor - The zoom factor.
 * @property {number} x      - The x coordinate of the screenpoint to focus while zooming.
 * @property {number} y      - The y coordinate of the screenpoint to focus while zooming.
 * @todo We should send the new absolute camera states instead of the current transformation.
 */

/** Signals that a user action will change the rotation angle.
 *
 * The event is emitted before applying the transformation.
 * Its argument is the angle.
 *
 * @event module:player/PlayerController.rotate
 * @type {number}
 * @todo We should send the new absolute camera states instead of the current transformation.
 */

/** Signals that a user action will perform a translation.
 *
 * The event is emitted before applying the transformation.
 *
 * @event module:player/PlayerController.translate
 * @type {object}
 * @property {number} deltaX - The horizontal displacement, in pixels.
 * @property {number} deltaY - The vertical displacement, in pixels.
 * @todo We should send the new absolute camera states instead of the current transformation.
 */

/** Signals a mouse click in a viewport.
 *
 * @event module:player/PlayerController.click
 */

/** Signals a mouse button press in a viewport.
 *
 * @event module:player/PlayerController.mouseDown
 */

/** Signals the possible start of a drag gesture in a viewport.
 *
 * @event module:player/PlayerController.dragStart
 */

/** Signals the end of a drag gesture in a viewport.
 *
 * @event module:player/PlayerController.dragEnd
 */

/** Signals a user-activated change in the camera states of a viewport.
 *
 * @event module:player/PlayerController.localViewportChange
 */

/** The player's event handling controller
 *
 * The controller implements keyboard and mouse handlers and performs according actions on the associated viewport.
 * It also provides an interface to external ui event handlers:
 * - TouchGestures
 *
 * @extends EventEmitter
 */
export class PlayerController extends EventEmitter{
    /** Initialize a new Sozi player controller.
     *
     * If the presentation is opened in edit mode, the controller will disable
     * these features on the corresponding player:
     * - mouse and keyboard actions for navigating in the presentation,
     * - automatic transitions after a timeout.
     *
     * @param {module:player/Player.Player} player - The player attached to this controller.
     */
    constructor(player) {
        super();

        /** The associated player.
         *
         * @type {module:model/Player.Player}
         */
        this.player = player;

        /** The current X coordinate of the mous during a drag action.
         *
         * @default
         * @type {number}
         */
        this.mouseDragX = 0;

        /** The current Y coordinate of the mous during a drag action.
         *
         * @default
         * @type {number}
         */
        this.mouseDragY = 0;

        /** A timeout ID to detect the end of a mouse wheel gesture.
         *
         * @default
         * @type {?number}
         */
        this.wheelTimeout = null;

        /** The mouse drag event handler.
         *
         * This function is registered as an event listener after
         * a mouse-down event.
         *
         * @param {MouseEvent} evt - A DOM event.
         * @returns {void}
         * @listens mousemove
         */
        this.dragHandler = evt => this.onDrag(evt);

        /** The mouse drag end event handler.
         *
         * This function is registered as an event listener after
         * a mouse-down event.
         *
         * @param {MouseEvent} evt - A DOM event.
         * @returns {void}
         * @listens mouseup
         */
        this.dragEndHandler = evt => this.onDragEnd(evt);

        if (!this.editMode) {
            window.addEventListener("keydown", evt => this.onKeyDown(evt), false);
            window.addEventListener("keypress", evt => this.onKeyPress(evt), false);
        }
    }

    get viewport() {
        return this.player.viewport;
    }

    get presentation() {
        return this.player.presentation;
    }

    get editMode() {
        return this.player.viewport.editMode;
    }

    onLoad() {
        const svgRoot = this.viewport.svgRoot;

        svgRoot.addEventListener("mousedown",   evt => this.onMouseDown(evt),   false);
        svgRoot.addEventListener("mousemove",   evt => this.onMouseMove(evt),   false);
        svgRoot.addEventListener("contextmenu", evt => this.onContextMenu(evt), false);

        const wheelEvent =
            "onwheel" in document.createElement("div") ? "wheel" :  // Modern browsers support "wheel"
            document.onmousewheel !== undefined ? "mousewheel" :    // Webkit and IE support at least "mousewheel"
            "DOMMouseScroll";                                       // Firefox < 17
        svgRoot.addEventListener(wheelEvent, evt => this.onWheel(evt), false);
    }

    /** Process a mouse move event in this viewport.
     *
     * @param {MouseEvent} evt - A DOM event.
     *
     * @listens mousemove
     */
    onMouseMove(evt) {
        this.viewport.updateClipCursor(evt.clientX,evt.clientY);
    }

    /** Process a mouse down event in this viewport.
     *
     * If the mouse button pressed is the left button,
     * this method will setup event listeners for detecting a drag action.
     *
     * @param {MouseEvent} evt - A DOM event.
     *
     * @listens mousedown
     * @fires module:player/PlayerController.mouseDown
     */
    onMouseDown(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if (evt.button === DRAG_BUTTON) {
            this.mouseDragged = false;
            this.mouseDragChangedState = false;
            this.mouseDragX = this.mouseDragStartX = evt.clientX;
            this.mouseDragY = this.mouseDragStartY = evt.clientY;

            document.documentElement.addEventListener("mousemove", this.dragHandler, false);
            document.documentElement.addEventListener("mouseup", this.dragEndHandler, false);

            this.viewport.updateClipMode(evt.clientX,evt.clientY);
        }

        this.emit("mouseDown", evt.button);
    }

    /** Process a mouse drag event.
     *
     * This method is called when a mouse move event happens after a mouse down event.
     *
     * @param {MouseEvent} evt - A DOM event.
     *
     * @listens mousemove
     * @fires module:player/PlayerController.dragStart
     */
    onDrag(evt) {
        evt.stopPropagation();
        const xFromCenter = evt.clientX - this.viewport.x - this.viewport.width / 2;
        const yFromCenter = evt.clientY - this.viewport.y - this.viewport.height / 2;
        let angle = 180 * Math.atan2(yFromCenter, xFromCenter) / Math.PI;
        let translateX = evt.clientX;
        let translateY = evt.clientY;
        const zoom = Math.sqrt(xFromCenter * xFromCenter + yFromCenter * yFromCenter);
        const deltaX = evt.clientX - this.mouseDragX;
        const deltaY = evt.clientY - this.mouseDragY;

        // The drag action is confirmed when one of the mouse coordinates
        // has moved past the threshold
        if (!this.mouseDragged && (Math.abs(deltaX) > DRAG_THRESHOLD_PX ||
                                   Math.abs(deltaY) > DRAG_THRESHOLD_PX)) {
            this.mouseDragged = true;

            this.rotateStart = this.rotatePrev = angle;
            this.translateStartX = this.translateXPrev = translateX;
            this.translateStartY = this.translateYPrev = translateY;
            this.zoomPrev = zoom;

            if (this.presentation.enableMouseTranslation) {
                this.player.pause();
            }

            this.emit("dragStart");
        }

        if (this.mouseDragged) {
            let mode = this.viewport.dragMode;
            if (mode == "translate") {
                if (evt.altKey) {
                    mode = "scale";
                }
                else if (evt.shiftKey) {
                    mode = "rotate";
                }
            }

            switch (mode) {
                case "scale":
                    if (this.editMode || this.presentation.enableMouseZoom) {
                        if (this.zoomPrev !== 0) {
                            this.zoom(zoom / this.zoomPrev, this.viewport.width / 2, this.viewport.height / 2);
                            this.mouseDragChangedState = true;
                        }
                        this.zoomPrev = zoom;
                    }
                    break;

                case "rotate":
                    if (this.editMode || this.presentation.enableMouseRotation) {
                        if (evt.ctrlKey) {
                            angle = 10 * Math.round((angle - this.rotateStart) / 10) + this.rotateStart;
                        }
                        this.rotate(this.rotatePrev - angle);
                        this.mouseDragChangedState = true;
                        this.rotatePrev = angle;
                    }
                    break;

                case "clip":
                    this.viewport.clipByMode(this.mouseDragStartX - this.viewport.x, this.mouseDragStartY - this.viewport.y,
                                             this.mouseDragX      - this.viewport.x, this.mouseDragY      - this.viewport.y,
                                             deltaX, deltaY);

                    this.mouseDragChangedState = true;
                    break;

                default: // case "translate":
                    if (this.editMode || this.presentation.enableMouseTranslation) {
                        if (evt.ctrlKey) {
                            if (Math.abs(translateX - this.translateStartX) >= Math.abs(translateY - this.translateStartY)) {
                                translateY = this.translateStartY;
                            }
                            else {
                                translateX = this.translateStartX;
                            }
                        }
                        this.translate(translateX - this.translateXPrev, translateY - this.translateYPrev);
                        this.mouseDragChangedState = true;
                        this.translateXPrev = translateX;
                        this.translateYPrev = translateY;
                    }
            }
            this.mouseDragX = evt.clientX;
            this.mouseDragY = evt.clientY;
        }
    }

    /** Process a drag end event.
     *
     * This method is called when a mouse up event happens after a mouse down event.
     * If the mouse has been moved past the drag threshold, this method
     * will fire a `dragEnd` event. Otherwise, it will fire a `click` event.
     *
     * @param {MouseEvent} evt - A DOM event
     *
     * @listens mouseup
     * @fires module:player/PlayerController.localViewportChange
     * @fires module:player/PlayerController.dragEnd
     * @fires module:player/PlayerController.click
     */
    onDragEnd(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if (evt.button === DRAG_BUTTON) {
            if (this.mouseDragged) {
                this.emit("dragEnd");
                if (this.mouseDragChangedState) {
                    this.emit("localViewportChange");
                }
            }
            else {
                this.onClick(evt);
            }

            document.documentElement.removeEventListener("mousemove", this.dragHandler, false);
            document.documentElement.removeEventListener("mouseup", this.dragEndHandler, false);
        }
        else {
            this.onClick(evt);
        }
    }

    /** Move to the next or previous frame on each click event in the viewport.
     *
     * This method is registered as a {@linkcode module:player/Viewport.click|click}
     * event handler of the current {@linkcode module:player/Viewport.Viewport|viewport}.
     *
     * @param {MouseEvent} evt - The mouse click event.
     *
     * @fires module:player/PlayerController.click
     */
    onClick(evt) {
        if (this.presentation.enableMouseNavigation) {
            switch (evt.button) {
                case 0: this.moveToNext(); break;
                case 2: this.moveToPrevious(); break;
            }
        }
        this.emit("click", evt);
    }

    /** Process a mouse wheel event in this viewport.
     *
     * The effect of the mouse wheel depends on the state of the Shift key:
     *    - released: zoom in and out,
     *    - pressed: rotate clockwise or counter-clockwise
     *
     * @param {WheelEvent} evt - A DOM event.
     *
     * @listens wheel
     * @fires module:player/PlayerController.localViewportChange
     */
    onWheel(evt) {
        if (this.wheelTimeout !== null) {
            window.clearTimeout(this.wheelTimeout);
        }

        evt.stopPropagation();
        evt.preventDefault();

        let delta = 0;
        if (evt.wheelDelta) {   // "mousewheel" event
            delta = evt.wheelDelta;
        }
        else if (evt.detail) {  // "DOMMouseScroll" event
            delta = -evt.detail;
        }
        else {                  // "wheel" event
            delta = -evt.deltaY;
        }

        let changed = false;

        if (delta !== 0) {
            if (evt.shiftKey) {
                // TODO rotate around mouse cursor
                if (this.editMode || this.presentation.enableMouseRotation) {
                    this.rotate(delta > 0 ? ROTATE_STEP : -ROTATE_STEP);
                    changed = true;
                }
            }
            else {
                if (this.editMode || this.presentation.enableMouseZoom) {
                    this.zoom(delta > 0 ? SCALE_FACTOR : 1/SCALE_FACTOR, evt.clientX - this.viewport.x, evt.clientY - this.viewport.y);
                    changed = true;
                }
            }
        }

        if (changed) {
            this.wheelTimeout = window.setTimeout(() => {
                this.wheelTimeout = null;
                this.emit("localViewportChange");
            }, WHEEL_TIMEOUT_MS);
        }
    }

    /** Helper for zoom.
     *
     * @param {number} factor - The zoom factor.
     * @param {number} x      - The x coordinate of the screenpoint to focus while zooming.
     * @param {number} y      - The y coordinate of the screenpoint to focus while zooming.
     *
     * @fires module:player/PlayerController.zoom
     */
    zoom(factor, x, y) {
        this.emit("zoom", {factor, x, y});
        this.player.pause();
        this.viewport.zoom(factor, x, y);
    }

    /** Helper for rotation.
     *
     * @param {number} angle - The rotation angle, in degrees.
     *
     * @fires module:player/PlayerController.rotate
     */
    rotate(angle) {
        this.emit("rotate", angle);
        this.player.pause();
        this.viewport.rotate(angle);
    }

    /** helper for translation by x and y offset.
     *
     * @param {number} deltaX - The horizontal displacement, in pixels.
     * @param {number} deltaY - The vertical displacement, in pixels.
     *
     * @fires module:player/PlayerController.translate
     */
     translate(deltaX, deltaY) {
        this.emit("translate", {deltaX, deltaY});
        this.viewport.translate(deltaX, deltaY);
    }

    /** Process a right-click in the associated viewport.
     *
     * This method forwards the `contextmenu` event as a
     * viewport {@linkcode module:player/Viewport.click|click} event.
     *
     * @param {MouseEvent} evt - A DOM event.
     *
     * @listens contextmenu
     * @fires module:player/PlayerController.click
     */
    onContextMenu(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        this.onClick(evt);
    }

    /** Process a keyboard event.
     *
     * This method handles the navigation keys if they are enabled in the
     * current presentation:
     * Arrows, Page-Up/Down, Home, End, Enter, and Space.
     *
     * @param {KeyboardEvent} evt - The DOM event to process.
     *
     * @listens keydown
     */
    onKeyDown(evt) {
        // Keys with Alt/Ctrl/Meta modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.keyCode) {
            case 36: // Home
                if (this.presentation.enableKeyboardNavigation) {
                    if (evt.shiftKey) {
                        this.jumpToFirst();
                    }
                    else {
                        this.moveToFirst();
                    }
                }
                break;

            case 35: // End
                if (this.presentation.enableKeyboardNavigation) {
                    if (evt.shiftKey) {
                        this.jumpToLast();
                    }
                    else {
                        this.moveToLast();
                    }
                }
                break;

            case 38: // Arrow up
            case 33: // Page up
            case 37: // Arrow left
                if (this.presentation.enableKeyboardNavigation) {
                    if (evt.shiftKey) {
                        this.jumpToPrevious();
                    }
                    else {
                        this.moveToPrevious();
                    }
                }
                break;

            case 40: // Arrow down
            case 34: // Page down
            case 39: // Arrow right
            case 13: // Enter
            case 32: // Space
                if (this.presentation.enableKeyboardNavigation) {
                    if (evt.shiftKey) {
                        this.jumpToNext();
                    }
                    else {
                        this.moveToNext();
                    }
                }
                break;

            default:
                return;
        }

        evt.stopPropagation();
        evt.preventDefault();
    }

    /** Process a keyboard event.
     *
     * This method handles character keys: "+", "-", "R", "P", "A", ".", "=".
     *
     * @param {KeyboardEvent} evt - The DOM event to process.
     *
     * @listens keypress
     */
    onKeyPress(evt) {
        // Keys with modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.charCode || evt.which) {
            case 43: // +
                if (this.presentation.enableKeyboardZoom) {
                    this.zoom(SCALE_FACTOR, this.viewport.width / 2, this.viewport.height / 2);
                }
                break;

            case 45: // -
                if (this.presentation.enableKeyboardZoom) {
                    this.zoom(1 / SCALE_FACTOR, this.viewport.width / 2, this.viewport.height / 2);
                }
                break;

            case 82: // R
                if (this.presentation.enableKeyboardRotation) {
                    this.rotate(-ROTATE_STEP);
                }
                break;

            case 114: // r
                if (this.presentation.enableKeyboardRotation) {
                    this.rotate(ROTATE_STEP);
                }
                break;

            case 80: // P
            case 112: //p
                this.togglePause();
                break;

            case 65: // A
            case 97: // a
                this.viewAll();
                break;

            case 46: // .
                if (this.presentation.enableKeyboardNavigation) {
                    this.toggleBlankScreen();
                }
                break;

            case 61: // =
                this.moveToCurrent();
                break;

            default:
                return;
        }

        evt.stopPropagation();
        evt.preventDefault();
    }

    /** The index of the presentation's last frame
     *
     * @readonly
     * @type {number}
     */
    get lastFrame() {
        return this.player.presentation.frames.length - 1;
    }

    /** Jumps to the first frame of the presentation.
     *
     * @fires module:player/PlayerController.jumpToFrame
     * @fires module:player/Player.frameChange
     */
    jumpToFirst() {
        this.jumpToFrame(0);
    }

    /** Jump to the last frame of the presentation.
     *
     * @fires module:player/PlayerController.jumpToFrame
     * @fires module:player/Player.frameChange
     */
    jumpToLast() {
        this.jumpToFrame(this.lastFrame);
    }

    /** Jump to the previous frame.
     *
     * @fires module:player/PlayerController.jumpToFrame
     * @fires module:player/Player.frameChange
     */
    jumpToPrevious() {
        this.jumpToFrame(this.player.previousFrame);
    }

    /** Jumps to the next frame.
     *
     * @fires module:player/PlayerController.jumpToFrame
     * @fires module:player/Player.frameChange
     */
    jumpToNext() {
        this.jumpToFrame(this.player.nextFrame);
    }

    /** Move to the first frame of the presentation.
     *
     * @fires module:player/PlayerController.moveToFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    moveToFirst() {
        this.moveToFrame(0);
    }

    /** Move to the previous frame.
     *
     * This method skips previous frames with 0 ms timeout.
     *
     * @fires module:player/PlayerController.moveToFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    moveToPrevious() {
        const frame = this.player.lastNonAutoTransitionFrame();
        if (frame) {
            this.moveToFrame(frame);
        }
    }

    /** Move to the next frame.
     *
     * @fires module:player/PlayerController.moveToFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    moveToNext() {
        this.emit("moveToFrame", this.player.nextFrame);
        this.player.moveToNext();
    }

    /** Move to the last frame of the presentation.
     *
     * @fires module:player/PlayerController.moveToFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    moveToLast() {
        this.moveToFrame(this.lastFrame);
    }

    /** Restore the current frame and resume playing.
     *
     * @fires module:player/PlayerController.moveToFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    moveToCurrent() {
        if (!this.player.playing) {
            this.moveToFrame(this.player.currentFrame);
        }
    }

    /** Move to a frame in *preview* mode.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The frame to show.
     *
     * @fires module:player/PlayerController.previewFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    previewFrame(frame) {
        let f = this.player.findFrame(frame);
        this.emit("previewFrame", f);
        this.player.previewFrame(f);
    }

    viewAll() {
        this.emit("viewAll");
        this.player.viewAll();
    }

    /** Jump to the given frame of the presentation and signal a local change.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The frame to show.
     *
     * @fires module:player/PlayerController.jumpToFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    jumpToFrame(frame) {
        let f = this.player.findFrame(frame);
        this.emit("jumpToFrame", f);
        this.player.jumpToFrame(f);
    }

    /** Move to the given frame of the presentation and signal a local change.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The frame to show.
     *
     * @fires module:player/PlayerController.moveToFrame
     * @fires module:player/Player.frameChange
     * @fires module:player/Player.stateChange
     */
    moveToFrame(frame) {
        let f = this.player.findFrame(frame);
        this.emit("moveToFrame", f);
        this.player.moveToFrame(f);
    }

    /** Toggles the pause state of the associated player
     *
     * @fires module:player/PlayerController.pause
     * @fires module:player/PlayerController.moveToFrame
     * @fires module:player/Player.stateChange
     */
    togglePause() {
        if (this.player.playing) {
            this.emit("pause");
            this.player.pause();
        }
        else {
            this.moveToFrame(this.player.currentFrame);
        }
    }

    /** Toggle the visibility of the elements that hides the viewport.
     *
     * @fires module:player/PlayerController.toggleBlankScreen
     */
    toggleBlankScreen() {
        if (this.player.blankScreenIsVisible) {
            this.player.disableBlankScreen();
        }
        else {
            this.player.enableBlankScreen();
        }
        this.emit("toggleBlankScreen", this.player.blankScreenIsVisible);
    }
}
