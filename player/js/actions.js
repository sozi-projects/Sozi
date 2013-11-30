/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2013 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

/**
 * @name sozi.actions
 * @namespace Callback functions for DOM event handlers
 * @depend namespace.js
 */
namespace(this, "sozi.actions", function (exports, window) {
    /** @lends sozi.actions */
    
    "use strict";
    
    // Module aliases
    var player = namespace(window, "sozi.player");
    var display = namespace(window, "sozi.display");
    
    // The global document object
    var document = window.document;
    
    // Constants: mouse button numbers
    var DRAG_BUTTON = 0;    // Left button
    var TOC_BUTTON = 1;     // Middle button
    
    // Constants: increments for zooming and rotating,
    // threshold for dragging
    var SCALE_FACTOR = 1.05;
    var ROTATE_STEP = 5;
    var DRAG_THRESHOLD_PX = 5;
    
    /**
     * The status of the current drag operation.
     *
     * @type Boolean
     */
    var mouseDragged = false;
    
    /**
     * The X coordinate of the mouse on the latest "down" or "drag" event.
     *
     * @type Number
     */
    var mouseLastX = 0;

    /**
     * The Y coordinate of the mouse on the latest "down" or "drag" event.
     *
     * @type Number
     */
    var mouseLastY = 0;
    
    /**
     * Zooms the display in the given direction.
     *
     * <p>Only the sign of <code>direction</code> is used:</p>
     * <ul>
     *  <li>zoom in when <code>direction > 0</code></li>
     *  <li>zoom out when <code>direction <= 0</code></li>
     * </ul>
     *
     * <p>The scaling is centered around point (<code>x</code>, <code>y</code>).</p>
     *
     * @param {Number} direction The direction of the scaling operation
     * @param {Number} x The X coordinate of the scaling center
     * @param {Number} y The Y coordinate of the scaling center
     */
    function zoom(direction, x, y) {
        player.stop();
        display.viewPorts["player"].zoom(direction > 0 ? SCALE_FACTOR : 1 / SCALE_FACTOR, x, y);
    }
    
    /**
     * Rotate the display in the given direction.
     *
     * <p>Only the sign of <code>direction</code> is used:</p>
     * <ul>
     *  <li>rotate anticlockwise when direction > 0</li>
     *  <li>rotate clockwise when direction <= 0</li>
     * </ul>
     *
     * @param {Number} direction The direction of the rotation
     */
    function rotate(direction) {
        player.stop();
        display.viewPorts["player"].rotate(direction > 0 ? ROTATE_STEP : -ROTATE_STEP);
    }
    
    /**
     * Show/hide the frame list.
     *
     * <p>The presentation stops when the frame list is showed,
     * and restarts when the frame list is hidden.</p>
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

    function isPlayerEvent(evt) {
        return display.viewPorts["player"].contains(evt.clientX, evt.clientY);
    }
    
    /**
     * Event handler: mouse down.
     *
     * <p>When the left button is pressed, we register the current coordinates
     * in case the mouse will be dragged. Handler {@link sozi.actions-onMouseDrag} is set until
     * the button is released ({@link sozi.actions-onMouseUp}).</p>
     *
     * <p>When the middle button is pressed, the table of contents is shown or hidden.</p>
     *
     * @param {Event} evt The DOM event object
     */
    function onMouseDown(evt) {
        if (!isPlayerEvent(evt)) {
            return;
        }
        if (evt.button === DRAG_BUTTON) {
            document.documentElement.addEventListener("mousemove", onMouseDrag, false);
            mouseDragged = false;
            mouseLastX = evt.clientX;
            mouseLastY = evt.clientY;
        } else if (evt.button === TOC_BUTTON) {
            toggleFrameList();
        }
        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     * Event handler: mouse move.
     *
     * <p>If the left mouse button is down, then the mouse move is a drag action.
     * This method computes the displacement since the button was pressed or
     * since the last move, and updates the reference coordinates for the next move.</p>
     *
     * @param {Event} evt The DOM event object
     */
    function onMouseDrag(evt) {
        if (!isPlayerEvent(evt)) {
            return;
        }
        player.stop();
        
        // The drag action is confirmed when one of the mouse coordinates
        // has moved past the threshold
        if (!mouseDragged && (Math.abs(evt.clientX - mouseLastX) > DRAG_THRESHOLD_PX ||
                              Math.abs(evt.clientY - mouseLastY) > DRAG_THRESHOLD_PX)) {
            mouseDragged = true;
        }
        
        if (mouseDragged) {
            sozi.events.fire("sozi.player.cleanup");
            display.viewPorts["player"].drag(evt.clientX - mouseLastX, evt.clientY - mouseLastY);
            mouseLastX = evt.clientX;
            mouseLastY = evt.clientY;
        }
        
        evt.stopPropagation();
    }

    /**
     * Event handler: mouse up.
     *
     * <p>Releasing the left button removes the {@link sozi.actions-onMouseDrag} handler.</p>
     *
     * @param {Event} evt The DOM event object
     */
    function onMouseUp(evt) {
        if (!isPlayerEvent(evt)) {
            return;
        }
        if (evt.button === DRAG_BUTTON) {
            document.documentElement.removeEventListener("mousemove", onMouseDrag, false);
        }
        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     * Event handler: context menu (i.e right click).
     *
     * <p>Right click goes one frame back.</p>
     *
     * <p>There is no "click" event for the right mouse button and the menu
     * can't be disabled in {@link sozi.actions-onMouseDown}.</p>
     *
     * @param {Event} evt The DOM event object
     */
    function onContextMenu(evt) {
        if (!isPlayerEvent(evt)) {
            return;
        }
        player.moveToPrevious();
        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     * Event handler: mouse click.
     *
     * <p>Left-click moves the presentation to the next frame.</p>
     *
     * <p>No "click" event is generated for the middle button in Firefox.
     * See {@link sozi.actions-onMouseDown} for middle click handling.</p>
     *
     * <p>Dragging the mouse produces a "click" event when the button is released.
     * If flag {@link sozi.actions-mouseDragged} was set by {@link sozi.actions-onMouseDrag},
     * then the click event is the result of a drag action.</p>
     *
     * @param {Event} evt The DOM event object
     */
    function onClick(evt) {
        if (!isPlayerEvent(evt)) {
            return;
        }
        if (!mouseDragged && evt.button !== TOC_BUTTON) {
            player.moveToNext();
        }
        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     * Event handler: mouse wheel.
     *
     * <p>Rolling the mouse wheel stops the presentation and zooms the current display.</p>
     *
     * FIXME shift key does not work in Opera
     *
     * @param {Event} evt The DOM event object
     */
    function onWheel(evt) {
        if (!isPlayerEvent(evt)) {
            return;
        }
        
        if (!evt) {
            evt = window.event;
        }

        var delta = 0;
        if (evt.wheelDelta) { // IE and Opera
            delta = evt.wheelDelta;
        }
        else if (evt.detail) { // Mozilla
            delta = -evt.detail;
        }
        
        if (delta !== 0) {
            if (evt.shiftKey) {
                rotate(delta);
            }
            else {
                zoom(delta, evt.clientX, evt.clientY);
            }
        }
        
        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     * Event handler: key press.
     *
     * <p>Keyboard handling is split into two methods:
     * {@link sozi.actions-onKeyPress} and {@link sozi.actions-onKeyDown}
     * in order to get the same behavior across browsers.</p>
     *
     * <p>This method handles character keys "+", "-", "=", "F" and "T".</p>
     *
     * @param {Event} evt The DOM event object
     */
    function onKeyPress(evt) {
        // Keys with modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.charCode || evt.which) {
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
        default:
            return;
        }

        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     * Event handler: key down.
     *
     * <p>Keyboard handling is split into two methods:
     * {@link sozi.actions-onKeyPress} and {@link sozi.actions-onKeyDown}
     * in order to get the same behavior across browsers.</p>
     *
     * <p>This method handles navigation keys (arrows, page up/down, home, end)
     * and the space and enter keys.</p>
     *
     * @param {Event} evt The DOM event object
     */
    function onKeyDown(evt) {
        // Keys with Alt/Ctrl/Meta modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.keyCode) {
            case 36: // Home
                if (evt.shiftKey) {
                    player.jumpToFirst();
                }
                else {
                    player.moveToFirst();
                }
                break;
            case 35: // End
                if (evt.shiftKey) {
                    player.jumpToLast();
                }
                else {
                    player.moveToLast();
                }
                break;
            case 38: // Arrow up
            case 33: // Page up
            case 37: // Arrow left
                if (evt.shiftKey) {
                    player.jumpToPrevious();
                }
                else {
                    player.moveToPrevious();
                }
                break;
            case 40: // Arrow down
            case 34: // Page down
            case 39: // Arrow right
            case 13: // Enter
            case 32: // Space
                if (evt.shiftKey) {
                    player.jumpToNext();
                }
                else {
                    player.moveToNext();
                }
                break;
            default:
                // Ignore other keys and propagate the event
                return;
        }
        
        // Stop event propagation for supported keys
        evt.stopPropagation();
        
        // In some versions of Chrome/Chromium, preventDefault() inhibits the "keypress" event
        evt.preventDefault();
    }

    /**
     * Dummy event handler: stop event propagation.
     *
     * @param {Event} evt The DOM event object
     */
    function stopEvent(evt) {
        evt.stopPropagation();
    }

    /**
     * Event handler: document load.
     *
     * <p>This function sets up all other event handlers for the player.</p>
     */
    function onDisplayReady() {
        // Prevent event propagation when clicking on a link
        // FIXME does not work in Firefox when the <a> is referenced through a <use>
        var links = document.getElementsByTagName("a");
        for (var i = 0; i < links.length; i += 1) {
            links[i].addEventListener("click", stopEvent, false);
            links[i].addEventListener("contextmenu", stopEvent, false);
        }
        
        // Mouse events are constrained to the player viewport
        // see isPlayerEvent()
        // TODO also use shift-click as an alternative for middle-click
        var svgRoot = document.documentElement;
        svgRoot.addEventListener("click", onClick, false);
        svgRoot.addEventListener("mousedown", onMouseDown, false);
        svgRoot.addEventListener("mouseup", onMouseUp, false);
        svgRoot.addEventListener("contextmenu", onContextMenu, false);
        svgRoot.addEventListener("DOMMouseScroll", onWheel, false); // Mozilla
        window.onmousewheel = onWheel;

        // Keyboard events are global to the SVG document
        svgRoot.addEventListener("keypress", onKeyPress, false);
        svgRoot.addEventListener("keydown", onKeyDown, false);
    }

    sozi.events.listen("sozi.display.ready", onDisplayReady); // @depend events.js
});
