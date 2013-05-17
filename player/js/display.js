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
 * @name sozi.display
 * @namespace Display management.
 * @depend namespace.js
 */
namespace(this, "sozi.display", function (exports, window) {
    "use strict";
    
    // Constant: the Sozi namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    var XLINK_NS = "http://www.w3.org/1999/xlink";
    
    // The global document object
    var document = window.document;
    
    // The initial bounding box of the whole document,
    // assigned in onDocumentReady()
    var initialBBox;
    
    var lastWindowWidth;
    var lastWindowHeight;
    
    exports.viewPorts = {};
    
    var primaryViewport;

    /**
     * @depend proto.js
     */
    exports.CameraState = sozi.proto.Object.subtype({
        construct : function () {
            // Center coordinates
            this.cx = this.cy = 0;
            
            // Dimensions
            this.width = this.height = 1;
            
            // Rotation angle, in degrees
            this.angle = 0;
            
            // Clipping
            this.clipped = true;
            
            // Transition zoom
            this.transitionZoomPercent = 0;
            
            // Transition profile
            this.transitionProfile = sozi.animation.profiles.linear;
            
            // Transition path
            this.transitionPath = null;
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
        
        setTransitionZoomPercent: function (zoomPercent) {
            this.transitionZoomPercent = zoomPercent;
            return this;
        },
        
        setTransitionProfile: function (profile) {
            this.transitionProfile = profile;
            return this;
        },
        
        setTransitionPath: function (svgPath) {
            this.transitionPath = svgPath;
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
                .setClipped(other.clipped)
                .setTransitionZoomPercent(other.transitionZoomPercent)
                .setTransitionProfile(other.transitionProfile)
                .setTransitionPath(other.transitionPath);
        },
        
        interpolatableAttributes: ["width", "height", "angle"],
        
        interpolate: function (initialState, finalState, ratio, useTransitionPath, reverseTransitionPath) {
            var remaining = 1 - ratio;
            for (var i = 0; i < this.interpolatableAttributes.length; i += 1) {
                var attr = this.interpolatableAttributes[i];
                this[attr] = finalState[attr] * ratio + initialState[attr] * remaining;
            }

            var svgPath = reverseTransitionPath ? initialState.transitionPath : finalState.transitionPath;
            if (useTransitionPath && svgPath) {
                var pathLength = svgPath.getTotalLength();
                
                if (reverseTransitionPath) {
                    var startPoint = svgPath.getPointAtLength(pathLength);
                    var endPoint = svgPath.getPointAtLength(0);
                    var currentPoint = svgPath.getPointAtLength(pathLength * remaining);
                }
                else {
                    var startPoint = svgPath.getPointAtLength(0);
                    var endPoint = svgPath.getPointAtLength(pathLength);
                    var currentPoint = svgPath.getPointAtLength(pathLength * ratio);
                }
 
                this.cx = currentPoint.x + (finalState.cx - endPoint.x) * ratio + (initialState.cx - startPoint.x) * remaining;
                this.cy = currentPoint.y + (finalState.cy - endPoint.y) * ratio + (initialState.cy - startPoint.y) * remaining;
            }
            else {
                this.cx = finalState.cx * ratio + initialState.cx * remaining;
                this.cy = finalState.cy * ratio + initialState.cy * remaining;
            }
        }
    });
    
    exports.Camera = exports.CameraState.subtype({
        construct: function (viewPort, idLayer) {
            exports.CameraState.construct.call(this);
            
            this.viewPort = viewPort;
            
            // Clipping rectangle
            this.svgClipRect = document.createElementNS(SVG_NS, "rect");
        
            // Clipping path
            var svgClipPath = document.createElementNS(SVG_NS, "clipPath");
            svgClipPath.setAttribute("id", "sozi-clip-path-" + viewPort.id + "-" + idLayer);
            svgClipPath.appendChild(this.svgClipRect);
            viewPort.svgGroup.appendChild(svgClipPath);

            // The group that will support the clipping operation
            var svgClippedGroup = document.createElementNS(SVG_NS, "g");
            svgClippedGroup.setAttribute("clip-path", "url(#sozi-clip-path-" + viewPort.id + "-" + idLayer + ")");
            viewPort.svgGroup.appendChild(svgClippedGroup);
            
            if (viewPort.isPrimary) {
                // This group will support transformations
                // we keep the layer group clean since it can be referenced
                // from <use> elements
                this.svgLayer = document.createElementNS(SVG_NS, "g");
                this.svgLayer.appendChild(document.getElementById(idLayer));
            }
            else {
                // A <use> element referencing the target layer
                this.svgLayer = document.createElementNS(SVG_NS, "use");
                this.svgLayer.setAttributeNS(XLINK_NS, "href", "#" + idLayer);
            }
            svgClippedGroup.appendChild(this.svgLayer);
        },
        
        setAtState: function (other) {
            return exports.CameraState.setAtState.call(this, other).update();
        },
        
        getScale: function () {
            return Math.min(this.viewPort.width / this.width, this.viewPort.height / this.height);
        },
        
        rotate: function (angle) {
            return this.setAngle(this.angle + angle).update();
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
                ).setClipped(false).update();
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
            
            return this;
        }
    });
    
    /**
     * @depend proto.js
     */
    exports.ViewPort = sozi.proto.Object.subtype({
        construct: function (id, idLayerList, primary) {
            this.id = id;
            exports.viewPorts[id] = this;
            
            this.isPrimary = !!primary;
            
            if (this.isPrimary) {
                if (primaryViewport) {
                    throw "Failed to create a primary viewport. A primary viewport already exists.";
                }
                else {
                    primaryViewport = this;
                }
            }
            
            // TODO add a clip path for the viewport
            this.svgGroup = document.createElementNS(SVG_NS, "g");
            this.svgGroup.setAttribute("class", "sozi-viewport");
            this.svgGroup.setAttribute("id", "sozi-viewport-" + id);
            document.documentElement.appendChild(this.svgGroup);
            
            this.setLocation(0, 0).setSize(window.innerWidth, window.innerHeight);
            
            // Create a camera for each layer
            this.cameras = {};
            idLayerList.forEach(function (idLayer) {
                this.cameras[idLayer] = exports.Camera.instance(this, idLayer);
            }, this);
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

        contains: function (x, y) {
            return x >= this.x && x < this.x + this.width &&
                   y >= this.y && y < this.y + this.height;
        },
        
        /*
         * Returns the geometrical properties of the SVG document
         *
         * Returns:
         *    - The default size, translation and rotation for the document's bounding box
         */
        getDocumentState: function () {
            // This object defines the bounding box of the whole document
            var camera = exports.CameraState.instance()
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
            this.svgGroup.setAttribute("transform", "translate(" + this.x + "," + this.y + ")");
            for (var idLayer in this.cameras) {
                this.cameras[idLayer].update();
            }
            return this;
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
            return this;
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
            return this;
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
            return this;
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
            return this;
        },
        
        /**
         * The default handler for window resize events.
         *
         * @param widthRatio The horizontal resize ratio
         * @param heightRatio The vertical resize ratio
         */
        onWindowResize: function (widthRatio, heightRatio) {
            this.setLocation(this.x * widthRatio, this.y * heightRatio)
                .setSize(this.width * widthRatio, this.height * heightRatio)
                .update();
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
        lastWindowWidth = window.innerWidth;
        lastWindowHeight = window.innerHeight;
        svgRoot.setAttribute("width", lastWindowWidth);
        svgRoot.setAttribute("height", lastWindowHeight);
        
        sozi.events.fire("sozi.display.ready");
    }

    /*
     * Resizes the SVG document to fit the browser window.
     *
     * This method calls onWindowResize on all registered viewports.
     */
    function resize() {
        var svgRoot = document.documentElement;
        svgRoot.setAttribute("width", window.innerWidth);
        svgRoot.setAttribute("height", window.innerHeight);
        
        for (var vp in exports.viewPorts) {
            exports.viewPorts[vp].onWindowResize(window.innerWidth / lastWindowWidth, window.innerHeight / lastWindowHeight);
        }

        lastWindowWidth = window.innerWidth;
        lastWindowHeight = window.innerHeight;
    }
    
    sozi.events.listen("sozi.document.ready", onDocumentReady); // @depend events.js
    window.addEventListener("resize", resize, false);
});
