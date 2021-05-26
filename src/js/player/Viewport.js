/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {Camera} from "./Camera";

/** The thickness of the rectangle where the mouse can resize the clipping rectangle.
 *
 * @readonly
 * @default
 * @type {number} */
const CLIP_BORDER = 3;

/** Viewing area for Sozi presentation. */
export class Viewport {

    /** Initialize a new viewport for the given presentation.
     *
     * @param {module:model/Presentation.Presentation} presentation - The presentations to display.
     */
    constructor(presentation) {
        /** The presentations to display.
         *
         * @type {module:model/Presentation.Presentation} */
        this.presentation = presentation;

        /** The cameras that operate in this viewport.
         *
         * @default
         * @type {module:player/Camera.Camera[]} */
        this.cameras = [];

        /** The effect of dragging in this viewport.
         *
         * Acceptable values are: `"scale"`, `"translate"`, `"rotate"`, `"clip"`.
         *
         * @default
         * @type {string} */
        this.dragMode = "translate";

        /** A description of the current clipping modification.
         *
         * Supported operations are:
         * - `"select"`: draw a new clipping rectangle.
         * - `"move"`: move the current clipping rectangle.
         * - `"n"`, `"s"`, `"e"`, `"w"`: move the north, south, east, or west border of the current clipping rectangle.
         * - `"ne"`, `"nw"`, `"se"`, `"sw"`: move the north-east, north-west, south-east, or south-west corner of the current clipping rectangle.
         *
         * @default
         * @type {object}
         * @property {module:player/Camera.Camera[]} cameras - The cameras affected by the clipping operation.
         * @property {string} operation - The type of modification in progress.
         */
        this.clipMode = {cameras: [], operation: "select"};

        /** Should the viewport reveal the hidden SVG elements?
         *
         * @default
         * @type {boolean} */
        this.showHiddenElements = false;
    }

    /** Create a unique SVG element ID.
     *
     * The result is an identifier with the given prefix followed
     * by a random integer.
     * This method always creates an ID that is not taken in the current
     * SVG document.
     *
     * @param {string} prefix - A string to use as a prefix in the resulting ID.
     * @returns {string} - A new unique ID.
     */
    makeUniqueId(prefix) {
        let suffix = Math.floor(1000 * (1 + 9 * Math.random()));
        let id;
        do {
            id = prefix + suffix;
            suffix ++;
        } while(this.svgRoot.getElementById(id));
        return id;
    }

    /** Complete the initialization of this viewport when the document has been loaded.
     *
     * This method registers event handlers and creates a camera for each layer.
     */
    onLoad() {
        this.cameras = this.presentation.layers.map(layer => new Camera(this, layer));
    }

    /** Is this viewport ready to for a repaint operation?
     *
     * @readonly
     * @type {boolean}
     */
    get ready() {
        return !!(this.presentation.document && this.presentation.document.root);
    }

    /** The SVG root element.
     *
     * @readonly
     * @type {SVGSVGElement}
     */
    get svgRoot() {
        return this.presentation.document.root;
    }

    /** Get a layer of the document.
     *
     * @param {string} nodeId - The ID of an SVG group.
     * @returns {module:model/Presentation.Layer} - A layer representation.
     */
    getLayer(nodeId) {
        return this.layers.filter(layer => layer.nodeId === nodeId)[0];
    }

    /** Changes the mouse cursor shape depending on the current mode.
     *
     * @param {number} clientX - the current mouse x coordinate.
     * @param {number} clientY - the current mouse y coordinate.
     */
    updateClipCursor(clientX, clientY) {
        const x = clientX - this.x;
        const y = clientY - this.y;

        if (this.dragMode === "clip") {
            switch (this.getClipMode(x,y).operation) {
                case "select":
                    this.svgRoot.style.cursor = "crosshair";
                    break;
                case "n":
                case "s":
                    this.svgRoot.style.cursor = "ns-resize";
                    break;
                case "w":
                case "e":
                    this.svgRoot.style.cursor = "ew-resize";
                    break;
                case "nw":
                case "se":
                    this.svgRoot.style.cursor = "nwse-resize";
                    break;
                case "ne":
                case "sw":
                    this.svgRoot.style.cursor = "nesw-resize";
                    break;
                case "move":
                    this.svgRoot.style.cursor = "move";
                    break;
                default:
                    this.svgRoot.style.cursor = "default";
            }
        }
        else {
            this.svgRoot.style.cursor = "default";
        }
    }

