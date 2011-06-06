/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2011 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 * 
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

var sozi = sozi || {};

sozi.player = (function () {
    var exports = {},
        listeners = {},
        display,
        animator,
        DEFAULTS,
        SOZI_NS = "http://sozi.baierouge.fr",
        DEFAULT_DURATION_MS = 500,
        DEFAULT_ZOOM_PERCENT = -10,
        DEFAULT_PROFILE = "linear",
        SCALE_FACTOR = 1.05,
        sourceFrameIndex = 0,
        currentFrameIndex = 0,
        playing = false,
        waiting = false;

    exports.frames = [];

    DEFAULTS = {
        "title": "Untitled",
        "sequence": "0",
        "hide": "true",
        "clip": "true",
        "timeout-enable": "false",
        "timeout-ms": "5000",
        "transition-duration-ms": "1000",
        "transition-zoom-percent": "0",
        "transition-profile": "linear"
    };

    /*
     * Adds a listener for a given event type.
     *
     * The event type is provided as a string by the key parameter.
     * The function to be executed is provided by the handler parameter.
     */
    exports.addListener = function (key, handler) {
        var listenersForKey = listeners[key];
        if (!listenersForKey) {
            listenersForKey = listeners[key] = [];
        }
        listenersForKey.push(handler);
    };
    
    /*
     * Fire an event of the given type.
     *
     * All event handlers added for the given event type are
     * executed.
     * Additional arguments provided to this function are passed
     * to the event handlers.
     */
    function fireEvent (key) {
        var listenersForKey = listeners[key],
            len,
            i,
            args = Array.prototype.slice.call(arguments, 1);
        if (listenersForKey) {
            len = listenersForKey.length;
            for (i = 0; i < len; i++) {
                listenersForKey[i].apply(null, args);
            }
        }
    }
    
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
        var remaining = 1 - progress,
            profileProgress = data.profile(progress),
            profileRemaining = 1 - profileProgress,
            attr,
            ps;

        for (attr in data.initialState) {
            if (data.initialState.hasOwnProperty(attr)) {
                if (typeof data.initialState[attr] === "number" && typeof data.finalState[attr] === "number") {
                    display.geometry[attr] = data.finalState[attr] * profileProgress + data.initialState[attr] * profileRemaining;
                }
            }
        }

        if (data.zoomWidth && data.zoomWidth.k !== 0) {
            ps = progress - data.zoomWidth.ts;
            display.geometry.width = data.zoomWidth.k * ps * ps + data.zoomWidth.ss;
        }

        if (data.zoomHeight && data.zoomHeight.k !== 0) {
            ps = progress - data.zoomHeight.ts;
            display.geometry.height = data.zoomHeight.k * ps * ps + data.zoomHeight.ss;
        }

        display.clip = data.finalState.clip;

        display.update();
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
     * Event handler: document load.
     *
     * This function initializes the animator, reads the frames.
     * The first frame, or the frame which number is given in the URL, is shown.
     */
    function onLoad() {
        display = sozi.display;
        display.onLoad();

        animator = new sozi.animation.Animator(40, onAnimationStep, onAnimationDone);

        readFrames();
        display.installTableOfContents();

        exports.startFromIndex(sozi.location.getFrameIndex());
    }

    /*
     * Returns the value of an attribute of a given SVG element.
     *
     * If the attribute is not set, then a default value is returned.
     * See DEFAULTS.
     */
    function readAttribute(elt, attr) {
        var value = elt.getAttributeNS(SOZI_NS, attr);
        return value === "" ? DEFAULTS[attr] : value;
    }

    /*
     * Builds the list of frames from the current document.
     *
     * This method collects all elements with tag "sozi:frame" and
     * retrieves their geometrical and animation attributes.
     * SVG elements that should be hidden during the presentation are hidden.
     *
     * The resulting list is available in frames, sorted by frame indices.
     */
    function readFrames() {
        var frameElements = document.getElementsByTagNameNS(SOZI_NS, "frame"),
            frameCount = frameElements.length,
            svgElement,
            i,
            newFrame;

        for (i = 0; i < frameCount; i++) {
            svgElement = document.getElementById(frameElements[i].getAttributeNS(SOZI_NS, "refid"));
            if (svgElement) {
                newFrame = {
                    geometry: display.getElementGeometry(svgElement),
                    title: readAttribute(frameElements[i], "title"),
                    sequence: parseInt(readAttribute(frameElements[i], "sequence"), 10),
                    hide: readAttribute(frameElements[i], "hide") === "true",
                    timeoutEnable: readAttribute(frameElements[i], "timeout-enable") === "true",
                    timeoutMs: parseInt(readAttribute(frameElements[i], "timeout-ms"), 10),
                    transitionDurationMs: parseInt(readAttribute(frameElements[i], "transition-duration-ms"), 10),
                    transitionZoomPercent: parseInt(readAttribute(frameElements[i], "transition-zoom-percent"), 10),
                    transitionProfile: sozi.animation.profiles[readAttribute(frameElements[i], "transition-profile") || "linear"]
                };
                if (newFrame.hide) {
                    svgElement.setAttribute("visibility", "hidden");
                }
                newFrame.geometry.clip = readAttribute(frameElements[i], "clip") === "true";
                exports.frames.push(newFrame);
            }
        }
        exports.frames.sort(
            function (a, b) {
                return a.sequence - b.sequence;
            }
        );
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
        display.showFrame(exports.frames[index]);
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
        if (exports.frames[currentFrameIndex].timeoutEnable) {
            waiting = true;
            index = (currentFrameIndex + 1) % exports.frames.length;
            nextFrameTimeout = window.setTimeout(function () {
                    exports.moveToFrame(index);
                },
                exports.frames[currentFrameIndex].timeoutMs
            );
        }
    }

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

        if (display.tableOfContentsIsVisible()) {
            display.hideTableOfContents();
        }

        sourceFrameIndex = index;
        currentFrameIndex = index;
        display.showFrame(exports.frames[index]);

        fireEvent("framechange", index);
    };

    exports.previewFrame = function (index) {
        var finalState = exports.frames[index].geometry,
            zw,
            zh;

        finalState.clip = false;

        if (DEFAULT_ZOOM_PERCENT !== 0) {
            zw = getZoomData(DEFAULT_ZOOM_PERCENT, display.geometry.width, finalState.width);
            zh = getZoomData(DEFAULT_ZOOM_PERCENT, display.geometry.height, finalState.height);
        }

        currentFrameIndex = index;
        animator.start(DEFAULT_DURATION_MS,  {
            initialState: display.getCurrentGeometry(),
            finalState: finalState,
            profile: sozi.animation.profiles[DEFAULT_PROFILE],
            zoomWidth: zw,
            zoomHeight: zh
        });

        fireEvent("framechange", index);
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
        var durationMs = DEFAULT_DURATION_MS,
            zoomPercent = DEFAULT_ZOOM_PERCENT,
            profile = sozi.animation.profiles[DEFAULT_PROFILE],
            zw,
            zh;

        if (waiting) {
            window.clearTimeout(nextFrameTimeout);
            waiting = false;
        }

        if (index === (currentFrameIndex + 1) % exports.frames.length) {
            durationMs = exports.frames[index].transitionDurationMs;
            zoomPercent = exports.frames[index].transitionZoomPercent;
            profile = exports.frames[index].transitionProfile;
        }

        if (display.tableOfContentsIsVisible()) {
            display.hideTableOfContents();
        }

        if (zoomPercent !== 0) {
            zw = getZoomData(zoomPercent, display.geometry.width, exports.frames[index].geometry.width);
            zh = getZoomData(zoomPercent, display.geometry.height, exports.frames[index].geometry.height);
        }

        playing = true;
        currentFrameIndex = index;
        animator.start(durationMs, {
            initialState: display.getCurrentGeometry(),
            finalState: exports.frames[currentFrameIndex].geometry,
            profile: profile,
            zoomWidth: zw,
            zoomHeight: zh
        });

        fireEvent("framechange", index);
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

        for (index--; index >= 0; index--) {
            frame = exports.frames[index];
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
        if (index < exports.frames.length) {
            exports.jumpToFrame(index);
        }
    };

    /*
     * Moves to the next frame.
     */
    exports.moveToNext = function () {
        if (currentFrameIndex < exports.frames.length - 1 || exports.frames[currentFrameIndex].timeoutEnable) {
            exports.moveToFrame((currentFrameIndex + 1) % exports.frames.length);
        }
    };

    /*
     * Moves to the last frame of the presentation.
     */
    exports.moveToLast = function () {
        exports.moveToFrame(exports.frames.length - 1);
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
        if (display.tableOfContentsIsVisible()) {
            display.hideTableOfContents();
        }
        animator.start(DEFAULT_DURATION_MS, {
            initialState: display.getCurrentGeometry(),
            finalState: display.getDocumentGeometry(),
            profile: sozi.animation.profiles[DEFAULT_PROFILE]
        });
    };

    /*
     * Zooms the display in the given direction.
     *
     * Only the sign of direction is used:
     *    - zoom in when direction > 0
     *    - zoom out when direction < 0
     *
     * The scaling is centered around point (x, y).
     */
    exports.zoom = function (direction, x, y) {
        exports.stop();
        display.applyZoomFactor(direction > 0 ? SCALE_FACTOR : 1 / SCALE_FACTOR, x, y);
    };

    exports.toggleTableOfContents = function () {
        if (display.tableOfContentsIsVisible()) {
            display.hideTableOfContents();
            exports.restart();
        } else {
            exports.stop();
            display.showTableOfContents();
        }
    };

    window.addEventListener("load", onLoad, false);

    return exports;
}());
