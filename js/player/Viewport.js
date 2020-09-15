/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {Camera} from "./Camera";
import {EventEmitter} from "events";

/** The mouse button for the drag action.
 *
 * 0 is the left button.
 *
 * @readonly
 * @default
 * @type {number} */
const DRAG_BUTTON = 0;

/** The minimum distance to detect a drag action, in pixels.
 *
 * @readonly
 * @default
 * @type {number} */
const DRAG_THRESHOLD_PX = 5;

/** The zoom step factor for user zoom action (keyboard and mouse wheel).
 *
 * @readonly
 * @default
 * @type {number} */
const SCALE_FACTOR = 1.05;

/** The rotation step angle for user rotate action (keyboard and mouse wheel), in degrees.
 *
 * @readonly
 * @default
 * @type {number} */
const ROTATE_STEP = 5;

/** The delay after the last mouse wheel event to consider that the wheel action is terminated, in milliseconds.
 *
 * @readonly
 * @default
 * @type {number} */
const WHEEL_TIMEOUT_MS = 200;

/** The thickness of the rectangle where the mouse can resize the clipping rectangle.
 *
 * @readonly
 * @default
 * @type {number} */
const CLIP_BORDER = 3;

/** Signals a mouse click in a viewport.
 *
 * @event module:player/Viewport.click
 */

/** Signals a mouse button press in a viewport.
 *
 * @event module:player/Viewport.mouseDown
 */

/** Signals the possible start of a drag gesture in a viewport.
 *
 * @event module:player/Viewport.dragStart
 */

/** Signals the end of a drag gesture in a viewport.
 *
 * @event module:player/Viewport.dragEnd
 */

/** Signals a user-activated change in the camera states of a viewport.
 *
 * @event module:player/Viewport.userChangeState
 */

/** Viewing area for Sozi presentation.
 *
 * @extends EventEmitter
 */
export class Viewport extends EventEmitter {

