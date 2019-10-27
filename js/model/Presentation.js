/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {EventEmitter} from "events";
import {CameraState} from "./CameraState";

function copyIfSet(dest, src, prop) {
    if (src.hasOwnProperty(prop)) {
        dest[prop] = src[prop];
    }
}

/** Layer properties for a frame in a Sozi presentation.
 *
 * @category model
 * @todo Add documentation.
 */
export class LayerProperties {

    constructor(obj) {
        if (obj instanceof LayerProperties) {
            this.copy(obj);
        }
        else {
            this.frame                    = obj;
            this.link                     = false;
            this.referenceElementId       = "";
            this.outlineElementId         = "";
            this.outlineElementAuto       = true;
            this.transitionTimingFunction = "linear";
            this.transitionRelativeZoom   = 0;
            this.transitionPathId         = "";
        }
    }

    copy(other) {
        this.frame                    = other.frame;
        this.link                     = other.link;
        this.referenceElementId       = other.referenceElementId;
        this.outlineElementId         = other.outlineElementId;
        this.outlineElementAuto       = other.outlineElementAuto;
        this.transitionTimingFunction = other.transitionTimingFunction;
        this.transitionRelativeZoom   = other.transitionRelativeZoom;
        this.transitionPathId         = other.transitionPathId;
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * @return A plain object with the properties that need to be saved.
     */
    toStorable() {
        return {
            link                    : this.link,
            referenceElementId      : this.referenceElementId,
            outlineElementId        : this.outlineElementId,
            outlineElementAuto      : this.outlineElementAuto,
            transitionTimingFunction: this.transitionTimingFunction,
            transitionRelativeZoom  : this.transitionRelativeZoom,
            transitionPathId        : this.transitionPathId
        };
    }

    toMinimalStorable() {
        return {
            transitionTimingFunction: this.transitionTimingFunction,
            transitionRelativeZoom  : this.transitionRelativeZoom,
            transitionPathId        : this.transitionPathId
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {Object} storable A plain object with the properties to copy.
     */
    fromStorable(storable) {
        copyIfSet(this, storable, "link");
        copyIfSet(this, storable, "referenceElementId");
        copyIfSet(this, storable, "outlineElementId");
        copyIfSet(this, storable, "outlineElementAuto");
        copyIfSet(this, storable, "transitionTimingFunction");
        copyIfSet(this, storable, "transitionRelativeZoom");
        copyIfSet(this, storable, "transitionPathId");
    }

    get index() {
        return this.frame.layerProperties.indexOf(this);
    }

    get referenceElement() {
        return this.frame.presentation.document.root.getElementById(this.referenceElementId);
    }

    get outlineElement() {
        return this.frame.presentation.document.root.getElementById(this.outlineElementId);
    }

    get transitionPath() {
        return this.frame.presentation.document.root.getElementById(this.transitionPathId);
    }

    get outlineElementHide() {
        return this.frame.presentation.elementsToHide.indexOf(this.outlineElementId) >= 0;
    }

    set outlineElementHide(hide) {
        if (this.outlineElement === this.frame.presentation.document.root) {
            return;
        }
        const hidden = this.outlineElementHide;
        if (hide && !hidden) {
            this.frame.presentation.elementsToHide.push(this.outlineElementId);
        }
        else if (!hide && hidden) {
            const index = this.frame.presentation.elementsToHide.indexOf(this.outlineElementId);
            this.frame.presentation.elementsToHide.splice(index, 1);
        }
        if (this.outlineElement) {
            this.outlineElement.style.visibility = hide ? "hidden" : "visible";
        }
    }

    get transitionPathHide() {
        return this.frame.presentation.elementsToHide.indexOf(this.transitionPathId) >= 0;
    }

    set transitionPathHide(hide) {
        const hidden = this.transitionPathHide;
        if (hide && !hidden) {
            this.frame.presentation.elementsToHide.push(this.transitionPathId);
        }
        else if (!hide && hidden) {
            const index = this.frame.presentation.elementsToHide.indexOf(this.transitionPathId);
            this.frame.presentation.elementsToHide.splice(index, 1);
        }
        if (this.transitionPath) {
            this.transitionPath.style.visibility = hide ? "hidden" : "visible";
        }
    }
}

/** A frame in a Sozi presentation.
 *
 * @category model
 * @todo Add documentation.
 */
export class Frame {

    constructor(obj, preserveId=false) {
        if (obj instanceof Frame) {
            this.copy(obj, preserveId);
        }
        else {
            this.presentation         = obj;
            this.frameId              = obj.makeFrameId();
            this.layerProperties      = obj.layers.map(lp => new LayerProperties(this));
            this.cameraStates         = obj.layers.map(cs => new CameraState(obj.document.root));
            this.title                = "New frame";
            this.titleLevel           = 0;
            this.notes                = "";
            this.timeoutMs            = 0;
            this.timeoutEnable        = false;
            this.transitionDurationMs = 1000;
            this.showInFrameList      = true;
            this.showFrameNumber      = true;
        }
    }

    copy(other, preserveId) {
        this.presentation = other.presentation;
        if (!preserveId) {
            this.frameId = other.presentation.makeFrameId();
        }
        this.title                = other.title;
        this.titleLevel           = other.titleLevel;
        this.notes                = other.notes;
        this.timeoutMs            = other.timeoutMs;
        this.timeoutEnable        = other.timeoutEnable;
        this.transitionDurationMs = other.transitionDurationMs;
        this.showInFrameList      = other.showInFrameList;
        this.showFrameNumber      = other.showFrameNumber;
        this.layerProperties      = other.layerProperties.map(lp => new LayerProperties(lp));
        this.cameraStates         = other.cameraStates.map(cs => new CameraState(cs));
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * @return A plain object with the properties that need to be saved.
     */
    toStorable() {
        const layerProperties = {};
        const cameraStates = {};
        const cameraOffsets = {};

        this.presentation.layers.forEach((layer, index) => {
            const lp = this.layerProperties[index];
            const cs = this.cameraStates[index];
            const re = lp.referenceElement;

            const key = layer.groupId;
            layerProperties[key] = lp.toStorable();
            cameraStates[key] = cs.toStorable();
            if (re) {
                cameraOffsets[key] = this.cameraStates[index].offsetFromElement(re);
            }
        });

        return {
            frameId             : this.frameId,
            title               : this.title,
            titleLevel          : this.titleLevel,
            notes               : this.notes,
            timeoutMs           : this.timeoutMs,
            timeoutEnable       : this.timeoutEnable,
            transitionDurationMs: this.transitionDurationMs,
            showInFrameList     : this.showInFrameList,
            showFrameNumber     : this.showFrameNumber,
            layerProperties,
            cameraStates,
            cameraOffsets
        };
    }

    toMinimalStorable() {
        const layerProperties = {};
        const cameraStates = {};

        this.presentation.layers.forEach((layer, index) => {
            const lp = this.layerProperties[index];
            const cs = this.cameraStates[index];

            const key = layer.groupId;
            layerProperties[key] = lp.toMinimalStorable();
            cameraStates[key] = cs.toMinimalStorable();
        });

        return {
            frameId: this.frameId,
            title: this.title,
            titleLevel: this.titleLevel,
            notes: this.notes,
            timeoutMs: this.timeoutMs,
            timeoutEnable: this.timeoutEnable,
            transitionDurationMs: this.transitionDurationMs,
            showInFrameList: this.showInFrameList,
            showFrameNumber: this.showFrameNumber,
            layerProperties,
            cameraStates
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {Object} storable A plain object with the properties to copy.
     */
    fromStorable(storable) {
        copyIfSet(this, storable, "frameId");
        copyIfSet(this, storable, "title");
        copyIfSet(this, storable, "titleLevel");
        copyIfSet(this, storable, "notes");
        copyIfSet(this, storable, "timeoutMs");
        copyIfSet(this, storable, "timeoutEnable");
        copyIfSet(this, storable, "transitionDurationMs");
        copyIfSet(this, storable, "showInFrameList");
        copyIfSet(this, storable, "showFrameNumber");

        // TODO if storable.layerProperties has keys not in layers, create fake layers marked as "deleted"
        this.presentation.layers.forEach((layer, index) => {
            // If the current layer has been added to the SVG after the frame
            // was created, copy the properties of the "auto" layer.
            const key = layer.groupId in storable.layerProperties ? layer.groupId : "__sozi_auto__";
            if (key in storable.layerProperties) {
                const lp = this.layerProperties[index];
                lp.fromStorable(storable.layerProperties[key]);

                const cs = this.cameraStates[index];
                cs.fromStorable(storable.cameraStates[key]);

                const re = lp.referenceElement;
                if (re) {
                    const ofs = storable.cameraOffsets[key] || {};
                    cs.setAtElement(re, ofs.deltaX, ofs.deltaY,
                                    ofs.widthFactor, ofs.heightFactor,
                                    ofs.deltaAngle);
                    // TODO compare current camera state with stored camera state.
                    // If different, mark the current layer as "dirty".
                }
            }
        });
    }

    get index() {
        return this.presentation.frames.indexOf(this);
    }

    setAtStates(states) {
        states.forEach((state, index) => {
            this.cameraStates[index].copy(state);
        });
    }

    /*
     * Check whether the current frame is linked to the given frame
     * at the given layer index.
     *
     * Returns true if there is a sequence of frames, between the first
     * and the last of the two frames, where the link attribute is set
     * in the layer at the given index.
     */
    isLinkedTo(frame, layerIndex) {
        const [first, second] = this.index < frame.index ? [this, frame] : [frame, this];
        return second.layerProperties[layerIndex].link &&
               (second.index === first.index + 1 ||
                second.index > first.index &&
                this.presentation.frames[second.index - 1].isLinkedTo(first, layerIndex));
    }
}

/** Layer in an SVG document.
 *
 * @category model
 * @todo Add documentation.
 */
export class Layer {

    constructor(presentation, label, auto) {
        this.presentation = presentation;
        this.label = label;
        this.auto = auto;
        this.svgNodes = [];
    }

    get groupId() {
        return this.auto ? "__sozi_auto__" : this.svgNodes[0].getAttribute("id");
    }

    get index() {
        return this.presentation.layers.indexOf(this);
    }

    get isVisible() {
        return this.svgNodes.some(node => window.getComputedStyle(node).display !== "none");
    }

    set isVisible(visible) {
        for (let node of this.svgNodes) {
            node.style.display = visible ? "inline" : "none";
        }
    }

    contains(svgElement) {
        return this.svgNodes.some(node => node.contains(svgElement));
    }
}

// Constant: the SVG namespace
const SVG_NS = "http://www.w3.org/2000/svg";

/** Sozi presentation.
 *
 * @category model
 * @todo Add documentation.
 */
export class Presentation extends EventEmitter {

    /*
     * Initialize a Sozi document object.
     *
     * Returns:
     *    - The current presentation object.
     */
    constructor() {
        super();

        this.document                 = null;
        this.frames                   = [];
        this.layers                   = [];
        this.elementsToHide           = [];
        this.aspectWidth              = 4;
        this.aspectHeight             = 3;
        this.enableKeyboardZoom       = true;
        this.enableKeyboardRotation   = true;
        this.enableKeyboardNavigation = true;
        this.enableMouseTranslation   = true;
        this.enableMouseZoom          = true;
        this.enableMouseRotation      = true;
        this.enableMouseNavigation    = true;
        this.updateURLOnFrameChange   = true;
    }

    setSVGDocument(svgDocument) {
        this.document = svgDocument;

        // Create an empty wrapper layer for elements that do not belong to a valid layer
        const autoLayer = new Layer(this, "auto", true);

        this.layers = [];
        for (let svgNode of this.document.root.childNodes) {
            if (svgNode instanceof SVGGElement) {
                const nodeId = svgNode.getAttribute("id");
                if (nodeId === null) {
                    autoLayer.svgNodes.push(svgNode);
                }
                else {
                    // Add the current node as a new layer.
                    const layer = new Layer(this,
                        this.document.handler.getLabel(svgNode) || ("#" + nodeId),
                        false);
                    layer.svgNodes.push(svgNode);
                    this.layers.push(layer);
                }
            }
        }

        this.layers.push(autoLayer);
        this.initialCameraState = new CameraState(this.document.root);
        this.emit("svgChange");
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * @return A plain object with the properties that need to be saved.
     */
    toStorable() {
        return {
            aspectWidth             : this.aspectWidth,
            aspectHeight            : this.aspectHeight,
            enableKeyboardZoom      : this.enableKeyboardZoom,
            enableKeyboardRotation  : this.enableKeyboardRotation,
            enableKeyboardNavigation: this.enableKeyboardNavigation,
            enableMouseTranslation  : this.enableMouseTranslation,
            enableMouseZoom         : this.enableMouseZoom,
            enableMouseRotation     : this.enableMouseRotation,
            enableMouseNavigation   : this.enableMouseNavigation,
            updateURLOnFrameChange  : this.updateURLOnFrameChange,
            frames                  : this.frames.map(frame => frame.toStorable()),
            elementsToHide          : this.elementsToHide.slice()
        };
    }

    toMinimalStorable() {
        return {
            enableKeyboardZoom      : this.enableKeyboardZoom,
            enableKeyboardRotation  : this.enableKeyboardRotation,
            enableKeyboardNavigation: this.enableKeyboardNavigation,
            enableMouseTranslation  : this.enableMouseTranslation,
            enableMouseZoom         : this.enableMouseZoom,
            enableMouseRotation     : this.enableMouseRotation,
            enableMouseNavigation   : this.enableMouseNavigation,
            updateURLOnFrameChange  : this.updateURLOnFrameChange,
            frames                  : this.frames.map(frame => frame.toMinimalStorable()),
            elementsToHide          : this.elementsToHide.slice()
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {Object} storable A plain object with the properties to copy.
     */
    fromStorable(storable) {
        copyIfSet(this, storable, "aspectWidth");
        copyIfSet(this, storable, "aspectHeight");
        copyIfSet(this, storable, "enableKeyboardZoom");
        copyIfSet(this, storable, "enableKeyboardRotation");
        copyIfSet(this, storable, "enableKeyboardNavigation");
        copyIfSet(this, storable, "enableMouseTranslation");
        copyIfSet(this, storable, "enableMouseZoom");
        copyIfSet(this, storable, "enableMouseRotation");
        copyIfSet(this, storable, "enableMouseNavigation");
        copyIfSet(this, storable, "updateURLOnFrameChange");

        this.frames = storable.frames.map(f => {
            const res = new Frame(this);
            res.fromStorable(f);
            return res;
        });

        if (storable.elementsToHide) {
            this.elementsToHide = storable.elementsToHide.slice();
        }
    }

    get title() {
        const svgTitles = this.document.root.getElementsByTagNameNS(SVG_NS, "title");
        return svgTitles.length ? svgTitles[0].firstChild.wholeText.trim() : "Untitled";
    }

    makeFrameId() {
        const prefix = "frame";
        let suffix = Math.floor(1000 * (1 + 9 * Math.random()));
        let frameId;
        do {
            frameId = prefix + suffix;
            suffix ++;
        } while (this.frames.some(frame => frame.frameId === frameId));
        return frameId;
    }

    getFrameWithId(frameId) {
        for (let frame of this.frames) {
            if (frame.frameId === frameId) {
                return frame;
            }
        }
        return null;
    }

    getLayerWithId(groupId) {
        for (let layer of this.layers) {
            if (layer.groupId === groupId) {
                return layer;
            }
        }
        return null;
    }

    updateLinkedLayers() {
        if (!this.frames.length) {
            return;
        }

        const firstCameraStates      = this.frames[0].cameraStates;
        const defaultCameraState     = firstCameraStates[firstCameraStates.length - 1];

        const firstLayerProperties   = this.frames[0].layerProperties;
        const defaultLayerProperties = firstLayerProperties[firstLayerProperties.length - 1];

        this.layers.forEach((layer, layerIndex) => {
            let cameraState     = defaultCameraState;
            let layerProperties = defaultLayerProperties;

            for (let frame of this.frames) {
                if (frame.layerProperties[layerIndex].link) {
                    frame.cameraStates[layerIndex].copy(cameraState);
                    frame.layerProperties[layerIndex].referenceElementId = layerProperties.referenceElementId;
                    frame.layerProperties[layerIndex].outlineElementId   = layerProperties.outlineElementId;
                }
                else {
                    cameraState     = frame.cameraStates[layerIndex];
                    layerProperties = frame.layerProperties[layerIndex];
                }
            }
        });
    }
}
