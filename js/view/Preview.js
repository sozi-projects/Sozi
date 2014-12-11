/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", function (exports) {
    "use strict";

    var PREVIEW_MARGIN = 15;

    exports.Preview = {

        init: function (container, presentation, selection, viewport, controller) {
            this.container = container;
            this.presentation = presentation;
            this.selection = selection;
            this.viewport = viewport;
            this.controller = controller;

            // Setup event handlers
            var repaintHandler = this.repaint.bind(this);
            $(window).resize(repaintHandler);
            controller.addListener("repaint", repaintHandler);
            controller.addListener("load", this.onLoad.bind(this));

            $("#sozi-editor-aspect-width, #sozi-editor-aspect-height").change(this.onChangeAspectRatio.bind(this));
            $("input[name=sozi-editor-preview-mode][type=radio]").change(this.onChangeDragMode.bind(this));

            this.viewport.addListener("click", this.onClick.bind(this));
            this.viewport.addListener("userChangeState", controller.updateCameraStates.bind(controller));

            return this;
        },

        onChangeAspectRatio: function () {
            this.controller.setAspectRatio(parseInt($("#sozi-editor-aspect-width").val()), parseInt($("#sozi-editor-aspect-height").val()));
        },

        onLoad: function () {
            this.container.addEventListener("mouseenter", this.onMouseEnter.bind(this), false);
            this.container.addEventListener("mouseleave", this.onMouseLeave.bind(this), false);
        },

        onChangeDragMode: function () {
            this.viewport.dragMode = $("input[name=sozi-editor-preview-mode][type=radio]:checked").val();
        },

        repaint: function () {
            $("#sozi-editor-aspect-width").val(this.presentation.aspectWidth);
            $("#sozi-editor-aspect-height").val(this.presentation.aspectHeight);

            var parent = $(this.container).parent();
            var parentWidth  = parent.innerWidth();
            var parentHeight = parent.innerHeight();

            var maxWidth  = parentWidth  - 2 * PREVIEW_MARGIN;
            var maxHeight = parentHeight - 2 * PREVIEW_MARGIN;

            var width  = Math.min(maxWidth, maxHeight * this.presentation.aspectWidth / this.presentation.aspectHeight);
            var height = Math.min(maxHeight, maxWidth * this.presentation.aspectHeight / this.presentation.aspectWidth);

            $(this.container).css({
                left:   (parentWidth  - width)  / 2 + "px",
                top:    (parentHeight - height) / 2 + "px",
                width:  width + "px",
                height: height + "px"
            });

            if (this.selection.currentFrame) {
                this.viewport.setAtStates(this.selection.currentFrame.cameraStates);
            }

            this.viewport.repaint();
        },

        onClick: function (button, evt) {
            if (button === 0 && evt.altKey) {
                var referenceElement = evt.target;
                if (referenceElement.hasAttribute("id") && referenceElement.getBBox) {
                    this.viewport.cameras.forEach(function (camera) {
                        if (camera.selected) {
                            this.controller.setReferenceElement(this.viewport.cameras.indexOf(camera), referenceElement);
                        }
                    }, this);
                }
            }
        },

        /*
         * When the mouse enters the preview area,
         * show the document outside the clipping rectangle
         * and show the hidden SVG elements.
         */
        onMouseEnter: function () {
            this.viewport.cameras.forEach(function (camera) {
                if (camera.selected) {
                    camera.maskValue = 64;
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
        onMouseLeave: function () {
            this.viewport.cameras.forEach(function (camera) {
                if (camera.selected) {
                    camera.maskValue = 0;
                }
            });
            this.viewport.showHiddenElements = false;
            this.viewport.repaint();
        }
    };
});
