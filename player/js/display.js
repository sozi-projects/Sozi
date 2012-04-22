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
 * @depend module.js
 * @depend proto.js
 * @depend events.js
 */

module(this, "sozi.display", function (exports, window) {
    "use strict";
    
    // The global document object
    var document = window.document;
    
    // The initial bounding box of the whole document,
    // assigned in onDocumentReady()
    var initialBBox;
    
    // Constant: the Sozi namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    // The geometry of each layer managed by Sozi
    exports.layers = {};

    exports.CameraState = new sozi.proto.Object.subtype({
        construct : function () {
            // Center coordinates
            this.cx = this. cy = 0;
            
            // Dimensions
            this.width = this.height = 1;
            
            // Rotation angle, in degrees
            this.angle = 0;
            
            // Clipping
            this.clipped = true;
        },

        setCenter: function (cx, cy) {
            this.cx = cx;
            this.cy = cy;
            return this;
        },
        
        setSize: function (width, height) {
            this.width = width;
            this.height = height;
            return this;
        },
        
        setClipped: function (clipped) {
            this.clipped = clipped;
            return this;
        },
        
        setAngle: function (angle) {
            this.angle = angle;
            return this;
        },
        
        /*
         * Set the current camera's properties to the given SVG element.
         *
         * If the element is a rectangle, the properties of the frames are based
         * on the geometrical properties of the rectangle.
         * Otherwise, the properties of the frame are based on the bounding box
         * of the given element.
         *
         * Parameters:
         *    - svgElement: an element from the SVG DOM
         */
        setAtElement: function (svgElement) {
            // Read the raw bounding box of the given SVG element
            var x, y, w, h;
            if (svgElement.nodeName === "rect") {
                x = svgElement.x.baseVal.value;
                y = svgElement.y.baseVal.value;
                w = svgElement.width.baseVal.value;
                h = svgElement.height.baseVal.value;
            } else {
                var b = svgElement.getBBox();
                x = b.x;
                y = b.y;
                w = b.width;
                h = b.height;
            }

            // Compute the raw coordinates of the center
            // of the given SVG element
            var c = document.documentElement.createSVGPoint();
            c.x = x + w / 2;
            c.y = y + h / 2;
            
            // Compute the coordinates of the center of the given SVG element
            // after its current transformation
            var matrix = svgElement.getCTM();
            c = c.matrixTransform(matrix);

            // Compute the scaling factor applied to the given SVG element
            var scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
            
            // Update the camera to match the bounding box information of the
            // given SVG element after its current transformation
            return this.setCenter(c.x, c.y)
                .setSize(w * scale, h * scale)
                .setAngle(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
        },

        setAtState: function (other) {
            return this.setCenter(other.cx, other.cy)
                .setSize(other.width, other.height)
                .setAngle(other.angle)
                .setClipped(other.clipped);
        }
    });
    
    exports.Camera = new exports.CameraState.subtype({
        construct: function (idLayer) {
            exports.CameraState.construct.call(this);
            
            // Clipping rectangle
            this.svgClipRect = document.createElementNS(SVG_NS, "rect");
        
            // Layer element (typically a "g" element)
            this.svgLayer = document.getElementById(idLayer);
        }
    });
    
    /*
     * Initializes the current Display.
     *
     * This method prepares the DOM representation of the current SVG document.
     * All the image is embedded into a global "g" element on which transformations will be applied.
     * A clipping rectangle is added.
     *
     * This method must be called when the document is ready to be manipulated.
     */
    function onDocumentReady() {
        var svgRoot = document.documentElement; // TODO check SVG tag
        
        // Save the initial bounding box of the document
        // and force its dimensions to the browser window
        initialBBox = svgRoot.getBBox();
        svgRoot.setAttribute("width", window.innerWidth);
        svgRoot.setAttribute("height", window.innerHeight);
        
        // Initialize display geometry for all layers
        sozi.document.idLayerList.forEach(function (idLayer) {
            exports.layers[idLayer] = new exports.Camera.instance(idLayer);

            // Add a clipping path
            var svgClipPath = document.createElementNS(SVG_NS, "clipPath");
            svgClipPath.setAttribute("id", "sozi-clip-path-" + idLayer);
            svgClipPath.appendChild(exports.layers[idLayer].svgClipRect);
            svgRoot.appendChild(svgClipPath);

            // Create a group that will support the clipping operation
            // and move the layer group into that new group
            var svgClippedGroup = document.createElementNS(SVG_NS, "g");
            svgClippedGroup.setAttribute("clip-path", "url(#sozi-clip-path-" + idLayer + ")");
            
            // Adding the layer group to the clipped group must preserve layer ordering
            svgRoot.insertBefore(svgClippedGroup, exports.layers[idLayer].svgLayer);
            svgClippedGroup.appendChild(exports.layers[idLayer].svgLayer);
        });

        sozi.events.fire("displayready");
    }

    /*
     * Resizes the SVG document to fit the browser window.
     */
    function resize() {
        var svgRoot = document.documentElement;
        svgRoot.setAttribute("width", window.innerWidth);
        svgRoot.setAttribute("height", window.innerHeight);
        exports.update();
    }

    /*
     * Returns an object with the geometrical properties of the current display.
     *
     * Attributes of the returned object :
     *    - x, y: the location of the top-left corner, in pixels
     *    - width, height: the size of the visible area, in pixels
     *    - scale: the scale factor to apply to the SVG document so that is fits the visible area
     */
    function getFrameGeometry(idLayer) {
        var g = exports.layers[idLayer];
        var result = {};
        result.scale = Math.min(window.innerWidth / g.width, window.innerHeight / g.height);
        result.width = g.width * result.scale;
        result.height = g.height * result.scale;
        result.x = (window.innerWidth - result.width) / 2;
        result.y = (window.innerHeight - result.height) / 2;
        return result;
    }

    /*
     * Returns the geometrical properties of the SVG document
     *
     * Returns:
     *    - The default size, translation and rotation for the document's bounding box
     */
    exports.getDocumentGeometry = function () {
        // This object defines the bounding box of the whole document
        var camera = new exports.CameraState.instance()
            .setCenter(initialBBox.x + initialBBox.width / 2,
                       initialBBox.y + initialBBox.height / 2)
            .setSize(initialBBox.width, initialBBox.height)
            .setClipped(false);
        
        // Copy the document's bounding box to all layers
        var result = { layers: {} };
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                result.layers[idLayer] = camera;
            }
        }
        return result;
    };

    /*
     * Apply geometrical transformations to the image according to the current
     * geometrical attributes of this Display.
     *
     * This method is called automatically when the window is resized.
     */
    exports.update = function () {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                var lg = exports.layers[idLayer];
                var fg = getFrameGeometry(idLayer);

                // Adjust the location and size of the clipping rectangle and the frame rectangle
                var cr = exports.layers[idLayer].svgClipRect;
                cr.setAttribute("x", lg.clipped ? fg.x : 0);
                cr.setAttribute("y", lg.clipped ? fg.y : 0);
                cr.setAttribute("width", lg.clipped ? fg.width : window.innerWidth);
                cr.setAttribute("height", lg.clipped ? fg.height : window.innerHeight);
                
                // Compute and apply the geometrical transformation to the layer group
                var translateX = -lg.cx + lg.width / 2  + fg.x / fg.scale;
                var translateY = -lg.cy + lg.height / 2 + fg.y / fg.scale;

                exports.layers[idLayer].svgLayer.setAttribute("transform",
                    "scale(" + fg.scale + ")" +
                    "translate(" + translateX + "," + translateY + ")" +
                    "rotate(" + (-lg.angle) + ',' + lg.cx + "," + lg.cy + ")"
                );
            }
        }
    };

    /*
     * Transform the SVG document to show the given frame.
     *
     * Parameters:
     *    - frame: the frame to show
     */
    exports.showFrame = function (frame) {
        for (var idLayer in frame.layers) {
            if (frame.layers.hasOwnProperty(idLayer)) {
                exports.layers[idLayer].setAtState(frame.layers[idLayer]);
            }
        }
        exports.update();
    };

    /*
     * Apply an additional translation to the SVG document based on onscreen coordinates.
     *
     * Parameters:
     *    - deltaX: the horizontal displacement, in pixels
     *    - deltaY: the vertical displacement, in pixels
     */
    exports.drag = function (deltaX, deltaY) {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                var lg = exports.layers[idLayer];
                var fg = getFrameGeometry(idLayer);
                var angleRad = lg.angle * Math.PI / 180;
                lg.cx -= (deltaX * Math.cos(angleRad) - deltaY * Math.sin(angleRad)) / fg.scale;
                lg.cy -= (deltaX * Math.sin(angleRad) + deltaY * Math.cos(angleRad)) / fg.scale;
                lg.clipped = false;
            }
        }
        exports.update();
    };

    /*
     * Zooms the display with the given factor.
     *
     * The zoom is centered around (x, y) with respect to the center of the display area.
     */
    exports.zoom = function (factor, x, y) {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                exports.layers[idLayer].width /= factor;
                exports.layers[idLayer].height /= factor;
            }
        }
        
        exports.drag(
            (1 - factor) * (x - window.innerWidth / 2),
            (1 - factor) * (y - window.innerHeight / 2)
        );
    };

    /*
     * Rotate the display with the given angle.
     *
     * The rotation is centered around the center of the display area.
     */
    exports.rotate = function (angle) {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                exports.layers[idLayer].angle += angle;
                exports.layers[idLayer].angle %= 360;
            }
        }
        exports.update();
    };
    
    sozi.events.listen("documentready", onDocumentReady);
    window.addEventListener("resize", resize, false);
});
