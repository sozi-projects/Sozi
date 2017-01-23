/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Camera} from "./Camera";
import {EventEmitter} from "events";

// Use left mouse button to drag
const DRAG_BUTTON = 0;

// Minimum distance to detect a drag action
const DRAG_THRESHOLD_PX = 5;

// Zoom factor for user zoom action (keyboard and mouse wheel)
const SCALE_FACTOR = 1.05;

// Rotation step for user rotate action (keyboard and mouse wheel)
const ROTATE_STEP = 5;

// The delay after the last mouse wheel event
// to consider that the wheel action is terminated
const WHEEL_TIMEOUT_MS = 200;

const CLIP_BORDER = 3;

export const Viewport = Object.create(EventEmitter.prototype);

/*
 * Initialize a new viewport for the given SVG root element.
 *
 * Parameters:
 *    - svgRoot: The SVG root element
 *
 * Returns:
 *    - The current viewport.
 */
Viewport.init = function (presentation, editMode) {
    EventEmitter.call(this);

    this.presentation = presentation;
    this.editMode = !!editMode;
    this.cameras = [];
    this.mouseDragX = 0;
    this.mouseDragY = 0;
    this.dragMode = "translate";
    this.clipMode = {cameras: [], operation: "select"};
    this.showHiddenElements = false;
    this.wheelTimeout = null;

    // Setup mouse and keyboard event handlers.
    this.dragHandler = () => this.onDrag();
    this.dragEndHandler = () => this.onDragEnd();

    return this;
};

Viewport.makeUniqueId = function (prefix) {
    let suffix = Math.floor(1000 * (1 + 9 * Math.random()));
    let id;
    do {
        id = prefix + suffix;
        suffix ++;
    } while(this.svgRoot.getElementById(id));
    return id;
};

Viewport.onLoad = function () {
    this.svgRoot.addEventListener("mousedown", () => this.onMouseDown(), false);
    this.svgRoot.addEventListener("mousemove", () => this.onMouseMove(), false);
    this.svgRoot.addEventListener("contextmenu", () => this.onContextMenu(), false);

    const wheelEvent =
        "onwheel" in document.createElement("div") ? "wheel" :  // Modern browsers support "wheel"
        document.onmousewheel !== undefined ? "mousewheel" :    // Webkit and IE support at least "mousewheel"
        "DOMMouseScroll";                                       // Firefox < 17
    this.svgRoot.addEventListener(wheelEvent, () => this.onWheel(), false);

    this.cameras = this.presentation.layers.map(layer => Object.create(Camera).init(this, layer));

    return this;
};

Object.defineProperty(Viewport, "svgRoot", {
    get() {
        return this.presentation.document.root;
    }
});

Viewport.getLayer = function (nodeId) {
    return this.layers.filter(layer => layer.nodeId === nodeId)[0];
};

Viewport.onContextMenu = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
    this.emit("click", 2, evt);
};

Viewport.onMouseMove = function (evt) {
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
};

/*
 * Event handler: mouse down.
 *
 * If the mouse button pressed is the left button,
 * this method will setup event listeners for detecting a drag action.
 *
 * Parameters:
 *    - evt: The DOM event object
 *
 * Fires:
 *    - mouseDown(button)
 */
Viewport.onMouseDown = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();

    if (evt.button === DRAG_BUTTON) {
        this.mouseDragged = false;
        this.mouseDragX = this.mouseDragStartX = evt.clientX;
        this.mouseDragY = this.mouseDragStartY = evt.clientY;

        document.documentElement.addEventListener("mousemove", this.dragHandler, false);
        document.documentElement.addEventListener("mouseup", this.dragEndHandler, false);

        if (this.dragMode === "clip") {
            this.clipMode = this.getClipMode(evt);
        }
    }

    this.emit("mouseDown", evt.button);
};

Viewport.getClipMode = function (evt) {
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

    selectedCameras.forEach(camera => {
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
    });

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
};

/*
 * Event handler: mouse move after mouse down.
 *
 * Parameters:
 *    - evt: The DOM event object
 *
 * Fires:
 *    - dragStart
 */
Viewport.onDrag = function (evt) {
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
                if (this.zoomPrev !== 0) {
                    this.zoom(zoom / this.zoomPrev, this.width / 2, this.height / 2);
                }
                this.zoomPrev = zoom;
                break;
            case "rotate":
                if (evt.ctrlKey) {
                    angle = 10 * Math.round((angle - this.rotateStart) / 10) + this.rotateStart;
                }
                this.rotate(this.rotatePrev - angle);
                this.rotatePrev = angle;
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
                break;
            default: // case "translate":
                if (evt.ctrlKey) {
                    if (Math.abs(translateX - this.translateStartX) >= Math.abs(translateY - this.translateStartY)) {
                        translateY = this.translateStartY;
                    }
                    else {
                        translateX = this.translateStartX;
                    }
                }
                this.translate(translateX - this.translateXPrev, translateY - this.translateYPrev);
                this.translateXPrev = translateX;
                this.translateYPrev = translateY;
        }
        this.mouseDragX = evt.clientX;
        this.mouseDragY = evt.clientY;
    }
};

/*
 * Event handler: mouse up after mouse down.
 *
 * If the mouse has been moved past the drag threshold, this method
 * will fire a "dragEnd" event. Otherwise, it will fire a "click" event.
 *
 * Parameters:
 *    - evt: The DOM event object
 *
 * Fires:
 *    - dragEnd
 *    - userChangeState
 *    - click(button, event)
 */
