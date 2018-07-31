/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "../utils";
import h from "virtual-dom/h";
import {VirtualDOMView} from "./VirtualDOMView";
import Jed from "jed";
import html2canvas from "html2canvas";

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
 */
export const Timeline = Object.create(VirtualDOMView);

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
Timeline.init = function (container, presentation, selection, controller, locale) {
    VirtualDOMView.init.call(this, container, controller);

    this.presentation = presentation;
    this.selection = selection;
    this.gettext = s => locale.gettext(s);

    this.editableLayers = [];
    this.defaultLayers = [];

    controller.addListener("ready", () => this.onReady());

    return this;
};

Timeline.onReady = function () {
    this.defaultLayers = [];

    this.presentation.layers.forEach(layer => {
        if (this.editableLayers.indexOf(layer) < 0) {
            this.defaultLayers.push(layer);
        }
    });
};

Timeline.toStorable = function () {
    return {
        editableLayers: this.editableLayers.map(layer => layer.groupId)
    };
};

Timeline.fromStorable = function (storable) {
    this.editableLayers = [];

    if (storable.hasOwnProperty("editableLayers")) {
        storable.editableLayers.forEach(groupId => {
            const layer = this.presentation.getLayerWithId(groupId);
            if (layer && this.editableLayers.indexOf(layer) < 0) {
                this.editableLayers.push(layer);
            }
        });
    }
    return this;
};

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
Timeline.addLayer = function (layerIndex) {
    const layer = this.presentation.layers[layerIndex];
    if (this.editableLayers.indexOf(layer) < 0) {
        this.editableLayers.push(layer);
    }

    const layerIndexInDefaults = this.defaultLayers.indexOf(layer);
    this.defaultLayers.splice(layerIndexInDefaults, 1);

    this.controller.addLayerToSelection(layer);

    // Force a repaint even if the controller
    // did not modify the selection
    this.repaint();
};

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
Timeline.removeLayer = function (layerIndex) {
    const layer = this.presentation.layers[layerIndex];

    const layerIndexInEditable = this.editableLayers.indexOf(layer);
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
};

Timeline.toggleLayerVisibility = function (layerIndex, evt) {
    this.controller.updateLayerVisibility(this.getLayersAtIndex(layerIndex));
    evt.stopPropagation();
};

Timeline.getLayersAtIndex = function (layerIndex) {
    return layerIndex >= 0 ?
        [this.presentation.layers[layerIndex]] :
        this.defaultLayers;
};

/*
 * Check whether "default" layers are selected.
 *
 * Returns:
 *  - true if all "default" layers are selected, else false
 */
Object.defineProperty(Timeline, "defaultLayersAreSelected", {
    get() {
        return this.defaultLayers.every(layer => this.selection.selectedLayers.indexOf(layer) >= 0);
    }
});

Timeline.updateFrameSelection = function (frameIndex, evt) {
    this.controller.updateFrameSelection(evt.ctrlKey, evt.shiftKey, frameIndex);
    evt.stopPropagation();
};

Timeline.updateLayerSelection = function (layerIndex, evt) {
    this.controller.updateLayerSelection(evt.ctrlKey, evt.shiftKey, this.getLayersAtIndex(layerIndex));
    evt.stopPropagation();
};

Timeline.updateLayerAndFrameSelection = function (layerIndex, frameIndex, evt) {
    this.controller.updateLayerAndFrameSelection(evt.ctrlKey, evt.shiftKey, this.getLayersAtIndex(layerIndex), frameIndex);
    evt.stopPropagation();
};

Timeline.repaint = function () {
    VirtualDOMView.repaint.call(this);

    const topLeft = this.rootNode.querySelector(".timeline-top-left");
    const topRight = this.rootNode.querySelector(".timeline-top-right");
    const bottomLeft = this.rootNode.querySelector(".timeline-bottom-left");
    const bottomRight = this.rootNode.querySelector(".timeline-bottom-right");

    const topLeftTable = topLeft.querySelector("table");
    const topRightTable = topRight.querySelector("table");
    const bottomLeftTable = bottomLeft.querySelector("table");

    const leftWidth = Math.max(topLeftTable.clientWidth, bottomLeftTable.clientWidth);
    const rightWidth = this.rootNode.clientWidth - leftWidth;
    const topHeight = Math.max(topLeftTable.clientHeight, topRightTable.clientHeight);
    const bottomHeight = this.rootNode.clientHeight - topHeight;

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
    const leftRows  = toArray(topLeft.querySelectorAll("tr")).concat(toArray(bottomLeft.querySelectorAll("tr")));
    const rightRows = toArray(topRight.querySelectorAll("tr")).concat(toArray(bottomRight.querySelectorAll("tr")));
    leftRows.forEach((leftRow, rowIndex) => {
        const rightRow = rightRows[rowIndex];
        const maxHeight = Math.max(leftRow.clientHeight, rightRow.clientHeight);
        leftRow.style.height = rightRow.style.height = maxHeight + "px";
    });
};

