/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.player", function (exports) {
    "use strict";

    // Constants: default animation properties
    // for out-of-sequence transitions
    var DEFAULT_TRANSITION_DURATION_MS = 500;
    var DEFAULT_RELATIVE_ZOOM = -0.1;
    var DEFAULT_TIMING_FUNCTION = "ease";

    // Zoom factor for user zoom action (keyboard and mouse wheel)
    var SCALE_FACTOR = 1.05;

    // Rotation step for user rotate action (keyboard and mouse wheel)
    var ROTATE_STEP = 5;

    exports.Player = sozi.model.Object.clone({

        viewport: null,
        presentation: null,

        // Status flag: is this player playing?
        playing: false,

        // Status flag: is this player waiting for the current frame's timeout?
        waitingTimeout: false,

        // The index of the frame currently displayed
        currentFrameIndex: 0,

        // The target frame index for the current transition
        targetFrameIndex: 0,

        // The handle returned by setTimeout() for frame timeout
        timeoutHandle: null,

        // The animator object used in transitions
        animator: {own: null},

        // The current transition data
        transitions: {own: []},

        init: function (viewport, presentation) {
            this.viewport = viewport;
            this.presentation = presentation;
            this.animator = sozi.player.Animator.clone().init();
            this.setupEventHandlers();
            return this;
        },

        setupEventHandlers: function () {
            var self = this;
            this.viewport.addListener("click", this.bind(this.onClick));
            this.viewport.addListener("dragStart", this.bind(this.pause));
            this.viewport.addListener("userChangeState", this.bind(this.pause));
            window.addEventListener("keydown", this.bind(this.onKeyDown), false);
            window.addEventListener("keypress", this.bind(this.onKeyPress), false);
            this.animator.addListener("step", this.bind(this.onAnimatorStep));
            this.animator.addListener("done", this.bind(this.onAnimatorDone));
        },

        onClick: function (viewport, button) {
            switch (button) {
                case 0: this.moveToNext(); break;
                case 1: /* TODO show table of contents */ break;
                case 2: this.moveToPrevious(); break;
            }
        },

        onKeyDown: function (evt) {
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
        },

        /**
         * Event handler: key press.
         *
         * This method handles character keys:
         *    - "+", "-": zoom in/out
         *    - "R", "r": rotate clockwise/counter-clockwise.
         *
         * Parameters:
         *    - evt: The DOM event object
         */
        onKeyPress: function (evt) {
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
        },

        get currentFrame() {
            return this.presentation.frames.at(this.currentFrameIndex);
        },

        get targetFrame() {
            return this.presentation.frames.at(this.targetFrameIndex);
        },

        get previousFrameIndex() {
            var index = this.animator.running ? this.targetFrameIndex : this.currentFrameIndex;
            return (index - 1) % this.presentation.frames.length;
        },

        get nextFrameIndex() {
            var index = this.animator.running ? this.targetFrameIndex : this.currentFrameIndex;
            return (index + 1) % this.presentation.frames.length;
        },

        showCurrentFrame: function () {
            this.viewport.setAtStates(this.currentFrame.cameraStates);
            return this;
        },

        /*
         * Start the presentation from the given frame index (0-based).
         *
         * This method sets the "playing" flag, shows the desired frame
         * and waits for the frame timeout if needed.
         */
        playFromIndex: function (index) {
            this.playing = true;
            this.waitingTimeout = false;
            this.targetFrameIndex = index;
            this.currentFrameIndex = index;
            this.showCurrentFrame();
            this.waitTimeout();
            return this;
        },

        /*
         * Pause the presentation.
         *
         * This method clears the "playing" flag.
         * If the presentation was in "waiting" mode due to a timeout
         * in the current frame, then it stops waiting.
         * The current animation is stopped in its current state.
         */
        pause: function () {
            this.animator.stop();
            if (this.waitingTimeout) {
                window.clearTimeout(this.timeoutHandle);
                this.waitingTimeout = false;
            }
            this.playing = false;
            this.targetFrameIndex = this.currentFrameIndex;
            return this;
        },

        /*
         * Resume playing from the current frame.
         */
        resume: function () {
            this.playFromIndex(this.currentFrameIndex);
            return this;
        },

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
        waitTimeout: function () {
            if (this.currentFrame.timeoutEnable) {
                this.waitingTimeout = true;
                var self = this;
                var nextIndex = this.nextFrameIndex;
                this.timeoutHandle = window.setTimeout(function () {
                        self.moveToFrame(nextIndex);
                    },
                    this.currentFrame.timeoutMs
                );
            }
            return this;
        },

        /*
         * Jump to a frame with the given index (0-based).
         *
         * This method does not animate the transition from the current
         * state of the viewport to the desired frame.
         *
         * The presentation is stopped: if a timeout has been set for the
         * target frame, it will be ignored.
         */
        jumpToFrame: function (index) {
            this.pause();
            this.fire("cleanup"); // TODO Remove this event or find a better name.

            this.targetFrameIndex = index;
            this.currentFrameIndex = index;
            this.showCurrentFrame();
            return this;
        },

        /*
         * Jumps to the first frame of the presentation.
         */
        jumpToFirst: function () {
            return this.jumpToFrame(0);
        },

        /*
         * Jump to the last frame of the presentation.
         */
        jumpToLast: function () {
            return this.jumpToFrame(this.presentation.frames.length - 1);
        },

        /*
         * Jumps to the previous frame.
         */
        jumpToPrevious: function () {
            return this.jumpToFrame(this.previousFrameIndex);
        },

        /*
         * Jumps to the next frame.
         */
        jumpToNext: function () {
            return this.jumpToFrame(this.nextFrameIndex);
        },

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
        moveToFrame: function (index) {
            if (this.waitingTimeout) {
                window.clearTimeout(this.timeoutHandle);
                this.waitingTimeout = false;
            }

            this.targetFrameIndex = index;

            var layerProperties = null;
            var durationMs = DEFAULT_TRANSITION_DURATION_MS;
            var useTransitionPath = false;
            var backwards = false;

            if (index === this.previousFrameIndex) {
                durationMs = this.currentFrame.transitionDurationMs;
                layerProperties = this.currentFrame.layerProperties;
                useTransitionPath = true;
                backwards = true;
            }
            else if (index === this.nextFrameIndex) {
                durationMs = this.targetFrame.transitionDurationMs;
                layerProperties = this.targetFrame.layerProperties;
                useTransitionPath = true;
            }

            this.fire("cleanup"); // TODO Remove this event or find a better name.

            this.playing = true;

            this.viewport.cameras.forEach(function (camera) {
                var timingFunction = sozi.player.timing[DEFAULT_TIMING_FUNCTION];
                var relativeZoom = DEFAULT_RELATIVE_ZOOM;
                var transitionPath = null;

                if (layerProperties) {
                    var lp = layerProperties.at(camera.layer.index);
                    relativeZoom = lp.transitionRelativeZoom;
                    timingFunction = sozi.player.timing[lp.transitionTimingFunction];
                    if (useTransitionPath) {
                        transitionPath = lp.transitionPath;
                    }
                    if (backwards) {
                        timingFunction = timingFunction.reverse;
                    }
                }

                this.setupTransition(camera, timingFunction, relativeZoom, transitionPath, backwards);
            }, this);

            this.animator.start(durationMs);

            return this;
        },

        /*
         * Move to the first frame of the presentation.
         */
        moveToFirst: function () {
            return this.moveToFrame(0);
        },

        /*
         * Move to the last frame of the presentation.
         */
        moveToLast: function () {
            return this.moveToFrame(this.presentation.frames.length - 1);
        },

        /*
         * Move to the previous frame.
         *
         * This method skips previous frames with 0 ms timeout.
         */
        moveToPrevious: function () {
            for (var index = this.previousFrameIndex; index >= 0; index --) {
                var frame = this.presentation.frames.at(index);
                if (!frame.timeoutEnable || frame.timeoutMs !== 0) {
                    this.moveToFrame(index);
                    break;
                }
            }
            return this;
        },

        /*
         * Move to the next frame.
         */
        moveToNext: function () {
            return this.moveToFrame(this.nextFrameIndex);
        },

        /*
         * Restore the current frame.
         *
         * This method restores the viewport to fit the current frame,
         * e.g. after the viewport has been zoomed or dragged.
         */
        moveToCurrent: function () {
            return this.moveToFrame(this.currentFrameIndex);
        },

        /*
         * Move to a frame with the given index (0-based).
         *
         * This method animates the transition from the current
         * state of the viewport to the desired frame, using
         * default transition settings.
         */
        previewFrame: function (index) {
            this.targetFrameIndex = index;

            this.viewport.cameras.forEach(function (camera) {
                this.setupTransition(camera, sozi.player.timing[DEFAULT_TIMING_FUNCTION], DEFAULT_RELATIVE_ZOOM);
            }, this);

            this.animator.start(DEFAULT_TRANSITION_DURATION_MS);
            return this;
        },

        setupTransition: function (camera, timingFunction, relativeZoom, svgPath, reverse) {
            if (this.animator.running) {
                this.animator.stop();
            }

            this.transitions.push({
                camera: camera,
                initialState: sozi.model.CameraState.clone().copy(camera),
                finalState: this.targetFrame.cameraStates.at(camera.layer.index),
                timingFunction: timingFunction,
                relativeZoom: relativeZoom,
                svgPath: svgPath,
                reverse: reverse
            });

            return this;
        },

        onAnimatorStep: function (animator, progress) {
            this.transitions.forEach(function (transition) {
                transition.camera.interpolate(transition.initialState, transition.finalState, progress, transition.timingFunction, transition.relativeZoom, transition.svgPath, transition.reverse);
                transition.camera.update();
            });
        },

        onAnimatorDone: function (animator) {
            this.transitions.clear();
            this.currentFrameIndex = this.targetFrameIndex;
            if (this.playing) {
                this.waitTimeout();
            }
        }
    });
});
