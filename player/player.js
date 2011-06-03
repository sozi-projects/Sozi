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

/*jslint plusplus: false, indent: 4, browser: true */

var sozi = sozi || {};

sozi.player = function () {
    var exports = {},
        display,
        animator,
        profiles,
        DEFAULTS,
        SOZI_NS = "http://sozi.baierouge.fr",
        DRAG_BUTTON = 0, // Left button
        TOC_BUTTON = 1, // Middle button
        DEFAULT_DURATION_MS = 500,
        DEFAULT_ZOOM_PERCENT = -10,
        DEFAULT_PROFILE = "linear",
        SCALE_FACTOR = 1.05,
        sourceFrameIndex = 0,
        currentFrameIndex = 0,
        dragButtonIsDown,
        dragged,
        dragClientX,
        dragClientY,
        playing = false,
        waiting = false;

    exports.frames = [];

    profiles = {
        "linear": function (x) {
            return x;
        },

        "accelerate": function (x) {
            return Math.pow(x, 3);
        },

        "strong-accelerate": function (x) {
            return Math.pow(x, 5);
        },

        "decelerate": function (x) {
            return 1 - Math.pow(1 - x, 3);
        },

        "strong-decelerate": function (x) {
            return 1 - Math.pow(1 - x, 5);
        },

        "accelerate-decelerate": function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = Math.pow(2 * xs, 3) / 2;
            return x <= 0.5 ? y : 1 - y;
        },

        "strong-accelerate-decelerate": function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = Math.pow(2 * xs, 5) / 2;
            return x <= 0.5 ? y : 1 - y;
        },

        "decelerate-accelerate": function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = (1 - Math.pow(1 - 2 * xs, 2)) / 2;
            return x <= 0.5 ? y : 1 - y;
        },

        "strong-decelerate-accelerate": function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = (1 - Math.pow(1 - 2 * xs, 3)) / 2;
            return x <= 0.5 ? y : 1 - y;
        }
    };

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
     * Event handler: mouse down.
     *
     * When the left button is pressed, we register the current coordinates
     * in case the mouse will be dragged. Flag "dragButtonIsDown" is set until
     * the button is released (onMouseUp). This flag is used by onMouseMove.
     *
     * When the middle button is pressed, the table of contents is shown or hidden.
     */
    onMouseDown = function (evt) {
        if (evt.button === DRAG_BUTTON) {
            dragButtonIsDown = true;
            dragged = false;
            dragClientX = evt.clientX;
            dragClientY = evt.clientY;
        } else if (evt.button === TOC_BUTTON) {
            exports.toggleTableOfContents();
        }
        evt.stopPropagation();
    };

    /*
     * Event handler: mouse move.
     *
     * If the left mouse button is down, then the mouse move is a drag action.
     * This method computes the displacement since the button was pressed or
     * since the last move, and updates the reference coordinates for the next move.
     */
    onMouseMove = function (evt) {
        if (dragButtonIsDown) {
            exports.stop();
            dragged = true;
            display.drag(evt.clientX - dragClientX, evt.clientY - dragClientY);
            dragClientX = evt.clientX;
            dragClientY = evt.clientY;
        }
        evt.stopPropagation();
    };

    /*
     * Event handler: mouse up.
     *
     * Releasing the left button resets the "dragButtonIsDown" flag.
     */
    onMouseUp = function (evt) {
        if (evt.button === DRAG_BUTTON) {
            dragButtonIsDown = false;
        }
        evt.stopPropagation();
    };

    /*
     * Event handler: mouse click.
     *
     * Left-click moves the presentation to the next frame.
     *
     * No "click" event is generated for the middle button.
     * See "onMouseDown" for middle click handling.
     *
     * Dragging the mouse produces a "click" event when the button is released.
     * If flag "dragged" was set by "onMouseMove", then the click event is the result
     * of a drag action.
     */
    onClick = function (evt) {
        if (!dragged) {
            exports.moveToNext();
        }
        evt.stopPropagation();
    };

    /*
     * Event handler: mouse wheel.
     *
     * Rolling the mouse wheel stops the presentation and zooms the current display.
     */
    onWheel = function (evt) {
        var delta = 0;
        if (!evt) {
            evt = window.event;
        }
        if (evt.wheelDelta) { // IE and Opera
            delta = evt.wheelDelta; 
            if (window.opera) { // Opera
                delta = -delta;
            }
        } else if (evt.detail) { // Mozilla
            delta = -evt.detail;
        }

        if (delta !== 0) {
            exports.zoom(delta, evt.clientX, evt.clientY);
        }
        evt.stopPropagation();
        evt.preventDefault();
    };

    /*
     * Event handler: key press.
     *
     * Keyboard handling is split into two methods: onKeyPress and onKeyDown
     * in order to get the same behavior in Mozilla and Webkit.
     *
     * This method handles character keys "+", "-", "=", "F" and "T".
     */
    onKeyPress = function (evt) {
        switch (evt.charCode) {
        case 43: // +
            exports.zoom(1, window.innerWidth / 2, window.innerHeight / 2);
            break;
        case 45: // -
            exports.zoom(-1, window.innerWidth / 2, window.innerHeight / 2);
            break;
        case 61: // =
            exports.moveToCurrent();
            break;
        case 70: // F
        case 102: // f
            exports.showAll();
            break;
        case 84: // T
        case 116: // t
            exports.toggleTableOfContents();
            break;
        }
        evt.stopPropagation();
    };

    /*
     * Event handler: key down.
     *
     * Keyboard handling is split into two methods: onKeyPress and onKeyDown
     * in order to get the same behavior in Mozilla and Webkit.
     *
     * This method handles navigation keys (arrows, page up/down, home, end)
     * and the space and enter keys.
     */
    onKeyDown = function (evt) {
        switch (evt.keyCode) {
        case 36: // Home
            exports.moveToFirst();
            break;
        case 35: // End
            exports.moveToLast();
            break;
        case 38: // Arrow up
            exports.jumpToPrevious();
            break;
        case 33: // Page up
        case 37: // Arrow left
            exports.moveToPrevious();
            break;
        case 40: // Arrow down
            exports.jumpToNext();
            break;
        case 34: // Page down
        case 39: // Arrow right
        case 13: // Enter
        case 32: // Space
            exports.moveToNext();
            break;
        }
        evt.stopPropagation();
    };

    /*
     * Event handler: hash change.
     *
     * This method is called when the URL hash is changed.
     * If the hash was changed manually in the address bar, and if it corresponds to
     * a valid frame number, then the presentation moves to that frame.
     *
     * The hashchange event can be triggered externally, by the user modifying the URL,
     * or internally, by the script modifying window.location.hash.
     * We move to the given index only if the hash is different from the current frame index. 
     */
    onHashChange = function () {
        var index = getFrameIndexFromURL();
        if (index !== currentFrameIndex) {
            exports.moveToFrame(index);
        }
    };

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
    onAnimationStep = function (progress, data) {
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
    };

    /*
     * Event handler: animation done.
     *
     * This method is called by animator when the current animation is finished.
     *
     * If the animation was a transition in the normal course of the presentation,
     * then we call the waitTimeout method to process the timeout property of the current frame.
     */
    onAnimationDone = function () {
        sourceFrameIndex = currentFrameIndex;
        if (playing) {
            waitTimeout();
        }
    };

    /*
     * Event handler: document load.
     *
     * This method initializes the display object, reads the frames, and registers all other
     * event handlers for the current document.
     * The first frame, or the frame which number is given in the URL, is shown.
     */
    onLoad = function () {
        display = sozi.display;
        display.onLoad();

        animator = new sozi.Animator(40, onAnimationStep, onAnimationDone);

        readFrames();
        display.installTableOfContents();

        exports.startFromIndex(getFrameIndexFromURL());

        // TODO also use shift-click as an alternative for middle-click
        display.svgRoot.addEventListener("click", onClick, false);
        display.svgRoot.addEventListener("mousedown", onMouseDown, false);
        display.svgRoot.addEventListener("mouseup", onMouseUp, false);
        display.svgRoot.addEventListener("mousemove", onMouseMove, false);
        display.svgRoot.addEventListener("keypress", onKeyPress, false);
        display.svgRoot.addEventListener("keydown", onKeyDown, false);
        window.addEventListener("hashchange", onHashChange, false);
        window.addEventListener("resize", display.resize, false);

        display.svgRoot.addEventListener("DOMMouseScroll", onWheel, false); // Mozilla
        window.onmousewheel = onWheel;

        dragButtonIsDown = false;
    };

    /*
     * Returns the frame index given in the URL hash.
     *
     * In the URL, the frame index starts a 1.
     * This method converts it into a 0-based index.
     *
     * If the URL hash is not a positive integer, then 0 is returned.
     * It the URL hash is an integer greater than the last frame index, then
     * the last frame index is returned.
     */
    getFrameIndexFromURL = function () {
        var index = window.location.hash ? parseInt(window.location.hash.slice(1), 10) - 1 : 0;
        if (isNaN(index) || index < 0) {
            return 0;
        } else if (index >= exports.frames.length) {
            return exports.frames.length - 1;
        } else {
            return index;
        }
    };

    /*
     * Returns the value of an attribute of a given SVG element.
     *
     * If the attribute is not set, then a default value is returned.
     * See DEFAULTS.
     */
    readAttribute = function (elt, attr) {
        var value = elt.getAttributeNS(SOZI_NS, attr);
        return value === "" ? DEFAULTS[attr] : value;
    };

    /*
     * Builds the list of frames from the current document.
     *
     * This method collects all elements with tag "sozi:frame" and
     * retrieves their geometrical and animation attributes.
     * SVG elements that should be hidden during the presentation are hidden.
     *
     * The resulting list is available in frames, sorted by frame indices.
     */
    readFrames = function () {
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
                    transitionProfile: profiles[readAttribute(frameElements[i], "transition-profile") || "linear"]
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
    };

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
    waitTimeout = function () {
        var index;
        if (exports.frames[currentFrameIndex].timeoutEnable) {
            waiting = true;
            index = (currentFrameIndex + 1) % exports.frames.length;
            nextFrameTimeout = window.setTimeout(
                exports.moveToFrame.bind(this, index),
                exports.frames[currentFrameIndex].timeoutMs
            );
        }
    };

    getZoomData = function (zoomPercent, s0, s1) {
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
    };

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

        // Update URL hash with the current frame index
        window.location.hash = "#" + (index + 1);
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
            profile: profiles[DEFAULT_PROFILE],
            zoomWidth: zw,
            zoomHeight: zh
        });

        // Update URL hash with the current frame index
        window.location.hash = "#" + (index + 1);
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
            profile = profiles[DEFAULT_PROFILE],
            zw,
            zh;

        if (waiting) {
            window.clearTimeout(nextFrameTimeout);
            waiting = false;
        }

        if (index === (exports.currentFrameIndex + 1) % exports.frames.length) {
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

        // Update URL hash with the current frame index
        window.location.hash = "#" + (index + 1);
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
        exports.moveToFrame(exports.currentFrameIndex);
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
            profile: profiles[DEFAULT_PROFILE]
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
}();
