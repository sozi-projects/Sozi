/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {CameraState} from "../model/CameraState";

// Constant: the Sozi namespace
const SVG_NS = "http://www.w3.org/2000/svg";

/** Camera.
 *
 * @category player
 * @extends CameraState
 * @todo Add documentation.
 */
export class Camera extends CameraState {

    constructor(viewport, layer) {
        super(viewport.svgRoot);

        this.viewport = viewport;
        this.layer = layer;
        this.selected = true;

        // The clipping rectangle of this camera
        this.svgClipRect = document.createElementNS(SVG_NS, "rect");

        let svgClipId;

        if (viewport.editMode) {
            // In edit mode, we set up a mask outside the clipping rectangle.
            // This value allows to set the opacity of the mask.
            this.maskValue = 0;

            const svgMask = document.createElementNS(SVG_NS, "mask");
            svgClipId = viewport.makeUniqueId("sozi-mask-");
            svgMask.setAttribute("id", svgClipId);
            viewport.svgRoot.appendChild(svgMask);

            this.svgMaskRect = document.createElementNS(SVG_NS, "rect");
            svgMask.appendChild(this.svgMaskRect);

            this.svgClipRect.setAttribute("fill", "white");
            svgMask.appendChild(this.svgClipRect);

            // We also define two rectangles that will show the outline
            // of the clipped region in alternating white and black dashes.
            this.svgClipOutlineRect1 = document.createElementNS(SVG_NS, "rect");
            this.svgClipOutlineRect1.setAttribute("stroke", "black");
            this.svgClipOutlineRect1.setAttribute("fill", "none");
            viewport.svgRoot.appendChild(this.svgClipOutlineRect1);

            this.svgClipOutlineRect2 = document.createElementNS(SVG_NS, "rect");
            this.svgClipOutlineRect2.setAttribute("stroke", "white");
            this.svgClipOutlineRect2.setAttribute("fill", "none");
            this.svgClipOutlineRect2.setAttribute("stroke-dasharray", "2,2");
            viewport.svgRoot.appendChild(this.svgClipOutlineRect2);

            this.concealClipping();
        }
        else {
            // When playing the presentation, we use the default SVG
            // clipping technique.
            const svgClipPath = document.createElementNS(SVG_NS, "clipPath");
            svgClipId = viewport.makeUniqueId("sozi-clip-path-");
            svgClipPath.setAttribute("id", svgClipId);
            svgClipPath.appendChild(this.svgClipRect);
            viewport.svgRoot.appendChild(svgClipPath);
        }

        // The groups that will support transformations
        this.svgTransformGroups = layer.svgNodes.map(svgNode => {
            // The group that will support the clipping operation
            const svgClippedGroup = document.createElementNS(SVG_NS, "g");
            viewport.svgRoot.insertBefore(svgClippedGroup, svgNode);

            if (viewport.editMode) {
                svgClippedGroup.setAttribute("mask", "url(#" + svgClipId + ")");
            }
            else {
                svgClippedGroup.setAttribute("clip-path", "url(#" + svgClipId + ")");
            }

            const svgGroup = document.createElementNS(SVG_NS, "g");
            svgGroup.appendChild(svgNode);
            svgClippedGroup.appendChild(svgGroup);
            return svgGroup;
        });
    }

    revealClipping() {
        this.maskValue = 64;
        this.svgClipOutlineRect1.style.display = "inline";
        this.svgClipOutlineRect2.style.display = "inline";
    }

    concealClipping() {
        this.maskValue = 0;
        this.svgClipOutlineRect1.style.display = "none";
        this.svgClipOutlineRect2.style.display = "none";
    }

    get scale() {
        return Math.min(this.viewport.width / this.width, this.viewport.height / this.height);
    }

    rotate(angle) {
        this.restoreAspectRatio();
        this.angle += angle;
        this.update();
    }

    zoom(factor, x, y) {
        this.width /= factor;
        this.height /= factor;
        this.restoreAspectRatio();
        this.translate(
            (1 - factor) * (x - this.viewport.width  / 2),
            (1 - factor) * (y - this.viewport.height / 2)
        );
    }

