/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Timeline = undefined;

var _utils = require("../utils");

var _h = require("virtual-dom/h");

var _h2 = _interopRequireDefault(_h);

var _VirtualDOMView = require("./VirtualDOMView");

var _jed = require("jed");

var _jed2 = _interopRequireDefault(_jed);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
var Timeline = exports.Timeline = Object.create(_VirtualDOMView.VirtualDOMView);

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
    var _this = this;

    _VirtualDOMView.VirtualDOMView.init.call(this, container, controller);

    this.presentation = presentation;
    this.selection = selection;
    this.gettext = function (s) {
        return locale.gettext(s);
    };

    this.editableLayers = [];
    this.defaultLayers = [];

    controller.addListener("ready", function () {
        return _this.onReady();
    });

    return this;
};

Timeline.onReady = function () {
    var _this2 = this;

    this.defaultLayers = [];

    this.presentation.layers.forEach(function (layer) {
        if (_this2.editableLayers.indexOf(layer) < 0) {
            _this2.defaultLayers.push(layer);
        }
    });
};

Timeline.toStorable = function () {
    return {
        editableLayers: this.editableLayers.map(function (layer) {
            return layer.groupId;
        })
    };
};

Timeline.fromStorable = function (storable) {
    var _this3 = this;

    this.editableLayers = [];

    if (storable.hasOwnProperty("editableLayers")) {
        storable.editableLayers.forEach(function (groupId) {
            var layer = _this3.presentation.getLayerWithId(groupId);
            if (layer && _this3.editableLayers.indexOf(layer) < 0) {
                _this3.editableLayers.push(layer);
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
    var layer = this.presentation.layers[layerIndex];
    if (this.editableLayers.indexOf(layer) < 0) {
        this.editableLayers.push(layer);
    }

    var layerIndexInDefaults = this.defaultLayers.indexOf(layer);
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
    var layer = this.presentation.layers[layerIndex];

    var layerIndexInEditable = this.editableLayers.indexOf(layer);
    this.editableLayers.splice(layerIndexInEditable, 1);

    if (this.defaultLayersAreSelected) {
        this.controller.addLayerToSelection(layer);
    } else if (this.selection.selectedLayers.length > 1) {
        this.controller.removeLayerFromSelection(layer);
    } else {
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
    return layerIndex >= 0 ? [this.presentation.layers[layerIndex]] : this.defaultLayers;
};

/*
 * Check whether "default" layers are selected.
 *
 * Returns:
 *  - true if all "default" layers are selected, else false
 */
Object.defineProperty(Timeline, "defaultLayersAreSelected", {
    get: function get() {
        var _this4 = this;

        return this.defaultLayers.every(function (layer) {
            return _this4.selection.selectedLayers.indexOf(layer) >= 0;
        });
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
    _VirtualDOMView.VirtualDOMView.repaint.call(this);

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
    topLeft.style.width = bottomLeft.style.width = topLeftTable.style.width = bottomLeftTable.style.width = leftWidth + "px";
    topRight.style.width = bottomRight.style.width = rightWidth + "px";

    // Fit the height of the top tables,
    // allocate remaining width to the bottom tables
    topLeft.style.height = topRight.style.height = topHeight + "px";
    bottomLeft.style.height = bottomRight.style.height = bottomHeight + "px";

    // Corresponding rows in left and right tables must have the same height
    var leftRows = (0, _utils.toArray)(topLeft.querySelectorAll("tr")).concat((0, _utils.toArray)(bottomLeft.querySelectorAll("tr")));
    var rightRows = (0, _utils.toArray)(topRight.querySelectorAll("tr")).concat((0, _utils.toArray)(bottomRight.querySelectorAll("tr")));
    leftRows.forEach(function (leftRow, rowIndex) {
        var rightRow = rightRows[rowIndex];
        var maxHeight = Math.max(leftRow.clientHeight, rightRow.clientHeight);
        leftRow.style.height = rightRow.style.height = maxHeight + "px";
    });
};

Object.defineProperty(Timeline, "hasDefaultLayer", {
    get: function get() {
        return this.defaultLayers.length > 1 || this.defaultLayers.length > 0 && this.defaultLayers[0].svgNodes.length;
    }
});

Object.defineProperty(Timeline, "refLayerInDefault", {
    get: function get() {
        for (var i = 0; i < this.defaultLayers.length; i++) {
            if (this.defaultLayers[i].svgNodes.length) {
                return this.defaultLayers[i];
            }
        }
        return this.defaultLayers[0];
    }
});

Timeline.render = function () {
    var _this5 = this;

    var _ = this.gettext;

    var defaultLayersAreVisible = this.defaultLayers.some(function (layer) {
        return layer.isVisible;
    });

    var c = this.controller;
    var even = true;
    function updateEven(frame, layer) {
        if (frame.index === 0) {
            even = true;
        } else if (!frame.layerProperties[layer.index].link) {
            even = !even;
        }
        return even;
    }

    return (0, _h2.default)("div", [(0, _h2.default)("div.timeline-top-left", [(0, _h2.default)("table.timeline", [(0, _h2.default)("tr", [(0, _h2.default)("th", (0, _h2.default)("button", {
        title: _("Delete the selected frames"),
        disabled: this.selection.selectedFrames.length ? undefined : "disabled",
        onclick: function onclick() {
            c.deleteFrames();
        }
    }, (0, _h2.default)("i.fa.fa-trash"))), (0, _h2.default)("th", (0, _h2.default)("button", {
        title: _("Create a new frame"),
        onclick: function onclick() {
            c.addFrame();
        }
    }, (0, _h2.default)("i.fa.fa-plus")))]), (0, _h2.default)("tr", (0, _h2.default)("th", { attributes: { colspan: 2 } }, (0, _h2.default)("select", {
        onchange: function onchange(evt) {
            var value = evt.target.value;
            evt.target.value = "__add__";
            _this5.addLayer(value);
        }
    }, [(0, _h2.default)("option", { value: "__add__", selected: "selected" }, _("Add layer"))].concat(this.presentation.layers.slice().reverse().filter(function (layer) {
        return !layer.auto && _this5.defaultLayers.indexOf(layer) >= 0;
    }).map(function (layer) {
        return (0, _h2.default)("option", { value: layer.index }, layer.label);
    })))))])]), (0, _h2.default)("div.timeline-bottom-left", [(0, _h2.default)("table.timeline", (this.hasDefaultLayer ? [(0, _h2.default)("tr", [(0, _h2.default)("th.layer-icons", [defaultLayersAreVisible ? (0, _h2.default)("i.visibility.fa.fa-eye", {
        title: _("This layer is visible. Click to hide it."),
        onclick: function onclick(evt) {
            return _this5.toggleLayerVisibility(-1, evt);
        }
    }) : (0, _h2.default)("i.visibility.fa.fa-eye-slash", {
        title: _("This layer is hidden. Click to show it."),
        onclick: function onclick(evt) {
            return _this5.toggleLayerVisibility(-1, evt);
        }
    }), (0, _h2.default)("i.remove.fa.fa-times", { style: { visibility: "hidden" } })]), (0, _h2.default)("th", {
        className: "layer-label" + (this.defaultLayersAreSelected ? " selected" : ""),
        onclick: function onclick(evt) {
            return _this5.updateLayerSelection(-1, evt);
        }
    }, _("Default"))])] : []).concat(this.presentation.layers.slice().reverse().filter(function (layer) {
        return _this5.editableLayers.indexOf(layer) >= 0;
    }).map(function (layer) {
        return (0, _h2.default)("tr", [(0, _h2.default)("th.layer-icons", [layer.isVisible ? (0, _h2.default)("i.visibility.fa.fa-eye", {
            title: _("This layer is visible. Click to hide it."),
            onclick: function onclick(evt) {
                return _this5.toggleLayerVisibility(layer.index, evt);
            }
        }) : (0, _h2.default)("i.visibility.fa.fa-eye-slash", {
            title: _("This layer is hidden. Click to show it."),
            onclick: function onclick(evt) {
                return _this5.toggleLayerVisibility(layer.index, evt);
            }
        }), (0, _h2.default)("i.remove.fa.fa-times", {
            title: _("Remove this layer"),
            onclick: function onclick() {
                return _this5.removeLayer(layer.index);
            }
        })]), (0, _h2.default)("th", {
            className: "layer-label" + (_this5.selection.selectedLayers.indexOf(layer) >= 0 ? " selected" : ""),
            onclick: function onclick(evt) {
                return _this5.updateLayerSelection(layer.index, evt);
            }
        }, layer.label)]);
    })).concat([(0, _h2.default)("tr", { style: { visibility: "collapse" } }, [(0, _h2.default)("th.layer-icons"), (0, _h2.default)("th.layer-label", _("Default"))])]))]), (0, _h2.default)("div.timeline-top-right", [(0, _h2.default)("table.timeline", [(0, _h2.default)("tr", this.presentation.frames.map(function (frame, frameIndex) {
        return (0, _h2.default)("th", {
            className: "frame-index" + (_this5.selection.selectedFrames.indexOf(frame) >= 0 ? " selected" : "") + (frame === _this5.selection.currentFrame ? " current" : ""),
            onclick: function onclick(evt) {
                return _this5.updateFrameSelection(frameIndex, evt);
            }
        }, [(0, _h2.default)("i.insert-before.fa.fa-arrow-circle-down", {
            title: _jed2.default.sprintf(_("Insert selection before frame %d"), frameIndex + 1),
            onclick: function onclick(evt) {
                c.moveFrames(frameIndex);
                evt.stopPropagation();
            }
        }), (0, _h2.default)("i.insert-after.fa.fa-arrow-circle-down", {
            title: _jed2.default.sprintf(_("Insert selection after frame %d"), frameIndex + 1),
            onclick: function onclick(evt) {
                c.moveFrames(frameIndex + 1);
                evt.stopPropagation();
            }
        }), (frameIndex + 1).toString()]);
    })), (0, _h2.default)("tr", this.presentation.frames.map(function (frame, frameIndex) {
        return (0, _h2.default)("th", {
            title: frame.title,
            className: "frame-title" + (_this5.selection.selectedFrames.indexOf(frame) >= 0 ? " selected" : "") + (frame === _this5.selection.currentFrame ? " current" : ""),
            onclick: function onclick(evt) {
                return _this5.updateFrameSelection(frameIndex, evt);
            }
        }, frame.title);
    }))])]), (0, _h2.default)("div.timeline-bottom-right", {
        onscroll: function onscroll(evt) {
            _this5.rootNode.querySelector(".timeline-top-right").scrollLeft = evt.target.scrollLeft;
            _this5.rootNode.querySelector(".timeline-bottom-left").scrollTop = evt.target.scrollTop;
        }
    }, [(0, _h2.default)("table.timeline", (this.hasDefaultLayer ? [(0, _h2.default)("tr", this.presentation.frames.map(function (frame, frameIndex) {
        return (0, _h2.default)("td", {

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
            className: (_this5.defaultLayersAreSelected && _this5.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") +
            (frame === _this5.selection.currentFrame ? " current" : "") + (frameIndex > 0 && frame.layerProperties[_this5.defaultLayers[0].index].link ? " link" : "") +
            (updateEven(frame, _this5.defaultLayers[0]) ? " even" : " odd") + " " + frameIndex,

            id: frame.frameId,
            onclick: function onclick(evt) {
                return _this5.updateLayerAndFrameSelection(-1, frameIndex, evt);
            }
        });
    }))] : []).concat(this.presentation.layers.slice().reverse().filter(function (layer) {
        return _this5.editableLayers.indexOf(layer) >= 0;
    }).map(function (layer) {
        return (0, _h2.default)("tr", _this5.presentation.frames.map(function (frame, frameIndex) {
            return (0, _h2.default)("td", {
                classList: (_this5.selection.selectedLayers.indexOf(layer) >= 0 && _this5.selection.selectedFrames.indexOf(frame) >= 0 ? "selected" : "") + (frame === _this5.selection.currentFrame ? " current" : "") + (frameIndex > 0 && frame.layerProperties[layer.index].link ? " link" : "") + (updateEven(frame, layer) ? " even" : " odd") + frame,
                onclick: function onclick(evt) {
                    return _this5.updateLayerAndFrameSelection(layer.index, frameIndex, evt);
                }
            });
        }));
    })).concat([(0, _h2.default)("tr.collapse", this.presentation.frames.map(function (frame) {
        return (0, _h2.default)("td", frame.title);
    }))]))])]);
};
