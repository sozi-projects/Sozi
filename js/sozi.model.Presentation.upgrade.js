/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2013 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

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
        return elt.hasAttribute(name) ?
            fn(elt.getAttribute(name)) :
            value;
    }

    exports.Presentation.upgrade = function () {
        console.log("Attempting document upgrade from Sozi 13 or earlier");

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
            // Create a new frame with defaule camera states
            var frame = this.addFrame();

            // If this is not the first frame, the state is cloned from the previous frame.
            if (frameIndex) {
                frame.cameraStates = this.frames[frameIndex - 1].cameraStates;
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
                    var groupId = layer.svgNodes[0].getAttribute("id");
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
                if (layerElt) {
                    var refElt = this.svgRoot.getElementById(layerElt.getAttribute(soziPrefix + "refid"));
                    frame.cameraStates[layerIndex].setAtElement(refElt);

                    var layerProperties = frame.layerProperties[layerIndex];
                    layerProperties.set({
                        clip: importAttribute(layerElt, soziPrefix + "clip", layerProperties.clip, parseBoolean),
                        hide: importAttribute(layerElt, soziPrefix + "hide", layerProperties.hide, parseBoolean),
                        transitionTimingFunction: importAttribute(layerElt, soziPrefix + "transition-profile", layerProperties.transitionTimingFunction, convertTimingFunction),
                        transitionRelativeZoom: importAttribute(layerElt, soziPrefix + "transition-zoom-percent", layerProperties.transitionRelativeZoom, function (z) { return parseFloat(z) / 100; }),
                        transitionPathId: importAttribute(layerElt, soziPrefix + "transition-path", layerProperties.transitionPathId),
                        transitionPathHide: importAttribute(layerElt, soziPrefix + "transition-path-hide", layerProperties.transitionPathHide, parseBoolean)
                    });
                }
            }, this);

            frame.set({
                frameId: importAttribute(frameElt, "id", frame.frameId),
                title: importAttribute(frameElt, soziPrefix + "title", frame.title),
                transitionDurationMs: importAttribute(frameElt, soziPrefix + "transition-duration-ms", frame.transitionDurationMs, parseFloat),
                timeoutMs: importAttribute(frameElt, soziPrefix + "timeout-ms", frame.timeoutMs, parseFloat),
                timeoutEnable: importAttribute(frameElt, soziPrefix + "timeout-enable", frame.timeoutEnable, parseBoolean)
            });

            frame.fire("changed");

        }, this);
    };
});