    translate(deltaX, deltaY) {
        const scale = this.scale;
        const angleRad = this.angle * Math.PI / 180;
        const si = Math.sin(angleRad);
        const co = Math.cos(angleRad);
        this.cx -= (deltaX * co - deltaY * si) / scale;
        this.cy -= (deltaX * si + deltaY * co) / scale;
        this.restoreAspectRatio();
        this.update();
    }

    clip(x0, y0, x1, y1) {
        this.clipped = true;
        const scale = this.scale;
        const clipWidth = Math.abs(x1 - x0) + 1;
        const clipHeight = Math.abs(y1 - y0) + 1;
        this.clipXOffset = (Math.min(x0, x1) - (this.viewport.width  - clipWidth)  / 2) * this.width  / clipWidth;
        this.clipYOffset = (Math.min(y0, y1) - (this.viewport.height - clipHeight) / 2) * this.height / clipHeight;
        this.clipWidthFactor  = clipWidth  / this.width  / scale;
        this.clipHeightFactor = clipHeight / this.height / scale;
        this.update();
    }

    restoreAspectRatio() {
        const viewportRatio = this.viewport.width / this.viewport.height;
        const camRatio = this.width / this.height;
        const ratio = viewportRatio / camRatio;
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
    }

    getCandidateReferenceElement() {
        // getIntersectionList is not supported in Gecko
        if (!this.layer.svgNodes.length || !this.svgRoot.getIntersectionList) {
            return {element: null, score: null};
        }

        // Get all elements that intersect with the viewport.
        const viewportRect = this.svgRoot.createSVGRect();
        viewportRect.x = 0;
        viewportRect.y = 0;
        viewportRect.width = this.viewport.width;
        viewportRect.height = this.viewport.height;
        const viewportArea = this.viewport.width * this.viewport.height;

        const intersectionList = this.svgRoot.getIntersectionList(viewportRect, this.layer.svgNodes[0]);

        // Find the element which bounding box best fits in the viewport.
        let element = null;
        let score = null;

        for (let i = 0; i < intersectionList.length; i ++) {
            const elt = intersectionList[i];
            if (elt.hasAttribute("id")) {
                // TODO getBoundingClientRect returns bounding box of bounding box
                const eltRect = elt.getBoundingClientRect();
                const eltArea = eltRect.width * eltRect.height;

                // Compute the intersection of the element's bounding
                // box with the current viewport.
                const l = Math.max(eltRect.left, this.viewport.x);
                const t = Math.max(eltRect.top, this.viewport.y);
                const r = Math.min(eltRect.right, this.viewport.x + this.viewport.width);
                const b = Math.min(eltRect.bottom, this.viewport.y + this.viewport.height);

                const intersectArea = (r - l) * (b - t);

                // An element is selected if it has the biggest intersect area
                // and the smallest area outside the intersection.
                const eltScore = viewportArea + eltArea - 2 * intersectArea;
                if (score === null || eltScore < score) {
                    score = eltScore;
                    element = elt;
                }
            }
        }

        return {element, score};
    }

    get clipRect() {
        let width, height, x, y;
        if (this.clipped) {
            const scale = this.scale;
            width = Math.round(this.width  * this.clipWidthFactor  * scale);
            height = Math.round(this.height * this.clipHeightFactor * scale);
            x = Math.round((this.viewport.width  - width)  / 2 + this.clipXOffset * this.clipWidthFactor  * scale);
            y = Math.round((this.viewport.height - height) / 2 + this.clipYOffset * this.clipHeightFactor * scale);
        }
        else {
            width = this.viewport.width;
            height = this.viewport.height;
            x = 0;
            y = 0;
        }
        return {width, height, x, y};
    }

