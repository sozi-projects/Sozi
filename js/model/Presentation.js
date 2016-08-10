/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "../utils";
import {CameraState} from "./CameraState";

function copyIfSet(dest, src, prop) {
    if (src.hasOwnProperty(prop)) {
        dest[prop] = src[prop];
    }
}

export var LayerProperties = {

    link: false,
    referenceElementId: "",
    referenceElementAuto: true,
    transitionTimingFunction: "linear",
    transitionRelativeZoom: 0,
    transitionPathId: "",

    init(frame) {
        this.frame = frame;
        return this;
    },

    initFrom(other) {
        this.frame = other.frame;
        this.link = other.link;
        this.referenceElementId = other.referenceElementId;
        this.referenceElementAuto = other.referenceElementAuto;
        this.transitionTimingFunction = other.transitionTimingFunction;
        this.transitionRelativeZoom = other.transitionRelativeZoom;
        this.transitionPathId = other.transitionPathId;
        return this;
    },

    toStorable() {
        return {
            link: this.link,
            referenceElementId: this.referenceElementId,
            referenceElementAuto: this.referenceElementAuto,
            transitionTimingFunction: this.transitionTimingFunction,
            transitionRelativeZoom: this.transitionRelativeZoom,
            transitionPathId: this.transitionPathId
        };
    },

    toMinimalStorable() {
        return {
            transitionTimingFunction: this.transitionTimingFunction,
            transitionRelativeZoom: this.transitionRelativeZoom,
            transitionPathId: this.transitionPathId
        };
    },

    fromStorable(storable) {
        copyIfSet(this, storable, "link");
        copyIfSet(this, storable, "referenceElementId");
        copyIfSet(this, storable, "referenceElementAuto");
        copyIfSet(this, storable, "transitionTimingFunction");
        copyIfSet(this, storable, "transitionRelativeZoom");
        copyIfSet(this, storable, "transitionPathId");
        return this;
    },

    get index() {
        return this.frame.layerProperties.indexOf(this);
    },

    get referenceElement() {
        return this.frame.presentation.document.root.getElementById(this.referenceElementId);
    },

    get transitionPath() {
        return this.frame.presentation.document.root.getElementById(this.transitionPathId);
    },

    get referenceElementHide() {
        return this.frame.presentation.elementsToHide.indexOf(this.referenceElementId) >= 0;
    },

    set referenceElementHide(hide) {
        var hidden = this.referenceElementHide;
        if (hide && !hidden) {
            this.frame.presentation.elementsToHide.push(this.referenceElementId);
        }
        else if (!hide && hidden) {
            var index = this.frame.presentation.elementsToHide.indexOf(this.referenceElementId);
            this.frame.presentation.elementsToHide.splice(index, 1);
        }
        if (this.referenceElement) {
            this.referenceElement.style.visibility = hide ? "hidden" : "visible";
        }
    },

    get transitionPathHide() {
        return this.frame.presentation.elementsToHide.indexOf(this.transitionPathId) >= 0;
    },

    set transitionPathHide(hide) {
        var hidden = this.transitionPathHide;
        if (hide && !hidden) {
            this.frame.presentation.elementsToHide.push(this.transitionPathId);
        }
        else if (!hide && hidden) {
            var index = this.frame.presentation.elementsToHide.indexOf(this.transitionPathId);
            this.frame.presentation.elementsToHide.splice(index, 1);
        }
        if (this.transitionPath) {
            this.transitionPath.style.visibility = hide ? "hidden" : "visible";
        }
    }
};

