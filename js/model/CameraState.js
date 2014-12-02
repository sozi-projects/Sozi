/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.model", function (exports) {
    "use strict";

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
        clipXOffset: 0,
        clipYOffset: 0,
        clipWidthFactor: 1,
        clipHeightFactor: 1,

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
                clipped: this.clipped,
                clipXOffset: this.clipXOffset,
                clipYOffset: this.clipYOffset,
                clipWidthFactor: this.clipWidthFactor,
                clipHeightFactor: this.clipHeightFactor
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

            // Interpolate clip rectangle
            this.clipped = true;
            var clipDefaults = {
                clipXOffset: 0,
                clipYOffset: 0,
                clipWidthFactor: 1,
                clipHeightFactor: 1
            };
            var initialClipping = initialState.clipped ? initialState : clipDefaults;
            var finalClipping   = finalState.clipped   ? finalState   : clipDefaults;
            for (var clipProp in clipDefaults) {
                this[clipProp] = linear(initialClipping[clipProp], finalClipping[clipProp]);
            }
        }
    });
});
