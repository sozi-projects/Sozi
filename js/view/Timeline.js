/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", function (exports) {
    "use strict";

    /*
     * The Timeline view shows a table where columns represent frames
     * and rows represent layers.
     * The user can choose to manipulate only a subset of the layers of the document.
     * The other layers are grouped into a "Default" row.
     *
     * The Timeline view allows the user to:
     *  - choose editable layers from the document
     *  - show/hide layers
     *  - create/delete/reorder frames
     *  - add/remove layers and frames to/from the selection
     *
     * See also:
     *  - templates/sozi.editor.Timeline.html
     */
    exports.Timeline = sozi.model.Object.clone({

        presentation: null,
        selection: null,
        editableLayers: [],
        defaultLayers: [],

        /*
         * Initialize a Timeline view.
         *
         * The view is rendered and event handlers are set up.
         *
         * Parameters:
         *  - pres: a presentation object
         *  - selection: a selection object
         *
         * Returns:
         *  - The current view
         */
        init: function (pres, selection) {
            this.presentation = pres;
            this.selection = selection;

            this.defaultLayers.pushAll(pres.layers);

            pres.addListener("change:frames", this.render, this);
            pres.frames.addListener("add", this.onAddFrame, this);
            pres.frames.addListener("remove", this.onRemoveFrame, this);
            pres.layers.addListener("add", this.onAddLayer, this);
            pres.layers.addListener("remove", this.onRemoveLayer, this);

            selection.addListener("change", this.onChangeSelection, this);

            pres.layers.forEach(function (layer) {
                layer.addListener("change:isVisible", this.render, this);
            }, this);

            pres.frames.forEach(function (frame) {
                this.onAddFrame(pres.frames, frame);
            }, this);

            $(window).resize(this.bind(this.render));

            this.render();

            return this;
        },

        toStorable: function () {
            return {
                editableLayers: this.editableLayers.map(function (layer) {
                    return layer.groupId;
                })
            };
        },

        fromStorable: function (storable) {
            if ("editableLayers" in storable) {
                storable.editableLayers.forEach(function (groupId) {
                    var layer = this.presentation.getLayerWithId(groupId);
                    if (layer) {
                        this.addLayer(layer.index);
                    }
                }, this);
            }
            return this;
        },

        onAddLayer: function (collection, layer) {
            this.defaultLayers.push(layer);
            layer.addListener("change:isVisible", this.render, this);
            this.render();
        },

        onRemoveLayer: function (collection, layer) {
            this.defaultLayers.remove(layer);
            this.editableLayers.remove(layer);
            this.render();
        },

        onAddFrame: function (collection, frame) {
            frame.addListener("change:title", this.render, this);
            frame.layerProperties.forEach(function (lp) {
                lp.addListener("change:link", this.render, this);
            }, this);
        },

        onRemoveFrame: function (collection, frame) {
            frame.removeListener("change", this.render, this);
            frame.layerProperties.forEach(function (lp) {
                lp.removeListener("change:link", this.render, this);
            }, this);
        },

        /*
         * Action: Add a frame to the presentation.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * A new frame is added to the presentation after the
         * currently selected frame (see Selection.currentFrame).
         * If no frame is selected, the new frame is added at the
         * end of the presentation.
         */
        addFrame: function () {
            var frame = sozi.model.Frame.clone().init(this.presentation);
            if (this.selection.currentFrame) {
                this.presentation.frames.insert(frame, this.selection.currentFrame.index + 1);
            }
            else {
                frame.setAtStates(sozi.editor.view.Preview.cameras);
                this.presentation.frames.push(frame);
            }
            frame.layerProperties.forEach(function (layer) {
                layer.link = true;
            });
            this.selection.selectedFrames.clear();
            this.selection.selectedFrames.push(frame);
        },

        /*
         * Action: Add a layer to the current view.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The layer at the given index is added to the current view
         * and to the selection.
         * The current view is updated.
         *
         * Parameters:
         *  - layerIndex: The index of a layer in the presentation
         */
        addLayer: function (layerIndex) {
            var layer = this.presentation.layers.at(layerIndex);
            this.editableLayers.push(layer);
            this.defaultLayers.remove(layer);
            this.render();
            if (!this.selection.selectedLayers.contains(layer)) {
                this.selection.selectedLayers.push(layer);
            }
        },

        /*
         * Action: Remove a layer from the current view.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The layer at the given index is removed from the current view
         * and from the selection.
         * The current view is updated.
         *
         * Parameters:
         *  - layerIndex: The index of a layer in the presentation
         */
        removeLayer: function (layerIndex) {
            var layer = this.presentation.layers.at(layerIndex);
            this.editableLayers.remove(layer);
            if (!this.defaultLayersAreSelected) {
                this.selection.selectedLayers.remove(layer);
            }
            else if (!this.selection.selectedLayers.contains(layer)) {
                this.selection.selectedLayers.push(layer);
            }
            this.defaultLayers.push(layer);
            if (this.selection.selectedLayers.isEmpty) {
                this.selection.selectedLayers.pushAll(this.defaultLayers);
            }
            this.render();
        },

        /*
         * Check whether "default" layers are visible.
         *
         * Returns:
         *  - true if at least one "default" layer is visible, else false
         */
        get defaultLayersAreVisible() {
            return this.defaultLayers.some(function (layer) {
                return layer.isVisible;
            });
        },

        /*
         * Check whether "default" layers are selected.
         *
         * Returns:
         *  - true if all "default" layers are selected, else false
         */
        get defaultLayersAreSelected() {
            return this.defaultLayers.every(function (layer) {
                return this.selection.selectedLayers.contains(layer);
            }, this);
        },

        /*
         * Action: Move frames.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * Move all selected frames to the given frame index.
         *
         * Parameters:
         *  - toFrameIndex: The index of the destination
         */
        moveFrames: function (toFrameIndex) {
            var framesByIndex = this.selection.selectedFrames.slice().sort(function (a, b) {
                return a.index - b.index;
            });

            framesByIndex.forEach(function (frame) {
                if (frame.index < toFrameIndex) {
                    toFrameIndex --;
                }
                this.presentation.frames.remove(frame);
                this.presentation.frames.insert(frame, toFrameIndex);
                toFrameIndex ++;
            }, this);
        },

        /*
         * Action: Delete selected frames from the presentation.
         *
         * This method is called as a result of a user action
         * in the current view.
         */
        deleteFrames: function () {
            this.selection.selectedFrames.slice().forEach(function (frame) {
                this.presentation.frames.remove(frame);
            }, this);
        },

        /*
         * Action: Update the selection for a given frame.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The result of this action depends in the following
         * modifier keys:
         *  - Ctrl: toggle the selection status of the given frame
         *  - Shift: toggle a sequence of frames to the given frame
         *  - No modifier: set the selection to the given frame and all layers
         *
         * Parameters:
         *  - evt: The DOM event of the user action
         *  - frameIndex: The index of a frame in the presentation
         */
        updateFrameSelection: function (evt, frameIndex) {
            var frame = this.presentation.frames.at(frameIndex);
            if (evt.ctrlKey) {
                if (this.selection.selectedFrames.contains(frame)) {
                    this.selection.selectedFrames.remove(frame);
                }
                else {
                    this.selection.selectedFrames.push(frame);
                }
            }
            else if (evt.shiftKey) {
                if (!this.selection.selectedFrames.length) {
                    this.selection.selectedFrames.push(frame);
                }
                else {
                    var endIndex = frame.index;
                    var startIndex = this.selection.currentFrame.index;
                    var inc = startIndex <= endIndex ? 1 : -1;
                    for (var i = startIndex + inc; startIndex <= endIndex ? i <= endIndex : i >= endIndex; i += inc) {
                        if (this.selection.selectedFrames.contains(this.presentation.frames.at(i))) {
                            this.selection.selectedFrames.remove(this.presentation.frames.at(i));
                        }
                        else {
                            this.selection.selectedFrames.push(this.presentation.frames.at(i));
                        }
                    }
                }
            }
            else {
                this.selection.selectedLayers.clear();
                this.selection.selectedLayers.pushAll(this.presentation.layers);
                this.selection.selectedFrames.clear();
                this.selection.selectedFrames.push(frame);
            }
        },

        /*
         * Action: Update the selection for a given layer.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The result of this action depends in the following
         * modifier keys:
         *  - Ctrl: toggle the selection status of the given layer
         *  - Shift: toggle a sequence of layers to the given layer
         *  - No modifier: set the selection to the given layer and all frames
         *
         * Parameters:
         *  - evt: The DOM event of the user action
         *  - layerIndex: The index of a layer in the presentation
         */
        updateLayerSelection: function (evt, layerIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers.at(layerIndex)] :
                this.defaultLayers;
            if (evt.ctrlKey) {
                layers.forEach(function (layer) {
                    if (this.selection.selectedLayers.contains(layer)) {
                        this.selection.selectedLayers.remove(layer);
                    }
                    else {
                        this.selection.selectedLayers.push(layer);
                    }
                }, this);
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.selection.selectedLayers.clear();
                this.selection.selectedLayers.pushAll(layers);
                this.selection.selectedFrames.clear();
                this.selection.selectedFrames.pushAll(this.presentation.frames);
            }
        },

        /*
         * Action: Update the selection for a given layer and a given frame.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * The result of this action depends in the following
         * modifier keys:
         *  - Ctrl: toggle the selection status of the given layer and frame.
         *          If both are selected, they are removed from the selection.
         *          If at least one is not selected, they are added to the selection.
         *  - Shift: toggle a sequence of layers and frames to the given layer and frame
         *  - No modifier: set the selection to the given layer and frame
         *
         * Parameters:
         *  - evt: The DOM event of the user action
         *  - layerIndex: The index of a layer in the presentation
         *  - frameIndex: The index of a frame in the presentation
         */
        updateLayerAndFrameSelection: function (evt, layerIndex, frameIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers.at(layerIndex)] :
                this.defaultLayers;
            var frame = this.presentation.frames.at(frameIndex);
            if (evt.ctrlKey) {
                var layersAreSelected = layers.every(function (layer) {
                    return this.selection.selectedLayers.contains(layer);
                }, this);
                var frameIsSelected = this.selection.selectedFrames.contains(frame);
                if (layersAreSelected && frameIsSelected) {
                    layers.forEach(function (layer) {
                        this.selection.selectedLayers.remove(layer);
                    }, this);
                    this.selection.selectedFrames.remove(frame);
                }
                else {
                    layers.forEach(function (layer) {
                        this.selection.selectedLayers.push(layer);
                    }, this);
                    this.selection.selectedFrames.push(frame);
                }
            }
            else if (evt.shiftKey) {
                // TODO toggle from last selected to current
            }
            else {
                this.selection.selectedLayers.clear();
                this.selection.selectedLayers.pushAll(layers);
                this.selection.selectedFrames.clear();
                this.selection.selectedFrames.push(frame);
            }
        },

        /*
         * Action: Change the visibility of the given layer.
         *
         * This method is called as a result of a user action
         * in the current view.
         *
         * Toggle the visibility of the given layer.
         * If the layer becomes visible, it is added to the selection,
         * otherwise, it is removed from the selection.
         *
         * Parameters:
         *  - layerIndex: The index of a layer in the presentation
         */
        updateLayerVisibility: function (layerIndex) {
            var layers = layerIndex >= 0 ?
                [this.presentation.layers.at(layerIndex)] :
                this.defaultLayers;
            layers.forEach(function (layer) {
                layer.isVisible = !layer.isVisible;
                if (layer.isVisible) {
                    this.selection.selectedLayers.push(layer);
                }
                else {
                    this.selection.selectedLayers.remove(layer);
                }
            }, this);
        },

        /*
         * Render the current view.
         *
         * The timeline is rendered with respect to the current state of
         * the presentation and the selection.
         * Event handlers are attached to UI elements.
         */
        render: function () {
            var container = $("#sozi-editor-view-timeline");

            // Save scrollbar positions before rendering
            var scrollTop  = $(".timeline-bottom-right", container).scrollTop();
            var scrollLeft = $(".timeline-bottom-right", container).scrollLeft();

            // Render the frame and layer table
            $("#sozi-editor-view-timeline").html(nunjucks.render("templates/sozi.editor.view.Timeline.html", this));

            var topLeft = $(".timeline-top-left", container);
            var topRight = $(".timeline-top-right", container);
            var bottomLeft = $(".timeline-bottom-left", container);
            var bottomRight = $(".timeline-bottom-right", container);

            // Fit the width of the left tables,
            // allocate remaining width to the right tables
            var leftWidth = Math.max($("table", topLeft).width(), $("table", bottomLeft).width());
            topLeft.width(leftWidth);
            bottomLeft.width(leftWidth);
            $("table", topLeft).width(leftWidth);
            $("table", bottomLeft).width(leftWidth);
            topRight.width(container.width() - leftWidth);
            bottomRight.width(container.width() - leftWidth);

            // Fit the height of the top tables,
            // allocate remaining width to the bottom tables
            var topHeight = Math.max($("table", topLeft).height(), $("table", topRight).height());
            topLeft.height(topHeight);
            topRight.height(topHeight);
            bottomLeft.height(container.height() - topHeight);
            bottomRight.height(container.height() - topHeight);

            // Corresponding rows in left and right tables must have the same height
            $("tr", topLeft).each(function (index) {
                var rightRow = $("tr", topRight).eq(index);
                var maxHeight = Math.max($(this).height(), rightRow.height());
                $(this).height(maxHeight);
                rightRow.height(maxHeight);
            });

            $("tr", bottomLeft).each(function (index) {
                var rightRow = $("tr", bottomRight).eq(index);
                var maxHeight = Math.max($(this).height(), rightRow.height());
                $(this).height(maxHeight);
                rightRow.height(maxHeight);
            });

            // Restore scrollbar positions
            bottomLeft.scrollTop(scrollTop);
            bottomRight.scrollTop(scrollTop);
            topRight.scrollLeft(scrollLeft);
            bottomRight.scrollLeft(scrollLeft);

            this.setupEvents();
        },

        setupEvents: function () {
            var self = this;

            var container = $("#sozi-editor-view-timeline");

            $("#add-frame").click(this.bind(this.addFrame));
            $("#delete-frames").click(this.bind(this.deleteFrames));

            $("#add-layer").change(function () {
                self.addLayer(this.value);
            });

            $(".layer-icons .remove", container).click(function () {
                self.removeLayer(parseInt(this.parentNode.parentNode.dataset.layerIndex));
            });

            $(".frame-index, .frame-title", container).click(function (evt) {
                self.updateFrameSelection(evt, parseInt(this.dataset.frameIndex));
            });

            $(".frame-index .insert-before", container).click(function (evt) {
                self.moveFrames(parseInt(this.parentNode.dataset.frameIndex));
                evt.stopPropagation();
            });

            $(".frame-index .insert-after", container).click(function (evt) {
                self.moveFrames(parseInt(this.parentNode.dataset.frameIndex) + 1);
                evt.stopPropagation();
            });

            $(".layer-label", container).click(function (evt) {
                self.updateLayerSelection(evt, parseInt(this.parentNode.dataset.layerIndex));
            });

            $("td", container).click(function (evt) {
                self.updateLayerAndFrameSelection(evt, parseInt(this.parentNode.dataset.layerIndex), parseInt(this.dataset.frameIndex));
            });

            $(".layer-icons .visibility", container).click(function (evt) {
                self.updateLayerVisibility(parseInt(this.parentNode.parentNode.dataset.layerIndex));
                evt.stopPropagation();
            });

            $(".timeline-bottom-right", container).scroll(function () {
                $(".timeline-top-right", container).scrollLeft($(this).scrollLeft());
                $(".timeline-bottom-left", container).scrollTop($(this).scrollTop());
            });
        },

        onChangeSelection: function () {
            var container = $("#sozi-editor-view-timeline");

            $("th, td", container).removeClass("selected current");

            $("#delete-frames").prop("disabled", this.selection.selectedFrames.length === 0);

            if (this.defaultLayersAreSelected) {
                $(".timeline-bottom-left tr[data-layer-index=-1] .layer-label", container).addClass("selected");
            }

            this.presentation.layers.forEach(function (layer, index) {
                if (this.editableLayers.contains(layer) && this.selection.selectedLayers.contains(layer)) {
                    $(".timeline-bottom-left tr[data-layer-index=" + index + "] .layer-label", container).addClass("selected");
                }
            }, this);

            this.presentation.frames.forEach(function (frame, frameIndex) {
                if(this.selection.selectedFrames.contains(frame)) {
                    var th = $(".timeline-top-right th[data-frame-index=" + frameIndex + "]");
                    th.addClass("selected");
                    if (frame === this.selection.currentFrame) {
                        th.addClass("current");
                    }
                    if (this.defaultLayersAreSelected) {
                        var td = $(".timeline-bottom-right tr[data-layer-index=-1] td[data-frame-index=" + frameIndex + "]", container);
                        td.addClass("selected");
                        if (frame === this.selection.currentFrame) {
                            td.addClass("current");
                        }
                    }
                    this.presentation.layers.forEach(function (layer, layerIndex) {
                        if (this.editableLayers.contains(layer) && this.selection.selectedLayers.contains(layer)) {
                            var td = $(".timeline-bottom-right tr[data-layer-index=" + layerIndex + "] td[data-frame-index=" + frameIndex + "]", container);
                            td.addClass("selected");
                            if (frame === this.selection.currentFrame) {
                                td.addClass("current");
                            }
                        }
                    }, this);
                }
            }, this);
        }
    });
});
