/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 * 
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend events.js
 * @depend animation.js
 */

var sozi = sozi || {};

(function () {
    var exports = sozi.player = sozi.player || {},
        display = sozi.display = sozi.display || {},
        window = this,
        animator,
        nextFrameTimeout,
        DEFAULT_DURATION_MS = 500,
        DEFAULT_ZOOM_PERCENT = -10,
        DEFAULT_PROFILE = "linear",
        sourceFrameIndex = 0,
        currentFrameIndex = 0,
        playing = false,
        waiting = false;

    /*
     * Event handler: animation step.
     *
     * This method is called periodically by animator after the animation
     * has been started, and until the animation time is elapsed.
     *
     * Parameter data provides the following information:
     *    - initialState and finalState contain the geometrical properties of the display
     *      at the start and end of the animation.
     *    - profile is a reference to the speed profile function to use.
     *    - zoomWidth and zoomHeight are the parameters of the zooming polynomial if the current
     *      animation has a non-zero zooming effect.
     *
     * Parameter progress is a float number between 0 (start of the animation)
     * and 1 (end of the animation).
     */
    function onAnimationStep(progress, data) {
        var profileProgress, profileRemaining,
            l, lg, attr, ps;

        for (l in data) {
            if (data.hasOwnProperty(l)) {
                lg = display.layers[l].geometry;
                
                profileProgress = data[l].profile(progress);
                profileRemaining = 1 - profileProgress;
                
                for (attr in data[l].initialState) {
                    if (data[l].initialState.hasOwnProperty(attr)) {
                        if (typeof data[l].initialState[attr] === "number" && typeof data[l].finalState[attr] === "number") {
                            lg[attr] = data[l].finalState[attr] * profileProgress + data[l].initialState[attr] * profileRemaining;
                        }
                    }
                }

                if (data[l].zoomWidth && data[l].zoomWidth.k !== 0) {
                    ps = progress - data[l].zoomWidth.ts;
                    lg.width = data[l].zoomWidth.k * ps * ps + data[l].zoomWidth.ss;
                }

                if (data[l].zoomHeight && data[l].zoomHeight.k !== 0) {
                    ps = progress - data[l].zoomHeight.ts;
                    lg.height = data[l].zoomHeight.k * ps * ps + data[l].zoomHeight.ss;
                }

                lg.clip = data[l].finalState.clip;
            }
        }
        
        display.update();
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
    function waitTimeout() {
        var index;
        if (sozi.document.frames[currentFrameIndex].timeoutEnable) {
            waiting = true;
            index = (currentFrameIndex + 1) % sozi.document.frames.length;
            nextFrameTimeout = window.setTimeout(function () {
                    exports.moveToFrame(index);
                },
                sozi.document.frames[currentFrameIndex].timeoutMs
            );
        }
    }

    /*
     * Event handler: animation done.
     *
     * This method is called by animator when the current animation is finished.
     *
     * If the animation was a transition in the normal course of the presentation,
     * then we call the waitTimeout method to process the timeout property of the current frame.
     */
    function onAnimationDone() {
        sourceFrameIndex = currentFrameIndex;
        if (playing) {
            waitTimeout();
        }
    }

    /*
     * Starts the presentation from the given frame index (0-based).
     *
     * This method sets the "playing" flag, shows the desired frame
     * and calls waitTimeout.
     */
    exports.startFromIndex = function (index) {
        playing = true;
        waiting = false;
        sourceFrameIndex = index;
        currentFrameIndex = index;
        display.showFrame(sozi.document.frames[index]);
        waitTimeout();
    };

    exports.restart = function () {
        exports.startFromIndex(currentFrameIndex);
    };

    /*
     * Stops the presentation.
     *
     * This method clears the "playing".
     * If the presentation was in "waiting" mode due to a timeout
     * in the current frame, then it stops waiting.
     * The current animation is stopped in its current state.
     */
    exports.stop = function () {
        animator.stop();
        if (waiting) {
            window.clearTimeout(nextFrameTimeout);
            waiting = false;
        }
        playing = false;
        sourceFrameIndex = currentFrameIndex;
    };

    function getZoomData(zoomPercent, s0, s1) {
        var result = {
                ss: ((zoomPercent < 0) ? Math.max(s0, s1) : Math.min(s0, s1)) * (100 - zoomPercent) / 100,
                ts: 0.5,
                k: 0
            },
            a,
            b,
            c,
            d,
            u,
            v;

        if (zoomPercent !== 0) {
            a = s0 - s1;
            b = s0 - result.ss;
            c = s1 - result.ss;

            if (a !== 0) {
                d = Math.sqrt(b * c);

                u = (b - d) / a;
                v = (b + d) / a;

                result.ts = (u > 0 && u <= 1) ? u : v;
            }

            result.k = b / result.ts / result.ts;
        }

        return result;
    }

    /*
     * Jump to a frame with the given index (0-based).
     *
     * This method does not animate the transition from the current
     * state of the display to the desired frame.
     *
     * The presentation is stopped: if a timeout has been set for the
     * target frame, it will be ignored.
     *
     * The URL hash is set to the given frame index (1-based).
     */
    exports.jumpToFrame = function (index) {
        exports.stop();
        sozi.events.fire("cleanup");

        sourceFrameIndex = index;
        currentFrameIndex = index;
        display.showFrame(sozi.document.frames[index]);

        sozi.events.fire("framechange", index);
    };

    /*
     * Returns an associative array where keys are layer names
     * and values are objects in the form { initialState: finalState: profile: zoomWidth: zoomHeight:}
     */
    function getAnimationData(initialState, finalState, zoomPercent, profile) {
        var g, l, zp,
            data = {};
        
        for (l in initialState.layers) {
            if (initialState.layers.hasOwnProperty(l)) {
                data[l] = {
                    initialState: {},
                    finalState: {}
                };
                
                data[l].profile = profile || finalState.layers[l].transitionProfile;

                // Copy all properties of given final state
                for (g in initialState.layers[l].geometry) {
                    if (initialState.layers[l].geometry.hasOwnProperty(g)) {
                        data[l].initialState[g] = initialState.layers[l].geometry[g];
                        // If the current layer is referenced in final state, copy the final properties
                        // else, copy initial state to final state for the current layer. 
                        if (finalState.layers.hasOwnProperty(l)) {
                            data[l].finalState[g] = finalState.layers[l].geometry[g];
                        }
                        else {
                            data[l].finalState[g] = initialState.layers[l].geometry[g];
                        }
                    }
                }

                // Keep the smallest angle difference between initial state and final state
                data[l].initialState.rotate = (data[l].initialState.rotate - 180) % 360 + 180;
                data[l].finalState.rotate = (data[l].finalState.rotate - 180) % 360 + 180;
        
                if (data[l].finalState.rotate - data[l].initialState.rotate > 180) {
                    data[l].finalState.rotate -= 360;
                }
                else if (data[l].finalState.rotate - data[l].initialState.rotate < -180) {
                    data[l].initialState.rotate -= 360;
                }

                zp = zoomPercent || finalState.layers[l].transitionZoomPercent;
                
                if (zp && finalState.layers.hasOwnProperty(l)) {
                    data[l].zoomWidth = getZoomData(zp,
                        initialState.layers[l].geometry.width,
                        finalState.layers[l].geometry.width);
                    data[l].zoomHeight = getZoomData(zp,
                        initialState.layers[l].geometry.height,
                        finalState.layers[l].geometry.height);
                }
            }
        }
        
        return data;
    }
    
    exports.previewFrame = function (index) {
        currentFrameIndex = index;
        animator.start(DEFAULT_DURATION_MS, 
            getAnimationData(display, sozi.document.frames[index],
                DEFAULT_ZOOM_PERCENT, sozi.animation.profiles[DEFAULT_PROFILE]));
        sozi.events.fire("framechange", index);
    };

    /*
     * Moves to a frame with the given index (0-based).
     *
     * This method animates the transition from the current
     * state of the display to the desired frame.
     *
     * If the given frame index corresponds to the next frame in the list,
     * the transition properties of the next frame are used.
     * Otherwise, default transition properties are used.
     *
     * The URL hash is set to the given frame index (1-based).
     */
    exports.moveToFrame = function (index) {
        var durationMs,
            zoomPercent,
            profile;

        if (waiting) {
            window.clearTimeout(nextFrameTimeout);
            waiting = false;
        }

        if (index === (currentFrameIndex + 1) % sozi.document.frames.length) {
            durationMs = sozi.document.frames[index].transitionDurationMs;
            zoomPercent = undefined; // Set for each layer
            profile = undefined; // Set for each layer
        }
        else {
            durationMs = DEFAULT_DURATION_MS;
            zoomPercent = DEFAULT_ZOOM_PERCENT;
            profile = sozi.animation.profiles[DEFAULT_PROFILE];
        }

        sozi.events.fire("cleanup");

        playing = true;
        currentFrameIndex = index;

        animator.start(durationMs, getAnimationData(display, sozi.document.frames[index], zoomPercent, profile));

        sozi.events.fire("framechange", index);
    };

    /*
     * Moves to the first frame of the presentation.
     */
    exports.moveToFirst = function () {
        exports.moveToFrame(0);
    };

    /*
     * Jumps to the previous frame
     */
    exports.jumpToPrevious = function () {
        var index = currentFrameIndex;
        if (!animator.started || sourceFrameIndex <= currentFrameIndex) {
            index -= 1;
        }
        if (index >= 0) {
            exports.jumpToFrame(index);
        }
    };

    /*
     * Moves to the previous frame.
     */
    exports.moveToPrevious = function () {
        var index = currentFrameIndex,
            frame;

        for (index -= 1; index >= 0; index -= 1) {
            frame = sozi.document.frames[index];
            if (!frame.timeoutEnable || frame.timeoutMs !== 0) {
                exports.moveToFrame(index);
                break;
            }
        }
    };

    /*
     * Jumps to the next frame
     */
    exports.jumpToNext = function () {
        var index = currentFrameIndex;
        if (!animator.started || sourceFrameIndex >= currentFrameIndex) {
            index += 1;
        }
        if (index < sozi.document.frames.length) {
            exports.jumpToFrame(index);
        }
    };

    /*
     * Moves to the next frame.
     */
    exports.moveToNext = function () {
        if (currentFrameIndex < sozi.document.frames.length - 1 || sozi.document.frames[currentFrameIndex].timeoutEnable) {
            exports.moveToFrame((currentFrameIndex + 1) % sozi.document.frames.length);
        }
    };

    /*
     * Moves to the last frame of the presentation.
     */
    exports.moveToLast = function () {
        exports.moveToFrame(sozi.document.frames.length - 1);
    };

    /*
     * Restores the current frame.
     *
     * This method restores the display to fit the current frame,
     * e.g. after the display has been zoomed or dragged.
     */
    exports.moveToCurrent = function () {
        exports.moveToFrame(currentFrameIndex);
    };

    /*
     * Shows all the document in the browser window.
     */
    exports.showAll = function () {
        exports.stop();
        sozi.events.fire("cleanup");
        animator.start(DEFAULT_DURATION_MS, 
            getAnimationData(display, display.getDocumentGeometry(),
                DEFAULT_ZOOM_PERCENT, sozi.animation.profiles[DEFAULT_PROFILE]
            )
        );
    };

    /*
     * Event handler: display ready.
     */
    function onDisplayReady() {
        exports.startFromIndex(sozi.location.getFrameIndex());
    }    

    animator = new sozi.animation.Animator(onAnimationStep, onAnimationDone);

    sozi.events.listen("displayready", onDisplayReady);
}());
