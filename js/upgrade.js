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
    for (let i = 0; i < elts.length; i ++) {
        if (elts[i] && elts[i].hasAttribute(attrName)) {
            obj[propName] = fn(elts[i].getAttribute(attrName));
            return;
        }
    }
}

export function upgrade(pres, timeline) {
    // In the inlined SVG, DOM accessors fail to get elements with explicit XML namespaces.
    // getElementsByTagNameNS, getAttributeNS do not work for elements with the Sozi namespace.
    // We need to use an explicit namespace prefix ("ns:attr") and use methods
    // getElementsByTagName and getAttribute as if the prefix was part of the attribute name.
    // With SVG documents from Inkscape, custom namespaces have an automatically generated prefix
    // (ns1, ns2, ...). We first need to identify which one corresponds to the Sozi namespace.

    // Get the xmlns for the Sozi namespace
    const soziNsAttrs = toArray(pres.document.root.attributes).filter(a => a.value === SOZI_NS);
    if (!soziNsAttrs.length) {
        return;
    }
    const soziPrefix = soziNsAttrs[0].name.replace(/^xmlns:/, "") + ":";

    // Get an ordered array of sozi:frame elements
    const frameElts = toArray(pres.document.root.getElementsByTagName(soziPrefix + "frame"));
    frameElts.sort((a, b) => parseInt(a.getAttribute(soziPrefix + "sequence")) - parseInt(b.getAttribute(soziPrefix + "sequence")));

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
        const layerElts = toArray(frameElt.getElementsByTagName(soziPrefix + "layer"));
        const layerEltsByGroupId = {};
        layerElts.forEach(layerElt => {
            layerEltsByGroupId[layerElt.getAttribute(soziPrefix + "group")] = layerElt;
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
                        timeline.editableLayers.push(layer);
                    }
                }
            }

            const layerProperties = frame.layerProperties[layerIndex];
            const cameraState = frame.cameraStates[layerIndex];

            // It the current layer is managed by a <frame> or <layer> element,
            // update the camera state for this layer.
            let refElt;
            if (layerElt && layerElt.hasAttribute(soziPrefix + "refid")) {
                refElt = pres.document.root.getElementById(layerElt.getAttribute(soziPrefix + "refid"));
            }
            else if (defaultLayers.indexOf(layer) >= 0) {
                refElt = pres.document.root.getElementById(frameElt.getAttribute(soziPrefix + "refid"));
            }
            if (refElt) {
                layerProperties.referenceElementId = refElt.getAttribute("id");
                cameraState.setAtElement(refElt);
            }

            importAttribute(cameraState, "clipped", [layerElt, frameElt], soziPrefix + "clip", parseBoolean);
            layerProperties.referenceElementAuto = false;
            importAttribute(layerProperties, "referenceElementHide", [layerElt, frameElt], soziPrefix + "hide", parseBoolean);
            importAttribute(layerProperties, "transitionTimingFunction", [layerElt, frameElt], soziPrefix + "transition-profile", convertTimingFunction);
            importAttribute(layerProperties, "transitionRelativeZoom", [layerElt, frameElt], soziPrefix + "transition-zoom-percent", z => parseFloat(z) / 100);
            importAttribute(layerProperties, "transitionPathId", [layerElt, frameElt], soziPrefix + "transition-path");
            importAttribute(layerProperties, "transitionPathHide", [layerElt, frameElt], soziPrefix + "transition-path-hide", parseBoolean);
        });

        importAttribute(frame, "frameId", [frameElt], "id");
        importAttribute(frame, "title", [frameElt], soziPrefix + "title");
        importAttribute(frame, "transitionDurationMs", [frameElt], soziPrefix + "transition-duration-ms", parseFloat);
        importAttribute(frame, "timeoutMs", [frameElt], soziPrefix + "timeout-ms", parseFloat);
        importAttribute(frame, "timeoutEnable", [frameElt], soziPrefix + "timeout-enable", parseBoolean);
        importAttribute(frame, "showInFrameList", [frameElt], soziPrefix + "show-in-frame-list", parseBoolean);
    });
}
