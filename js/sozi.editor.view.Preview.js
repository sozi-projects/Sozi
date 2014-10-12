/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", function (exports) {
    "use strict";

    var PREVIEW_MARGIN = 15;

    exports.Preview = sozi.player.Viewport.clone({

        selection: null,
        userChange: false,
        
        init: function (pres, selection) {
            sozi.player.Viewport.init.call(this, pres);

            this.selection = selection;
            this.onChangeSelection(selection);

            // Setup event handlers
            var resizeHandler = this.bind(function () {
                this.setAspectRatio(parseInt($("#sozi-editor-aspect-num").val()), parseInt($("#sozi-editor-aspect-den").val()));
            });

            $("#sozi-editor-aspect-num, #sozi-editor-aspect-den").change(resizeHandler);
            $(window).resize(resizeHandler).resize();

            selection.addListener("change", this.onChangeSelection, this);
            this.addListener("userChangeState", this.onUserChangeState, this);
            pres.frames.addListener("add", this.onAddFrame, this);
            
            return this;
        },

        setAspectRatio: function (num, den) {
            if (num > 0 && den > 0) {
                var parent = $("#sozi-editor-view-preview").parent();
                var parentWidth  = parent.innerWidth();
                var parentHeight = parent.innerHeight();

                var maxWidth  = parentWidth  - 2 * PREVIEW_MARGIN;
                var maxHeight = parentHeight - 2 * PREVIEW_MARGIN;

                var width  = Math.min(maxWidth, maxHeight * num / den);
                var height = Math.min(maxHeight, maxWidth * den / num);

                $("#sozi-editor-view-preview").css({
                    left:   (parentWidth  - width)  / 2 + "px",
                    top:    (parentHeight - height) / 2 + "px",
                    width:  width + "px",
                    height: height + "px"
                });

                this.resize();

                this.fire("change:aspectRatio", num, den);
            }
            return this;
        },

        onAddFrame: function (collection, frame) {
            frame.cameraStates.forEach(function (cameraState, cameraIndex) {
                cameraState.addListener("change", function () {
                    if (!this.userChange) {
                        this.cameras.at(cameraIndex).copy(cameraState).update();
                    }
                }, this);
            }, this);
        },
        
        onChangeSelection: function (selection) {
            if (selection.currentFrame) {
                this.setAtStates(selection.currentFrame.cameraStates);
            }
            // A camera is selected if its layer belongs to the list of selected layers
            // or if its layer is not managed and the default layer is selected.
            this.cameras.forEach(function (camera) {
                camera.selected = selection.selectedLayers.contains(camera.layer);
            });
        },

        onUserChangeState: function () {
            var frame = this.selection.currentFrame;
            if (frame) {
                this.userChange = true;
                this.cameras.forEach(function (camera) {
                    if (camera.selected) {
                        var cameraIndex = this.cameras.indexOf(camera);
                        var layerProperties = frame.layerProperties.at(cameraIndex);
                        
                        // Update the camera states of the current frame
                        frame.cameraStates.at(cameraIndex).copy(camera);
                        
                        // Mark the modified layers as unlinked in the current frame
                        layerProperties.link = false;

                        // TODO choose reference SVG element for frame
                        if (layerProperties.referenceElementAuto) {
                            var refElt = camera.getCandidateReferenceElement();
                            if (refElt) {
                                layerProperties.referenceElementId = refElt.getAttribute("id");
                            }
                        }
                    }
                }, this);
                this.userChange = false;
            }
        }
    });
});
