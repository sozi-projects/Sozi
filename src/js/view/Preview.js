/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

const PREVIEW_MARGIN = 15;

/** The preview area in the presentation editor. */
export class Preview {
    /** Initialize a new preview area.
     *
     * This method registers the event handlers for the preview area of the presentation editor.
     *
     * @param {HTMLElement} container - The HTML element that will contain this preview area.
     * @param {module:model/Presentation.Presentation} presentation - The current Sozi presentation.
     * @param {module:model/Selection.Selection} selection - The object that manages the frame and layer selection.
     * @param {module:player/Viewport.Viewport} viewport - The viewport where the presentation is displayed.
     * @param {module:Controller.Controller} controller - The controller that manages the current editor.
     * @param {module:player/PlayerController.PlayerController} playerController - The controller that manages the player user interactions.
     */
    constructor(container, presentation, selection, viewport, controller, playerController) {
        /** The HTML element that will contain this preview area.
         *
         * @type {HTMLElement}
         */
        this.container = container;

        /** The current Sozi presentation.
         *
         * @type {module:model/Presentation.Presentation}
         */
        this.presentation = presentation;

        /** The object that manages the frame and layer selection.
         *
         * @type {module:model/Selection.Selection}
         */
        this.selection = selection;

        /** The viewport where the presentation is displayed.
         *
         * @type {module:player/Viewport.Viewport}
         */
        this.viewport = viewport;

        /** The controller that manages the current editor.
         *
         * @type {module:Controller.Controller}
         */
        this.controller = controller;

        /** The controller that manages the player user interactions.
         *
         * @type {module:player/PlayerController.PlayerController}
         */
        this.playerController = playerController;

        presentation.on("svgChange", () => this.onLoad());
        window.addEventListener("resize", () => this.repaint());
        playerController.on("mouseDown", () => document.activeElement.blur());
        playerController.on("click", evt => this.onClick(evt));
        playerController.on("localViewportChange", () => controller.updateCameraStates());
        controller.on("repaint", () => this.repaint());
    }

    /** Reset the preview area when a presentation is loaded or reloaded.
     *
     * @listens module:model/Presentation.svgChange
     */
    onLoad() {
        // Set the window title to the presentation title
        document.querySelector("html head title").innerHTML = this.presentation.title;

        // Replace the content of the preview area with the SVG document
        while(this.container.hasChildNodes()) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(this.presentation.document.root);

        this.viewport.onLoad();
        this.playerController.onLoad();
        this.presentation.setInitialCameraState();

        this.container.addEventListener("mouseenter", () => this.onMouseEnter(), false);
        this.container.addEventListener("mouseleave", () => this.onMouseLeave(), false);
    }

    /** Refresh this preview area on resize and repaint events.
     *
     * This method will update the geometry of the preview area,
     * realign all cameras and repaint the viewport.
     *
     * @listens resize
     * @listens module:Controller.repaint
     *
     * @see {@linkcode module:player/Viewport.Viewport#repaint}
     */
    repaint() {
        // this.container is assumed to have padding: 0
        const parentWidth  = this.container.parentNode.clientWidth;
        const parentHeight = this.container.parentNode.clientHeight;

        const maxWidth  = parentWidth  - 2 * PREVIEW_MARGIN;
        const maxHeight = parentHeight - 2 * PREVIEW_MARGIN;

        const width  = Math.min(maxWidth, maxHeight * this.presentation.aspectWidth / this.presentation.aspectHeight);
        const height = Math.min(maxHeight, maxWidth * this.presentation.aspectHeight / this.presentation.aspectWidth);

        this.container.style.left   = (parentWidth  - width)  / 2 + "px";
        this.container.style.top    = (parentHeight - height) / 2 + "px";
        this.container.style.width  = width + "px";
        this.container.style.height = height + "px";

        if (this.selection.currentFrame) {
            this.viewport.setAtStates(this.selection.currentFrame.cameraStates);
        }

        if (this.viewport.ready) {
            this.viewport.repaint();
        }
    }

    /** Choose an outline element on an Alt+click event in this preview area.
     *
     * @param {MouseEvent} evt - A DOM event.
     *
     * @listens click
     */
    onClick(evt) {
        if (evt.button === 0 && evt.altKey) {
            const outlineElement = evt.target;
            if (outlineElement.hasAttribute("id") && outlineElement.getBBox) {
                this.controller.setOutlineElement(outlineElement);
            }
        }
    }

    /** When the mouse hovers the preview area, reveal the clipping rectangle.
     *
     * @listens mouseenter
     *
     * @see {@linkcode module:player/Camera.Camera#revealClipping}
     */
    onMouseEnter() {
        for (let camera of this.viewport.cameras) {
            if (camera.selected) {
                camera.revealClipping();
            }
        }
        this.viewport.showHiddenElements = true;
        this.viewport.repaint();
    }

    /** When the mouse leaves the preview area, conceal the clipping rectangle.
     *
     * @listens mouseleave
     *
     * @see {@linkcode module:player/Camera.Camera#concealClipping}
     */
    onMouseLeave() {
        for (let camera of this.viewport.cameras) {
            if (camera.selected) {
                camera.concealClipping();
            }
        }
        this.viewport.showHiddenElements = false;
        this.viewport.repaint();
    }
}
