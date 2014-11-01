/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.player", function (exports) {
    "use strict";

    // Constant: the Sozi namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    exports.CameraState = sozi.model.Object.clone({

        svgRoot: null,
        
        // Center coordinates
        cx: 0,
        cy: 0,
        
        // Dimensions
        width: 0,
        height: 0,
        
        // Rotation angle, in degrees
        angle: 0,
        
        // Clipping
        clipped: false,
        
        init: function (svgRoot) {
            this.svgRoot = svgRoot;
            var initialBBox = svgRoot.getBBox();
            this.cx = initialBBox.x + initialBBox.width / 2;
            this.cy = initialBBox.y + initialBBox.height / 2;
            this.width = initialBBox.width;
            this.height = initialBBox.height;
            return this;
        },

        toStorable: function () {
            return {
                cx: this.cx,
                cy: this.cy,
                width: this.width,
                height: this.height,
                angle: this.angle,
                clipped: this.clipped
            };
        },
        
        toMinimalStorable: function () {
            return this.toStorable();
        },

        fromStorable: sozi.model.Object.copy,
        
        /*
         * Set the angle of the current camera state.
         * The angle of the current state is normalized
         * in the interval [-180 ; 180]
         */
        setAngle: function (angle) {
            this.angle = (angle + 180) % 360 - 180;
            return this;
        },

        /*
         * Set the current camera's properties to the given SVG element.
         *
         * Otherwise, the properties of the frame are based on the bounding box
         * of the given element.
         *
         * Parameters:
         *    - svgElement: an element from the SVG DOM
         */
        setAtElement: function (svgElement, deltaX, deltaY, widthFactor, heightFactor, deltaAngle) {
            deltaX = deltaX || 0;
            deltaY = deltaY || 0;
            widthFactor = widthFactor || 1;
            heightFactor = heightFactor || 1;
            deltaAngle = deltaAngle || 0;

            // Read the raw bounding box of the given SVG element
            var b = svgElement.getBBox();

            // Compute the raw coordinates of the center
            // of the given SVG element
            var c = this.svgRoot.createSVGPoint();
            c.x = b.x + b.width  / 2;
            c.y = b.y + b.height / 2;

            // Find the transform group corresponding to the layer
            // that contains the given element
            var layerGroup = svgElement;
            while (layerGroup.parentNode.parentNode !== this.svgRoot) {
                layerGroup = layerGroup.parentNode;
            }

            // Compute the coordinates of the center of the given SVG element
            // after its current transformation
            var matrix = layerGroup.getCTM().inverse().multiply(svgElement.getCTM());
            c = c.matrixTransform(matrix);

            // Compute the scaling factor applied to the given SVG element
            var scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);

            // Update the camera to match the bounding box information of the
            // given SVG element after its current transformation
            this.cx     = c.x + deltaX;
            this.cy     = c.y + deltaY;
            this.width  = b.width  * scale * widthFactor;
            this.height = b.height * scale * heightFactor;
            this.angle  = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + deltaAngle;

            return this;
        },

        offsetFromElement: function (svgElement) {
            var cam = this.clone().setAtElement(svgElement);
            return {
                deltaX: this.cx - cam.cx,
                deltaY: this.cy - cam.cy,
                widthFactor: this.width / cam.width,
                heightFactor: this.height / cam.height,
                deltaAngle: this.angle - cam.angle
            };
        },

        interpolate: function (initialState, finalState, progress, timingFunction, relativeZoom, svgPath, reversePath) {
            var tfProgress = timingFunction(progress);
            var tfRemaining = 1 - tfProgress;

            function linear(initial, final) {
                return final * tfProgress + initial * tfRemaining;
            }

            function quadratic(u0, u1) {
                var um = (relativeZoom > 0 ? Math.max(u0, u1) : Math.min(u0, u1)) * (1 + relativeZoom);
                var du0 = u0 - um;
                var du1 = u1 - um;
                var r = Math.sqrt(du0 / du1);
                var tm = r / (1 + r);
                var k = du0 / tm / tm;
                var dt = progress - tm;
                return k * dt * dt + um;
            }

            // Interpolate camera width and height
            if (relativeZoom) {
                this.width  = quadratic(initialState.width,  finalState.width);
                this.height = quadratic(initialState.height, finalState.height);
            }
            else {
                this.width  = linear(initialState.width,  finalState.width);
                this.height = linear(initialState.height, finalState.height);
            }

            // Interpolate camera location
            if (svgPath) {
                var pathLength   = svgPath.getTotalLength();
                var startPoint   = svgPath.getPointAtLength(reversePath ? pathLength : 0);
                var endPoint     = svgPath.getPointAtLength(reversePath ? 0 : pathLength);
                var currentPoint = svgPath.getPointAtLength(pathLength * (reversePath ? tfRemaining : tfProgress));

                this.cx = currentPoint.x + linear(initialState.cx - startPoint.x, finalState.cx - endPoint.x);
                this.cy = currentPoint.y + linear(initialState.cy - startPoint.y, finalState.cy - endPoint.y);
            }
            else {
                this.cx = linear(initialState.cx, finalState.cx);
                this.cy = linear(initialState.cy, finalState.cy);
            }

            // Interpolate camera angle
            // Keep the smallest angle between the initial and final states
            if (finalState.angle - initialState.angle > 180) {
                this.angle  = linear(initialState.angle, finalState.angle - 360);
            }
            else if (finalState.angle - initialState.angle < -180) {
                this.angle  = linear(initialState.angle - 360, finalState.angle);
            }
            else {
                this.angle  = linear(initialState.angle, finalState.angle);
            }
        }
    });

    exports.Camera = exports.CameraState.clone({

        layer: null,
        selected: true,
        svgClipRect: false,
        svgTransformGroups: [],
        
        init: function (viewport, layer) {
            exports.CameraState.init.call(this, viewport.svgRoot);

            this.layer = layer;

            // The clipping rectangle of this camera
            this.svgClipRect = document.createElementNS(SVG_NS, "rect");

            // The clipping path of this camera
            var svgClipPath = document.createElementNS(SVG_NS, "clipPath");
            var svgClipPathId = viewport.makeUniqueId("sozi-clip-path-");
            svgClipPath.setAttribute("id", svgClipPathId);
            svgClipPath.appendChild(this.svgClipRect);
            viewport.svgRoot.appendChild(svgClipPath);

            // The group that will support the clipping operation
            var svgClippedGroup = document.createElementNS(SVG_NS, "g");
            svgClippedGroup.setAttribute("clip-path", "url(#" + svgClipPathId + ")");
            viewport.svgRoot.appendChild(svgClippedGroup);

            // The groups that will support transformations
            layer.svgNodes.forEach(function (svgNode) {
                var svgGroup = document.createElementNS(SVG_NS, "g");
                svgGroup.appendChild(svgNode);
                svgClippedGroup.appendChild(svgGroup);
                this.svgTransformGroups.push(svgGroup);
            }, this);

            return this;
        },

        get scale() {
            return Math.min(this.owner.width / this.width, this.owner.height / this.height);
        },

        rotate: function (angle) {
            this.restoreAspectRatio();
            return this.setAngle(this.angle + angle).update();
        },

        zoom: function (factor, x, y) {
            this.width /= factor;
            this.height /= factor;
            this.restoreAspectRatio();
            return this.translate(
                (1 - factor) * (x - this.owner.width  / 2),
                (1 - factor) * (y - this.owner.height / 2)
            );
        },

        translate: function (deltaX, deltaY) {
            var scale = this.scale;
            var angleRad = this.angle * Math.PI / 180;
            var si = Math.sin(angleRad);
            var co = Math.cos(angleRad);
            this.cx -= (deltaX * co - deltaY * si) / scale;
            this.cy -= (deltaX * si + deltaY * co) / scale;
            this.restoreAspectRatio();
            return this.update();
        },

        restoreAspectRatio: function () {
            var ownerRatio = this.owner.width / this.owner.height;
            var camRatio = this.width / this.height;
            if (ownerRatio > camRatio) {
                this.width = this.height * ownerRatio;
            }
            else {
                this.height = this.width / ownerRatio;
            }
        },

        getCandidateReferenceElement: function () {
            // getIntersectionList is not supported in Gecko
            if (!this.svgRoot.getIntersectionList) {
                return this.svgRoot;
            }

            // Get all elements that intersect with the viewport.
            var viewportRect = this.svgRoot.createSVGRect();
            viewportRect.x = 0;
            viewportRect.y = 0;
            viewportRect.width = this.owner.width;
            viewportRect.height = this.owner.height;
            var viewportArea = this.owner.width * this.owner.height;

            var intersectionList = this.svgRoot.getIntersectionList(viewportRect, this.layer.svgNodes.first);

            // Find the element which bounding box best fits in the viewport.
            var bestScore = -1;
            var result;

            for (var i = 0; i < intersectionList.length; i ++) {
                var elt = intersectionList[i];
                if (elt.hasAttribute("id")) {
                    // TODO getBoundingClientRect returns bounding box of bounding box
                    var eltRect = elt.getBoundingClientRect();
                    var eltArea = eltRect.width * eltRect.height;

                    // Compute the intersection of the element'b bounding
                    // box with the current viewport.
                    var l = Math.max(eltRect.left, this.owner.x);
                    var t = Math.max(eltRect.top, this.owner.y);
                    var r = Math.min(eltRect.right, this.owner.x + this.owner.width);
                    var b = Math.min(eltRect.bottom, this.owner.y + this.owner.height);

                    var intersectArea = (r - l) * (b - t);

                    // An element is selected if it has the biggest intersect area
                    // and the smallest area outside the intersection.
                    var eltScore = viewportArea + eltArea - 2 * intersectArea;
                    if (bestScore < 0 || eltScore < bestScore) {
                        bestScore = eltScore;
                        result = elt;
                    }
                }
            }

            return result;
        },

        update: function () {
            var scale = this.scale;

            // Compute the size and location of the frame on the screen
            var width = this.width  * scale;
            var height = this.height * scale;
            var x = (this.owner.width - width) / 2;
            var y = (this.owner.height - height) / 2;

            // Adjust the location and size of the clipping rectangle and the frame rectangle
            this.svgClipRect.setAttribute("x", this.clipped ? x : 0);
            this.svgClipRect.setAttribute("y", this.clipped ? y : 0);
            this.svgClipRect.setAttribute("width",  this.clipped ? width  : this.owner.width);
            this.svgClipRect.setAttribute("height", this.clipped ? height : this.owner.height);

            // Compute and apply the geometrical transformation to the layer group
            var translateX = -this.cx + this.width / 2  + x / scale;
            var translateY = -this.cy + this.height / 2 + y / scale;

            this.svgTransformGroups.forEach(function (svgGroup) {
                svgGroup.setAttribute("transform",
                    "scale(" + scale + ")" +
                    "translate(" + translateX + "," + translateY + ")" +
                    "rotate(" + (-this.angle) + ',' + this.cx + "," + this.cy + ")"
                );
            }, this);

            return this;
        }
    });
});