    /** Initialize a new viewport for the given presentation.
     *
     * @param {module:model/Presentation.Presentation} presentation - The presentations to display.
     * @param {boolean} editMode - Is the presentation opened in an editor?
     */
    constructor(presentation, editMode) {
        super();

        /** The presentations to display.
         *
         * @type {module:model/Presentation.Presentation} */
        this.presentation = presentation;

        /** Is the presentation opened in an editor?
         *
         * @type {boolean} */
        this.editMode = !!editMode;

        /** The cameras that operate in this viewport.
         *
         * @default
         * @type {module:player/Camera.Camera[]} */
        this.cameras = [];

        /** The current X coordinate of the mous during a drag action.
         *
         * @default
         * @type {number} */
        this.mouseDragX = 0;

        /** The current Y coordinate of the mous during a drag action.
         *
         * @default
         * @type {number} */
        this.mouseDragY = 0;

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

        /** A timeout ID to detect the end of a mouse wheel gesture.
         *
         * @default
         * @type {?number} */
        this.wheelTimeout = null;

        /** The mouse drag event handler.
         *
         * This function is registered as an event listener after
         * a mouse-down event.
         *
         * @listens mousemove
         * @param {MouseEvent} evt - A DOM event.
         * @returns {void} */
        this.dragHandler = evt => this.onDrag(evt);

        /** The mouse drag end event handler.
         *
         * This function is registered as an event listener after
         * a mouse-down event.
         *
         * @listens mouseup
         * @param {MouseEvent} evt - A DOM event.
         * @returns {void} */
        this.dragEndHandler = evt => this.onDragEnd(evt);
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
        this.svgRoot.addEventListener("mousedown", evt => this.onMouseDown(evt), false);
        this.svgRoot.addEventListener("mousemove", evt => this.onMouseMove(evt), false);
        this.svgRoot.addEventListener("contextmenu", evt => this.onContextMenu(evt), false);

        const wheelEvent =
            "onwheel" in document.createElement("div") ? "wheel" :  // Modern browsers support "wheel"
            document.onmousewheel !== undefined ? "mousewheel" :    // Webkit and IE support at least "mousewheel"
            "DOMMouseScroll";                                       // Firefox < 17
        this.svgRoot.addEventListener(wheelEvent, evt => this.onWheel(evt), false);

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

    /** Process a right-click in this viewport.
     *
     * This method forwards the `contextmenu` event as a
     * viewport {@linkcode module:player/Viewport.click|click} event.
     *
     * @listens contextmenu
     * @fires module:player/Viewport.click
     * @param {MouseEvent} evt - A DOM event.
     */
    onContextMenu(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        this.emit("click", 2, evt);
    }

    /** Process a mouse move event in this viewport.
     *
     * This method changes the mouse cursor shape depending on the current mode.
     *
     * @listens mousemove
     * @param {MouseEvent} evt - A DOM event.
     */
    onMouseMove(evt) {
        if (this.dragMode === "clip") {
            switch (this.getClipMode(evt).operation) {
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

    /** Process a mouse down event in this viewport.
     *
     * If the mouse button pressed is the left button,
     * this method will setup event listeners for detecting a drag action.
     *
     * @listens mousedown
     * @fires module:player/Viewport.mouseDown
     * @param {MouseEvent} evt - A DOM event.
     */
    onMouseDown(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if (evt.button === DRAG_BUTTON) {
            this.mouseDragged = false;
            this.mouseDragChangedState = false;
            this.mouseDragX = this.mouseDragStartX = evt.clientX;
            this.mouseDragY = this.mouseDragStartY = evt.clientY;

            document.documentElement.addEventListener("mousemove", this.dragHandler, false);
            document.documentElement.addEventListener("mouseup", this.dragEndHandler, false);

            if (this.dragMode === "clip") {
                this.clipMode = this.getClipMode(evt);
            }
        }

        this.emit("mouseDown", evt.button);
    }

    /** Detect the current clip mode depending on the current mouse location.
     *
     * This method will compare the current mouse coordinates with the borders
     * of the clipping rectangle of each camera, and decide which clipping
     * operation is in progress on which cameras.
     *
     * @see {@linkcode module:player/Viewport.Viewport#clipMode|clipMode}
     * @param {MouseEvent} evt - A DOM event containing the current mouse coordinates.
     * @returns {object} - A list of cameras and a clipping operation.
     */
    getClipMode(evt) {
        const x = evt.clientX - this.x;
        const y = evt.clientY - this.y;

        const camerasByOperation = {
            nw: [],
            sw: [],
            ne: [],
            se: [],
            w: [],
            e: [],
            n: [],
            s: [],
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

    /** Process a mouse drag event.
     *
     * This method is called when a mouse move event happens after a mouse down event.
     *
     * @listens mousemove
     * @fires module:player/Viewport.dragStart
     * @param {MouseEvent} evt - A DOM event.
     */
    onDrag(evt) {
        evt.stopPropagation();

        const xFromCenter = evt.clientX - this.x - this.width / 2;
        const yFromCenter = evt.clientY - this.y - this.height / 2;
        let angle = 180 * Math.atan2(yFromCenter, xFromCenter) / Math.PI;
        let translateX = evt.clientX;
        let translateY = evt.clientY;
        const zoom = Math.sqrt(xFromCenter * xFromCenter + yFromCenter * yFromCenter);
        const deltaX = evt.clientX - this.mouseDragX;
        const deltaY = evt.clientY - this.mouseDragY;

        // The drag action is confirmed when one of the mouse coordinates
        // has moved past the threshold
        if (!this.mouseDragged && (Math.abs(deltaX) > DRAG_THRESHOLD_PX ||
                                   Math.abs(deltaY) > DRAG_THRESHOLD_PX)) {
            this.mouseDragged = true;

            this.rotateStart = this.rotatePrev = angle;
            this.translateStartX = this.translateXPrev = translateX;
            this.translateStartY = this.translateYPrev = translateY;
            this.zoomPrev = zoom;

            this.emit("dragStart");
        }

        if (this.mouseDragged) {
            let mode = this.dragMode;
            if (mode == "translate") {
                if (evt.altKey) {
                    mode = "scale";
                }
                else if (evt.shiftKey) {
                    mode = "rotate";
                }
            }

            switch (mode) {
                case "scale":
                    if (this.editMode || this.presentation.enableMouseZoom) {
                        if (this.zoomPrev !== 0) {
                            this.zoom(zoom / this.zoomPrev, this.width / 2, this.height / 2);
                            this.mouseDragChangedState = true;
                        }
                        this.zoomPrev = zoom;
                    }
                    break;

                case "rotate":
                    if (this.editMode || this.presentation.enableMouseRotation) {
                        if (evt.ctrlKey) {
                            angle = 10 * Math.round((angle - this.rotateStart) / 10) + this.rotateStart;
                        }
                        this.rotate(this.rotatePrev - angle);
                        this.mouseDragChangedState = true;
                        this.rotatePrev = angle;
                    }
                    break;

                case "clip":
                    switch (this.clipMode.operation) {
                        case "select":
                            this.clip(this.mouseDragStartX - this.x, this.mouseDragStartY - this.y,
                                      this.mouseDragX      - this.x, this.mouseDragY      - this.y);
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
                    this.mouseDragChangedState = true;
                    break;

                default: // case "translate":
                    if (this.editMode || this.presentation.enableMouseTranslation) {
                        if (evt.ctrlKey) {
                            if (Math.abs(translateX - this.translateStartX) >= Math.abs(translateY - this.translateStartY)) {
                                translateY = this.translateStartY;
                            }
                            else {
                                translateX = this.translateStartX;
                            }
                        }
                        this.translate(translateX - this.translateXPrev, translateY - this.translateYPrev);
                        this.mouseDragChangedState = true;
                        this.translateXPrev = translateX;
                        this.translateYPrev = translateY;
                    }
            }
            this.mouseDragX = evt.clientX;
            this.mouseDragY = evt.clientY;
        }
    }

    /** Process a drag end event.
     *
     * This method is called when a mouse up event happens after a mouse down event.
     * If the mouse has been moved past the drag threshold, this method
     * will fire a `dragEnd` event. Otherwise, it will fire a `click` event.
     *
     * @listens mouseup
     * @fires module:player/Viewport.userChangeState
     * @fires module:player/Viewport.dragEnd
     * @fires module:player/Viewport.click
     * @param {MouseEvent} evt - A DOM event
     */
    onDragEnd(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if (evt.button === DRAG_BUTTON) {
            if (this.mouseDragged) {
                this.emit("dragEnd");
                if (this.mouseDragChangedState) {
                    this.emit("userChangeState");
                }
            }
            else {
                this.emit("click", evt.button, evt);
            }

            document.documentElement.removeEventListener("mousemove", this.dragHandler, false);
            document.documentElement.removeEventListener("mouseup", this.dragEndHandler, false);
        }
        else {
            this.emit("click", evt.button, evt);
        }
    }

    /** Process a mouse wheel event in this viewport.
     *
     * The effect of the mouse wheel depends on the state of the Shift key:
     *    - released: zoom in and out,
     *    - pressed: rotate clockwise or counter-clockwise
     *
     * @fires module:player/Viewport.userChangeState
     * @param {WheelEvent} evt - A DOM event.
     */
    onWheel(evt) {
        if (this.wheelTimeout !== null) {
            window.clearTimeout(this.wheelTimeout);
        }

        evt.stopPropagation();
        evt.preventDefault();

        let delta = 0;
        if (evt.wheelDelta) {   // "mousewheel" event
            delta = evt.wheelDelta;
        }
        else if (evt.detail) {  // "DOMMouseScroll" event
            delta = -evt.detail;
        }
        else {                  // "wheel" event
            delta = -evt.deltaY;
        }

        let changed = false;

        if (delta !== 0) {
            if (evt.shiftKey) {
                // TODO rotate around mouse cursor
                if (this.editMode || this.presentation.enableMouseRotation) {
                    this.rotate(delta > 0 ? ROTATE_STEP : -ROTATE_STEP);
                    changed = true;
                }
            }
            else {
                if (this.editMode || this.presentation.enableMouseZoom) {
                    this.zoom(delta > 0 ? SCALE_FACTOR : 1/SCALE_FACTOR, evt.clientX - this.x, evt.clientY - this.y);
                    changed = true;
                }
            }
        }

        if (changed) {
            this.wheelTimeout = window.setTimeout(() => {
                this.wheelTimeout = null;
                this.emit("userChangeState");
            }, WHEEL_TIMEOUT_MS);
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
     * @see {@linkcode module:player/Camera.Camera#zoom}
     * @param {number} factor - The scaling factor, above 1 to zoom in, below 1 to zoom out.
     * @param {number} x - The X coordinate of the transformation center (this point will not move during the operation).
     * @param {number} y - The Y coordinate of the transformation center (this point will not move during the operation).
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
     * @see {@linkcode module:player/Camera.Camera#rotate}
     * @param {number} angle - The rotation angle, in degrees.
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
     * @see {@linkcode module:player/Camera.Camera#clip}
     * @param {number} x0 - The X coordinate of the first corner of the clipping rectangle.
     * @param {number} y0 - The Y coordinate of the first corner of the clipping rectangle.
     * @param {number} x1 - The X coordinate of the opposite corner of the clipping rectangle.
     * @param {number} y1 - The Y coordinate of the opposite corner of the clipping rectangle.
     */
    clip(x0, y0, x1, y1) {
        for (let camera of this.clipMode.cameras) {
            camera.clip(x0, y0, x1, y1);
        }
    }

    /** Update the clipping rectangles for all selected cameras.
     *
     * @see {@linkcode module:player/Camera.Camera#clip}
     * @param {number} w - The X offset with respect to the west border.
     * @param {number} n - The Y offset with respect to the north border.
     * @param {number} e - The X offset with respect to the east border.
     * @param {number} s - The Y offset with respect to the south border.
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
