/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {Animator} from "./Animator";
import * as Timing from "./Timing";
import {CameraState} from "../model/CameraState";
import {Frame} from "../model/Presentation";
import {EventEmitter} from "events";

/** The duration of out-of-sequence transitions, in milliseconds.
 *
 * @readonly
 * @default
 * @type {number} */
const DEFAULT_TRANSITION_DURATION_MS = 500;

/** The relative zoom of out-of-sequence transitions.
 *
 * @readonly
 * @default
 * @type {number} */
const DEFAULT_RELATIVE_ZOOM = 0;

/** The timing function name of out-of-sequence transitions.
 *
 * @readonly
 * @default
 * @type {string} */
const DEFAULT_TIMING_FUNCTION = "ease";

/** The zoom step factor for user zoom action (keyboard and mouse wheel)
 *
 * @readonly
 * @default
 * @type {number} */
const SCALE_FACTOR = 1.05;

/** The rotation step angle for user zoom action (keyboard and mouse wheel), in degrees.
 *
 * @readonly
 * @default
 * @type {number} */
const ROTATE_STEP = 5;

/** Signals that a user interaction triggered a change to the player's state.
 *
 * @event module:player/Player.localChange
 */

/** The player's event handling controller.
 *
 * The controller implements keyboard and mouse handlers and performs according actions on the associated player.
 * It also provides an interface to external UI event handlers:
 * - TouchGestures
 * - presentation console
 *
 * @extends EventEmitter
 */
class Controller extends EventEmitter {
    /** Initialize a new Sozi player controller.
     *
     * If the presentation is opened in edit mode, the controller will disable
     * these features on the corresponding player:
     * - mouse and keyboard actions for navigating in the presentation,
     * - automatic transitions after a timeout.
     *
     * @param {module:player/Player.Player} player - The player attached to this controller.
     * @param {module:player/Viewport.Viewport} viewport - The viewport where the presentation is rendered.
     * @param {module:model/Presentation.Presentation} presentation - The presentation to play.
     * @param {boolean} [editMode=false] - Is the presentation opened in edit mode?
     */
    constructor(player, viewport, presentation, editMode) {
        super();

        this.player = player;
        this.viewport = viewport;
        this.presentation = presentation;

        if (!editMode) {
            this.viewport.controller.on("click", btn => this.onClick(btn));
            window.addEventListener("keydown", evt => this.onKeyDown(evt), false);

            if (this.presentation.enableMouseTranslation) {
                this.viewport.controller.on("dragStart", () => this.player.pause());
            }

            this.viewport.controller.on("userChangeState", () => player.pause());
            window.addEventListener("keypress", evt => this.onKeyPress(evt), false);
        }
    }

    /** Move to the next or previous frame on each click event in the viewport.
     *
     * This method is registered as a {@linkcode module:player/Viewport.click|click}
     * event handler of the current {@linkcode module:player/Viewport.Viewport|viewport}.
     *
     * @param {number} button - The index of the button that was pressed.
     *
     * @listens module:player/Viewport.click
     */
    onClick(button) {
        if (this.presentation.enableMouseNavigation) {
            switch (button) {
                case 0: this.moveToNext(); break;
                case 2: this.moveToPrevious(); break;
            }
        }
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
     * This method handles character keys: "+", "-", "R", "P", ".".
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
                    this.zoom(SCALE_FACTOR);
                }
                break;

            case 45: // -
                if (this.presentation.enableKeyboardZoom) {
                    this.zoom(1 / SCALE_FACTOR);
                }
                break;

            case 82: // R
                if (this.presentation.enableKeyboardRotation) {
                    this.rotate(-ROTATE_STEP);
                }
                break;

            case 114: // r
                if (this.presentation.enableKeyboardRotation) {
                    this.viewport.rotate(ROTATE_STEP);
                    this.pause();
                }
                break;

            case 80: // P
            case 112: //p
                this.togglePause();
                break;

            case 46: // .
                if (this.presentation.enableKeyboardNavigation) {
                    this.toggleBlankScreen();
                }
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
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     */
    jumpToFirst() {
        this.jumpToFrame(0);
    }

    /** Jump to the last frame of the presentation.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     */
    jumpToLast() {
        this.jumpToFrame(this.lastFrame);
    }

