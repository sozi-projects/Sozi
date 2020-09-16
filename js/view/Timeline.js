/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {h} from "inferno-hyperscript";
import {VirtualDOMView} from "./VirtualDOMView";
import Jed from "jed";

/** Timeline pane of the presentation editor.
 *
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
 * @extends module:view/VirtualDOMView.VirtualDOMView
 * @todo Add documentation
 */
export class Timeline extends VirtualDOMView {

    /** Initialize a new timeline view.
     *
     * @param {HTMLElement} container - The HTML element that will contain this preview area.
     * @param {module:model/Presentation.Presentation} presentation - The current Sozi presentation.
     * @param {module:model/Selection.Selection} selection - The object that manages the frame and layer selection.
     * @param {module:Controller.Controller} controller - The controller that manages the current editor.
     */
    constructor(container, presentation, selection, controller) {
        super(container, controller);

        /** The current Sozi presentation.
         *
         * @type {module:model/Presentation.Presentation} */
        this.presentation = presentation;

        /** The object that manages the frame and layer selection.
         *
         * @type {module:model/Selection.Selection} */
        this.selection = selection;
    }

    /** Toggle the visibility of a layer in the preview area.
     *
     * @see {@linkcode module:Controller.Controller#updateLayerVisibility}
     * @listens click
     * @param {number} layerIndex - The index of the layer to change.
     * @param {MouseEvent} evt - The DOM event that triggered this action.
     */
    toggleLayerVisibility(layerIndex, evt) {
        this.controller.updateLayerVisibility(this.controller.getLayersAtIndex(layerIndex));
        evt.stopPropagation();
    }

    /** Update the list of selected frames.
     *
     * This method is called when the user clicks a frame heading in the timeline.
     *
     * @see {@linkcode module:Controller.Controller#updateFrameSelection}
     * @listens click
     * @param {number} frameIndex - The index of the frame to add or remove.
     * @param {MouseEvent} evt - The DOM event that triggered this action.
     */
    updateFrameSelection(frameIndex, evt) {
        this.controller.updateFrameSelection(evt.ctrlKey, evt.shiftKey, frameIndex);
        evt.stopPropagation();
    }

    /** Update the list of selected layers.
     *
     * This method is called when the user clicks a layer heading in the timeline.
     *
     * @see {@linkcode module:Controller.Controller#updateLayerSelection}
     * @listens click
     * @param {number} layerIndex - The index of the layer to add or remove.
     * @param {MouseEvent} evt - The DOM event that triggered this action.
     */
    updateLayerSelection(layerIndex, evt) {
        this.controller.updateLayerSelection(evt.ctrlKey, evt.shiftKey, this.controller.getLayersAtIndex(layerIndex));
        evt.stopPropagation();
    }

    /** Update the list of selected frames and layers.
     *
     * This method is called when the user clicks a cell inside the timeline table.
     *
     * @see {@linkcode module:Controller.Controller#updateLayerSelection}
     * @listens click
     * @param {number} layerIndex - The index of the layer to add or remove.
     * @param {number} frameIndex - The index of the frame to add or remove.
     * @param {MouseEvent} evt - The DOM event that triggered this action.
     */
    updateLayerAndFrameSelection(layerIndex, frameIndex, evt) {
        this.controller.updateLayerAndFrameSelection(evt.ctrlKey, evt.shiftKey, this.controller.getLayersAtIndex(layerIndex), frameIndex);
        evt.stopPropagation();
    }