export var Frame = {

    // Default values for new frames
    title: "New frame",
    timeoutMs: 0,
    timeoutEnable: false,
    transitionDurationMs: 1000,
    showInFrameList: true,
    showFrameNumber: true,

    init(presentation) {
        this.presentation = presentation;
        this.frameId = presentation.makeFrameId();
        this.layerProperties = presentation.layers.map(lp => Object.create(LayerProperties).init(this));
        this.cameraStates = presentation.layers.map(cs => Object.create(CameraState).init(presentation.document.root));
        return this;
    },

    initFrom(other, preserveId) {
        this.presentation = other.presentation;
        if (!preserveId) {
            this.frameId = other.presentation.makeFrameId();
        }
        this.title = other.title;
        this.timeoutMs = other.timeoutMs;
        this.timeoutEnable = other.timeoutEnable;
        this.transitionDurationMs = other.transitionDurationMs;
        this.showInFrameList = other.showInFrameList;
        this.showFrameNumber = other.showFrameNumber;
        this.layerProperties = other.layerProperties.map(lp => Object.create(LayerProperties).initFrom(lp));
        this.cameraStates = other.cameraStates.map(cs => Object.create(CameraState).initFrom(cs));
        return this;
    },

    toStorable() {
        var layerProperties = {};
        var cameraStates = {};
        var cameraOffsets = {};

        this.presentation.layers.forEach((layer, index) => {
            var lp = this.layerProperties[index];
            var cs = this.cameraStates[index];
            var re = lp.referenceElement;

            var key = layer.groupId;
            layerProperties[key] = lp.toStorable();
            cameraStates[key] = cs.toStorable();
            if (re) {
                cameraOffsets[key] = this.cameraStates[index].offsetFromElement(re);
            }
        });

        return {
            frameId: this.frameId,
            title: this.title,
            timeoutMs: this.timeoutMs,
            timeoutEnable: this.timeoutEnable,
            transitionDurationMs: this.transitionDurationMs,
            showInFrameList: this.showInFrameList,
            showFrameNumber: this.showFrameNumber,
            layerProperties,
            cameraStates,
            cameraOffsets
        };
    },

    toMinimalStorable() {
        var layerProperties = {};
        var cameraStates = {};

        this.presentation.layers.forEach((layer, index) => {
            var lp = this.layerProperties[index];
            var cs = this.cameraStates[index];

            var key = layer.groupId;
            layerProperties[key] = lp.toMinimalStorable();
            cameraStates[key] = cs.toMinimalStorable();
        });

        return {
            frameId: this.frameId,
            title: this.title,
            timeoutMs: this.timeoutMs,
            timeoutEnable: this.timeoutEnable,
            transitionDurationMs: this.transitionDurationMs,
            showInFrameList: this.showInFrameList,
            showFrameNumber: this.showFrameNumber,
            layerProperties,
            cameraStates
        };
    },

    fromStorable(storable) {
        copyIfSet(this, storable, "frameId");
        copyIfSet(this, storable, "title");
        copyIfSet(this, storable, "timeoutMs");
        copyIfSet(this, storable, "timeoutEnable");
        copyIfSet(this, storable, "transitionDurationMs");
        copyIfSet(this, storable, "showInFrameList");
        copyIfSet(this, storable, "showFrameNumber");

        // TODO if storable.layerProperties has keys not in layers, create fake layers marked as "deleted"
        this.presentation.layers.forEach((layer, index) => {
            var key = layer.groupId;
            if (key in storable.layerProperties) {
                var lp = this.layerProperties[index];
                lp.fromStorable(storable.layerProperties[key]);

                var cs = this.cameraStates[index].fromStorable(storable.cameraStates[key]);
                var re = lp.referenceElement;
                if (re) {
                    var ofs = storable.cameraOffsets[key] || {};
                    cs.setAtElement(re, ofs.deltaX, ofs.deltaY,
                                    ofs.widthFactor, ofs.heightFactor,
                                    ofs.deltaAngle);
                    // TODO compare current camera state with stored camera state.
                    // If different, mark the current layer as "dirty".
                }
            }
            // TODO else, link to "auto" layer
        });

        return this;
    },

    get index() {
        return this.presentation.frames.indexOf(this);
    },

    setAtStates(states) {
        states.forEach((state, index) => {
            this.cameraStates[index].initFrom(state);
        });
    },

    /*
     * Check whether the current frame is linked to the given frame
     * at the given layer index.
     *
     * Returns true if there is a sequence of frames, between the first
     * and the last of the two frames, where the link attribute is set
     * in the layer at the given index.
     */
    isLinkedTo(frame, layerIndex) {
        var [first, second] = this.index < frame.index ? [this, frame] : [frame, this];
        return second.layerProperties[layerIndex].link &&
               (second.index === first.index + 1 ||
                second.index > first.index &&
                this.presentation.frames[second.index - 1].isLinkedTo(first, layerIndex));
    }
};

