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

namespace("sozi.display", function (exports) {
    "use strict";
    
    // Use left mouse button to drag
    var DRAG_BUTTON = 0;
    
    // Minimum distance to detect a drag action
    var DRAG_THRESHOLD_PX = 5;
    
    exports.ViewPort = sozi.model.Object.create({
        
        /*
         * Initialize a new viewport for the given SVG root element.
         *
         * Parameters:
         *    - doc: An instance of sozi.display.Document
         *
         * Returns:
         *    - The current viewport.
         */
        init: function (doc) {
            sozi.model.Object.init.call(this);
            
            this.document = doc;

            // Save the initial bounding box of the document
            // and force its dimensions to fit the container.
            this.initialBBox = doc.svgRoot.getBBox();
            
            // Create a camera for each layer
            this.cameras = {};
            for (var layerId in doc.layers) {
                this.cameras[layerId] = exports.Camera.create().init(this, doc.layers[layerId].svgNode);
            }
            
            this.setupActions();
            
            this.resize();
            
            return this;
        },
        
        setupActions: function () {
            var svgRoot = this.document.svgRoot;
            
            this.dragHandler = this.bind(this.onDrag);
            this.dragEndHandler = this.bind(this.onDragEnd);
            
            svgRoot.addEventListener("mousedown", this.bind(this.onMouseDown), false);
        },
        
        /*
         * Event handler: mouse down.
         *
         * If the mouse button pressed is the left button,
         * this method will setup event listeners for detecting a drag action.
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
            return this.document.svgRoot === document.documentElement ?
                window.innerWidth :
                this.document.svgRoot.parentNode.clientWidth;
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
            return this.document.svgRoot === document.documentElement ?
                window.innerHeight :
                this.document.svgRoot.parentNode.clientHeight;
        },
        
        /*
         * Fit the size of the SVG document to its container.
         *
         * Returns:
         *    - The current viewport.
         */
        resize: function () {
            this.document.svgRoot.setAttribute("width", this.width);
            this.document.svgRoot.setAttribute("height", this.height);
            
            for (var layerId in this.cameras) {
                this.cameras[layerId].update();
            }
            
            return this;
        },
        
        /*
         * Returns the default camera states to show the whole document.
         *
         * Returns:
         *    - An dictionary of camera states that fit the whole document.
         */
        getDefaultStates: function () {
            // This object defines the bounding box of the whole document
            var state = exports.CameraState.create().init(this);
            
            // Copy the document's bounding box to all layers
            var result = {};
            for (var layerId in this.cameras) {
                result[layerId] = state;
            }
            return result;
        },

        /*
         * Transform the SVG document to show the given frame.
         *
         * Parameters:
         *    - states: A dictionary of camera states
         *
         * Returns:
         *    - The current viewport.
         */
        setStates: function (states) {
            for (var layerId in this.cameras) {
                this.cameras[layerId].setAtState(states[layerId]);
            }
            return this;
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
         * Returns:
         *    - The current viewport.
         */
        drag: function (deltaX, deltaY) {
            for (var layerId in this.document.layers) {
                if (this.document.layers[layerId].selected) {
                    this.cameras[layerId].drag(deltaX, deltaY);
                }
            }
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
         * Returns:
         *    - The current viewport.
         */
        zoom: function (factor, x, y) {
            for (var layerId in this.document.layers) {
                if (this.document.layers[layerId].selected) {
                    this.cameras[layerId].zoom(factor, x, y);
                }
            }
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
         */
        rotate: function (angle) {
            for (var layerId in this.document.layers) {
                if (this.document.layers[layerId].selected) {
                    this.cameras[layerId].rotate(angle);
                }
            }
            return this;
        }
    });
});
