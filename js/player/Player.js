/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Animator} from "./Animator";
import * as Timing from "./Timing";
import {CameraState} from "../model/CameraState";
import {Frame} from "../model/Presentation";
import {EventEmitter} from "events";
import * as Media from "./Media";

// Constants: default animation properties
// for out-of-sequence transitions
const DEFAULT_TRANSITION_DURATION_MS = 500;
const DEFAULT_RELATIVE_ZOOM = 0;
const DEFAULT_TIMING_FUNCTION = "ease";

// Zoom factor for user zoom action (keyboard and mouse wheel)
const SCALE_FACTOR = 1.05;

// Rotation step for user rotate action (keyboard and mouse wheel)
const ROTATE_STEP = 5;

/** Sozi presentation player.
 *
 * @category player
 * @extends EventEmitter
 * @todo Add documentation.
 */
export class Player extends EventEmitter {

    constructor(viewport, presentation, editMode = false) {
        super();

        this.editMode       = !!editMode;
        this.viewport       = viewport;
        this.presentation   = presentation;
        this.animator       = new Animator();
        this.playing        = false;
        this.waitingTimeout = false;
        this.currentFrame   = presentation.frames[0];
        this.targetFrame    = presentation.frames[0];
        this.timeoutHandle  = null;
        this.transitions    = [];

        if (!this.editMode) {
            this.viewport.addListener("click", btn => this.onClick(btn));
            window.addEventListener("keydown", evt => this.onKeyDown(evt), false);
            if (this.presentation.enableMouseTranslation) {
                this.viewport.addListener("dragStart", () => this.pause());
            }
            this.viewport.addListener("userChangeState", () => this.pause());
            window.addEventListener("keypress", evt => this.onKeyPress(evt), false);
        }
        this.animator.addListener("step", p => this.onAnimatorStep(p));
        this.animator.addListener("stop", () => this.onAnimatorStop());
        this.animator.addListener("done", () => this.onAnimatorDone());

        this.addListener("frameChange", () => {
            // TODO Only if frame is not transient.
            document.title = this.presentation.title + " \u2014 " + this.currentFrame.title;
        });
    }

    onClick(button) {
        if (this.presentation.enableMouseNavigation) {
            switch (button) {
                case 0: this.moveToNext(); break;
                case 2: this.moveToPrevious(); break;
            }
        }
    }

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