    update() {
        // Adjust the location and size of the clipping rectangle
        const rect = this.clipRect;
        this.svgClipRect.setAttribute("x", rect.x);
        this.svgClipRect.setAttribute("y", rect.y);
        this.svgClipRect.setAttribute("width",  rect.width);
        this.svgClipRect.setAttribute("height", rect.height);

        if (this.viewport.editMode) {
            this.svgMaskRect.setAttribute("fill", "rgb(" + this.maskValue + "," + this.maskValue + "," + this.maskValue + ")");
            this.svgMaskRect.setAttribute("x", 0);
            this.svgMaskRect.setAttribute("y", 0);
            this.svgMaskRect.setAttribute("width",  this.viewport.width);
            this.svgMaskRect.setAttribute("height", this.viewport.height);

            this.svgClipOutlineRect1.setAttribute("x", rect.x);
            this.svgClipOutlineRect1.setAttribute("y", rect.y);
            this.svgClipOutlineRect1.setAttribute("width",  rect.width);
            this.svgClipOutlineRect1.setAttribute("height", rect.height);

            this.svgClipOutlineRect2.setAttribute("x", rect.x);
            this.svgClipOutlineRect2.setAttribute("y", rect.y);
            this.svgClipOutlineRect2.setAttribute("width",  rect.width);
            this.svgClipOutlineRect2.setAttribute("height", rect.height);
        }

        // Compute and apply the geometrical transformation to the layer group
        const scale = this.scale;
        const translateX = this.viewport.width  / scale / 2 - this.cx;
        const translateY = this.viewport.height / scale / 2 - this.cy;

        for (let svgGroup of this.svgTransformGroups) {
            svgGroup.setAttribute("transform",
                "scale(" + scale + ")" +
                "translate(" + translateX + "," + translateY + ")" +
                "rotate(" + (-this.angle) + ',' + this.cx + "," + this.cy + ")"
            );
            svgGroup.setAttribute("opacity", this.opacity);
        }
    }

    interpolate(initialState, finalState, progress, timingFunction, relativeZoom, svgPath, reversePath) {
        const tfProgress = timingFunction(progress);
        const tfRemaining = 1 - tfProgress;

        function linear(initial, final) {
            return final * tfProgress + initial * tfRemaining;
        }

        function quadratic(u0, u1) {
            const um = (relativeZoom > 0 ? Math.min(u0, u1) : Math.max(u0, u1)) * (1 - relativeZoom);
            const du0 = u0 - um;
            const du1 = u1 - um;
            const r = Math.sqrt(du0 / du1);
            const tm = r / (1 + r);
            const k = du0 / tm / tm;
            const dt = progress - tm;
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
            const pathLength   = svgPath.getTotalLength();
            const startPoint   = svgPath.getPointAtLength(reversePath ? pathLength : 0);
            const endPoint     = svgPath.getPointAtLength(reversePath ? 0 : pathLength);
            const currentPoint = svgPath.getPointAtLength(pathLength * (reversePath ? tfRemaining : tfProgress));

            this.cx = currentPoint.x + linear(initialState.cx - startPoint.x, finalState.cx - endPoint.x);
            this.cy = currentPoint.y + linear(initialState.cy - startPoint.y, finalState.cy - endPoint.y);
        }
        else {
            this.cx = linear(initialState.cx, finalState.cx);
            this.cy = linear(initialState.cy, finalState.cy);
        }

        // Interpolate opacity
        this.opacity = linear(initialState.opacity, finalState.opacity);

        // Interpolate camera angle
        // Keep the smallest angle between the initial and final states
        if (finalState.angle - initialState.angle > 180) {
            this.angle = linear(initialState.angle, finalState.angle - 360);
        }
        else if (finalState.angle - initialState.angle < -180) {
            this.angle = linear(initialState.angle - 360, finalState.angle);
        }
        else {
            this.angle = linear(initialState.angle, finalState.angle);
        }

        // Interpolate clip rectangle
        this.clipped = true;
        const scale = this.scale;
        const clipDefaults = {
            clipXOffset: 0,
            clipYOffset: 0,
            clipWidthFactor:  this.viewport.width  / this.width  / scale,
            clipHeightFactor: this.viewport.height / this.height / scale
        };
        const initialClipping = initialState.clipped ? initialState : clipDefaults;
        const finalClipping   = finalState.clipped   ? finalState   : clipDefaults;
        for (let clipProp in clipDefaults) {
            this[clipProp] = linear(initialClipping[clipProp], finalClipping[clipProp]);
        }
    }
}
