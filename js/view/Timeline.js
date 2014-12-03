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
         *  - presentation: a presentation object
         *  - selection: a selection object
         *
         * Returns:
         *  - The current view
         */
        init: function (presentation, selection, controller) {
            this.presentation = presentation;
            this.selection = selection;
            this.controller = controller;

            controller.addListener("repaint", this.repaint.bind(this));
            controller.addListener("load", this.onLoad.bind(this));

            $(window).resize(this.repaint.bind(this));

            return this;
        },

        onLoad: function () {
            this.defaultLayers.pushAll(this.presentation.layers);
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
            this.repaint();
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
            this.repaint();
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
         * Render the current view.
         *
         * The timeline is rendered with respect to the current state of
         * the presentation and the selection.
         * Event handlers are attached to UI elements.
         */
        repaint: function () {
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

        getLayersAtIndex: function (layerIndex) {
            return layerIndex >= 0 ?
                [this.presentation.layers.at(layerIndex)] :
                this.defaultLayers;
        },

        setupEvents: function () {
            var self = this;

            var container = $("#sozi-editor-view-timeline");

            // Actions on the presentation model
            $("#add-frame").click(this.controller.addFrame.bind(this.controller));

            $("#delete-frames").click(this.controller.deleteFrames.bind(this.controller));

            $(".frame-index .insert-before", container).click(function (evt) {
                self.controller.moveFrames(parseInt(this.parentNode.dataset.frameIndex));
                evt.stopPropagation();
            });

            $(".layer-icons .visibility", container).click(function (evt) {
                self.controller.updateLayerVisibility(self.getLayersAtIndex(parseInt(this.parentNode.dataset.layerIndex)));
                evt.stopPropagation();
            });

            // Actions on the selection
            $(".frame-index, .frame-title", container).click(function (evt) {
                self.controller.updateFrameSelection(evt.ctrlKey, evt.shiftKey, parseInt(this.dataset.frameIndex));
            });

            $(".layer-label", container).click(function (evt) {
                self.controller.updateLayerSelection(evt.ctrlKey, evt.shiftKey, self.getLayersAtIndex(parseInt(this.parentNode.dataset.layerIndex)));
            });

            $("td", container).click(function (evt) {
                self.controller.updateLayerAndFrameSelection(evt.ctrlKey, evt.shiftKey, self.getLayersAtIndex(parseInt(this.parentNode.dataset.layerIndex)), parseInt(this.dataset.frameIndex));
            });

            // View state actions
            $(".frame-index .insert-after", container).click(function (evt) {
                self.controller.moveFrames(parseInt(this.parentNode.dataset.frameIndex) + 1);
                evt.stopPropagation();
            });

            $("#add-layer").change(function () {
                self.addLayer(this.value);
            });

            $(".layer-icons .remove", container).click(function () {
                self.removeLayer(parseInt(this.parentNode.parentNode.dataset.layerIndex));
            });

            $(".timeline-bottom-right", container).scroll(function () {
                $(".timeline-top-right", container).scrollLeft($(this).scrollLeft());
                $(".timeline-bottom-left", container).scrollTop($(this).scrollTop());
            });
        }
    });
});