Object.defineProperty(Timeline, "hasDefaultLayer", {
    get() {
        return this.defaultLayers.length > 1 ||
               this.defaultLayers.length > 0 && this.defaultLayers[0].svgNodes.length;
    }
});

Object.defineProperty(Timeline, "refLayerInDefault", {
    get() {
        for (let i = 0; i < this.defaultLayers.length; i ++) {
            if (this.defaultLayers[i].svgNodes.length) {
                return this.defaultLayers[i];
            }
        }
        return this.defaultLayers[0];
    }
});

Timeline.render = function () {
    const _ = this.gettext;

    const defaultLayersAreVisible = this.defaultLayers.some(layer => layer.isVisible);

    const c = this.controller;
    let even = true;
    function updateEven(frame, layer) {
        if (frame.index === 0) {
            even = true;
        }
        else if (!frame.layerProperties[layer.index].link) {
            even = !even;
        }
        return even;
    }

    return h("div", [
        h("div.timeline-top-left", [
            h("table.timeline", [
                h("tr", [
                    h("th",
                        h("button", {
                            title: _("Delete the selected frames"),
                            disabled: this.selection.selectedFrames.length ? undefined : "disabled",
                            onclick() { c.deleteFrames(); }
                        },
                            h("i.fa.fa-trash"))),
                    h("th",
                        h("button", {
                            title: _("Create a new frame"),
                            onclick() { c.addFrame(); }
                        },
                            h("i.fa.fa-plus"))),
                ]),
                h("tr",
                    h("th", {attributes: {colspan: 2}},
                        h("select", {
                            onchange: evt => {
                                const value = evt.target.value;
                                evt.target.value = "__add__";
                                this.addLayer(value);
                            }
                        }, [
                            h("option", {value: "__add__", selected: "selected"}, _("Add layer"))
                        ].concat(
                            this.presentation.layers.slice().reverse()
                                .filter(layer => !layer.auto && this.defaultLayers.indexOf(layer) >= 0)
                                .map(layer => h("option", {value: layer.index}, layer.label))
                        ))
                    )
                )
            ])
        ]),
        h("div.timeline-bottom-left", [
            h("table.timeline", (this.hasDefaultLayer ? [
                h("tr", [
                    h("th.layer-icons", [
                        defaultLayersAreVisible ?
                            h("i.visibility.fa.fa-eye", {
                                title: _("This layer is visible. Click to hide it."),
                                onclick: evt => this.toggleLayerVisibility(-1, evt)
                            }) :
                            h("i.visibility.fa.fa-eye-slash", {
                                title: _("This layer is hidden. Click to show it."),
                                onclick: evt => this.toggleLayerVisibility(-1, evt)
                            }),
                        h("i.remove.fa.fa-times", {style: {visibility: "hidden"}})
                    ]),
                    h("th", {
                        className: "layer-label" + (this.defaultLayersAreSelected ? " selected" : ""),
                        onclick: evt => this.updateLayerSelection(-1, evt)
                    }, _("Default"))
                ]),
            ] : []).concat(
                this.presentation.layers.slice().reverse()
                    .filter(layer => this.editableLayers.indexOf(layer) >= 0)
                    .map(layer => h("tr", [
                            h("th.layer-icons", [
                                layer.isVisible ?
                                    h("i.visibility.fa.fa-eye", {
                                        title: _("This layer is visible. Click to hide it."),
                                        onclick: evt => this.toggleLayerVisibility(layer.index, evt)
                                    }) :
                                    h("i.visibility.fa.fa-eye-slash", {
                                        title: _("This layer is hidden. Click to show it."),
                                        onclick: evt => this.toggleLayerVisibility(layer.index, evt)
                                    }),
                                h("i.remove.fa.fa-times", {
                                    title: _("Remove this layer"),
                                    onclick: () => this.removeLayer(layer.index)
                                })
                            ]),
                            h("th", {
                                className: "layer-label" + (this.selection.selectedLayers.indexOf(layer) >= 0 ? " selected" : ""),
                                onclick: evt => this.updateLayerSelection(layer.index, evt)
                            }, layer.label)
                        ])
                    )
            ).concat([
                h("tr", {style: {visibility: "collapse"}}, [
                    h("th.layer-icons"),
                    h("th.layer-label", _("Default"))
                ])
            ]))
        ]),
        h("div.timeline-top-right", [
            h("table.timeline", [
                h("tr", this.presentation.frames.map((frame, frameIndex)  => h("th", {
                        className: "frame-index" +
                            (this.selection.selectedFrames.indexOf(frame) >= 0 ? " selected" : "") +
                            (frame === this.selection.currentFrame ? " current" : ""),
                        onclick: evt => this.updateFrameSelection(frameIndex, evt)
                    }, [
                        h("i.insert-before.fa.fa-arrow-circle-down", {
                            title: Jed.sprintf(_("Insert selection before frame %d"), frameIndex + 1),
                            onclick(evt) {
                                c.moveFrames(frameIndex);
                                evt.stopPropagation();
                            }
                        }),
                        h("i.insert-after.fa.fa-arrow-circle-down", {
                            title: Jed.sprintf(_("Insert selection after frame %d"), frameIndex + 1),
                            onclick(evt) {
                                c.moveFrames(frameIndex + 1);
                                evt.stopPropagation();
                            }
                        }),
                        (frameIndex + 1).toString()
                    ])
                )),
                h("tr",
                  this.presentation.frames.map((frame, frameIndex) => h("th", {
                            title: frame.title,
                            className: "frame-title" +
                                (this.selection.selectedFrames.indexOf(frame) >= 0 ? " selected" : "") +
                                (frame === this.selection.currentFrame ? " current" : ""),
                            onclick: evt => this.updateFrameSelection(frameIndex, evt)
                        }, frame.title)
                    )
                 )
            ])
        ]),
        h("div.timeline-bottom-right", {
            onscroll: evt => {
                this.rootNode.querySelector(".timeline-top-right").scrollLeft = evt.target.scrollLeft;
                this.rootNode.querySelector(".timeline-bottom-left").scrollTop = evt.target.scrollTop;
            }
        }, [
            h("table.timeline", (this.hasDefaultLayer ? [
                h("tr",
                    this.presentation.frames.map((frame, frameIndex) => h("td", {
                        innerHTML: html2canvas(document.getElementById('sozi-editor-view-preview')).then(function(canvas) {
                          //delete unnecessary stuff
                          var frameCell = document.getElementById(frame.frameId);
                          if(frameCell.childNodes[0].nodeValue == "[object Object]"){
                            frameCell.removeChild(frameCell.childNodes[0]);
                          }

                          if(!document.getElementById(frame.frameId).childNodes.length){
                            canvas.style = "width:100%; height:140px";
                            frameCell.appendChild(canvas);
                          }
                          //update if the selected frame has been updated
                          else if(document.getElementsByClassName("selected current" + " " + frameIndex).length){
                            canvas.style = "width:100%; height:140px";
                            frameCell.replaceChild(canvas, frameCell.childNodes[0]);
                          }
                        }),
                        className:
                            (this.defaultLayersAreSelected && this.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") +
                            (frame === this.selection.currentFrame ? " current" : "") +
                            (frameIndex > 0 && frame.layerProperties[this.defaultLayers[0].index].link ? " link" : "") +
                            (updateEven(frame, this.defaultLayers[0]) ? " even" : " odd") + " " + frameIndex,

                        id: frame.frameId,
                        onclick: evt => this.updateLayerAndFrameSelection(-1, frameIndex, evt)
                    }))
                )
            ] : []).concat(
                this.presentation.layers.slice().reverse()
                    .filter(layer => this.editableLayers.indexOf(layer) >= 0)
                    .map(layer => h("tr",
                        this.presentation.frames.map((frame, frameIndex) => h("td", {
                            className:
                                (this.selection.selectedLayers.indexOf(layer) >= 0 && this.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") +
                                (frame === this.selection.currentFrame ? " current" : "") +
                                (frameIndex > 0 && frame.layerProperties[layer.index].link ? " link" : "") +
                                (updateEven(frame, layer) ? " even" : " odd"),
                            onclick: evt => this.updateLayerAndFrameSelection(layer.index, frameIndex, evt)
                        })
                    )))
            ).concat([
                h("tr.collapse",
                    this.presentation.frames.map(frame => h("td", frame.title))
                )
            ]))
        ])
    ]);
};