    /** Updates the clip mode according to the current dragMode.
     *
     * @param {number} clientX - the current mouse x coordinate.
     * @param {number} clientY - the current mouse y coordinate.
     */
    updateClipMode(clientX,clientY) {
        if (this.dragMode === "clip") {
            this.clipMode = this.getClipMode(clientX,clientY);
        }
    }

    /** Detect the current clip mode depending on the current mouse location.
     *
     * This method will compare the current mouse coordinates with the borders
     * of the clipping rectangle of each camera, and decide which clipping
     * operation is in progress on which cameras.
     *
     * @param {number} x - the current mouse x coordinate.
     * @param {number} y - the current mouse y coordinate.
     * @returns {object} - A list of cameras and a clipping operation.
     *
     * @see {@linkcode module:player/Viewport.Viewport#clipMode|clipMode}
     */
    getClipMode(x,y) {
        const camerasByOperation = {
            nw:   [],
            sw:   [],
            ne:   [],
            se:   [],
            w:    [],
            e:    [],
            n:    [],
            s:    [],
            move: []
        };

        const selectedCameras = this.cameras.filter(camera => camera.selected);

        for (let camera of selectedCameras) {
            const rect = camera.clipRect;
            if (x >= rect.x - CLIP_BORDER && x <= rect.x + rect.width  + CLIP_BORDER &&
                y >= rect.y - CLIP_BORDER && y <= rect.y + rect.height + CLIP_BORDER) {
                const w = x <= rect.x + CLIP_BORDER;
                const e = x >= rect.x + rect.width - CLIP_BORDER - 1;
                const n = y <= rect.y + CLIP_BORDER;
                const s = y >= rect.y + rect.height - CLIP_BORDER - 1;
                const operation =
                    w || e || n || s ?
                        (n ? "n" : s ? "s" : "") +
                        (w ? "w" : e ? "e" : "") :
                        "move";
                camerasByOperation[operation].push(camera);
            }
        }

        for (let operation in camerasByOperation) {
            if (camerasByOperation[operation].length) {
                return {
                    cameras: camerasByOperation[operation],
                    operation: operation
                };
            }
        }

        return {
            cameras: selectedCameras,
            operation: "select"
        };
    }

    /** Clips with respect to the current clipMode settings and within the bounds of a continiously modified rectangle.
     *
     * This is typically used during onscreen manipulation such as mouse drags.
     *
     * @param {number} startX - The x position of the rectangles origin in viewport coordinate pixels.
     * @param {number} startY - The y position of the rectangles origin in viewport coordinate pixels.
     * @param {number} currentX - The x position of the rectangles diagonal point in viewport coordinate pixels.
     * @param {number} currentY - The y position of the rectangles diagonal point in viewport coordinate pixels.
     * @param {number} deltaX - The horizontal displacement to the last diagonal x point in viewport coordinate pixels.
     * @param {number} deltaY - The horizontal displacement to the last diagonal y point in viewport coordinate pixels.
     *
     */
    clipByMode(startX, startY, currentX, currentY, deltaX, deltaY) {
        switch (this.clipMode.operation) {
            case "select":
                this.clip(startX, startY, currentX, currentY);
                break;
            case "move":
                this.clipRel(deltaX, deltaY, deltaX, deltaY);
                break;
            case "w":
                this.clipRel(deltaX, 0, 0, 0);
                break;
            case "e":
                this.clipRel(0, 0, deltaX, 0);
                break;
            case "n":
                this.clipRel(0, deltaY, 0, 0);
                break;
            case "s":
                this.clipRel(0, 0, 0, deltaY);
                break;
            case "nw":
                this.clipRel(deltaX, deltaY, 0, 0);
                break;
            case "ne":
                this.clipRel(0, deltaY, deltaX, 0);
                break;
            case "sw":
                this.clipRel(deltaX, 0, 0, deltaY);
                break;
            case "se":
                this.clipRel(0, 0, deltaX, deltaY);
                break;
        }
    }

    /** The X coordinate of the current viewport in the current browser window.
     *
     * If the SVG is a standalone document, the returned value is 0.
     *
     * @readonly
     * @type {number}
     */
    get x() {
        return this.svgRoot.getScreenCTM().e;
    }

    /** The Y coordinate of the current viewport in the current browser window.
     *
     * If the SVG is a standalone document, the returned value is 0.
     *
     * @readonly
     * @type {number}
     */
    get y() {
        return this.svgRoot.getScreenCTM().f;
    }

