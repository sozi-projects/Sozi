/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {CameraState} from "../model/CameraState";

/** Constant: the XML SVG namespace URI.
 *
 * @type {string}
 */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Check that an SVG element is usable as a reference element.
 *
 * The function helps work around a bug in web browsers where text elements
 * are known to return unreliable bounding box data.
 *
 * @param {SVGElement} elt - An SVG element to check.
 * @returns {boolean} - `true` if the element can be used as a reference element.
 */
export function hasReliableBoundaries(elt) {
    return !/text|textpath|tspan/i.test(elt.tagName);
}

/** Get a list of graphics elements in the given element.
 *
 * If `elt` is a group, return a list of its children, non-group, graphics elements.
 * If `elt` is another graphics element, return a list with this element.
 *
 * @param {SVGElement} elt - An SVG element to inspect.
 * @returns {SVGElement[]} - A list of graphics elements.
 */
function getGraphicsElements(elt) {
    // Skip <defs> elements. We need to handle this case because
    // SVGDefsElement inherits from SVGGraphicsElement.
    if (elt instanceof SVGDefsElement) {
        return [];
    }

    // Collect graphics elements inside groups.
    if (elt instanceof SVGGElement) {
        return Array.from(elt.childNodes).map(getGraphicsElements).flat();
    }

    // Return a graphics element that has and ID and consistent positioning information.
    if (elt instanceof SVGGraphicsElement) {
        return [elt];
    }

    return [];
}

/** Camera.
 *
 * @extends module:model/CameraState.CameraState
 */
export class Camera extends CameraState {

