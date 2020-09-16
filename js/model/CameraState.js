/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/** Copy a property from an object to another.
 *
 * If the source object has a property with the given name,
 * this property is copied to the target object.
 *
 * @param {object} dest - The destination object.
 * @param {object} src - The source object.
 * @param {string} prop - The name of the property to copy.
 */
function copyIfSet(dest, src, prop) {
    if (src.hasOwnProperty(prop)) {
        dest[prop] = src[prop];
    }
}

/** Camera state.
 *
 * This class models the state of a camera in the context of a Sozi document.
 * It is attached to a given SVG document and contains the properties that need
 * to be stored in the Sozi presentation file.
 *
 * @see {@linkcode module:player/Camera.Camera|Camera} for a camera implementation in the context of the Sozi player.
 */
export class CameraState {
    /** Initialize a new camera state object.
     *
     * If the argument is a camera state, this constructor will create a copy of
     * of that state.
     * If the argument is an SVG root element, a camera state with default properties
     * will be created.
     *
     * @param {(CameraState|SVGSVGElement)} obj - A camera state to copy, or an SVG root element.
     */
    constructor(obj) {
        if (obj instanceof CameraState) {
            this.copy(obj);
        }
        else {
            const initialBBox = obj.getBBox();

            /** The root SVG element attached to this camera.
             *
             * @type {SVGSVGElement} */
            this.svgRoot = obj;

            /** The opacity level of the layer attached to this camera.
             *
             * A floating-point number between 0 and 1.
             *
             * @default
             * @type {number} */
            this.opacity = 1.0;

            /** Indicates that the content outside a specified rectangle must be clipped.
             *
             * @default
             * @type {boolean} */
            this.clipped = false;

            /** The horizontal offset of the clipping rectangle with respect to the current camera location.
             *
             * @default
             * @type {number} */
            this.clipXOffset = 0;

            /** The vertical offset of the clipping rectangle with respect to the current camera location.
             *
             * @default
             * @type {number} */
            this.clipYOffset = 0;

            /** The width of the clipping rectangle with respect to the width of the image seen by the camera.
             *
             * @default
             * @type {number} */
            this.clipWidthFactor = 1;

            /** The height of the clipping rectangle with respect to the height of the image seen by the camera.
             *
             * @default
             * @type {number} */
            this.clipHeightFactor = 1;

            /** The horizontal coordinate of the camera.
             *
             * This is also the horizontal coordinate of the center of the image seen by the camera.
             *
             * @default The center of the bounding box of the SVG content.
             * @type {number} */
            this.cx = initialBBox.x + initialBBox.width / 2;

            /** The vertical coordinate of the camera.
             *
             * This is also the vertical coordinate of the center of the image seen by the camera.
             *
             * @default The center of the bounding box of the SVG content.
             * @type {number} */
            this.cy = initialBBox.y + initialBBox.height / 2;

            // These are assigned through setters. See below.
            this.width  = initialBBox.width;
            this.height = initialBBox.height;
            this.angle  = 0;
        }
    }

    /** Copy another camera state into the current instance.
     *
     * @param {module:model/CameraState.CameraState} state - The camera state to copy.
     */
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

    /** The width of the image seen by the camera.
     *
     * Cannot be lower than 1.
     *
     * @default The width of the bounding box of the SVG content.
     * @type {number}
     */
    get width() {
        return this._width;
    }

    set width(w) {
        this._width = !isNaN(w) && w >= 1 ? w : 1;
    }

    /** The height of the image seen by the camera.
     *
     * Cannot be lower than 1.
     *
     * @default The height of the bounding box of the SVG content.
     * @type {number} */
    get height() {
        return this._height;
    }

    set height(h) {
        this._height = !isNaN(h) && h >= 1 ? h : 1;
    }

    /** The rotation angle applied to the camera, in degrees.
     *
     * The angle is automatically normalized in the interval [-180 ; 180].
     *
     * @default 0
     * @type {number}
     */
    get angle() {
        return this._angle;
    }

    set angle(a) {
        this._angle = !isNaN(a) ? (a + 180) % 360 : 180;
        if (this._angle < 0) {
            this._angle += 180;
        }
        else {
            this._angle -= 180;
        }
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains all the properties needed by the editor to restore
     * the state of this instance.
     *
     * @returns {object} - A plain object with the properties needed by the editor.
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

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains only the properties needed by the Sozi player to
     * show and animate the presentation.
     *
     * @returns {object} - A plain object with the properties needed by the player.
     */
    toMinimalStorable() {
        return this.toStorable();
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {object} storable - A plain object with the properties to copy.
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

    /** Fit the current camera state to the given SVG element.
     *
     * The default behavior is to fit the image seen by the camera to the bounding
     * box of the SVG element.
     * Translation, scaling and rotation may be applied.
     *
     * @see {@linkcode module:model/CameraState.CameraState#offsetFromElement|offsetFromElement}
     * @see {@linkcode module:model/CameraState.CameraState#applyOffset|applyOffset}
     *
     * @param {SVGElement} svgElement - The target SVG element.
     * @param {number} [deltaX=0] - An horizontal offset from the center of the SVG element.
     * @param {number} [deltaY=0] - A vertical offset from the center of the SVG element.
     * @param {number} [widthFactor=1] - A scaling factor applied to the width of the SVG element.
     * @param {number} [heightFactor=1] - A scaling factor applied to the height of the SVG element.
     * @param {number} [deltaAngle=0] - A relative angle from the orientation of the SVG element.
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

    /** Set the clipping properties to their default values.
     *
     * This method will fit the clipping rectangle to the image seen by the camera.
     */
    resetClipping() {
        this.clipXOffset     = this.clipYOffset      = 0;
        this.clipWidthFactor = this.clipHeightFactor = 1;
    }

    /** Compute a transformation from the bounding box of an SVG element to the current camera state.
     *
     * The result has the same type as the argument of {@linkcode module:model/CameraState.CameraState#applyOffset|applyOffset}.
     *
     * @see {@linkcode module:model/CameraState.CameraState#setAtElement|setAtElement}
     *
     * @param {SVGElement} svgElement - A source SVG element.
     * @returns {object} - The translation coordinates, scaling factors, and rotation angle.
     */
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

    /** Apply a transformation to the current camera state.
     *
     * This method accepts an object with the same type as the result of
     * {@linkcode module:model/CameraState.CameraState#offsetFromElement|offsetFromElement}.
     *
     * @see {@linkcode module:model/CameraState.CameraState#setAtElement|setAtElement}
     *
     * @param {object} arg - A transformation object to apply.
     * @param {number} arg.deltaX - An horizontal offset from the center of the SVG element.
     * @param {number} arg.deltaY - A vertical offset from the center of the SVG element.
     * @param {number} arg.widthFactor - A scaling factor applied to the width of the SVG element.
     * @param {number} arg.heightFactor - A scaling factor applied to the height of the SVG element.
     * @param {number} arg.deltaAngle - A relative angle from the orientation of the SVG element.
     */
    applyOffset({deltaX, deltaY, widthFactor, heightFactor, deltaAngle}) {
        this.cx -= deltaX;
        this.cy -= deltaY;
        this.width /= widthFactor;
        this.height /= heightFactor;
        this.angle -= deltaAngle;
    }
}