Viewport.onDragEnd = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();

    if (evt.button === DRAG_BUTTON) {
        if (this.mouseDragged) {
            this.emit("dragEnd");
            this.emit("userChangeState");
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
};

/*
 * Event handler: mouse wheel.
 *
 * The effect of the mouse wheel depends on the state of the Shift key:
 *    - released: zoom in and out,
 *    - pressed: rotate clockwise or counter-clockwise
 *
 * Parameters:
 *    - evt: The DOM event object
 *
 * Fires:
 *    - userChangeState
 */
Viewport.onWheel = function (evt) {
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

    if (delta !== 0) {
        if (evt.shiftKey) {
            // TODO rotate around mouse cursor
            this.rotate(delta > 0 ? ROTATE_STEP : -ROTATE_STEP);
        }
        else {
            this.zoom(delta > 0 ? SCALE_FACTOR : 1/SCALE_FACTOR, evt.clientX - this.x, evt.clientY - this.y);
        }
    }

    this.wheelTimeout = window.setTimeout(() => {
        this.wheelTimeout = null;
        this.emit("userChangeState");
    }, WHEEL_TIMEOUT_MS);
};

/*
 * Get the X coordinate of the current viewport in the current browser window.
 *
 * If the SVG is a standalone document, the returned value is 0.
 *
 * Returns:
 *    - The X coordinate of the current viewport.
 */
Object.defineProperty(Viewport, "x", {
    get() {
        return this.svgRoot.getScreenCTM().e;
    }
});

/*
 * Get the Y coordinate of the current viewport in the current browser window.
 *
 * If the SVG is a standalone document, the returned value is 0.
 *
 * Returns:
 *    - The Y coordinate of the current viewport.
 */
Object.defineProperty(Viewport, "y", {
    get() {
        return this.svgRoot.getScreenCTM().f;
    }
});

/*
 * Get the width of the current viewport.
 *
 * If the SVG is inlined in an HTML document, the returned width
 * includes the padding width of the container.
 *
 * If the SVG is a standalone document, the returned width is the
 * window's inner width.
 *
 * Returns:
 *    - The width of the current viewport.
 */
Object.defineProperty(Viewport, "width", {
    get() {
        return this.svgRoot === document.documentElement ?
            window.innerWidth :
            this.svgRoot.parentNode.clientWidth;
    }
});

/*
 * Get the height of the current viewport.
 *
 * If the SVG is inlined in an HTML document, the returned height
 * includes the padding height of the container.
 *
 * If the SVG is a standalone document, the returned height is the
 * window's inner height.
 *
 * Returns:
 *    - The height of the current viewport.
 */
Object.defineProperty(Viewport, "height", {
    get() {
        return this.svgRoot === document.documentElement ?
            window.innerHeight :
            this.svgRoot.parentNode.clientHeight;
    }
});

Viewport.repaint = function () {
    this.svgRoot.setAttribute("width", this.width);
    this.svgRoot.setAttribute("height", this.height);

    this.update();

    this.presentation.elementsToHide.forEach(id => {
        const elt = document.getElementById(id);
        if (elt) {
            elt.style.visibility = this.showHiddenElements ? "visible" : "hidden";
        }
    });

    return this;
};

Viewport.update = function () {
    this.cameras.forEach(camera => {
        camera.update();
    });
    return this;
};

/*
 * Set the states of the cameras of the current viewport.
 *
 * Parameters:
 *    - states: An array of camera states
 */
Viewport.setAtStates = function (states) {
    states.forEach((state, index) => {
        this.cameras[index].initFrom(state);
    });
    return this;
};

/*
 * Apply an additional translation to the SVG document based on onscreen coordinates.
 *
 * This method delegates to the cameras of the currently selected layers.
 *
 * Parameters:
 *    - deltaX: The horizontal displacement, in pixels
 *    - deltaY: The vertical displacement, in pixels
 *
 * Returns:
 *    - The current viewport.
 */
Viewport.translate = function (deltaX, deltaY) {
    this.cameras.forEach(camera => {
        if (camera.selected) {
            camera.translate(deltaX, deltaY);
        }
    });
    return this;
};

/*
 * Zooms the display with the given factor.
 *
 * The zoom is centered around (x, y) with respect to the center of the display area.
 *
 * This method delegates to the cameras of the currently selected layers.
 *
 * Parameters:
 *    - factor: The zoom factor (relative to the current state of the viewport).
 *    - x, y: The coordinates of the center of the zoom operation.
 *
 * Returns:
 *    - The current viewport.
 */
Viewport.zoom = function (factor, x, y) {
    this.cameras.forEach(camera => {
        if (camera.selected) {
            camera.zoom(factor, x, y);
        }
    });
    return this;
};

/*
 * Rotate the display with the given angle.
 *
 * The rotation is centered around the center of the display area.
 *
 * This method delegates to the cameras of the currently selected layers.
 *
 * Parameters:
 *    - angle: The rotation angle, in degrees.
 *
 * Returns:
 *    - The current viewport.
 */
Viewport.rotate = function (angle) {
    this.cameras.forEach(camera => {
        if (camera.selected) {
            camera.rotate(angle);
        }
    });
    return this;
};

Viewport.clip = function (x0, y0, x1, y1) {
    this.clipMode.cameras.forEach(camera => {
        camera.clip(x0, y0, x1, y1);
    });
    return this;
};

Viewport.clipRel = function (w, n, e, s) {
    this.clipMode.cameras.forEach(camera => {
        const rect = camera.clipRect;
        if (w <= rect.width + e - 1 && n <= rect.height + s - 1) {
            camera.clip(rect.x + w,
                        rect.y + n,
                        rect.x + rect.width + e - 1,
                        rect.y + rect.height + s - 1);
        }
    });
    return this;
};
