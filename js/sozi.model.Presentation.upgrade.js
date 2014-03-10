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
            // If this is not the first frame, the state is cloned from the previous frame.
            // Else, create a new default state.
            var states = frameIndex ?
                this.frames[frameIndex - 1].cameraStates.map(function (state) {
                    return state.clone();
                }) :
                this.layers.map(function () {
                    return sozi.player.CameraState.create().init(this.svgRoot);
                }, this);

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
                    states[layerIndex].setAtElement(refElt);
                }
            }, this);

            var frame = this.addFrame(states);

            function importAttribute(srcName, targetName, fn) {
                targetName = targetName || srcName;
                fn = fn || function (x) { return x; };
                frame[targetName] = frameElt.hasAttribute(srcName) ?
                    fn(frameElt.getAttribute(srcName)) :
                    frame[targetName]
            }

            importAttribute("id", "frameId");
            importAttribute(soziPrefix + "title", "title");
            importAttribute(soziPrefix + "transition-duration-ms", "transitionDurationMs", parseFloat);
            importAttribute(soziPrefix + "timeout-ms", "timeoutMs", parseFloat);
            importAttribute(soziPrefix + "timeout-enable", "timeoutEnable", function (str) { return str === "true"; });
            frame.fire("changed");

/* TODO process layer-specific elements
            frameElt.getAttribute(soziPrefix + "clip");
            frameElt.getAttribute(soziPrefix + "hide");
            frameElt.getAttribute(soziPrefix + "transition-profile");
            frameElt.getAttribute(soziPrefix + "transition-zoom-percent");
            frameElt.getAttribute(soziPrefix + "transition-path-hide");
            frameElt.getAttribute(soziPrefix + "transition-path");
*/

        }, this);
    };
});
