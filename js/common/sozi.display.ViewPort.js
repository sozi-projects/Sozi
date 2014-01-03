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

    // Constant: the SVG namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    // Constant: the Inkscape namespace
    var INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

    // Constant: The SVG element names that can be found in layers
    var DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
        "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

    // Use left mouse button to drag
    var DRAG_BUTTON = 0;

    // Minimum distance to detect a drag action
    var DRAG_THRESHOLD_PX = 5;

    // Zoom factor for user zoom action (keyboard and mouse wheel)
    var SCALE_FACTOR = 1.05;

    // Rotation step for user rotate action (keyboard and mouse wheel)
    var ROTATE_STEP = 5;

    exports.ViewPort = sozi.model.Object.create({

        /*
         * Initialize a new viewport for the given SVG root element.
         *
         * Parameters:
         *    - svgRoot: The SVG root element
         *
         * Returns:
         *    - The current viewport.
         */
        init: function (svgRoot) {
            sozi.model.Object.init.call(this);

            this.svgRoot = svgRoot;

            this.layers = {};

            // Create an empty wrapper layer for elements that do not belong to a valid layer
            var wrapperCount = 0;
            var svgWrapper = document.createElementNS(SVG_NS, "g");
            svgWrapper.setAttribute("id", "sozi-wrapper-" + this.id + "-" + wrapperCount);

            // Get all child nodes of the SVG root.
            // Make a copy of svgRoot.childNodes before modifying the document.
            var svgNodeList = Array.prototype.slice.call(svgRoot.childNodes);

            svgNodeList.forEach(function (svgNode) {
                // Remove text nodes and comments
                if (svgNode.tagName === undefined) {
                    svgRoot.removeChild(svgNode);
                }
                // Reorganize SVG elements
                else {
                    var nodeName = svgNode.localName.toLowerCase();
                    if (DRAWABLE_TAGS.indexOf(nodeName) !== -1) {
                        // The current node is a valid layer if it has the following characteristics:
                        //    - it is an SVG group element
                        //    - it has an id
                        //    - the id has not been met before.
                        if (nodeName === "g" && svgNode.getAttribute("id") && !(svgNode.getAttribute("id") in this.layers)) {
                            // If the current wrapper layer contains elements,
                            // add it to the document and to the list of layers.
                            if (svgWrapper.firstChild) {
                                svgRoot.insertBefore(svgWrapper, svgNode);
                                this.layers[svgWrapper.getAttribute("id")] = {
                                    auto: true,
                                    selected: true,
                                    label: "#" + svgWrapper.getAttribute("id"),
                                    svgNode: svgWrapper
                                };

                                // Create a new empty wrapper layer
                                wrapperCount ++;
                                svgWrapper = document.createElementNS(SVG_NS, "g");
                                svgWrapper.setAttribute("id", "sozi-wrapper-" + this.id + "-" + wrapperCount);
                            }

                            // Add the current node to the list of layers.
                            this.layers[svgNode.getAttribute("id")] = {
                                auto: false,
                                selected: true,
                                // FIXME Should be has/getAttributeNS(INKSCAPE_NS, "label"
                                label: svgNode.hasAttribute("inkscape:label") ? svgNode.getAttribute("inkscape:label") : ("#" + svgNode.getAttribute("id")),
                                svgNode: svgNode
                            };
                        }
                        else {
                            svgWrapper.appendChild(svgNode);
                        }
                    }
                }
            }, this);

            // If the current wrapper layer contains elements,
            // add it to the document and to the list of layers.
            if (svgWrapper.firstChild) {
                svgRoot.appendChild(svgWrapper);
                this.layers[svgWrapper.getAttribute("id")] = {
                    auto: true,
                    selected: true,
                    svgNode: svgWrapper
                };
            }

            // Save the initial bounding box of the document
            // and force its dimensions to fit the container.
            this.initialBBox = svgRoot.getBBox();

            // Create a camera for each layer
            this.cameras = {};
            for (var layerId in this.layers) {
                this.cameras[layerId] = exports.Camera.create().init(this, this.layers[layerId].svgNode);
            }

            // Setup mouse and keyboard event handlers
            this.dragHandler = this.bind(this.onDrag);
            this.dragEndHandler = this.bind(this.onDragEnd);

            svgRoot.addEventListener("mousedown", this.bind(this.onMouseDown), false);
            svgRoot.addEventListener("DOMMouseScroll", this.bind(this.onWheel), false); // Mozilla
            svgRoot.addEventListener("mousewheel", this.bind(this.onWheel), false); // IE, Opera, Webkit
            svgRoot.addEventListener("keypress", this.bind(this.onKeyPress), false);

            this.resize();

            return this;
        },

        /*
         * Mark all layers as selected.
         *
         * Fires:
         *    - selectLayer(layerId)
         *
         * Returns:
         *    - The current object.
         */
        selectAllLayers: function () {
            for (var layerId in this.layers) {
                this.selectLayer(layerId);
            }
            return this;
        },

        /*
         * Mark all layers as deselected.
         *
         * Fires:
         *    - deselectLayer(layerId)
         *
         * Returns:
         *    - The current object.
         */
        deselectAllLayers: function () {
            for (var layerId in this.layers) {
                this.deselectLayer(layerId);
            }
            return this;
        },

        /*
         * Mark a layer as selected.
         *
         * When selecting a layer, the previously selected layers are not deselected.
         *
         * Parameters:
         *    - layerId: The id of the layer to select.
         *
         * Fires:
         *    - selectLayer(layerId)
         *
         * Returns:
         *    - The current object.
         */
        selectLayer: function (layerId) {
            this.layers[layerId].selected = true;
            this.fire("selectLayer", layerId);
            return this;
        },

        /*
         * Mark a layer as deselected.
         *
         * Parameters:
         *    - layerId: The id of the layer to deselect.
         *
         * Fires:
         *    - deselectLayer(layerId)
         *
         * Returns:
         *    - The current object.
         */
        deselectLayer: function (layerId) {
            this.layers[layerId].selected = false;
            this.fire("deselectLayer", layerId);
            return this;
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
        get defaultState() {
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
         * Set the state of the current viewport.
         *
         * Parameters:
         *    - state: A dictionary of camera states
         */
        set state(state) {
            for (var layerId in this.cameras) {
                this.cameras[layerId].setAtState(state[layerId]);
            }
        },

        /*
         * Get the state of the current viewport.
         *
         * Returns:
         *    - A dictionary of camera states
         */
        get state () {
            var result = {};
            for (var layerId in this.cameras) {
                result[layerId] = this.cameras[layerId].clone;
            }
            return result;
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
            for (var layerId in this.layers) {
                if (this.layers[layerId].selected) {
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
         * Fires:
         *    - zoom
         *
         * Returns:
         *    - The current viewport.
         */
        zoom: function (factor, x, y) {
            for (var layerId in this.layers) {
                if (this.layers[layerId].selected) {
                    this.cameras[layerId].zoom(factor, x, y);
                }
            }
            this.fire("zoom");
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
         *    - rotate
         */
        rotate: function (angle) {
            for (var layerId in this.layers) {
                if (this.layers[layerId].selected) {
                    this.cameras[layerId].rotate(angle);
                }
            }
            this.fire("rotate");
            return this;
        }
    });
});