    /**
     * Event handler: key press.
     *
     * This method handles character keys:
     *    - "+", "-": zoom in/out
     *    - "R", "r": rotate clockwise/counter-clockwise.
     *
     * Parameters:
     *    - evt: The DOM event object
     *
     * TODO use keydown event
     */
    onKeyPress(evt) {
        // Keys with modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.charCode || evt.which) {
            case 43: // +
                if (this.presentation.enableKeyboardZoom) {
                    this.viewport.zoom(SCALE_FACTOR, this.viewport.width / 2, this.viewport.height / 2);
                    this.pause();
                }
                break;

            case 45: // -
                if (this.presentation.enableKeyboardZoom) {
                    this.viewport.zoom(1 / SCALE_FACTOR, this.viewport.width / 2, this.viewport.height / 2);
                    this.pause();
                }
                break;

            case 82: // R
                if (this.presentation.enableKeyboardRotation) {
                    this.viewport.rotate(-ROTATE_STEP);
                    this.pause();
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
                if (this.playing) {
                    this.pause();
                }
                else {
                    this.resume();
                }
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

    get previousFrame() {
        const frame = this.animator.running ? this.targetFrame : this.currentFrame;
        const index = (frame.index + this.presentation.frames.length - 1) % this.presentation.frames.length;
        return this.presentation.frames[index];
    }

    get nextFrame() {
        const frame = this.animator.running ? this.targetFrame : this.currentFrame;
        const index = (frame.index + 1) % this.presentation.frames.length;
        return this.presentation.frames[index];
    }

    showCurrentFrame() {
        this.viewport.setAtStates(this.currentFrame.cameraStates);
        this.viewport.update();
        this.emit("frameChange");
    }

    /*
     * Start the presentation from the given frame.
     *
     * This method sets the "playing" flag, shows the desired frame
     * and waits for the frame timeout if needed.
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

    /*
     * Pause the presentation.
     *
     * This method clears the "playing" flag.
     * If the presentation was in "waiting" mode due to a timeout
     * in the current frame, then it stops waiting.
     * The current animation is stopped in its current state.
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

    /*
     * Resume playing from the current frame.
     */
    resume() {
        this.playFromFrame(this.currentFrame);
    }

    /*
     * Starts waiting before moving to the next frame.
     *
     * It the current frame has a timeout set, this method
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

    /*
     * Jump to a frame.
     *
     * This method does not animate the transition from the current
     * state of the viewport to the desired frame.
     *
     * The presentation is stopped: if a timeout has been set for the
     * target frame, it will be ignored.
     */
    jumpToFrame(frame) {
        this.disableBlankScreen();

        this.pause();

        this.targetFrame = this.currentFrame = this.findFrame(frame);
        this.showCurrentFrame();
    }

    /*
     * Jumps to the first frame of the presentation.
     */
    jumpToFirst() {
        this.jumpToFrame(0);
    }

    /*
     * Jump to the last frame of the presentation.
     */
    jumpToLast() {
        this.jumpToFrame(this.presentation.frames.length - 1);
    }

    /*
     * Jumps to the previous frame.
     */
    jumpToPrevious() {
        this.jumpToFrame(this.previousFrame);
    }

    /*
     * Jumps to the next frame.
     */
    jumpToNext() {
        this.jumpToFrame(this.nextFrame);
    }

    /*
     * Move to a frame.
     *
     * This method animates the transition from the current
     * state of the viewport to the desired frame.
     *
     * If the given frame corresponds to the next frame in the list,
     * the transition properties of the next frame are used.
     * Otherwise, default transition properties are used.
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
            let timingFunction = Timing[DEFAULT_TIMING_FUNCTION];
            let relativeZoom = DEFAULT_RELATIVE_ZOOM;
            let transitionPath = null;

            if (layerProperties) {
                const lp = layerProperties[camera.layer.index];
                relativeZoom = lp.transitionRelativeZoom;
                timingFunction = Timing[lp.transitionTimingFunction];
                if (useTransitionPath) {
                    transitionPath = lp.transitionPath;
                }
                if (backwards) {
                    timingFunction = timingFunction.reverse;
                }
            }

            this.setupTransition(camera, timingFunction, relativeZoom, transitionPath, backwards);
        }

        this.animator.start(durationMs);
    }

    /*
     * Move to the first frame of the presentation.
     */
    moveToFirst() {
        this.moveToFrame(0);
    }

    /*
     * Move to the last frame of the presentation.
     */
    moveToLast() {
        this.moveToFrame(this.presentation.frames.length - 1);
    }

    /*
     * Move to the previous frame.
     *
     * This method skips previous frames with 0 ms timeout.
     */
    moveToPrevious() {
        for (let index = this.previousFrame.index; index >= 0; index --) {
            const frame = this.presentation.frames[index];
            if (!frame.timeoutEnable || frame.timeoutMs !== 0) {
                this.moveToFrame(frame);
                break;
            }
        }
    }

    /*
     * Move to the next frame.
     */
    moveToNext() {
        this.moveToFrame(this.nextFrame);
    }

    /*
     * Restore the current frame.
     *
     * This method restores the viewport to fit the current frame,
     * e.g. after the viewport has been zoomed or dragged.
     */
    moveToCurrent() {
        this.moveToFrame(this.currentFrame);
    }

    /*
     * Move to a frame.
     *
     * This method animates the transition from the current
     * state of the viewport to the desired frame, using
     * default transition settings.
     */
    previewFrame(frame) {
        this.targetFrame = this.findFrame(frame);

        for (let camera of this.viewport.cameras) {
            this.setupTransition(camera, Timing[DEFAULT_TIMING_FUNCTION], DEFAULT_RELATIVE_ZOOM);
        }

        this.animator.start(DEFAULT_TRANSITION_DURATION_MS);
    }

    setupTransition(camera, timingFunction, relativeZoom, svgPath, reverse) {
        if (this.animator.running) {
            this.animator.stop();
        }

        this.transitions.push({
            camera,
            initialState: new CameraState(camera),
            finalState: this.targetFrame.cameraStates[camera.layer.index],
            timingFunction,
            relativeZoom,
            svgPath,
            reverse
        });
    }

    onAnimatorStep(progress) {
        for (let transition of this.transitions) {
            transition.camera.interpolate(transition.initialState, transition.finalState, progress, transition.timingFunction, transition.relativeZoom, transition.svgPath, transition.reverse);
            transition.camera.update();
        }
    }

    onAnimatorStop() {
        this.transitions = [];
        this.currentFrame = this.targetFrame;
        this.emit("frameChange");
    }

    onAnimatorDone() {
        this.onAnimatorStop();
        if (this.playing) {
            this.waitTimeout();
        }
    }

    get blankScreenIsVisible() {
        return document.querySelector(".sozi-blank-screen").style.visibility === "visible";
    }

    enableBlankScreen() {
        this.pause();
        const blankScreen = document.querySelector(".sozi-blank-screen");
        if (blankScreen) {
            blankScreen.style.opacity = 1;
            blankScreen.style.visibility = "visible";
        }
    }

    disableBlankScreen() {
        const blankScreen = document.querySelector(".sozi-blank-screen");
        if (blankScreen) {
            blankScreen.style.opacity = 0;
            blankScreen.style.visibility = "hidden";
        }
    }

    toggleBlankScreen() {
        if (this.blankScreenIsVisible) {
            this.disableBlankScreen();
        }
        else {
            this.enableBlankScreen();
        }
    }

    disableMedia() {
        Media.disable();
    }
}
