/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.player", function (exports) {
    "use strict";

    // Use left mouse button to drag
    var DRAG_BUTTON = 0;

    // Minimum distance to detect a drag action
    var DRAG_THRESHOLD_PX = 5;

    // Zoom factor for user zoom action (keyboard and mouse wheel)
    var SCALE_FACTOR = 1.05;

    // Rotation step for user rotate action (keyboard and mouse wheel)
    var ROTATE_STEP = 5;

    var Viewport = Object.create(EventEmitter.prototype);

    /*
     * Initialize a new viewport for the given SVG root element.
     *
     * Parameters:
     *    - svgRoot: The SVG root element
     *
     * Returns:
     *    - The current viewport.
     */
    Viewport.init = function (presentation) {
        this.presentation = presentation;
        this.cameras = [];
        this.mouseDragX = 0;
        this.mouseDragY = 0;
        this.dragMode = "translate";

        // Setup mouse and keyboard event handlers.
        this.dragHandler = this.onDrag.bind(this);
        this.dragEndHandler = this.onDragEnd.bind(this);

        return this;
    };

    Viewport.makeUniqueId = function (prefix) {
        var suffix = Math.floor(1000 * (1 + 9 * Math.random()));
        var id;
        do {
            id = prefix + suffix;
            suffix ++;
        } while(this.svgRoot.getElementById(id));
        return id;
    };

    Viewport.onLoad = function () {
        this.svgRoot.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        this.svgRoot.addEventListener("contextmenu", this.onContextMenu.bind(this), false);

        var wheelEvent =
            "onwheel" in document.createElement("div") ? "wheel" :  // Modern browsers support "wheel"
            document.onmousewheel !== undefined ? "mousewheel" :    // Webkit and IE support at least "mousewheel"
            "DOMMouseScroll";                                       // Firefox < 17
        this.svgRoot.addEventListener(wheelEvent, this.onWheel.bind(this), false);

        this.cameras = this.presentation.layers.map(function (layer) {
            return Object.create(sozi.player.Camera).init(this, layer);
        }, this);
    };

    Object.defineProperty(Viewport, "svgRoot", {
        get: function () {
            return this.presentation.svgRoot;
        }
    });

    Viewport.getLayer = function (nodeId) {
        return this.layers.filter(function (layer) {
            return layer.nodeId === nodeId;
        })[0];
    };

    Viewport.onContextMenu = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        this.emitEvent("click", [2, evt]);
    };

    /*
     * Event handler: mouse down.
     *
     * If the mouse button pressed is the left button,
     * this method will setup event listeners for detecting a drag action.
     *
     * Parameters:
     *    - evt: The DOM event object
     *
     * Fires:
     *    - mouseDown(button)
     */
    Viewport.onMouseDown = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if (evt.button === DRAG_BUTTON) {

            this.mouseDragged = false;
            this.mouseDragX = this.mouseDragStartX = evt.clientX;
            this.mouseDragY = this.mouseDragStartY = evt.clientY;

            document.documentElement.addEventListener("mousemove", this.dragHandler, false);
            document.documentElement.addEventListener("mouseup", this.dragEndHandler, false);
        }

        this.emitEvent("mouseDown", [evt.button]);
    };

    /*
     * Event handler: mouse move after mouse down.
     *
     * Parameters:
     *    - evt: The DOM event object
     *
     * Fires:
     *    - dragStart
     */
    Viewport.onDrag = function (evt) {
        evt.stopPropagation();

        var xFromCenter = evt.clientX - this.x - this.width / 2;
        var yFromCenter = evt.clientY - this.y - this.height / 2;
        var angle = 180 * Math.atan2(yFromCenter, xFromCenter) / Math.PI;
        var translateX = evt.clientX;
        var translateY = evt.clientY;
        var zoom = Math.sqrt(xFromCenter * xFromCenter + yFromCenter * yFromCenter);

        // The drag action is confirmed when one of the mouse coordinates
        // has moved past the threshold
        if (!this.mouseDragged && (Math.abs(evt.clientX - this.mouseDragX) > DRAG_THRESHOLD_PX ||
                                   Math.abs(evt.clientY - this.mouseDragY) > DRAG_THRESHOLD_PX)) {
            this.mouseDragged = true;

            this.rotateStart = this.rotatePrev = angle;
            this.translateStartX = this.translateXPrev = translateX;
            this.translateStartY = this.translateYPrev = translateY;
            this.zoomPrev = zoom;

            this.emitEvent("dragStart");
        }

        if (this.mouseDragged) {
            var mode = this.dragMode;
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
                    if (this.zoomPrev !== 0) {
                        this.zoom(zoom / this.zoomPrev, this.width / 2, this.height / 2);
                    }
                    this.zoomPrev = zoom;
                    break;
                case "rotate":
                    if (evt.ctrlKey) {
                        angle = 10 * Math.round((angle - this.rotateStart) / 10) + this.rotateStart;
                    }
                    this.rotate(this.rotatePrev - angle);
                    this.rotatePrev = angle;
                    break;
                case "clip":
                    this.clip(this.mouseDragStartX - this.x, this.mouseDragStartY - this.y,
                              this.mouseDragX      - this.x, this.mouseDragY      - this.y);
                    break;
                default: // case "translate":
                    if (evt.ctrlKey) {
                        if (Math.abs(translateX - this.translateStartX) >= Math.abs(translateY - this.translateStartY)) {
                            translateY = this.translateStartY;
                        }
                        else {
                            translateX = this.translateStartX;
                        }
                    }
                    this.translate(translateX - this.translateXPrev, translateY - this.translateYPrev);
                    this.translateXPrev = translateX;
                    this.translateYPrev = translateY;
            }
            this.mouseDragX = evt.clientX;
            this.mouseDragY = evt.clientY;
        }
    };

    /*
     * Event handler: mouse up after mouse down.
     *
     * If the mouse has been moved past the drag threshold, this method
     * will fire a "dragEnd" event. Otherwise, it will fire a "click" event.
     *
     * Parameters:
     *    - evt: The DOM event object
     *
     * Fires:
     *    - dragEnd
     *    - click(button, event)
     */
    Viewport.onDragEnd = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if (evt.button === DRAG_BUTTON) {
            if (this.mouseDragged) {
                this.emitEvent("dragEnd");
                this.emitEvent("userChangeState");
            }
            else {
                this.emitEvent("click", [evt.button, evt]);
            }

            document.documentElement.removeEventListener("mousemove", this.dragHandler, false);
            document.documentElement.removeEventListener("mouseup", this.dragEndHandler, false);
        }
        else {
            this.emitEvent("click", [evt.button, evt]);
        }
    };

    /*
     * Event handler: mouse wheel.
     *
     * The effect of the mouse wheel depends on the state of the Shift key:
     *    - released: zoom in and out,
     *    - pressed: rotate clockwise or counter-clockwise
     *
     * Parameters:
     *    - evt: The DOM event object
     *
     * Fires:
     *    - zoom
     *    - rotate
     */
    Viewport.onWheel = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var delta = 0;
        if (evt.wheelDelta) {   // "mousewheel" event
            delta = evt.wheelDelta;
        }
        else if (evt.detail) {  // "DOMMouseScroll" event
            delta = -evt.detail;
        }
        else {                  // "wheel" event
            delta = -evt.deltaY;
        }

        if (delta !== 0) {
            if (evt.shiftKey) {
                // TODO rotate around mouse cursor
                this.rotate(delta > 0 ? ROTATE_STEP : -ROTATE_STEP);
            }
            else {
                this.zoom(delta > 0 ? SCALE_FACTOR : 1/SCALE_FACTOR, evt.clientX - this.x, evt.clientY - this.y);
            }
        }
    };

    /*
     * Get the X coordinate of the current viewport in the current browser window.
     *
     * If the SVG is a standalone document, the returned value is 0.
     *
     * Returns:
     *    - The X coordinate of the current viewport.
     */
    Object.defineProperty(Viewport, "x", {
        get: function () {
            return this.svgRoot.getScreenCTM().e;
        }
    });

    /*
     * Get the Y coordinate of the current viewport in the current browser window.
     *
     * If the SVG is a standalone document, the returned value is 0.
     *
     * Returns:
     *    - The Y coordinate of the current viewport.
     */
    Object.defineProperty(Viewport, "y", {
        get: function () {
            return this.svgRoot.getScreenCTM().f;
        }
    });

    /*
     * Get the width of the current viewport.
     *
     * If the SVG is inlined in an HTML document, the returned width
     * includes the padding width of the container.
     *
     * If the SVG is a standalone document, the returned width is the
     * window's inner width.
     *
     * Returns:
     *    - The width of the current viewport.
     */
    Object.defineProperty(Viewport, "width", {
        get: function () {
            return this.svgRoot === document.documentElement ?
                window.innerWidth :
                this.svgRoot.parentNode.clientWidth;
        }
    });

    /*
     * Get the height of the current viewport.
     *
     * If the SVG is inlined in an HTML document, the returned height
     * includes the padding height of the container.
     *
     * If the SVG is a standalone document, the returned height is the
     * window's inner height.
     *
     * Returns:
     *    - The height of the current viewport.
     */
    Object.defineProperty(Viewport, "height", {
        get: function () {
            return this.svgRoot === document.documentElement ?
                window.innerHeight :
                this.svgRoot.parentNode.clientHeight;
        }
    });

    Viewport.repaint = function () {
        this.svgRoot.setAttribute("width", this.width);
        this.svgRoot.setAttribute("height", this.height);

        this.cameras.forEach(function (camera) {
            camera.update();
        });

        this.presentation.elementsToHide.forEach(function (id) {
            var elt = document.getElementById(id);
            if (elt) {
                elt.style.visibility = "hidden";
            }
        });
    };

    /*
     * Set the states of the cameras of the current viewport.
     *
     * Parameters:
     *    - states: An array of camera states
     */
    Viewport.setAtStates = function (states) {
        states.forEach(function (state, index) {
            this.cameras[index].initFrom(state);
        }, this);
    };

    /*
     * Apply an additional translation to the SVG document based on onscreen coordinates.
     *
     * This method delegates to the cameras of the currently selected layers.
     *
     * Parameters:
     *    - deltaX: The horizontal displacement, in pixels
     *    - deltaY: The vertical displacement, in pixels
     *
     * Fires:
     *    - userChangeState
     *
     * Returns:
     *    - The current viewport.
     */
    Viewport.translate = function (deltaX, deltaY) {
        this.cameras.forEach(function (camera) {
            if (camera.selected) {
                camera.translate(deltaX, deltaY);
            }
        });
        this.emitEvent("userChangeState");
        return this;
    };

    /*
     * Zooms the display with the given factor.
     *
     * The zoom is centered around (x, y) with respect to the center of the display area.
     *
     * This method delegates to the cameras of the currently selected layers.
     *
     * Parameters:
     *    - factor: The zoom factor (relative to the current state of the viewport).
     *    - x, y: The coordinates of the center of the zoom operation.
     *
     * Fires:
     *    - userChangeState
     *
     * Returns:
     *    - The current viewport.
     */
    Viewport.zoom = function (factor, x, y) {
        this.cameras.forEach(function (camera) {
            if (camera.selected) {
                camera.zoom(factor, x, y);
            }
        });
        this.emitEvent("userChangeState");
        return this;
    };

    /*
     * Rotate the display with the given angle.
     *
     * The rotation is centered around the center of the display area.
     *
     * This method delegates to the cameras of the currently selected layers.
     *
     * Parameters:
     *    - angle: The rotation angle, in degrees.
     *
     * Returns:
     *    - The current viewport.
     *
     * Fires:
     *    - userChangeState
     */
    Viewport.rotate = function (angle) {
        this.cameras.forEach(function (camera) {
            if (camera.selected) {
                camera.rotate(angle);
            }
        });
        this.emitEvent("userChangeState");
        return this;
    };

    Viewport.clip = function (x0, y0, x1, y1) {
        this.cameras.forEach(function (camera) {
            if (camera.selected) {
                camera.clip(x0, y0, x1, y1);
            }
        });
        this.emitEvent("userChangeState");
        return this;
    };

    exports.Viewport = Viewport;
});
