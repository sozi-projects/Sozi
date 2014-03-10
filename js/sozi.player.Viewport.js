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

    exports.Viewport = sozi.model.Object.create({

        /*
         * Initialize a new viewport for the given SVG root element.
         *
         * Parameters:
         *    - svgRoot: The SVG root element
         *
         * Returns:
         *    - The current viewport.
         */
        init: function (pres) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;

            // Create a camera for each layer
            this.cameras = this.presentation.layers.map(function (layer) {
                return exports.Camera.create().init(this, layer);
            }, this);

            // Setup mouse and keyboard event handlers
            this.dragHandler = this.bind(this.onDrag);
            this.dragEndHandler = this.bind(this.onDragEnd);

            this.svgRoot.addEventListener("mousedown", this.bind(this.onMouseDown), false);
            this.svgRoot.addEventListener("DOMMouseScroll", this.bind(this.onWheel), false); // Mozilla
            this.svgRoot.addEventListener("mousewheel", this.bind(this.onWheel), false); // IE, Opera, Webkit
            this.svgRoot.addEventListener("keypress", this.bind(this.onKeyPress), false);

            this.resize();

            return this;
        },

        get svgRoot() {
            return this.presentation.svgRoot;
        },

        getLayer: function (nodeId) {
            return this.layers.filter(function (layer) {
                return layer.nodeId === nodeId;
            })[0];
        },

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
        onMouseDown: function (evt) {
            if (evt.button === DRAG_BUTTON) {
                evt.stopPropagation();
                evt.preventDefault();

                this.mouseDragged = false;
                this.mouseLastX = evt.clientX;
                this.mouseLastY = evt.clientY;

                document.documentElement.addEventListener("mousemove", this.dragHandler, false);
                document.documentElement.addEventListener("mouseup", this.dragEndHandler, false);
            }

            this.fire("mouseDown", evt.button);
        },

        /*
         * Event handler: mouse move after mouse down.
         *
         * Parameters:
         *    - evt: The DOM event object
         *
         * Fires:
         *    - dragStart
         */
        onDrag: function (evt) {
            evt.stopPropagation();

            // The drag action is confirmed when one of the mouse coordinates
            // has moved past the threshold
            if (!this.mouseDragged && (Math.abs(evt.clientX - this.mouseLastX) > DRAG_THRESHOLD_PX ||
                                       Math.abs(evt.clientY - this.mouseLastY) > DRAG_THRESHOLD_PX)) {
                this.mouseDragged = true;
                this.fire("dragStart");
            }

            if (this.mouseDragged) {
                this.drag(evt.clientX - this.mouseLastX, evt.clientY - this.mouseLastY);
                this.mouseLastX = evt.clientX;
                this.mouseLastY = evt.clientY;
            }
        },

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
         *    - click(button)
         */
        onDragEnd: function (evt) {
            if (evt.button === DRAG_BUTTON) {
                evt.stopPropagation();
                evt.preventDefault();

                if (this.mouseDragged) {
                    this.fire("dragEnd");
                }
                else {
                    this.fire("click", evt.button);
                }

                document.documentElement.removeEventListener("mousemove", this.dragHandler, false);
                document.documentElement.removeEventListener("mouseup", this.dragEndHandler, false);
            }
            else {
                this.fire("click", evt.button);
            }
        },

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
        onWheel: function (evt) {
            evt.stopPropagation();
            evt.preventDefault();

            var delta = 0;
            if (evt.wheelDelta) { // IE and Opera
                delta = evt.wheelDelta;
            }
            else if (evt.detail) { // Mozilla
                delta = -evt.detail;
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
                    this.zoom(SCALE_FACTOR, this.width / 2, this.height / 2);
                    break;
                case 45: // -
                    this.zoom(1 / SCALE_FACTOR, this.width / 2, this.height / 2);
                    break;
                case 82: // R
                    this.rotate(-ROTATE_STEP);
                    break;
                case 114: // r
                    this.rotate(ROTATE_STEP);
                    break;
                default:
                    return;
            }

            evt.stopPropagation();
            evt.preventDefault();
        },

        /*
         * Get the X coordinate of the current viewport in the current browser window.
         *
         * If the SVG is a standalone document, the returned value is 0.
         *
         * Returns:
         *    - The X coordinate of the current viewport.
         */
        get x() {
            return this.svgRoot === document.documentElement ?
                0 :
                this.svgRoot.getBoundingClientRect().left;
        },

        /*
         * Get the Y coordinate of the current viewport in the current browser window.
         *
         * If the SVG is a standalone document, the returned value is 0.
         *
         * Returns:
         *    - The Y coordinate of the current viewport.
         */
        get y() {
            return this.svgRoot === document.documentElement ?
                0 :
                this.svgRoot.getBoundingClientRect().top;
        },

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
        get width() {
            return this.svgRoot === document.documentElement ?
                window.innerWidth :
                this.svgRoot.parentNode.clientWidth;
        },

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
        get height() {
            return this.svgRoot === document.documentElement ?
                window.innerHeight :
                this.svgRoot.parentNode.clientHeight;
        },

        /*
         * Fit the size of the SVG document to its container.
         *
         * Returns:
         *    - The current viewport.
         */
        resize: function () {
            this.svgRoot.setAttribute("width", this.width);
            this.svgRoot.setAttribute("height", this.height);

            this.cameras.forEach(function (camera) {
                camera.update();
            });

            return this;
        },

        /*
         * Returns the default camera states to show the whole document.
         *
         * Returns:
         *    - An dictionary of camera states that fit the whole document.
         */
        get defaultStates() {
            // This object defines the bounding box of the whole document
            var state = exports.CameraState.create().init(this);

            // Copy the document's bounding box to all layers
            return this.cameras.map(function (camera) {
                return state;
            });
        },

        /*
         * Set the states of the cameras of the current viewport.
         *
         * Parameters:
         *    - states: An array of camera states
         */
        set cameraStates(states) {
            this.cameras.forEach(function (camera, index) {
                camera.setAtState(states[index]);
            });
        },

        /*
         * Get the states of the cameras of the current viewport.
         *
         * Returns:
         *    - An array of camera states
         */
        get cameraStates () {
            return this.cameras.map(function (camera) {
                return camera.clone();
            });
        },

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
         *    - stateChanged
         *
         * Returns:
         *    - The current viewport.
         */
        drag: function (deltaX, deltaY) {
            this.cameras.forEach(function (camera) {
                if (camera.selected) {
                    camera.drag(deltaX, deltaY);
                }
            });
            this.fire("stateChanged");
            return this;
        },

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
         *    - stateChanged
         *
         * Returns:
         *    - The current viewport.
         */
        zoom: function (factor, x, y) {
            this.cameras.forEach(function (camera) {
                if (camera.selected) {
                    camera.zoom(factor, x, y);
                }
            });
            this.fire("stateChanged");
            return this;
        },

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
         *    - stateChanged
         */
        rotate: function (angle) {
            this.cameras.forEach(function (camera) {
                if (camera.selected) {
                    camera.rotate(angle);
                }
            });
            this.fire("stateChanged");
            return this;
        }
    });
});
