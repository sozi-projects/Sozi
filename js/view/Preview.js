/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const PREVIEW_MARGIN = 15;

export const Preview = {

    init(container, presentation, selection, viewport, controller) {
        this.container = container;
        this.presentation = presentation;
        this.selection = selection;
        this.viewport = viewport;
        this.controller = controller;

        controller.addListener("loadSVG", () => this.onLoadSVG());
        window.addEventListener("resize", () => this.repaint());

        return this;
    },

    onLoadSVG() {
        this.viewport.addListener("click", () => this.onClick());
        this.viewport.addListener("userChangeState", () => this.controller.updateCameraStates());
        this.controller.addListener("repaint", () => this.repaint());
        this.container.addEventListener("mouseenter", () => this.onMouseEnter(), false);
        this.container.addEventListener("mouseleave", () => this.onMouseLeave(), false);

        // Set the window title to the presentation title
        document.querySelector("html head title").innerHTML = this.presentation.title;

        // Replace the content of the preview area with the SVG document
        while(this.container.hasChildNodes()) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(this.presentation.document.root);

        this.viewport.onLoad();
    },

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

        if (this.viewport.svgRoot) {
            this.viewport.repaint();
        }
    },

    onClick(button, evt) {
        if (button === 0 && evt.altKey) {
            const referenceElement = evt.target;
            if (referenceElement.hasAttribute("id") && referenceElement.getBBox) {
                this.controller.setReferenceElement(referenceElement);
            }
        }
    },

    /*
     * When the mouse enters the preview area,
     * show the document outside the clipping rectangle
     * and show the hidden SVG elements.
     */
    onMouseEnter() {
        this.viewport.cameras.forEach(camera => {
            if (camera.selected) {
                camera.revealClipping();
            }
        });
        this.viewport.showHiddenElements = true;
        this.viewport.repaint();
    },

    /*
     * When the mouse leaves the preview area,
     * hide the document outside the clipping rectangle
     * and hide the hidden SVG elements.
     */
    onMouseLeave() {
        this.viewport.cameras.forEach(camera => {
            if (camera.selected) {
                camera.concealClipping();
            }
        });
        this.viewport.showHiddenElements = false;
        this.viewport.repaint();
    }
};