    /** @inheritdoc */
    repaint() {
        super.repaint();

        const topLeft = this.container.querySelector(".timeline-top-left");
        const topRight = this.container.querySelector(".timeline-top-right");
        const bottomLeft = this.container.querySelector(".timeline-bottom-left");
        const bottomRight = this.container.querySelector(".timeline-bottom-right");

        const topLeftTable = topLeft.querySelector("table");
        const topRightTable = topRight.querySelector("table");
        const bottomLeftTable = bottomLeft.querySelector("table");

        const leftWidth = Math.max(topLeftTable.clientWidth, bottomLeftTable.clientWidth);
        const rightWidth = this.container.clientWidth - leftWidth;
        const topHeight = Math.max(topLeftTable.clientHeight, topRightTable.clientHeight);
        const bottomHeight = this.container.clientHeight - topHeight;

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
        const leftRows  = document.querySelectorAll(".timeline-top-left tr,  .timeline-bottom-left tr");
        const rightRows = document.querySelectorAll(".timeline-top-right tr, .timeline-bottom-right tr");
        leftRows.forEach((leftRow, rowIndex) => {
            const rightRow = rightRows[rowIndex];
            const maxHeight = Math.max(leftRow.clientHeight, rightRow.clientHeight);
            leftRow.style.height = rightRow.style.height = maxHeight + "px";
        });
    }

