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

    exports.CameraState = new sozi.proto.Object.subtype({
        construct : function () {
            // Center coordinates
            this.cx = this.cy = 0;
            
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
        
        /*
         * Set the angle of the current camera state.
         * The angle of the current state is normalized
         * in the interval [-180 ; 180]
         */
        setAngle: function (angle) {
            this.angle = (angle + 180) % 360 - 180;
            return this;
        },
        
        setRawAngle: function (angle) {
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
        construct: function (viewPort, idLayer) {
            exports.CameraState.construct.call(this);
            
            this.viewPort = viewPort;
            
            // Clipping rectangle
            this.svgClipRect = document.createElementNS(SVG_NS, "rect");
        
            // Layer element (typically a "g" element)
            this.svgLayer = document.getElementById(idLayer);
        },
        
        getScale: function () {
            return Math.min(this.viewPort.width / this.width, this.viewPort.height / this.height);
        },
        
        rotate: function (angle) {
            return this.setAngle(this.angle + angle);
        },

        zoom: function (factor, x, y) {
            return this.setSize(this.width / factor, this.height / factor)
                       .drag(
                            (1 - factor) * (x - this.viewPort.width / 2),
                            (1 - factor) * (y - this.viewPort.height / 2)
                        );
        },
        
        drag: function (deltaX, deltaY) {
            var scale = this.getScale();
            var angleRad = this.angle * Math.PI / 180;
            var si = Math.sin(angleRad);
            var co = Math.cos(angleRad);
            return this.setCenter(
                    this.cx - (deltaX * co - deltaY * si) / scale,
                    this.cy - (deltaX * si + deltaY * co) / scale
                ).setClipped(false);
        },

        update: function () {
            var scale = this.getScale();
                    
            // Compute the size and location of the frame on the screen
            var width = this.width  * scale;
            var height = this.height * scale;
            var x = (this.viewPort.width - width) / 2;
            var y = (this.viewPort.height - height) / 2;

            // Adjust the location and size of the clipping rectangle and the frame rectangle
            this.svgClipRect.setAttribute("x", this.clipped ? x : 0);
            this.svgClipRect.setAttribute("y", this.clipped ? y : 0);
            this.svgClipRect.setAttribute("width",  this.clipped ? width  : this.viewPort.width);
            this.svgClipRect.setAttribute("height", this.clipped ? height : this.viewPort.height);
                    
            // Compute and apply the geometrical transformation to the layer group
            var translateX = -this.cx + this.width / 2  + x / scale;
            var translateY = -this.cy + this.height / 2 + y / scale;

            this.svgLayer.setAttribute("transform",
                "scale(" + scale + ")" +
                "translate(" + translateX + "," + translateY + ")" +
                "rotate(" + (-this.angle) + ',' + this.cx + "," + this.cy + ")"
            );
        }
    });
    
    exports.ViewPort = new sozi.proto.Object.subtype({
        construct: function (idLayerList) {
            var svgRoot = document.documentElement;
            
            this.setLocation(0, 0).setSize(window.innerWidth, window.innerHeight);
            
            this.cameras = {};
            
            for (var i = 0; i < idLayerList.length; i += 1) {
                var idLayer = idLayerList[i];
                
                // Create a new camera for the current layer
                var camera = this.cameras[idLayer] = new exports.Camera.instance(this, idLayer);

                // Add a clipping path
                var svgClipPath = document.createElementNS(SVG_NS, "clipPath");
                svgClipPath.setAttribute("id", "sozi-clip-path-" + idLayer);
                svgClipPath.appendChild(camera.svgClipRect);
                svgRoot.appendChild(svgClipPath);

                // Create a group that will support the clipping operation
                // and move the layer group into that new group
                var svgClippedGroup = document.createElementNS(SVG_NS, "g");
                svgClippedGroup.setAttribute("clip-path", "url(#sozi-clip-path-" + idLayer + ")");
                
                // Adding the layer group to the clipped group must preserve layer ordering
                svgRoot.insertBefore(svgClippedGroup, camera.svgLayer);
                svgClippedGroup.appendChild(camera.svgLayer);
            }
        },
        
        setSize: function (width, height) {
            this.width = width;
            this.height = height;
            return this;
        },
        
        setLocation: function (x, y) {
            this.x = x;
            this.y = y;
            return this;
        },

        /*
         * Returns the geometrical properties of the SVG document
         *
         * Returns:
         *    - The default size, translation and rotation for the document's bounding box
         */
        getDocumentState: function () {
            // This object defines the bounding box of the whole document
            var camera = new exports.CameraState.instance()
                .setCenter(initialBBox.x + initialBBox.width / 2,
                           initialBBox.y + initialBBox.height / 2)
                .setSize(initialBBox.width, initialBBox.height)
                .setClipped(false);
            
            // Copy the document's bounding box to all layers
            var result = {};
            for (var idLayer in this.cameras) {
                result[idLayer] = camera;
            }
            return result;
        },

        /*
         * Apply geometrical transformations to the image according to the current
         * geometrical attributes of this Display.
         *
         * This method is called automatically when the window is resized.
         */
        update: function () {
            for (var idLayer in this.cameras) {
                this.cameras[idLayer].update();
            }
        },

        /*
         * Transform the SVG document to show the given frame.
         *
         * Parameters:
         *    - frame: the frame to show
         */
        showFrame: function (frame) {
            for (var idLayer in frame.states) {
                this.cameras[idLayer].setAtState(frame.states[idLayer]);
            }
            this.update();
        },

        /*
         * Apply an additional translation to the SVG document based on onscreen coordinates.
         *
         * Parameters:
         *    - deltaX: the horizontal displacement, in pixels
         *    - deltaY: the vertical displacement, in pixels
         */
        drag: function (deltaX, deltaY) {
            for (var idLayer in this.cameras) {
                this.cameras[idLayer].drag(deltaX, deltaY);
            }
            this.update();
        },

        /*
         * Zooms the display with the given factor.
         *
         * The zoom is centered around (x, y) with respect to the center of the display area.
         */
        zoom: function (factor, x, y) {
            for (var idLayer in this.cameras) {
                this.cameras[idLayer].zoom(factor, x, y);
            }
            this.update();
        },

        /*
         * Rotate the display with the given angle.
         *
         * The rotation is centered around the center of the display area.
         */
        rotate: function (angle) {
            for (var idLayer in this.cameras) {
                this.cameras[idLayer].rotate(angle);
            }
            this.update();
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
        
        exports.viewPort = new exports.ViewPort.instance(sozi.document.idLayerList);
        
        sozi.events.fire("displayready");
    }

    /*
     * Resizes the SVG document to fit the browser window.
     */
    function resize() {
        var svgRoot = document.documentElement;
        svgRoot.setAttribute("width", window.innerWidth);
        svgRoot.setAttribute("height", window.innerHeight);
        exports.viewPort.setSize(window.innerWidth, window.innerHeight).update();
    }
    
    sozi.events.listen("documentready", onDocumentReady);
    window.addEventListener("resize", resize, false);
});