    /** The width of the current viewport.
     *
     * If the SVG is inlined in an HTML document, the returned width
     * includes the padding width of the container.
     *
     * If the SVG is a standalone document, the returned width is the
     * window's inner width.
     *
     * @readonly
     * @type {number}
     */
    get width() {
        return this.svgRoot === document.documentElement ?
            window.innerWidth :
            this.svgRoot.parentNode.clientWidth;
    }

    /** The height of the current viewport.
     *
     * If the SVG is inlined in an HTML document, the returned height
     * includes the padding height of the container.
     *
     * If the SVG is a standalone document, the returned height is the
     * window's inner height.
     *
     * @readonly
     * @type {number}
     */
    get height() {
        return this.svgRoot === document.documentElement ?
            window.innerHeight :
            this.svgRoot.parentNode.clientHeight;
    }

    /** Repaint the current viewport.
     *
     * This method updates:
     * - the dimensions of the SVG document,
     * - all cameras,
     * - the visibility of all hidden elements.
     */
    repaint() {
        this.svgRoot.setAttribute("width", this.width);
        this.svgRoot.setAttribute("height", this.height);

        this.update();

        for (let id of this.presentation.elementsToHide) {
            const elt = document.getElementById(id);
            if (elt) {
                elt.style.visibility = this.showHiddenElements ? "visible" : "hidden";
            }
        }
    }

    /** Update all cameras in the current viewport.
     *
     * @see {@linkcode module:player/Camera.Camera#update}
     */
    update() {
        for (let camera of this.cameras) {
            camera.update();
        }
    }

    /** Set the states of the cameras of the current viewport.
     *
     * @param {module:model/CameraState.CameraState[]} states - The camera states to copy.
     */
    setAtStates(states) {
        states.forEach((state, index) => {
            this.cameras[index].copy(state);
        });
    }

    /** Apply an additional translation to the SVG document based on onscreen coordinates.
     *
     * This method delegates to the cameras of the currently selected layers.
     *
     * @param {number} deltaX - The horizontal displacement, in pixels.
     * @param {number} deltaY - The vertical displacement, in pixels.
     */
    translate(deltaX, deltaY) {
        for (let camera of this.cameras) {
            if (camera.selected) {
                camera.translate(deltaX, deltaY);
            }
        }
    }

    /** Zooms the content of this viewport with the given factor.
     *
     * The zoom is centered around (`x`, `y`).
     *
     * @param {number} factor - The scaling factor, above 1 to zoom in, below 1 to zoom out.
     * @param {number} x - The X coordinate of the transformation center (this point will not move during the operation).
     * @param {number} y - The Y coordinate of the transformation center (this point will not move during the operation).
     *
     * @see {@linkcode module:player/Camera.Camera#zoom}
     */
    zoom(factor, x, y) {
        for (let camera of this.cameras) {
            if (camera.selected) {
                camera.zoom(factor, x, y);
            }
        }
    }

    /** Rotate the content of this viewport with the given angle.
     *
     * The rotation is centered around the center of the display area.
     *
     * @param {number} angle - The rotation angle, in degrees.
     *
     * @see {@linkcode module:player/Camera.Camera#rotate}
     */
    rotate(angle) {
        for (let camera of this.cameras) {
            if (camera.selected) {
                camera.rotate(angle);
            }
        }
    }

    /** Clip the content of this viewport.
     *
     * @param {number} x0 - The X coordinate of the first corner of the clipping rectangle.
     * @param {number} y0 - The Y coordinate of the first corner of the clipping rectangle.
     * @param {number} x1 - The X coordinate of the opposite corner of the clipping rectangle.
     * @param {number} y1 - The Y coordinate of the opposite corner of the clipping rectangle.
     *
     * @see {@linkcode module:player/Camera.Camera#clip}
     */
    clip(x0, y0, x1, y1) {
        for (let camera of this.clipMode.cameras) {
            camera.clip(x0, y0, x1, y1);
        }
    }

    /** Update the clipping rectangles for all selected cameras.
     *
     * @param {number} w - The X offset with respect to the west border.
     * @param {number} n - The Y offset with respect to the north border.
     * @param {number} e - The X offset with respect to the east border.
     * @param {number} s - The Y offset with respect to the south border.
     *
     * @see {@linkcode module:player/Camera.Camera#clip}
     */
    clipRel(w, n, e, s) {
        for (let camera of this.clipMode.cameras) {
            const rect = camera.clipRect;
            if (w <= rect.width + e - 1 && n <= rect.height + s - 1) {
                camera.clip(rect.x + w,
                            rect.y + n,
                            rect.x + rect.width + e - 1,
                            rect.y + rect.height + s - 1);
            }
        }
    }
}
