/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "./utils";
import {Frame} from "./model/Presentation";

const SOZI_NS = "http://sozi.baierouge.fr";

function parseBoolean(str) {
    return str === "true";
}

function convertTimingFunction(str) {
    switch (str) {
            case "accelerate":
            case "strong-accelerate":
                return "easeIn";

            case "decelerate":
            case "strong-decelerate":
                return "easeOut";

            case "accelerate-decelerate":
            case "strong-accelerate-decelerate":
                return "easeInOut";

            case "immediate-beginning":
                return "stepStart";

            case "immediate-end":
                return "stepEnd";

            case "immediate-middle":
                return "stepMiddle";

            default:
                return "linear";
    }
}

function importAttribute(obj, propName, elts, attrName, fn) {
    fn = fn || function (x) { return x; };
    for (let e of elts) {
        if (e && e.hasAttribute(attrName)) {
            obj[propName] = fn(e.getAttribute(attrName));
            return;
        }
    }
}

function importAttributeNS(obj, propName, elts, nsUri, attrName, fn) {
    fn = fn || function (x) { return x; };
    for (let e of elts) {
        if (e && e.hasAttributeNS(nsUri, attrName)) {
            obj[propName] = fn(e.getAttributeNS(nsUri, attrName));
            return;
        }
    }
}

export function upgradeFromSVG(pres, controller) {
    // In the inlined SVG, DOM accessors fail to get elements with explicit XML namespaces.
    // getElementsByTagNameNS, getAttributeNS do not work for elements with the Sozi namespace.
    // We need to use an explicit namespace prefix ("ns:attr") and use method
    // getAttribute as if the prefix was part of the attribute name.
    // With SVG documents from Inkscape, custom namespaces have an automatically generated prefix
    // (ns1, ns2, ...). We first need to identify which one corresponds to the Sozi namespace.

    // Get the xmlns for the Sozi namespace
    const soziNsAttrs = toArray(pres.document.root.attributes).filter(a => a.value === SOZI_NS);
    if (!soziNsAttrs.length) {
        return;
    }
    const soziPrefix = soziNsAttrs[0].name.replace(/^xmlns:/, "") + ":";

    // Get an ordered array of sozi:frame elements
    const frameElts = toArray(pres.document.root.getElementsByTagNameNS(SOZI_NS, "frame"));
    frameElts.sort((a, b) => parseInt(a.getAttributeNS(SOZI_NS, "sequence")) - parseInt(b.getAttributeNS(SOZI_NS, "sequence")));

    // The "default" pool contains all layers that have no corresponding
    // <layer> element in any frame. The properties for these layers are
    // set in the <frame> elements. This array is updated as we process
    // the sequence of frames.
    const defaultLayers = pres.layers.slice();

    frameElts.forEach((frameElt, frameIndex) => {
        // Create a new frame with default camera states
        const frame = Object.create(Frame).init(pres);
        pres.frames.splice(frameIndex, 0, frame);

        // If this is not the first frame, the state is cloned from the previous frame.
        if (frameIndex) {
            frame.initFrom(pres.frames[frameIndex - 1]);
        }

        // Collect layer elements inside the current frame element
        const layerElts = toArray(frameElt.getElementsByTagNameNS(SOZI_NS, "layer"));
        const layerEltsByGroupId = {};
        layerElts.forEach(layerElt => {
            layerEltsByGroupId[layerElt.getAttributeNS(SOZI_NS, "group")] = layerElt;
        });

        pres.layers.forEach((layer, layerIndex) => {
            let layerElt = null;
            if (!layer.auto) {
                // If the current layer has a corresponding <layer> element, use it
                // and consider that the layer is no longer in the "default" pool.
                // Else, if the layer is in the "default" pool, then it is managed
                // by the <frame> element.
                // Other frames are cloned from the predecessors.
                const defaultLayerIndex = defaultLayers.indexOf(layer);
                const groupId = layer.svgNodes[0].getAttribute("id");
                if (groupId in layerEltsByGroupId) {
                    layerElt = layerEltsByGroupId[groupId];
                    if (defaultLayerIndex >= 0) {
                        defaultLayers.splice(defaultLayerIndex, 1);
                        controller.editableLayers.push(layer);
                    }
                }
            }

            const layerProperties = frame.layerProperties[layerIndex];
            const cameraState = frame.cameraStates[layerIndex];

            // It the current layer is managed by a <frame> or <layer> element,
            // update the camera state for this layer.
            let refElt;
            if (layerElt && layerElt.hasAttributeNS(SOZI_NS, "refid")) {
                refElt = pres.document.root.getElementById(layerElt.getAttributeNS(SOZI_NS, "refid"));
            }
            else if (defaultLayers.indexOf(layer) >= 0) {
                refElt = pres.document.root.getElementById(frameElt.getAttributeNS(SOZI_NS, "refid"));
            }
            if (refElt) {
                layerProperties.referenceElementId = layerProperties.outlineElementId = refElt.getAttribute("id");
                cameraState.setAtElement(refElt);
            }

            importAttributeNS(cameraState,     "clipped",                  [layerElt, frameElt], SOZI_NS, "clip",                    parseBoolean);
            importAttributeNS(layerProperties, "outlineElementHide",       [layerElt, frameElt], SOZI_NS, "hide",                    parseBoolean);
            importAttributeNS(layerProperties, "transitionTimingFunction", [layerElt, frameElt], SOZI_NS, "transition-profile",      convertTimingFunction);
            importAttributeNS(layerProperties, "transitionRelativeZoom",   [layerElt, frameElt], SOZI_NS, "transition-zoom-percent", z => parseFloat(z) / 100);
            importAttributeNS(layerProperties, "transitionPathId",         [layerElt, frameElt], SOZI_NS, "transition-path");
            importAttributeNS(layerProperties, "transitionPathHide",       [layerElt, frameElt], SOZI_NS, "transition-path-hide",    parseBoolean);
            layerProperties.outlineElementAuto = false;
        });

        importAttribute(  frame, "frameId",              [frameElt],          "id");
        importAttributeNS(frame, "title",                [frameElt], SOZI_NS, "title");
        importAttributeNS(frame, "transitionDurationMs", [frameElt], SOZI_NS, "transition-duration-ms", parseFloat);
        importAttributeNS(frame, "timeoutMs",            [frameElt], SOZI_NS, "timeout-ms",             parseFloat);
        importAttributeNS(frame, "timeoutEnable",        [frameElt], SOZI_NS, "timeout-enable",         parseBoolean);
        importAttributeNS(frame, "showInFrameList",      [frameElt], SOZI_NS, "show-in-frame-list",     parseBoolean);
    });
}

export function upgradeFromStorable(storable) {
    // Sozi 17.02.05
    // Replace referenceElementAuto with outlineElementAuto
    // Replace referenceElementHide with outlineElementHide
    storable.frames.forEach(frame => {
        for (let layerId in frame.layerProperties) {
            const layer = frame.layerProperties[layerId];
            if (layer.hasOwnProperty("referenceElementAuto")) {
                layer.outlineElementAuto = layer.referenceElementAuto;
                delete layer.referenceElementAuto;
            }
            if (layer.hasOwnProperty("referenceElementHide")) {
                layer.outlineElementHide = layer.referenceElementHide;
                delete layer.referenceElementHide;
            }
            if (layer.hasOwnProperty("referenceElementId") && !layer.hasOwnProperty("outlineElementId")) {
                layer.outlineElementId = layer.referenceElementId;
            }
        }
    });
}