    /** @inheritdoc */
    render() {
        const controller = this.controller;
        const _ = controller.gettext;

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

        function isLinked(frame, layer) {
            return frame.index > 0 && frame.layerProperties[layer.index].link;
        }

        function hasNoReferenceElement(frame, layer) {
            return !isLinked(frame, layer) && !frame.layerProperties[layer.index].referenceElement;
        }

        const defaultLayersAreVisible = controller.defaultLayers.some(layer => layer.isVisible);

        return h("div", [
            h("div.timeline-top-left", [
                h("table.timeline", [
                    h("tr", [
                        h("th", [
                            h("button", {
                                title: _("Delete the selected frames"),
                                disabled: this.selection.selectedFrames.length ? undefined : "disabled",
                                onclick() { controller.deleteFrames(); }
                            }, h("i.fas.fa-trash"))
                        ]),
                        h("th", [
                            h("button", {
                                title: _("Create a new frame"),
                                onclick() { controller.addFrame(); }
                            }, h("i.fas.fa-plus"))
                        ]),
                    ]),
                    h("tr", [
                        h("th", {colspan: 2},
                            h("select", {
                                onchange: evt => {
                                    const value = evt.target.value;
                                    evt.target.value = "__sozi_add__";
                                    if (value === "__sozi_add_all__") {
                                        controller.addAllLayers();
                                    }
                                    else {
                                        controller.addLayer(value);
                                    }
                                }
                            }, [
                                h("option", {value: "__sozi_add__", selected: "selected"}, _("Add layer")),
                                h("option", {value: "__sozi_add_all__"}, _("Add all layers")),
                                this.presentation.layers.slice().reverse()
                                    .filter(layer => !layer.auto && controller.defaultLayers.indexOf(layer) >= 0)
                                    .map(layer => h("option", {value: layer.index}, layer.label))
                            ])
                        )
                    ])
                ])
            ]),
            h("div.timeline-bottom-left", [
                h("table.timeline", [
                    controller.hasDefaultLayer ? h("tr", [
                        h("th.layer-icons", [
                            defaultLayersAreVisible ?
                                h("i.visibility.far.fa-eye", {
                                    title: _("This layer is visible. Click to hide it."),
                                    onclick: evt => this.toggleLayerVisibility(-1, evt)
                                }) :
                                h("i.visibility.far.fa-eye-slash", {
                                    title: _("This layer is hidden. Click to show it."),
                                    onclick: evt => this.toggleLayerVisibility(-1, evt)
                                }),
                            h("i.remove.fas.fa-times", {style: {visibility: "hidden"}})
                        ]),
                        h("th", {
                            className: "layer-label" + (controller.defaultLayersAreSelected ? " selected" : ""),
                            onclick: evt => this.updateLayerSelection(-1, evt)
                        }, _("Default"))
                    ]) : null,
                    this.presentation.layers.slice().reverse()
                        .filter(layer => controller.editableLayers.indexOf(layer) >= 0)
                        .map(layer => h("tr", [
                                h("th.layer-icons", [
                                    layer.isVisible ?
                                        h("i.visibility.far.fa-eye", {
                                            title: _("This layer is visible. Click to hide it."),
                                            onclick: evt => this.toggleLayerVisibility(layer.index, evt)
                                        }) :
                                        h("i.visibility.far.fa-eye-slash", {
                                            title: _("This layer is hidden. Click to show it."),
                                            onclick: evt => this.toggleLayerVisibility(layer.index, evt)
                                        }),
                                    h("i.remove.fas.fa-times", {
                                        title: _("Remove this layer"),
                                        onclick: () => controller.removeLayer(layer.index)
                                    })
                                ]),
                                h("th", {
                                    className: "layer-label" + (this.selection.selectedLayers.indexOf(layer) >= 0 ? " selected" : ""),
                                    onclick: evt => this.updateLayerSelection(layer.index, evt)
                                }, layer.label)
                            ])
                        ),
                    h("tr", {style: {visibility: "collapse"}}, [
                        h("th.layer-icons"),
                        h("th.layer-label", _("Default"))
                    ])
                ])
            ]),
            h("div.timeline-top-right", [
                h("table.timeline", [
                    h("tr", this.presentation.frames.map((frame, frameIndex)  => h("th", {
                            className: "frame-index" +
                                (this.selection.selectedFrames.indexOf(frame) >= 0 ? " selected" : "") +
                                (frame === this.selection.currentFrame ? " current" : ""),
                            onclick: evt => this.updateFrameSelection(frameIndex, evt)
                        }, [
                            h("i.insert-before.fas.fa-arrow-circle-down", {
                                title: Jed.sprintf(_("Insert selection before frame %d"), frameIndex + 1),
                                onclick(evt) {
                                    controller.moveFrames(frameIndex);
                                    evt.stopPropagation();
                                }
                            }),
                            h("i.insert-after.fas.fa-arrow-circle-down", {
                                title: Jed.sprintf(_("Insert selection after frame %d"), frameIndex + 1),
                                onclick(evt) {
                                    controller.moveFrames(frameIndex + 1);
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
                    this.container.querySelector(".timeline-top-right").scrollLeft = evt.target.scrollLeft;
                    this.container.querySelector(".timeline-bottom-left").scrollTop = evt.target.scrollTop;
                }
            }, h("table.timeline", [
                    controller.hasDefaultLayer ? h("tr",
                        this.presentation.frames.map((frame, frameIndex) => h("td", {
                            className:
                                (controller.defaultLayersAreSelected && this.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") +
                                (frame === this.selection.currentFrame ? " current" : "") +
                                (isLinked(frame, controller.defaultLayers[0]) ? " link" : "") +
                                (updateEven(frame, controller.defaultLayers[0]) ? " even" : " odd"),
                            onclick: evt => this.updateLayerAndFrameSelection(-1, frameIndex, evt)
                        }, hasNoReferenceElement(frame, controller.defaultLayers[0]) ? h("i.fas.fa-exclamation-triangle", {title: _("You should add graphic elements in the current area to help Sozi keep track of this layer's position.")}) : null))
                    ) : null,
                    this.presentation.layers.slice().reverse()
                        .filter(layer => controller.editableLayers.indexOf(layer) >= 0)
                        .map(layer => h("tr",
                            this.presentation.frames.map((frame, frameIndex) => h("td", {
                                className:
                                    (this.selection.selectedLayers.indexOf(layer) >= 0 && this.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") +
                                    (frame === this.selection.currentFrame ? " current" : "") +
                                    (isLinked(frame, layer) ? " link" : "") +
                                    (updateEven(frame, layer) ? " even" : " odd"),
                                onclick: evt => this.updateLayerAndFrameSelection(layer.index, frameIndex, evt)
                            }, hasNoReferenceElement(frame, layer) ? h("i.fas.fa-exclamation-triangle", {title: _("You should add graphic elements in the current area to help Sozi keep track of this layer's position.")}) : null)
                        ))),
                    h("tr.collapse",
                        this.presentation.frames.map(frame => h("td", frame.title))
                    )
                ])
            )
        ]);
    }
}