export var Layer = {

    init(presentation, label, auto) {
        this.presentation = presentation;
        this.label = label;
        this.auto = auto;
        this.svgNodes = [];
        return this;
    },

    get groupId() {
        return this.auto ? "__sozi_auto__" : this.svgNodes[0].getAttribute("id");
    },

    get index() {
        return this.presentation.layers.indexOf(this);
    },

    get isVisible() {
        return this.svgNodes.some(node => window.getComputedStyle(node).display !== "none");
    },

    set isVisible(visible) {
        this.svgNodes.forEach(node => {
            node.style.display = visible ? "inline" : "none";
        });
    }
};

// Constant: the SVG namespace
var SVG_NS = "http://www.w3.org/2000/svg";

export var Presentation = {

    aspectWidth: 4,
    aspectHeight: 3,

    /*
     * Initialize a Sozi document object.
     *
     * Returns:
     *    - The current presentation object.
     */
    init(svgDocument) {
        this.document = svgDocument;
        this.frames = [];
        this.layers = [];
        this.elementsToHide = [];

        // Create an empty wrapper layer for elements that do not belong to a valid layer
        var autoLayer = Object.create(Layer).init(this, "auto", true);

        toArray(this.document.root.childNodes).forEach(svgNode => {
            if (svgNode.localName === "g") {
                var nodeId = svgNode.getAttribute("id");
                if (nodeId === null) {
                    autoLayer.svgNodes.push(svgNode);
                }
                else {
                    // Add the current node as a new layer.
                    var layer = Object.create(Layer).init(this,
                        this.document.handler.getLabel(svgNode) || ("#" + nodeId),
                        false);
                    layer.svgNodes.push(svgNode);
                    this.layers.push(layer);
                }
            }
        });

        this.layers.push(autoLayer);

        return this;
    },

    toStorable() {
        return {
            aspectWidth: this.aspectWidth,
            aspectHeight: this.aspectHeight,
            frames: this.frames.map(frame => frame.toStorable()),
            elementsToHide: this.elementsToHide.slice()
        };
    },

    toMinimalStorable() {
        return {
            frames: this.frames.map(frame => frame.toMinimalStorable()),
            elementsToHide: this.elementsToHide.slice()
        };
    },

    fromStorable(storable) {
        copyIfSet(this, storable, "aspectWidth");
        copyIfSet(this, storable, "aspectHeight");

        this.frames = storable.frames.map(f => Object.create(Frame).init(this).fromStorable(f));

        if (storable.elementsToHide) {
            this.elementsToHide = storable.elementsToHide.slice();
        }

        return this;
    },

    get title() {
        var svgTitles = this.document.root.getElementsByTagNameNS(SVG_NS, "title");
        if (svgTitles.length) {
            return svgTitles[0].firstChild.wholeText.trim();
        }
        else {
            var svgRoot = this.document.root.getElementsByTagNameNS(SVG_NS, "svg");
            if (svgRoot.length) {
                var docName = svgRoot.firstChild.getAttributeNode("sodipodi:docname").value.trim();
                return docName.replace(/\.[^/.]+$/, "");
            }
        }
        return "Untitled";
    },

    makeFrameId() {
        var prefix = "frame";
        var suffix = Math.floor(1000 * (1 + 9 * Math.random()));
        var frameId;
        do {
            frameId = prefix + suffix;
            suffix ++;
        } while (this.frames.some(frame => frame.frameId === frameId));
        return frameId;
    },

    getFrameWithId(frameId) {
        for (var i = 0; i < this.frames.length; i ++) {
            if (this.frames[i].frameId === frameId) {
                return this.frames[i];
            }
        }
        return null;
    },

    getLayerWithId(groupId) {
        for (var i = 0; i < this.layers.length; i ++) {
            if (this.layers[i].groupId === groupId) {
                return this.layers[i];
            }
        }
        return null;
    },

    updateLinkedLayers() {
        if (!this.frames.length) {
            return;
        }

        var firstCameraStates = this.frames[0].cameraStates;
        var defaultCameraState = firstCameraStates[firstCameraStates.length - 1];

        this.layers.forEach((layer, layerIndex) => {
            var cameraState = defaultCameraState;

            this.frames.forEach(frame => {
                if (frame.layerProperties[layerIndex].link) {
                    frame.cameraStates[layerIndex].initFrom(cameraState);
                }
                else {
                    cameraState = frame.cameraStates[layerIndex];
                }
            });
        });
    }
};
