/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.model", function (exports) {
    "use strict";

    var SOZI_NS = "http://sozi.baierouge.fr";

    function toArray(coll) {
        return Array.prototype.slice.call(coll);

    }

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
                    return "step-start";

                case "immediate-end":
                    return "step-end";

                case "immediate-middle":
                    return "step-middle";

                default:
                    return "linear";
        }
    }

    function importAttribute(elt, name, value, fn) {
        fn = fn || function (x) { return x; };
        return elt && elt.hasAttribute(name) ?
            fn(elt.getAttribute(name)) :
            value;
    }

    exports.Presentation.upgrade = function () {
        // In the inlined SVG, DOM accessors fail to get elements with explicit XML namespaces.
        // getElementsByTagNameNS, getAttributeNS do not work for elements with the Sozi namespace.
        // We need to use an explicit namespace prefix ("ns:attr") and use methods
        // getElementsByTagName and getAttribute as if the prefix was part of the attribute name.
        // With SVG documents from Inkscape, custom namespaces have an automatically generated prefix
        // (ns1, ns2, ...). We first need to identify which one corresponds to the Sozi namespace.

        // Get the xmlns for the Sozi namespace
        var soziNsAttrs = toArray(this.svgRoot.attributes).filter(function (a) {
            return a.value === SOZI_NS;
        });
        if (!soziNsAttrs.length) {
            return;
        }
        var soziPrefix = soziNsAttrs[0].name.replace(/^xmlns:/, "") + ":";

        // Get an ordered array of sozi:frame elements
        var frameElts = toArray(this.svgRoot.getElementsByTagName(soziPrefix + "frame"));
        frameElts.sort(function (a, b) {
            return parseInt(a.getAttribute(soziPrefix + "sequence")) - parseInt(b.getAttribute(soziPrefix + "sequence"));
        });

        // The "default" pool contains all layers that have no corresponding
        // <layer> element in any frame. The properties for these layers are
        // set in the <frame> elements. This array is updated as we process
        // the sequence of frames.
        var defaultLayers = this.layers.slice();

        frameElts.forEach(function (frameElt, frameIndex) {
            // Create a new frame with default camera states
            var frame = exports.Frame.clone().init(this);
            this.frames.insert(frame, frameIndex);
            var refFrame = frame;
            
            // If this is not the first frame, the state is cloned from the previous frame.
            if (frameIndex) {
                refFrame = this.frames.at(frameIndex - 1);
                frame.setAtStates(refFrame.cameraStates);
            }

            // Collect layer elements inside the current frame element
            var layerElts = toArray(frameElt.getElementsByTagName(soziPrefix + "layer"));
            var layerEltsByGroupId = {};
            layerElts.forEach(function (layerElt) {
                layerEltsByGroupId[layerElt.getAttribute(soziPrefix + "group")] = layerElt;
            });

            this.layers.forEach(function (layer, layerIndex) {
                var layerElt = null;
                if (layer.auto) {
                    // The "auto" layer is managed by the current <frame> element
                    layerElt = frameElt;
                }
                else {
                    // If the current layer has a corresponding <layer> element, use it
                    // and consider that the layer is no longer in the "default" pool.
                    // Else, if the layer is in the "default" pool, then it is managed
                    // by the <frame> element.
                    // Other frames are cloned from the predecessors.
                    var defaultLayerIndex = defaultLayers.indexOf(layer);
                    var groupId = layer.svgNodes.at(0).getAttribute("id");
                    if (groupId in layerEltsByGroupId) {
                        layerElt = layerEltsByGroupId[groupId];
                        if (defaultLayerIndex >= 0) {
                            defaultLayers.splice(defaultLayerIndex, 1);
                        }
                    }
                    else if (defaultLayerIndex >= 0) {
                        layerElt = frameElt;
                    }
                }

                // It the current layer is managed by a <frame> or <layer> element,
                // update the camera state for this layer.
                if (layerElt && layerElt.hasAttribute(soziPrefix + "refid")) {
                    var refElt = this.svgRoot.getElementById(layerElt.getAttribute(soziPrefix + "refid"));
                    if (!refElt) {
                        console.log("Element not found: #" + layerElt.getAttribute(soziPrefix + "refid"));
                        return;
                    }

                    frame.cameraStates.at(layerIndex).setAtElement(refElt);
                    frame.layerProperties.at(layerIndex).link = false;
                }

                var refLayerProperties = refFrame.layerProperties.at(layerIndex);
                var refCameraState = refFrame.cameraStates.at(layerIndex);
                var layerProperties = frame.layerProperties.at(layerIndex);
                var cameraState = frame.cameraStates.at(layerIndex);
                cameraState.clipped = importAttribute(layerElt, soziPrefix + "clip", refCameraState.clipped, parseBoolean);
                layerProperties.referenceElementId = importAttribute(layerElt, soziPrefix + "refid", refLayerProperties.referenceElementId);
                layerProperties.referenceElementAuto = false;
                layerProperties.referenceElementHide = importAttribute(layerElt, soziPrefix + "hide", refLayerProperties.referenceElementHide, parseBoolean);
                layerProperties.transitionTimingFunction = importAttribute(layerElt, soziPrefix + "transition-profile", refLayerProperties.transitionTimingFunction, convertTimingFunction);
                layerProperties.transitionRelativeZoom = importAttribute(layerElt, soziPrefix + "transition-zoom-percent", refLayerProperties.transitionRelativeZoom, function (z) { return parseFloat(z) / 100; });
                layerProperties.transitionPathId = importAttribute(layerElt, soziPrefix + "transition-path", refLayerProperties.transitionPathId);
                layerProperties.transitionPathHide = importAttribute(layerElt, soziPrefix + "transition-path-hide", refLayerProperties.transitionPathHide, parseBoolean);
            }, this);

            frame.frameId = importAttribute(frameElt, "id", refFrame.frameId);
            frame.title = importAttribute(frameElt, soziPrefix + "title", refFrame.title);
            frame.transitionDurationMs = importAttribute(frameElt, soziPrefix + "transition-duration-ms", refFrame.transitionDurationMs, parseFloat);
            frame.timeoutMs = importAttribute(frameElt, soziPrefix + "timeout-ms", refFrame.timeoutMs, parseFloat);
            frame.timeoutEnable = importAttribute(frameElt, soziPrefix + "timeout-enable", refFrame.timeoutEnable, parseBoolean);
            frame.showInFrameList = importAttribute(frameElt, soziPrefix + "show-in-frame-list", refFrame.showInFrameList, parseBoolean);
        }, this);
    };
});