    /** Jump to the previous frame.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     */
    jumpToPrevious() {
        this.jumpToFrame(this.player.previousFrame);
    }

    /** Jumps to the next frame.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     */
    jumpToNext() {
        this.jumpToFrame(this.player.nextFrame);
    }

    /** Move to the first frame of the presentation.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToFirst() {
        this.moveToFrame(0);
    }


    /** Move to the previous frame.
     *
     * This method skips previous frames with 0 ms timeout.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToPrevious() {
        const frame = this.player.lastNonAutoTransitionFrame();
        if (frame != null ) this.moveToFrame(frame);
    }

    /** Move to the next frame.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToNext() {
        this.emit("localChange", {change:"moveToFrame", value:this.player.nextFrame});
        this.player.moveToNext();
    }

    /** Move to the last frame of the presentation.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToLast() {
        this.moveToFrame(this.lastFrame);
    }

    /** Move to a frame in *preview* mode.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The frame to show.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    previewFrame(frame) {
        let f = this.player.findFrame(frame);
        this.emit("localChange", {change:"previewFrame", value:f});
        this.player.previewFrame(f);
    }

    /** Jump to the given frame of the presentation and signal a local change.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The frame to show.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    jumpToFrame(frame) {
        let f = this.player.findFrame(frame);
        this.emit("localChange", {change:"jumpToFrame", value:f});
        this.player.jumpToFrame(f);
    }

    /** Move to the given frame of the presentation and signal a local change.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The frame to show.
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToFrame(frame) {
        let f = this.player.findFrame(frame);
        this.emit("localChange", {change:"moveToFrame", value:f});
        this.player.moveToFrame(f);
    }

    /** Helper for step rotation clockwise as well as counter-clockwise.
     *
     * @param {number} angle - The rotation angle, in degrees.
     *
     * @fires {module:player/Player.localChange}
     *
     */
    rotate(angle) {
        this.player.pause();
        this.viewport.controller.rotate(angle);
    }

    /** helper for step zoom focusing a mid screen center coordinate
     *
     * @param {number} factor - The scaling factor, above 1 to zoom in, below 1 to zoom out.
     *
     * @fires {module:player/Player.localChange}
     */
    zoom(factor) {
        this.player.pause();
        this.viewport.controller.zoom(factor, this.viewport.width / 2, this.viewport.height / 2);
    }

    /** toggles the pause state of the associated player
     *
     * @fires {module:player/Player.localChange}
     * @fires {module:player/Player.stateChange}
     */
    togglePause() {
        if (this.player.playing) {
            this.player.pause();
        }
        else {
            this.player.playFromFrame(this.player.currentFrame);
        }

        this.emit("localChange", {change:"pause", value:this.player.playing});
    }

    /** Toggle the visibility of the elements that hides the viewport.
     *
     * @fires {module:player/Player.localChange}
     */
    toggleBlankScreen() {
        if (this.player.blankScreenIsVisible) {
            this.player.disableBlankScreen();
        }
        else {
            this.player.enableBlankScreen();
        }
        this.emit("localChange", {change:"blankScreen", value:this.player.blankScreenIsVisible});
    }
}


/** Signals that the player has moved to a new frame.
 *
 * @event module:player/Player.frameChange
 */

/** Signals that the player has changed its `playing` status.
 *
 * @event module:player/Player.stateChange
 */

/** Sozi presentation player.
 *
 * @extends EventEmitter
 */
export class Player extends EventEmitter {

