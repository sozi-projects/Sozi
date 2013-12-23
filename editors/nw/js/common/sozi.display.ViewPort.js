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
            this.document = doc;

            // Save the initial bounding box of the document
            // and force its dimensions to fit the container.
            this.initialBBox = doc.svgRoot.getBBox();
            
            // Create a camera for each layer
            this.cameras = {};
            for (var layerId in doc.layers) {
                this.cameras[layerId] = exports.Camera.create().init(this, doc.layers[layerId].svgNode);
            }
            
            this.resize();
            
            return this;
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
         * Parameters:
         *    - deltaX: The horizontal displacement, in pixels
         *    - deltaY: The vertical displacement, in pixels
         *    - layerIds (optional): The ids of the layers to drag (defaults to all layers)
         *
         * Returns:
         *    - The current viewport.
         */
        drag: function (deltaX, deltaY, layerIds) {
            if (layerIds === undefined) {
                for (var layerId in this.cameras) {
                    this.cameras[layerId].drag(deltaX, deltaY);
                }
            }
            else {
                layerIds.forEach(function (layerId) {
                    this.cameras[layerId].drag(deltaX, deltaY);
                }, this);
            }
            return this;
        },

        /*
         * Zooms the display with the given factor.
         *
         * The zoom is centered around (x, y) with respect to the center of the display area.
         *
         * Parameters:
         *    - factor: The zoom factor (relative to the current state of the viewport).
         *    - x, y: The coordinates of the center of the zoom operation.
         *    - layerIds (optional): The ids of the layers to zoom (defaults to all layers)
         *
         * Returns:
         *    - The current viewport.
         */
        zoom: function (factor, x, y, layerIds) {
            if (layerIds === undefined) {
                for (var layerId in this.cameras) {
                    this.cameras[layerId].zoom(factor, x, y);
                }
            }
            else {
                layerIds.forEach(function (layerId) {
                    this.cameras[layerId].zoom(factor, x, y);
                }, this);
            }
            return this;
        },

        /*
         * Rotate the display with the given angle.
         *
         * The rotation is centered around the center of the display area.
         *
         * Parameters:
         *    - The rotation angle, in degrees.
         *    - layerIds (optional): The ids of the layers to rotate (defaults to all layers)
         *
         * Returns:
         *    - The current viewport.
         */
        rotate: function (angle, layerIds) {
            if (layerIds === undefined) {
                for (var layerId in this.cameras) {
                    this.cameras[layerId].rotate(angle);
                }
            }
            else {
                layerIds.forEach(function (layerId) {
                    this.cameras[layerId].rotate(angle);
                }, this);
            }
            return this;
        }
    });
});
