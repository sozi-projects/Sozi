/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Animator} from "./Animator";
import * as Timing from "./Timing";
import {CameraState} from "../model/CameraState";
import {EventEmitter} from "events";

// Constants: default animation properties
// for out-of-sequence transitions
var DEFAULT_TRANSITION_DURATION_MS = 500;
var DEFAULT_RELATIVE_ZOOM = 0;
var DEFAULT_TIMING_FUNCTION = "ease";

// Zoom factor for user zoom action (keyboard and mouse wheel)
var SCALE_FACTOR = 1.05;

// Rotation step for user rotate action (keyboard and mouse wheel)
var ROTATE_STEP = 5;

export var Player = Object.create(EventEmitter.prototype);

Player.init = function (viewport, presentation, editMode) {
    EventEmitter.call(this);
    this.viewport = viewport;
    this.presentation = presentation;
    this.editMode = !!editMode;
    this.animator = Object.create(Animator).init();
    this.playing = false;
    this.waitingTimeout = false;
    this.currentFrameIndex = 0;
    this.targetFrameIndex = 0;
    this.timeoutHandle = null;
    this.transitions = [];
    this.previewTransitions = false;

    this.setupEventHandlers();
    return this;
};

Player.setupEventHandlers = function () {
    if (!this.editMode) {
        this.viewport.addListener("click", this.onClick.bind(this));
        this.viewport.addListener("dragStart", this.pause.bind(this));
        this.viewport.addListener("userChangeState", this.pause.bind(this));
        window.addEventListener("keydown", this.onKeyDown.bind(this), false);
        window.addEventListener("keypress", this.onKeyPress.bind(this), false);
    }
    this.animator.addListener("step", this.onAnimatorStep.bind(this));
    this.animator.addListener("stop", this.onAnimatorStop.bind(this));
    this.animator.addListener("done", this.onAnimatorDone.bind(this));
};

Player.onClick = function (button) {
    switch (button) {
        case 0: this.moveToNext(); break;
        case 2: this.moveToPrevious(); break;
    }
};

Player.onKeyDown = function (evt) {
    // Keys with Alt/Ctrl/Meta modifiers are ignored
    if (evt.altKey || evt.ctrlKey || evt.metaKey) {
        return;
    }

    switch (evt.keyCode) {
        case 36: // Home
            if (evt.shiftKey) {
                this.jumpToFirst();
            }
            else {
                this.moveToFirst();
            }
            break;
        case 35: // End
            if (evt.shiftKey) {
                this.jumpToLast();
            }
            else {
                this.moveToLast();
            }
            break;
        case 38: // Arrow up
        case 33: // Page up
        case 37: // Arrow left
            if (evt.shiftKey) {
                this.jumpToPrevious();
            }
            else {
                this.moveToPrevious();
            }
            break;
        case 40: // Arrow down
        case 34: // Page down
        case 39: // Arrow right
        case 13: // Enter
        case 32: // Space
            if (evt.shiftKey) {
                this.jumpToNext();
            }
            else {
                this.moveToNext();
            }
            break;
        default:
            return;
    }

    evt.stopPropagation();
    evt.preventDefault();
};

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
Player.onKeyPress = function (evt) {
    // Keys with modifiers are ignored
    if (evt.altKey || evt.ctrlKey || evt.metaKey) {
        return;
    }

    switch (evt.charCode || evt.which) {
        case 43: // +
            this.viewport.zoom(SCALE_FACTOR, this.viewport.width / 2, this.viewport.height / 2);
            this.pause();
            break;
        case 45: // -
            this.viewport.zoom(1 / SCALE_FACTOR, this.viewport.width / 2, this.viewport.height / 2);
            this.pause();
            break;
        case 82: // R
            this.viewport.rotate(-ROTATE_STEP);
            this.pause();
            break;
        case 114: // r
            this.viewport.rotate(ROTATE_STEP);
            this.pause();
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
        default:
            return;
    }

    evt.stopPropagation();
    evt.preventDefault();
};