    /** Initialize a new Sozi player.
     *
     * If the presentation is opened in edit mode, the player will disable
     * these features:
     * - mouse and keyboard actions for navigating in the presentation,
     * - automatic transitions after a timeout.
     *
     * @param {module:player/Viewport.Viewport} viewport - The viewport where the presentation is rendered.
     * @param {module:model/Presentation.Presentation} presentation - The presentation to play.
     * @param {boolean} [editMode=false] - Is the presentation opened in edit mode?
     */
    constructor(viewport, presentation, editMode = false) {
        super();

        /** Is the presentation opened in edit mode?
         *
         * @default false
         * @type {boolean} */
        this.editMode = !!editMode;

        /** Enable embedded video and audio?
         *
         * @default true
         * @type {boolean} */
        this.mediaEnable = true;

        /** The viewport where the presentation is rendered.
         *
         * @type {module:player/Viewport.Viewport} */
        this.viewport = viewport;

        /** The presentation to play.
         *
         * @type {module:model/Presentation.Presentation} */
        this.presentation = presentation;

        /** An animator to control the transitions.
         *
         * @type {module:player/Animator.Animator} */
        this.animator = new Animator();

        /** The playing/paused state of this player.
         *
         * @default
         * @type {boolean} */
        this.playing = false;

        /** Is the player waiting for a frame timeout to complete?
         *
         * @default
         * @type {boolean} */
        this.waitingTimeout = false;

        /** The current frame of the presentation.
         *
         * @type {module:model/Presentation.Frame} */
        this.currentFrame = presentation.frames[0];

        /** The target frame of the current transition.
         *
         * @type {module:model/Presentation.Frame} */
        this.targetFrame = presentation.frames[0];

        /** The result of `setTimeout` when starting waiting for a frame timeout.
         *
         * @default
         * @type {?number} */
        this.timeoutHandle = null;

        /** An array of tansition descriptors for each camera.
         *
         * @default
         * @type {object[]}
         * @see {@linkcode module:player/Player.Player#setupTransition}
         */
        this.transitions = [];

        this.controller = new Controller(this, this.viewport, this.presentation, this.editMode);

        this.animator.on("step", p => this.onAnimatorStep(p));
        this.animator.on("stop", () => this.onAnimatorStop());
        this.animator.on("done", () => this.onAnimatorDone());

        this.on("frameChange", () => {
            // TODO Only if frame is not transient.
            document.title = this.presentation.title + " \u2014 " + this.currentFrame.title;
        });
    }

    /** Find a frame by its ID or number.
     *
     * @param {(string|number|module:model/Presentation.Frame)} frame - An indication of the frame to find.
     * @returns {?module:model/Presentation.Frame} - The frame found, or `null`.
     */
    findFrame(frame) {
        if (frame instanceof Frame) {
            return frame;
        }
        if (typeof frame === "string") {
            return this.presentation.getFrameWithId(frame);
        }
        if (typeof frame === "number") {
            return this.presentation.frames[frame];
        }
        return null;
    }

    /** The frame before the current frame.
     *
     * If a transition is in progress, returns the frame before the target frame.
     * When reaching the first frame, cycle to the last of the presentation.
     *
     * @readonly
     * @type {module:model/Presentation.Frame}
     */
    get previousFrame() {
        const frame = this.animator.running ? this.targetFrame : this.currentFrame;
        const index = (frame.index + this.presentation.frames.length - 1) % this.presentation.frames.length;
        return this.presentation.frames[index];
    }

    /** The frame after the current frame.
     *
     * If a transition is in progress, returns the frame after the target frame.
     * When reaching the last frame, cycle to the first of the presentation.
     *
     * @readonly
     * @type {module:model/Presentation.Frame}
     */
    get nextFrame() {
        const frame = this.animator.running ? this.targetFrame : this.currentFrame;
        const index = (frame.index + 1) % this.presentation.frames.length;
        return this.presentation.frames[index];
    }

    /** Finds the last preceding frame which will not automatically transit (i.e. has a timout > 0 ms).
     *
     * @returns {module:model/Presentation.Frame} The identified frame, or null, if none is found
     *
     */
    lastNonAutoTransitionFrame() {
        for (let index = this.previousFrame.index; index >= 0; index --) {
            const frame = this.presentation.frames[index];
            if (!frame.timeoutEnable || frame.timeoutMs !== 0) {
                return frame;
            }
        }
        // only auto frames before? might happen in some showcase kiosk scenario
        return null;
    }

    /** Force the viewport to show the current frame.
     *
     * This method will set all cameras to the states in the current frame,
     * and update the viewport.
     *
     * @fires {module:player/Player.frameChange}
     */
    showCurrentFrame() {
        this.viewport.setAtStates(this.currentFrame.cameraStates);
        this.viewport.update();
        this.emit("frameChange");
    }

    /** Start the presentation from the given frame.
     *
     * This method sets the {@linkcode module:player/Player.Player#playing|playing} flag,
     * shows the desired frame and waits for the frame timeout if needed.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The first frame to show.
     *
     * @fires {module:player/Player.stateChange}
     */
    playFromFrame(frame) {
        if (!this.playing) {
            this.playing = true;
            this.emit("stateChange");
        }
        this.waitingTimeout = false;
        this.targetFrame = this.currentFrame = this.findFrame(frame);
        this.showCurrentFrame();
        this.waitTimeout();
    }

