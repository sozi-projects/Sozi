/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.player", function (exports) {
    "use strict";

    // Constant: the Sozi namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    exports.Camera = sozi.model.CameraState.clone({

        layer: null,
        selected: true,
        svgClipMask: null,
        svgClipRect: null,
        svgTransformGroups: [],
        maskValue: 0,

        init: function (viewport, layer) {
            sozi.model.CameraState.init.call(this, viewport.svgRoot);

            this.layer = layer;

            // The clipping rectangle of this camera
            this.svgMaskRect = document.createElementNS(SVG_NS, "rect");
            this.svgClipRect = document.createElementNS(SVG_NS, "rect");
            this.svgClipRect.setAttribute("fill", "white");

            // The clipping path of this camera
            var svgMask = document.createElementNS(SVG_NS, "mask");
            var svgMaskId = viewport.makeUniqueId("sozi-mask-");
            svgMask.setAttribute("id", svgMaskId);
            svgMask.appendChild(this.svgMaskRect);
            svgMask.appendChild(this.svgClipRect);
            viewport.svgRoot.appendChild(svgMask);

            // The group that will support the clipping operation
            var svgClippedGroup = document.createElementNS(SVG_NS, "g");
            svgClippedGroup.setAttribute("mask", "url(#" + svgMaskId + ")");
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

        clip: function (x0, y0, x1, y1) {
            this.clipped = true;
            var scale = this.scale;
            var clipWidth = Math.abs(x1 - x0);
            var clipHeight = Math.abs(y1 - y0);
            this.clipXOffset = (Math.min(x0, x1) - (this.owner.width  - clipWidth)  / 2) * this.width  / clipWidth;
            this.clipYOffset = (Math.min(y0, y1) - (this.owner.height - clipHeight) / 2) * this.height / clipHeight;
            this.clipWidthFactor  = clipWidth  / this.width  / scale;
            this.clipHeightFactor = clipHeight / this.height / scale;
            return this.update();
        },

        restoreAspectRatio: function () {
            var ownerRatio = this.owner.width / this.owner.height;
            var camRatio = this.width / this.height;
            var ratio = ownerRatio / camRatio;
            if (ratio > 1) {
                this.width *= ratio;
                if (this.clipped) {
                    this.clipWidthFactor /= ratio;
                }
            }
            else {
                this.height /= ratio;
                if (this.clipped) {
                    this.clipHeightFactor *= ratio;
                }
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

            // Adjust the location and size of the clipping rectangle
            var clipWidth, clipHeight, clipX, clipY;

            if (this.clipped) {
                clipWidth  = this.width  * this.clipWidthFactor  * scale;
                clipHeight = this.height * this.clipHeightFactor * scale;
                clipX = (this.owner.width  - clipWidth)  / 2 + this.clipXOffset * this.clipWidthFactor  * scale;
                clipY = (this.owner.height - clipHeight) / 2 + this.clipYOffset * this.clipHeightFactor * scale;
            }
            else {
                clipWidth = this.owner.width;
                clipHeight = this.owner.height;
                clipX = 0;
                clipY = 0;
            }

            this.svgMaskRect.setAttribute("fill", "rgb(" + this.maskValue + "," + this.maskValue + "," + this.maskValue + ")");
            this.svgMaskRect.setAttribute("x", 0);
            this.svgMaskRect.setAttribute("y", 0);
            this.svgMaskRect.setAttribute("width",  this.owner.width);
            this.svgMaskRect.setAttribute("height", this.owner.height);

            this.svgClipRect.setAttribute("x", clipX);
            this.svgClipRect.setAttribute("y", clipY);
            this.svgClipRect.setAttribute("width",  clipWidth);
            this.svgClipRect.setAttribute("height", clipHeight);

            // Compute and apply the geometrical transformation to the layer group
            var translateX = this.owner.width  / scale / 2 - this.cx;
            var translateY = this.owner.height / scale / 2 - this.cy;

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