    /** Initialize a new camera.
     *
     * @param {module:player/Viewport.Viewport} viewport - The viewport attached to this camera.
     * @param {module:model/Presentation.Layer} layer - The layer where this camera operates.
     */
    constructor(viewport, layer) {
        super(viewport.svgRoot);

        /** The viewport attached to this camera.
         *
         * @type {module:player/Viewport.Viewport}
         */
        this.viewport = viewport;

        /** The layer where this camera operates.
         *
         * @type {module:model/Presentation.Layer}
         */
        this.layer = layer;

        /** Is the layer for this camera selected for manipulation by the user?
         *
         * When playing the presentation, all cameras are always selected.
         *
         * @default
         * @type {boolean}
         */
        this.selected = true;

        /** The clipping rectangle of this camera.
         *
         * @type {SVGRectElement}
         */
        this.svgClipRect = document.createElementNS(SVG_NS, "rect");

        let svgClipId;

        if (viewport.editMode) {
            /** In edit mode, the opacity of the mask outside the clipping rectangle.
             *
             * @default
             * @type {number}
             */
            this.maskValue = 0;

            const svgMask = document.createElementNS(SVG_NS, "mask");
            svgClipId = viewport.makeUniqueId("sozi-mask-");
            svgMask.setAttribute("id", svgClipId);
            viewport.svgRoot.appendChild(svgMask);

            /** In edit mode, a rectangle that will be combined to the clipping rectangle to create a mask.
             *
             * @type {SVGRectElement}
             */
            this.svgMaskRect = document.createElementNS(SVG_NS, "rect");
            svgMask.appendChild(this.svgMaskRect);

            this.svgClipRect.setAttribute("fill", "white");
            svgMask.appendChild(this.svgClipRect);

            /** A rectangle with black stroke that indicates the boundary of the clipped region.
             *
             * This rectangle is painted below {@linkcode module:player/Camera.Camera#svgClipOutlineRect2|svgClipOutlineRect2}
             * to create an alternating black-and-white pattern.
             *
             * @type {SVGRectElement}
             */
            this.svgClipOutlineRect1 = document.createElementNS(SVG_NS, "rect");
            this.svgClipOutlineRect1.setAttribute("stroke", "black");
            this.svgClipOutlineRect1.setAttribute("fill", "none");
            viewport.svgRoot.appendChild(this.svgClipOutlineRect1);

            /** A rectangle with dashed white stroke that indicates the boundary of the clipped region.
             *
             * This rectangle is painted over {@linkcode module:player/Camera.Camera#svgClipOutlineRect1|svgClipOutlineRect1}
             * to create an alternating black-and-white pattern.
             *
             * @type {SVGRectElement}
             */
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

        /** The groups that will support transformations.
         *
         * One SVG group is created for each group listed in each layer.
         *
         * @type {SVGGElement[]}
         */
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

    /** Show the clipping rectangle and its surroundings.
     *
     * This method makes the clipping rectangle visible and dims the
     * elements outside this rectangle by making the clipping mask partially
     * transparent.
     *
     * @see {@linkcode module:player/Camera.Camera#maskValue|maskValue}
     * @see {@linkcode module:player/Camera.Camera#svgClipOutlineRect2|svgClipOutlineRect1}
     * @see {@linkcode module:player/Camera.Camera#svgClipOutlineRect2|svgClipOutlineRect2}
     */
    revealClipping() {
        this.maskValue = 64;
        this.svgClipOutlineRect1.style.display = "initial";
        this.svgClipOutlineRect2.style.display = "initial";
    }

    /** Hide the clipping rectangle and its surroundings.
     *
     * This method makes the clipping rectangle invisible and masks the
     * elements outside this rectangle.
     *
     * @see {@linkcode module:player/Camera.Camera#maskValue|maskValue}
     * @see {@linkcode module:player/Camera.Camera#svgClipOutlineRect2|svgClipOutlineRect1}
     * @see {@linkcode module:player/Camera.Camera#svgClipOutlineRect2|svgClipOutlineRect2}
     */
    concealClipping() {
        this.maskValue = 0;
        this.svgClipOutlineRect1.style.display = "none";
        this.svgClipOutlineRect2.style.display = "none";
    }

    /** The scaling factor applied to this camera to fit the viewport.
     *
     * @readonly
     * @type {number}
     */
    get scale() {
        return Math.min(this.viewport.width / this.width, this.viewport.height / this.height);
    }

    /** Rotate this camera.
     *
     * @param {number} angle - The rotation angle, in degrees.
     */
    rotate(angle) {
        this.restoreAspectRatio();
        this.angle += angle;
        this.update();
    }

    /** Zoom by a given factor.
     *
     * A zoom-in operation will shrink the width and height of the image
     * seen by this camera.
     * It will be automatically scaled to fit the viewport.
     *
     * @param {number} factor - The scaling factor, above 1 to zoom in, below 1 to zoom out.
     * @param {number} x - The X coordinate of the transformation center (this point will not move during the operation).
     * @param {number} y - The Y coordinate of the transformation center (this point will not move during the operation).
     */
    zoom(factor, x, y) {
        this.width /= factor;
        this.height /= factor;
        this.restoreAspectRatio();
        this.translate(
            (1 - factor) * (x - this.viewport.width  / 2),
            (1 - factor) * (y - this.viewport.height / 2)
        );
    }

    /** Translate the canvas.
     *
     * The given coordinates represent the displacement of the canvas,
     * e.g. when the user uses a drag-and-drop gesture.
     * For this reason, they are negated when computing the new coordinates
     * of this camera.
     *
     * The translation is applied after the rotation and zoom.
     *
     * @param {number} deltaX - The displacement along the X axis.
     * @param {number} deltaY - The displacement along the Y axis.
     */
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

    /** Clip the image seen by the camera.
     *
     * This method will set the `clipped` property to `true`
     * and will compute the geometry of the clipping rectangle.
     *
     * @param {number} x0 - The X coordinate of the first corner of the clipping rectangle.
     * @param {number} y0 - The Y coordinate of the first corner of the clipping rectangle.
     * @param {number} x1 - The X coordinate of the opposite corner of the clipping rectangle.
     * @param {number} y1 - The Y coordinate of the opposite corner of the clipping rectangle.
     */
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

    /** Update the dimensions of the image to match the aspect ratio of the viewport. */
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

    /** Find an SVG element that can be used as an anchor for this camera.
     *
     * When the SVG is modified, the reference element will be used to
     * recalculate to location, rotation, ans scaling factor of this camera.
     *
     * The reference element is selected according to these criteria:
     * - It must be completely, or partially, visible in the field of this camera.
     * - Its bounding box has the biggest intersection area with the viewport, and the smallest area outside the viewport.
     *
     * @returns {object} - An object `{element, score}` with an SVG element and a number that indicates how well the element fits the viewport.
     */
    getCandidateReferenceElement() {
        // Get all elements that intersect with the viewport.
        const viewportArea     = this.viewport.width * this.viewport.height;
        const viewportRect     = this.svgRoot.createSVGRect();
        viewportRect.x         = 0;
        viewportRect.y         = 0;
        viewportRect.width     = this.viewport.width;
        viewportRect.height    = this.viewport.height;

        // Fallback for getIntersectionList not supported in Gecko
        const intersectionList = this.svgRoot.getIntersectionList ?
            this.svgRoot.getIntersectionList(viewportRect, this.layer.svgNodes[0]) :
            getGraphicsElements(this.layer.svgNodes[0]);

        if (!intersectionList.length) {
            return {element: null, score: null};
        }

        // Find the element whose bounding box best fits in the viewport.
        let element = null;
        let score   = null;

        for (let elt of intersectionList) {
            if (elt.hasAttribute("id") && hasReliableBoundaries(elt) && !elt.closest("defs")) {
                // FIXME getBoundingClientRect returns bounding box of bounding box
                const eltRect = elt.getBoundingClientRect();

                // Candidate elements are ranked by the "distance" between their
                // bounding rectangle and the viewport.
                const dl = this.viewport.x                        - eltRect.left;
                const dt = this.viewport.y                        - eltRect.top;
                const dr = this.viewport.x + this.viewport.width  - eltRect.right;
                const db = this.viewport.y + this.viewport.height - eltRect.bottom;
                const eltScore = dl * dl + dt * dt + dr * dr + db * db;

                if (score === null || eltScore < score) {
                    score   = eltScore;
                    element = elt;
                }
            }
        }

        return {element, score};
    }

    /** The geometry of the clipping rectangle.
     *
     * @returns {object} - An object of the form `{width, height, x, y}` where `x` and `y` are the coordinates of the top-left corner.
     */
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

    /** Update the current layer of the SVG document to reflect the properties of this camera.
     *
     * This method applies geometrical transformations to the current layer,
     * and updates the clipping rectangles and mask.
     */
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
            // Do not render the layer if it is completely transparent.
            // This does not apply in edit mode, where getCandidateReferenceElement
            // needs the layer to be rendered even if invisible.
            if (!this.viewport.editMode) {
                svgGroup.style.display = this.opacity === 0 ? "none" : "initial";
            }
        }
    }

    /** Update this camera by interpolating between two camera states.
     *
     * This method is typically used when animating a transition between two
     * frames of a Sozi presentation.
     *
     * @param {module:model/CameraState.CameraState} initialState - The initial camera state.
     * @param {module:model/CameraState.CameraState} finalState - The final camera state.
     * @param {number} progress - The relative time already elapsed between the initial and final states (between 0 and 1).
     * @param {Function} timingFunction - A function that maps the progress indicator to the relative distance already completed between the initial and final states (between 0 and 1).
     * @param {number} relativeZoom - An additional zooming factor to apply during the transition.
     * @param {SVGPathElement} svgPath - An SVG path to follow during the transition.
     * @param {boolean} reversePath - If `true`, follow the path in the opposite direction.
     */
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