    /** Pause the presentation.
     *
     * This method clears the {@linkcode module:player/Player.Player#playing|playing} flag.
     * If the presentation was in "waiting" mode due to a timeout
     * in the current frame, then it stops waiting.
     * The current animation is stopped in its current state.
     *
     * @listens module:player/Viewport.userChangeState
     * @listens module:player/Viewport.dragStart
     * @fires {module:player/Player.stateChange}
     */
    pause() {
        this.animator.stop();
        if (this.waitingTimeout) {
            window.clearTimeout(this.timeoutHandle);
            this.waitingTimeout = false;
        }
        if (this.playing) {
            this.playing = false;
            this.emit("stateChange");
        }
        this.targetFrame = this.currentFrame;
    }

    /** Starts waiting before moving to the next frame.
     *
     * If the current frame has a timeout set, this method
     * will register a timer to move to the next frame automatically
     * after the specified time.
     *
     * If the current frame is the last, the presentation will
     * move to the first frame.
     */
    waitTimeout() {
        if (this.currentFrame.timeoutEnable) {
            this.waitingTimeout = true;
            this.timeoutHandle = window.setTimeout(
                () => this.moveToNext(),
                this.currentFrame.timeoutMs
            );
        }
    }

    /** Jump to a frame.
     *
     * This method does not animate the transition from the current
     * state of the viewport to the desired frame.
     *
     * The presentation is stopped: if a timeout has been set for the
     * target frame, it will be ignored.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The frame to show.
     *
     * @fires {module:player/Player.frameChange}
     */
    jumpToFrame(frame) {
        this.disableBlankScreen();

        this.pause();

        this.targetFrame = this.currentFrame = this.findFrame(frame);
        this.showCurrentFrame();
    }

    /** Move to a frame.
     *
     * This method animates the transition from the current
     * state of the viewport to the desired frame.
     *
     * If the given frame corresponds to the next frame in the list,
     * the transition properties of the next frame are used.
     * Otherwise, default transition properties are used.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The first frame to show.
     *
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToFrame(frame) {
        this.disableBlankScreen();

        if (this.waitingTimeout) {
            window.clearTimeout(this.timeoutHandle);
            this.waitingTimeout = false;
        }

        this.targetFrame = this.findFrame(frame);

        let layerProperties = null;
        let durationMs = DEFAULT_TRANSITION_DURATION_MS;
        let useTransitionPath = false;
        let backwards = false;

        if (this.currentFrame) {
            if (this.targetFrame === this.nextFrame) {
                durationMs = this.targetFrame.transitionDurationMs;
                layerProperties = this.targetFrame.layerProperties;
                useTransitionPath = true;
            }
            else if (this.targetFrame === this.previousFrame) {
                durationMs = this.currentFrame.transitionDurationMs;
                layerProperties = this.currentFrame.layerProperties;
                useTransitionPath = true;
                backwards = true;
            }
        }

        if (!this.editMode && !this.playing) {
            this.playing = true;
            this.emit("stateChange");
        }

        for (let camera of this.viewport.cameras) {
            let timingFunction = DEFAULT_TIMING_FUNCTION;
            let relativeZoom   = DEFAULT_RELATIVE_ZOOM;
            let transitionPath = null;

            if (layerProperties) {
                const lp       = layerProperties[camera.layer.index];
                relativeZoom   = lp.transitionRelativeZoom;
                timingFunction = lp.transitionTimingFunction;
                if (useTransitionPath) {
                    transitionPath = lp.transitionPath;
                }
            }

            this.setupTransition(camera, timingFunction, relativeZoom, transitionPath, backwards);
        }

        this.animator.start(durationMs);
    }

    /** Move to the next frame.
     *
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToNext() {
        this.moveToFrame(this.nextFrame);
    }

    /** Restore the current frame.
     *
     * This method restores the viewport to fit the current frame,
     * e.g. after the viewport has been zoomed or dragged.
     *
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    moveToCurrent() {
        this.moveToFrame(this.currentFrame);
    }

    /** Move to a frame in *preview* mode.
     *
     * This method animates the transition from the current
     * state of the viewport to the desired frame, using
     * default transition settings.
     *
     * @param {string|number|module:model/Presentation.Frame} frame - The first frame to show.
     *
     * @fires {module:player/Player.frameChange}
     * @fires {module:player/Player.stateChange}
     */
    previewFrame(frame) {
        this.targetFrame = this.findFrame(frame);

        for (let camera of this.viewport.cameras) {
            this.setupTransition(camera, DEFAULT_TIMING_FUNCTION, DEFAULT_RELATIVE_ZOOM);
        }

        this.animator.start(DEFAULT_TRANSITION_DURATION_MS);
    }