Object.defineProperty(Player, "currentFrame", {
    get() {
        return this.presentation.frames[this.currentFrameIndex];
    }
});

Object.defineProperty(Player, "targetFrame", {
    get() {
        return this.presentation.frames[this.targetFrameIndex];
    }
});

Object.defineProperty(Player, "previousFrameIndex", {
    get() {
        var index = this.animator.running ? this.targetFrameIndex : this.currentFrameIndex;
        return (index + this.presentation.frames.length - 1) % this.presentation.frames.length;
    }
});

Object.defineProperty(Player, "nextFrameIndex", {
    get() {
        var index = this.animator.running ? this.targetFrameIndex : this.currentFrameIndex;
        return (index + 1) % this.presentation.frames.length;
    }
});

Player.showCurrentFrame = function () {
    this.viewport.setAtStates(this.currentFrame.cameraStates).update();
    this.emit("frameChange");
    return this;
};

/*
 * Start the presentation from the given frame index (0-based).
 *
 * This method sets the "playing" flag, shows the desired frame
 * and waits for the frame timeout if needed.
 */
Player.playFromIndex = function (index) {
    this.playing = true;
    this.waitingTimeout = false;
    this.targetFrameIndex = index;
    this.currentFrameIndex = index;
    this.showCurrentFrame();
    this.waitTimeout();
    return this;
};

/*
 * Pause the presentation.
 *
 * This method clears the "playing" flag.
 * If the presentation was in "waiting" mode due to a timeout
 * in the current frame, then it stops waiting.
 * The current animation is stopped in its current state.
 */
Player.pause = function () {
    this.animator.stop();
    if (this.waitingTimeout) {
        window.clearTimeout(this.timeoutHandle);
        this.waitingTimeout = false;
    }
    this.playing = false;
    this.previewTransitions = false;
    this.targetFrameIndex = this.currentFrameIndex;
    return this;
};

/*
 * Resume playing from the current frame.
 */
Player.resume = function () {
    this.previewTransitions = true;
    this.playFromIndex(this.currentFrameIndex);
    return this;
};

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
Player.waitTimeout = function () {
    if (this.currentFrame.timeoutEnable) {
        this.waitingTimeout = true;
        this.timeoutHandle = window.setTimeout(
            this.moveToFrame.bind(this, this.nextFrameIndex),
            this.currentFrame.timeoutMs
        );
    }
    return this;
};

/*
 * Jump to a frame with the given index (0-based).
 *
 * This method does not animate the transition from the current
 * state of the viewport to the desired frame.
 *
 * The presentation is stopped: if a timeout has been set for the
 * target frame, it will be ignored.
 */
Player.jumpToFrame = function (index) {
    this.pause();

    this.targetFrameIndex = index;
    this.currentFrameIndex = index;
    this.showCurrentFrame();
    return this;
};

/*
 * Jumps to the first frame of the presentation.
 */
Player.jumpToFirst = function () {
    return this.jumpToFrame(0);
};

/*
 * Jump to the last frame of the presentation.
 */
Player.jumpToLast = function () {
    return this.jumpToFrame(this.presentation.frames.length - 1);
};

/*
 * Jumps to the previous frame.
 */
Player.jumpToPrevious = function () {
    return this.jumpToFrame(this.previousFrameIndex);
};

/*
 * Jumps to the next frame.
 */
Player.jumpToNext = function () {
    return this.jumpToFrame(this.nextFrameIndex);
};

/*
 * Move to a frame with the given index (0-based).
 *
 * This method animates the transition from the current
 * state of the viewport to the desired frame.
 *
 * If the given frame index corresponds to the next frame in the list,
 * the transition properties of the next frame are used.
 * Otherwise, default transition properties are used.
 */
