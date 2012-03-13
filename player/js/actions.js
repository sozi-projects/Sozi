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
 */

var sozi = sozi || {};

(function () {
    var player = sozi.player = sozi.player || {},
        display = sozi.display = sozi.display || {},
        window = this,
        document = window.document,
        DRAG_BUTTON = 0, // Left button
        TOC_BUTTON = 1, // Middle button
        SCALE_FACTOR = 1.05,
        ROTATE_STEP = 5,
        dragButtonIsDown = false,
        dragged = false,
        dragClientX = 0,
        dragClientY = 0;
    
    /*
     * Zooms the display in the given direction.
     *
     * Only the sign of direction is used:
     *    - zoom in when direction > 0
     *    - zoom out when direction <= 0
     *
     * The scaling is centered around point (x, y).
     */
    function zoom(direction, x, y) {
        player.stop();
        display.zoom(direction > 0 ? SCALE_FACTOR : 1 / SCALE_FACTOR, x, y);
    }
    
    /*
     * Rotate the display in the given direction.
     *
     * Only the sign of direction is used:
     *    - rotate anticlockwise when direction > 0
     *    - rotate clockwise when direction <= 0
     */
    function rotate(direction) {
        player.stop();
        display.rotate(direction > 0 ? ROTATE_STEP : -ROTATE_STEP);
    }
    
    /*
     * Show/hide the frame list.
     *
     * The presentation stops when the frame list is showed,
     * and restarts when the frame list is hidden.
     */
    function toggleFrameList() {
        if (sozi.framelist.isVisible()) {
            sozi.framelist.hide();
            player.restart();
        } else {
            player.stop();
            sozi.framelist.show();
        }
    }

    /*
     * Event handler: mouse down.
     *
     * When the left button is pressed, we register the current coordinates
     * in case the mouse will be dragged. Flag "dragButtonIsDown" is set until
     * the button is released (onMouseUp). This flag is used by onMouseMove.
     *
     * When the middle button is pressed, the table of contents is shown or hidden.
     */
    function onMouseDown(evt) {
        if (evt.button === DRAG_BUTTON) {
            dragButtonIsDown = true;
            dragged = false;
            dragClientX = evt.clientX;
            dragClientY = evt.clientY;
        } else if (evt.button === TOC_BUTTON) {
            toggleFrameList();
        }
        evt.stopPropagation();
    }

    /*
     * Event handler: mouse move.
     *
     * If the left mouse button is down, then the mouse move is a drag action.
     * This method computes the displacement since the button was pressed or
     * since the last move, and updates the reference coordinates for the next move.
     */
    function onMouseMove(evt) {
        if (dragButtonIsDown) {
            player.stop();
            dragged = true;
            sozi.events.fire("cleanup");
            display.drag(evt.clientX - dragClientX, evt.clientY - dragClientY);
            dragClientX = evt.clientX;
            dragClientY = evt.clientY;
        }
        evt.stopPropagation();
    }

    /*
     * Event handler: mouse up.
     *
     * Releasing the left button resets the "dragButtonIsDown" flag.
     */
    function onMouseUp(evt) {
        if (evt.button === DRAG_BUTTON) {
            dragButtonIsDown = false;
        }
        evt.stopPropagation();
    }

    /*
     * Event handler: context menu (i.e. right click).
     *
     * Right click goes one frame back.
     *
     * There is no "click" for the right mouse button and the menu can't
     * be prevented in "onMouseDown".
     */
    function onContextMenu(evt) {
        player.moveToPrevious();
        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: mouse click.
     *
     * Left-click moves the presentation to the next frame.
     *
     * No "click" event is generated for the middle button in Firefox.
     * See "onMouseDown" for middle click handling.
     *
     * Dragging the mouse produces a "click" event when the button is released.
     * If flag "dragged" was set by "onMouseMove", then the click event is the result
     * of a drag action.
     */
    function onClick(evt) {
        if (!dragged && evt.button !== TOC_BUTTON) {
            player.moveToNext();
        }
        evt.stopPropagation();
    }

    /*
     * Event handler: mouse wheel.
     *
     * Rolling the mouse wheel stops the presentation and zooms the current display.
     */
    function onWheel(evt) {
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
            if (evt.shiftKey) {
                rotate(delta);
            } else {
                zoom(delta, evt.clientX, evt.clientY);
            }
        }
        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: key press.
     *
     * Keyboard handling is split into two methods: onKeyPress and onKeyDown
     * in order to get the same behavior in Mozilla and Webkit.
     *
     * This method handles character keys "+", "-", "=", "F" and "T".
     */
    function onKeyPress(evt) {
        // Keys with modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.charCode) {
        case 43: // +
            zoom(1, window.innerWidth / 2, window.innerHeight / 2);
            break;
        case 45: // -
            zoom(-1, window.innerWidth / 2, window.innerHeight / 2);
            break;
        case 61: // =
            player.moveToCurrent();
            break;
        case 70: // F
        case 102: // f
            player.showAll();
            break;
        case 84: // T
        case 116: // t
            toggleFrameList();
            break;
        case 82: // R
            rotate(-1);
            break;
        case 114: // r
            rotate(1);
            break;
        }

        evt.stopPropagation();
    }

    /*
     * Event handler: key down.
     *
     * Keyboard handling is split into two methods: onKeyPress and onKeyDown
     * in order to get the same behavior in Mozilla and Webkit.
     *
     * This method handles navigation keys (arrows, page up/down, home, end)
     * and the space and enter keys.
     */
    function onKeyDown(evt) {
        // Keys with modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.keyCode) {
        case 36: // Home
            player.moveToFirst();
            break;
        case 35: // End
            player.moveToLast();
            break;
        case 38: // Arrow up
            player.jumpToPrevious();
            break;
        case 33: // Page up
        case 37: // Arrow left
            player.moveToPrevious();
            break;
        case 40: // Arrow down
            player.jumpToNext();
            break;
        case 34: // Page down
        case 39: // Arrow right
        case 13: // Enter
        case 32: // Space
            player.moveToNext();
            break;
        }
        evt.stopPropagation();
    }

    function onLoad() {
        var svgRoot = document.documentElement;

        // TODO also use shift-click as an alternative for middle-click
        svgRoot.addEventListener("click", onClick, false);
        svgRoot.addEventListener("mousedown", onMouseDown, false);
        svgRoot.addEventListener("mouseup", onMouseUp, false);
        svgRoot.addEventListener("mousemove", onMouseMove, false);
        svgRoot.addEventListener("keypress", onKeyPress, false);
        svgRoot.addEventListener("keydown", onKeyDown, false);
        svgRoot.addEventListener("contextmenu", onContextMenu, false);
        svgRoot.addEventListener("DOMMouseScroll", onWheel, false); // Mozilla
        window.onmousewheel = onWheel;
    }

    window.addEventListener("load", onLoad, false);
}());