    /** Prepare a transition for a given camera.
     *
     * The initial state is the current state of the given camera.
     * The final state is the camera state in the current layer of the target frame.
     *
     * A new descriptor is added to the {@linkcode module:player/Player.Player#transitions|list of transition descriptors}.
     *
     * @param {module:player/Camera.Camera} camera - The camera that will perform the transition.
     * @param {string} timingFunction - The name of function that maps the progress indicator to the relative distance already completed between the initial and final states (between 0 and 1).
     * @param {number} relativeZoom - An additional zooming factor to apply during the transition.
     * @param {SVGPathElement} svgPath - An SVG path to follow during the transition.
     * @param {boolean} [backwards=false] - If `true`, apply the reverse timing function and follow the transition path in the opposite direction.
     */
    setupTransition(camera, timingFunction, relativeZoom, svgPath, backwards=false) {
        if (this.animator.running) {
            this.animator.stop();
        }

        timingFunction = Timing[timingFunction];
        if (backwards) {
            timingFunction = timingFunction.reverse;
        }

        this.transitions.push({
            camera,
            initialState: new CameraState(camera),
            finalState: this.targetFrame.cameraStates[camera.layer.index],
            timingFunction,
            relativeZoom,
            svgPath,
            backwards
        });
    }

    /** Process an animation step.
     *
     * This method moves each camera according to the {@linkcode module:player/Player.Player#transitions|list of transition descriptors}.
     *
     * @param {number} progress - The relative time already elapsed between the initial and final states of the current animation (between 0 and 1).
     *
     * @listens module:player/Animator.step
     *
     * @see {@linkcode module:player/Player.Camera#interpolate}
     */
    onAnimatorStep(progress) {
        for (let transition of this.transitions) {
            transition.camera.interpolate(transition.initialState, transition.finalState, progress, transition.timingFunction, transition.relativeZoom, transition.svgPath, transition.reverse);
            transition.camera.update();
        }
    }

    /** Finalize a transition when the current animation is stopped.
     *
     * This method clears the {@linkcode module:player/Player.Player#transitions|list of transition descriptors}.
     *
     * @listens module:player/Animator.stop
     * @fires {module:player/Player.frameChange}
     */
    onAnimatorStop() {
        this.transitions = [];
        this.currentFrame = this.targetFrame;
        this.emit("frameChange");
    }

    /** Finalize a transition when the current animation is complete.
     *
     * If the presentation is in playing state, wait for the current frame's timeout.
     *
     * @listens module:player/Animator.done
     * @fires {module:player/Player.frameChange}
     */
    onAnimatorDone() {
        this.onAnimatorStop();
        if (this.playing) {
            this.waitTimeout();
        }
    }

    /** Is the blank screen activated?
     *
     * @readonly
     * @type {boolean}
     */
    get blankScreenIsVisible() {
        return document.querySelector(".sozi-blank-screen").style.visibility === "visible";
    }

    /** Enable the blank screen.
     *
     * This method will pause the presentation and hide the viewport under
     * an opaque element.
     */
    enableBlankScreen() {
        this.pause();
        const blankScreen = document.querySelector(".sozi-blank-screen");
        if (blankScreen) {
            blankScreen.style.opacity = 1;
            blankScreen.style.visibility = "visible";
        }
    }

    /** Disable the blank screen.
     *
     * This method will reveal the viewport again.
     */
    disableBlankScreen() {
        const blankScreen = document.querySelector(".sozi-blank-screen");
        if (blankScreen) {
            blankScreen.style.opacity = 0;
            blankScreen.style.visibility = "hidden";
        }
    }

    /** Disable all video and audio elements in the current presentation. */
    disableMedia() {
        this.mediaEnable = false;
    }
}