Player.moveToFrame = function (index) {
    if (this.waitingTimeout) {
        window.clearTimeout(this.timeoutHandle);
        this.waitingTimeout = false;
    }

    this.targetFrameIndex = index;

    var layerProperties = null;
    var durationMs = DEFAULT_TRANSITION_DURATION_MS;
    var useTransitionPath = false;
    var backwards = false;

    if (index === this.nextFrameIndex) {
        durationMs = this.targetFrame.transitionDurationMs;
        layerProperties = this.targetFrame.layerProperties;
        useTransitionPath = true;
    }
    else if (index === this.previousFrameIndex) {
        durationMs = this.currentFrame.transitionDurationMs;
        layerProperties = this.currentFrame.layerProperties;
        useTransitionPath = true;
        backwards = true;
    }

    this.playing = true;

    this.viewport.cameras.forEach(camera => {
        var timingFunction = Timing[DEFAULT_TIMING_FUNCTION];
        var relativeZoom = DEFAULT_RELATIVE_ZOOM;
        var transitionPath = null;

        if (layerProperties) {
            var lp = layerProperties[camera.layer.index];
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
    });

    this.animator.start(durationMs);

    return this;
};

/*
 * Move to the first frame of the presentation.
 */
Player.moveToFirst = function () {
    return this.moveToFrame(0);
};

/*
 * Move to the last frame of the presentation.
 */
Player.moveToLast = function () {
    return this.moveToFrame(this.presentation.frames.length - 1);
};

/*
 * Move to the previous frame.
 *
 * This method skips previous frames with 0 ms timeout.
 */
Player.moveToPrevious = function () {
    for (var index = this.previousFrameIndex; index >= 0; index --) {
        var frame = this.presentation.frames[index];
        if (!frame.timeoutEnable || frame.timeoutMs !== 0) {
            this.moveToFrame(index);
            break;
        }
    }
    return this;
};

/*
 * Move to the next frame.
 */
Player.moveToNext = function () {
    return this.moveToFrame(this.nextFrameIndex);
};

/*
 * Restore the current frame.
 *
 * This method restores the viewport to fit the current frame,
 * e.g. after the viewport has been zoomed or dragged.
 */
Player.moveToCurrent = function () {
    return this.moveToFrame(this.currentFrameIndex);
};

/*
 * Move to a frame with the given index (0-based).
 *
 * This method animates the transition from the current
 * state of the viewport to the desired frame, using
 * default transition settings.
 */
Player.previewFrame = function (index) {
    this.targetFrameIndex = index;

    this.viewport.cameras.forEach(camera => {
        this.setupTransition(camera, Timing[DEFAULT_TIMING_FUNCTION], DEFAULT_RELATIVE_ZOOM);
    });

    this.animator.start(DEFAULT_TRANSITION_DURATION_MS);
    return this;
};

Player.setupTransition = function (camera, timingFunction, relativeZoom, svgPath, reverse) {
    if (this.animator.running) {
        this.animator.stop();
    }

    this.transitions.push({
        camera,
        initialState: Object.create(CameraState).initFrom(camera),
        finalState: this.targetFrame.cameraStates[camera.layer.index],
        timingFunction,
        relativeZoom,
        svgPath,
        reverse
    });

    return this;
};

Player.onAnimatorStep = function (progress) {
    this.transitions.forEach(transition => {
        transition.camera.interpolate(transition.initialState, transition.finalState, progress, transition.timingFunction, transition.relativeZoom, transition.svgPath, transition.reverse);
        transition.camera.update();
    });
};

Player.onAnimatorStop = function () {
    this.transitions = [];
    this.currentFrameIndex = this.targetFrameIndex;
    this.emit("frameChange");
};

Player.onAnimatorDone = function () {
    this.transitions = [];
    this.currentFrameIndex = this.targetFrameIndex;
    this.emit("frameChange");
    if (this.playing) {
        this.waitTimeout();
    }
};
