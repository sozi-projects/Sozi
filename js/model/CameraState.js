/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function copyIfSet(dest, src, prop) {
    if (src.hasOwnProperty(prop)) {
        dest[prop] = src[prop];
    }
}

/** Camera state.
 *
 * @category model
 * @todo Add documentation.
 */
export class CameraState {
    constructor(obj) {
        if (obj instanceof CameraState) {
            this.copy(obj);
        }
        else {
            const initialBBox     = obj.getBBox();
            this.svgRoot          = obj;
            this.opacity          = 1.0;
            this.clipped          = false;
            this.clipXOffset      = 0;
            this.clipYOffset      = 0;
            this.clipWidthFactor  = 1;
            this.clipHeightFactor = 1;
            this.cx               = initialBBox.x + initialBBox.width / 2;
            this.cy               = initialBBox.y + initialBBox.height / 2;
            this.width            = initialBBox.width;
            this.height           = initialBBox.height;
            this.angle            = 0;
        }
    }

    copy(state) {
        this.svgRoot          = state.svgRoot;
        this.cx               = state.cx;
        this.cy               = state.cy;
        this.width            = state.width;
        this.height           = state.height;
        this.opacity          = state.opacity;
        this.angle            = state.angle;
        this.clipped          = state.clipped;
        this.clipXOffset      = state.clipXOffset;
        this.clipYOffset      = state.clipYOffset;
        this.clipWidthFactor  = state.clipWidthFactor;
        this.clipHeightFactor = state.clipHeightFactor;
    }

    set width(w) {
        this._width = !isNaN(w) && w >= 1 ? w : 1;
    }

    get width() {
        return this._width;
    }

    set height(h) {
        this._height = !isNaN(h) && h >= 1 ? h : 1;
    }

    get height() {
        return this._height;
    }

    /*
     * Set the angle of the current camera state.
     * The angle of the current state is normalized
     * in the interval [-180 ; 180]
     */
    set angle(a) {
        this._angle = !isNaN(a) ? (a + 180) % 360 : 180;
        if (this._angle < 0) {
            this._angle += 180;
        }
        else {
            this._angle -= 180;
        }
    }

    get angle() {
        return this._angle;
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * @return A plain object with the properties that need to be saved.
     */
    toStorable() {
        return {
            cx              : this.cx,
            cy              : this.cy,
            width           : this.width,
            height          : this.height,
            opacity         : this.opacity,
            angle           : this.angle,
            clipped         : this.clipped,
            clipXOffset     : this.clipXOffset,
            clipYOffset     : this.clipYOffset,
            clipWidthFactor : this.clipWidthFactor,
            clipHeightFactor: this.clipHeightFactor
        };
    }

    toMinimalStorable() {
        return this.toStorable();
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {Object} storable A plain object with the properties to copy.
     */
    fromStorable(storable) {
        copyIfSet(this, storable, "cx");
        copyIfSet(this, storable, "cy");
        copyIfSet(this, storable, "width");
        copyIfSet(this, storable, "height");
        copyIfSet(this, storable, "opacity");
        copyIfSet(this, storable, "angle");
        copyIfSet(this, storable, "clipped");
        copyIfSet(this, storable, "clipXOffset");
        copyIfSet(this, storable, "clipYOffset");
        copyIfSet(this, storable, "clipWidthFactor");
        copyIfSet(this, storable, "clipHeightFactor");
    }

    /*
     * Set the current camera's properties to the given SVG element.
     *
     * Otherwise, the properties of the frame are based on the bounding box
     * of the given element.
     *
     * Parameters:
     *    - svgElement: an element from the SVG DOM
     */
    setAtElement(svgElement, deltaX = 0, deltaY = 0, widthFactor = 1, heightFactor = 1, deltaAngle = 0) {
        // Read the raw bounding box of the given SVG element
        const bbox = svgElement.getBBox();

        // Compute the raw coordinates of the center
        // of the given SVG element
        let bboxCenter = this.svgRoot.createSVGPoint();
        bboxCenter.x = bbox.x + bbox.width  / 2;
        bboxCenter.y = bbox.y + bbox.height / 2;

        // Find the transform group corresponding to the layer
        // that contains the given element
        let layerGroup = svgElement;
        while (layerGroup.parentNode.parentNode !== this.svgRoot) {
            layerGroup = layerGroup.parentNode;
        }

        // Compute the coordinates of the center of the given SVG element
        // after its current transformation
        const matrix = layerGroup.getCTM().inverse().multiply(svgElement.getCTM());
        bboxCenter = bboxCenter.matrixTransform(matrix);

        // Compute the scaling factor applied to the given SVG element
        const scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);

        // Update the camera to match the bounding box information of the
        // given SVG element after its current transformation
        this.cx     = bboxCenter.x + deltaX;
        this.cy     = bboxCenter.y + deltaY;
        this.width  = bbox.width  * scale * widthFactor;
        this.height = bbox.height * scale * heightFactor;
        this.angle  = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + deltaAngle;
    }

    resetClipping() {
        this.clipXOffset     = this.clipYOffset      = 0;
        this.clipWidthFactor = this.clipHeightFactor = 1;
    }

    offsetFromElement(svgElement) {
        const cam = new CameraState(this.svgRoot);
        cam.setAtElement(svgElement);
        return {
            deltaX: this.cx - cam.cx,
            deltaY: this.cy - cam.cy,
            widthFactor: this.width / cam.width,
            heightFactor: this.height / cam.height,
            deltaAngle: this.angle - cam.angle
        };
    }

    applyOffset({deltaX, deltaY, widthFactor, heightFactor, deltaAngle}) {
        this.cx -= deltaX;
        this.cy -= deltaY;
        this.width /= widthFactor;
        this.height /= heightFactor;
        this.angle -= deltaAngle;
    }
}
