/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.editor.view", function (exports) {
    "use strict";

    var h = require("virtual-dom/h");
    var createElement = require("virtual-dom/create-element");
    var diff = require("virtual-dom/diff");
    var patch = require("virtual-dom/patch");

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
    exports.Timeline = {

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
        init: function (container, presentation, selection, controller) {
            this.presentation = presentation;
            this.selection = selection;
            this.controller = controller;
            this.editableLayers = [];
            this.defaultLayers = [];

            this.vtree = h("div");
            this.rootNode = createElement(this.vtree, {document: document});
            container.appendChild(this.rootNode);

            controller.addListener("repaint", this.repaint.bind(this));
            controller.addListener("load", this.onLoad.bind(this));

            window.addEventListener("resize", this.repaint.bind(this), false);

            return this;
        },

        onLoad: function () {
            this.presentation.layers.forEach(function (layer) {
                if (this.editableLayers.indexOf(layer) < 0) {
                    this.defaultLayers.push(layer);
                }
            }, this);
        },

        toStorable: function () {
            return {
                editableLayers: this.editableLayers.map(function (layer) {
                    return layer.groupId;
                })
            };
        },

        fromStorable: function (storable) {
            if (storable.hasOwnProperty("editableLayers")) {
                storable.editableLayers.forEach(function (groupId) {
                    var layer = this.presentation.getLayerWithId(groupId);
                    if (layer) {
                        this.editableLayers.push(layer);
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
            var layer = this.presentation.layers[layerIndex];
            this.editableLayers.push(layer);

            var layerIndexInDefaults = this.defaultLayers.indexOf(layer);
            this.defaultLayers.splice(layerIndexInDefaults, 1);

            this.controller.addLayerToSelection(layer);

            // Force a repaint even if the controller
            // did not modify the selection
            this.repaint();
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
            var layer = this.presentation.layers[layerIndex];

            var layerIndexInEditable = this.editableLayers.indexOf(layer);
            this.editableLayers.splice(layerIndexInEditable, 1);

            if (this.defaultLayersAreSelected) {
                this.controller.addLayerToSelection(layer);
            }
            else if (this.selection.selectedLayers.length > 1) {
                this.controller.removeLayerFromSelection(layer);
            }
            else {
                this.controller.selectLayers(this.defaultLayers);
            }

            this.defaultLayers.push(layer);

            // Force a repaint even if the controller
            // did not modify the selection
            this.repaint();
        },

        toggleLayerVisibility: function (layerIndex, evt) {
            this.controller.updateLayerVisibility(this.getLayersAtIndex(layerIndex));
            evt.stopPropagation();
        },

        getLayersAtIndex: function (layerIndex) {
            return layerIndex >= 0 ?
                [this.presentation.layers[layerIndex]] :
                this.defaultLayers;
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
                return this.selection.selectedLayers.indexOf(layer) >= 0;
            }, this);
        },

        updateFrameSelection: function (frameIndex, evt) {
            this.controller.updateFrameSelection(evt.ctrlKey, evt.shiftKey, frameIndex);
            evt.stopPropagation();
        },

        updateLayerSelection: function (layerIndex, evt) {
            this.controller.updateLayerSelection(evt.ctrlKey, evt.shiftKey, this.getLayersAtIndex(layerIndex));
            evt.stopPropagation();
        },

        updateLayerAndFrameSelection: function (layerIndex, frameIndex, evt) {
            this.controller.updateLayerAndFrameSelection(evt.ctrlKey, evt.shiftKey, this.getLayersAtIndex(layerIndex), frameIndex);
            evt.stopPropagation();
        },

        get defaultLayerIsNotEmpty() {
            return this.defaultLayers.length > 1 || this.defaultLayers[0].svgNodes.length;
        },

        repaint: function () {
            var vtree = this.render();
            this.rootNode = patch(this.rootNode, diff(this.vtree, vtree));
            this.vtree = vtree;

            this.adjust();
        },

        render: function () {
            var self = this;
            return h("div", [
                h("div.timeline-top-left", [
                    h("table.timeline", [
                        h("tr", [
                            h("th",
                                h("button", {
                                    title: "Delete selected frames",
                                    disabled: this.selection.selectedFrames.length ? undefined : "disabled",
                                    onclick: this.controller.deleteFrames.bind(this.controller)
                                },
                                    h("i.fa.fa-trash"))),
                            h("th",
                                h("button", {
                                    title: "Create a new frame",
                                    onclick: this.controller.addFrame.bind(this.controller)
                                },
                                    h("i.fa.fa-plus"))),
                        ]),
                        h("tr",
                            h("th", {colspan: 2},
                                h("select", {
                                    onchange: function () {
                                        var value = this.value;
                                        this.value = "__add__";
                                        self.addLayer(value);
                                    }
                                }, [
                                    h("option", {value: "__add__", selected: "selected"}, "Add layer")
                                ].concat(
                                    this.presentation.layers.slice().reverse()
                                        .filter(function (layer) {
                                            return !layer.auto && this.defaultLayers.indexOf(layer) >= 0;
                                        }, this)
                                        .map(function (layer) {
                                            return h("option", {value: layer.index}, layer.label);
                                        })
                                ))
                            )
                        )
                    ])
                ]),
                h("div.timeline-bottom-left", [
                    h("table.timeline", (this.defaultLayerIsNotEmpty ? [
                        h("tr", [
                            h("th.layer-icons", [
                                this.defaultLayersAreVisible ?
                                    h("i.visibility.fa.fa-eye", {
                                        title: "This layer is visible. Click to hide it.",
                                        onclick: this.toggleLayerVisibility.bind(this, -1)
                                    }) :
                                    h("i.visibility.fa.fa-eye-slash", {
                                        title: "This layer is hidden. Click to show it.",
                                        onclick: this.toggleLayerVisibility.bind(this, -1)
                                    }),
                                h("i.remove.fa.fa-times", {style: {visibility: "hidden"}})
                            ]),
                            h("th", {
                                className: "layer-label" + (this.defaultLayersAreSelected ? " selected" : ""),
                                onclick: this.updateLayerSelection.bind(this, -1)
                            }, "Default")
                        ]),
                    ] : []).concat(
                        this.presentation.layers.slice().reverse()
                            .filter(function (layer) {
                                return this.editableLayers.indexOf(layer) >= 0;
                            }, this)
                            .map(function (layer) {
                                return h("tr", [
                                    h("th.layer-icons", [
                                        layer.isVisible ?
                                            h("i.visibility.fa.fa-eye", {
                                                title: "This layer is visible. Click to hide it.",
                                                onclick: this.toggleLayerVisibility.bind(this, layer.index)
                                            }) :
                                            h("i.visibility.fa.fa-eye-slash", {
                                                title: "This layer is hidden. Click to show it.",
                                                onclick: this.toggleLayerVisibility.bind(this, layer.index)
                                            }),
                                        h("i.remove.fa.fa-times", {
                                            title: "Remove this layer",
                                            onclick: this.removeLayer.bind(this, layer.index)
                                        })
                                    ]),
                                    h("th", {
                                        className: "layer-label" + (this.selection.selectedLayers.indexOf(layer) >= 0 ? " selected" : ""),
                                        onclick: this.updateLayerSelection.bind(this, layer.index)
                                    }, layer.label)
                                ]);
                            }, this)
                    ).concat([
                        h("tr", {style: {visibility: "collapse"}}, [
                            h("th.layer-icons"),
                            h("th.layer-label", "Default")
                        ])
                    ]))
                ]),
                h("div.timeline-top-right", [
                    h("table.timeline", [
                        h("tr", this.presentation.frames.map(function (frame, frameIndex) {
                            return h("th", {
                                className: "frame-index" +
                                    (this.selection.selectedFrames.indexOf(frame) >= 0 ? " selected" : "") +
                                    (frame === this.selection.currentFrame ? " current" : ""),
                                onclick: this.updateFrameSelection.bind(this, frameIndex)
                            }, [
                                h("i.insert-before.fa.fa-arrow-circle-down", {
                                    title: "Insert selection before frame " + frameIndex,
                                    onclick: function (evt) {
                                        self.controller.moveFrames(frameIndex);
                                        evt.stopPropagation();
                                    }
                                }),
                                h("i.insert-after.fa.fa-arrow-circle-down", {
                                    title: "Insert selection after frame " + frameIndex,
                                    onclick: function (evt) {
                                        self.controller.moveFrames(frameIndex + 1);
                                        evt.stopPropagation();
                                    }
                                }),
                                frameIndex.toString()
                            ]);
                        }, this)),
                        h("tr", this.presentation.frames.map(function (frame, frameIndex) {
                            return h("th", {
                                title: frame.title,
                                className: "frame-title" +
                                    (this.selection.selectedFrames.indexOf(frame) >= 0 ? " selected" : "") +
                                    (frame === this.selection.currentFrame ? " current" : ""),
                                onclick: this.updateFrameSelection.bind(this, frameIndex)
                            }, frame.title);
                        }, this))
                    ])
                ]),
                h("div.timeline-bottom-right", {
                    onscroll: function (evt) {
                        self.rootNode.querySelector(".timeline-top-right").scrollLeft = this.scrollLeft;
                        self.rootNode.querySelector(".timeline-bottom-left").scrollTop = this.scrollTop;
                    }
                }, [
                    h("table.timeline", (this.defaultLayerIsNotEmpty ? [
                        h("tr",
                            this.presentation.frames.map(function (frame, frameIndex) {
                                return h("td", {
                                    className:
                                        (this.defaultLayersAreSelected && this.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") +
                                        (frame === this.selection.currentFrame ? " current" : ""),
                                    onclick: this.updateLayerAndFrameSelection.bind(this, -1, frameIndex)
                                });
                            }, this)
                        )
                    ] : []).concat(
                        this.presentation.layers.slice().reverse()
                            .filter(function (layer) {
                                return this.editableLayers.indexOf(layer) >= 0;
                            }, this)
                            .map(function (layer) {
                                return h("tr",
                                    this.presentation.frames.map(function (frame, frameIndex) {
                                        return h("td", {
                                            className:
                                                (this.selection.selectedLayers.indexOf(layer) >= 0 && this.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") +
                                                (frame === this.selection.currentFrame ? " current" : ""),
                                            onclick: this.updateLayerAndFrameSelection.bind(this, layer.index, frameIndex)
                                        }, frame.layerProperties[layer.index].link ? h("i.fa.fa-link") : []);
                                    }, this)
                                );
                            }, this)
                    ).concat([
                        h("tr", {style: {visibility: "collapse"}},
                            this.presentation.frames.map(function (frame) {
                                return h("td", frame.title);
                            })
                        )
                    ]))
                ])
            ]);
        },

        /*
         * Render the current view.
         *
         * The timeline is rendered with respect to the current state of
         * the presentation and the selection.
         * Event handlers are attached to UI elements.
         */
        adjust: function () {
            var topLeft = this.rootNode.querySelector(".timeline-top-left");
            var topRight = this.rootNode.querySelector(".timeline-top-right");
            var bottomLeft = this.rootNode.querySelector(".timeline-bottom-left");
            var bottomRight = this.rootNode.querySelector(".timeline-bottom-right");

            var topLeftTable = topLeft.querySelector("table");
            var topRightTable = topRight.querySelector("table");
            var bottomLeftTable = bottomLeft.querySelector("table");

            var leftWidth = Math.max(topLeftTable.clientWidth, bottomLeftTable.clientWidth);
            var rightWidth = this.rootNode.clientWidth - leftWidth;
            var topHeight = Math.max(topLeftTable.clientHeight, topRightTable.clientHeight);
            var bottomHeight = this.rootNode.clientHeight - topHeight;

            // Fit the width of the left tables,
            // allocate remaining width to the right tables
            topLeft.style.width = bottomLeft.style.width =
            topLeftTable.style.width = bottomLeftTable.style.width = leftWidth + "px";
            topRight.style.width = bottomRight.style.width = rightWidth + "px";

            // Fit the height of the top tables,
            // allocate remaining width to the bottom tables
            topLeft.style.height = topRight.style.height = topHeight + "px";
            bottomLeft.style.height = bottomRight.style.height = bottomHeight + "px";

            // Corresponding rows in left and right tables must have the same height
            var leftRows  = Array.prototype.slice.call(topLeft.querySelectorAll("tr")).concat(Array.prototype.slice.call(bottomLeft.querySelectorAll("tr")));
            var rightRows = Array.prototype.slice.call(topRight.querySelectorAll("tr")).concat(Array.prototype.slice.call(bottomRight.querySelectorAll("tr")));
            leftRows.forEach(function (leftRow, rowIndex) {
                var rightRow = rightRows[rowIndex];
                var maxHeight = Math.max(leftRow.clientHeight, rightRow.clientHeight);
                leftRow.style.height = rightRow.style.height = maxHeight + "px";
            });
        }
    };
});
