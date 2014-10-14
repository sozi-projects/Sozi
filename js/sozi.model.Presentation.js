/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.model", function (exports) {
    "use strict";

    var LayerProperties = sozi.model.Object.clone({
        // TODO define default properties separately
        link: true,
        referenceElementId: "",
        referenceElementAuto: true,
        referenceElementHide: false,
        transitionTimingFunction: "linear",
        transitionRelativeZoom: 0,
        transitionPathId: "",
        transitionPathHide: false,
        
        init: function () {
            this.addListener("change:link", this.onChangeLink, this);
            this.addListener("change:referenceElementHide", this.onChangeReferenceElementHide, this);
            this.addListener("change:transitionPathHide", this.onChangeTransitionPathHide, this);
            return this;
        },
        
        get index() {
            return this.owner.layerProperties.indexOf(this);
        },
        
        get referenceElement() {
            return this.owner.owner.svgRoot.getElementById(this.referenceElementId);
        },

        get transitionPath() {
            return this.owner.owner.svgRoot.getElementById(this.transitionPathId);
        },

        onChangeLink: function () {
            if (this.link) {
                var frames = this.owner.owner.frames;
                var frameIndex = this.owner.index;
                var layerIndex = this.index;
                
                var cameraState = frameIndex > 0 ?
                    frames.at(frameIndex - 1).cameraStates.at(layerIndex) :
                    this.owner.cameraStates.last; // Link to "auto" layer

                // Update the camera states of the linked layers in the following frames
                for (var i = frameIndex; i < frames.length; i ++) {
                    var frame = frames.at(i);
                    if (!frame.layerProperties.at(layerIndex).link) {
                        break;
                    }
                    frame.cameraStates.at(layerIndex).copy(cameraState);
                }
            }
        },
        
        onChangeReferenceElementHide: function (self, value) {
            if (this.referenceElement) {
                // TODO: update visibility in other frames and layers
                this.referenceElement.style.visibility = value ? "hidden" : "visible";
            }
        },

        onChangeTransitionPathHide: function (self, value) {
            if (this.transitionPath) {
                // TODO: update visibility in other frames and layers
                this.transitionPath.style.visibility = value ? "hidden" : "visible";
            }
        },

        toStorable: function () {
            return {
                link: this.link,
                referenceElementId: this.referenceElementId,
                referenceElementAuto: this.referenceElementAuto,
                referenceElementHide: this.referenceElementHide,
                transitionTimingFunction: this.transitionTimingFunction,
                transitionRelativeZoom: this.transitionRelativeZoom,
                transitionPathId: this.transitionPathId,
                transitionPathHide: this.transitionPathHide
            };
        },
        
        toMinimalStorable: function () {
            return {
                referenceElementHide: this.referenceElementHide,
                transitionTimingFunction: this.transitionTimingFunction,
                transitionRelativeZoom: this.transitionRelativeZoom,
                transitionPathId: this.transitionPathId,
                transitionPathHide: this.transitionPathHide
            };
        },

        fromStorable: sozi.model.Object.copy
    });
    
    exports.Frame = sozi.model.Object.clone({
        // TODO define default properties separately
        frameId: "",
        title: "New frame",
        timeoutMs: 0,
        timeoutEnable: false,
        transitionDurationMs: 1000,
        showInFrameList: true,
        layerProperties: {own: []},
        cameraStates: {own: []},
        
        init: function (pres) {
            this.frameId = pres.makeFrameId();

            pres.layers.forEach(function () {
                var cameraState = sozi.player.CameraState.clone().init(pres.svgRoot);
                this.cameraStates.push(cameraState);
                cameraState.addListener("change", this.onChangeCameraState, this);
                this.layerProperties.push(LayerProperties.clone().init());
            }, this);

            return this;
        },

        onChangeCameraState: function (cameraState) {
            var frames = this.owner.frames;
            var layerIndex = this.cameraStates.indexOf(cameraState);

            // Update the camera states of the linked layers in the following frames
            for (var i = this.index + 1; i < frames.length; i ++) {
                var frame = frames.at(i);
                if (!frame.layerProperties.at(layerIndex).link) {
                    break;
                }
                frame.cameraStates.at(layerIndex).copy(cameraState);
            }
        },
        
        toStorable: function () {
            var layerProperties = {};
            var cameraStates = {};
            var cameraOffsets = {};

            this.owner.layers.forEach(function (layer, index) {
                var lp = this.layerProperties.at(index);
                var cs = this.cameraStates.at(index);
                var re = lp.referenceElement;

                var key = layer.auto ? "__sozi_auto__" : layer.svgNodes.first.getAttribute("id");
                layerProperties[key] = lp.toStorable();
                cameraStates[key] = cs.toStorable();
                if (re) {
                    cameraOffsets[key] = this.cameraStates.at(index).offsetFromElement(re);
                    if (this.index === 0)
                        console.log(key + ": " + cameraOffsets[key].scaleFactor);
                }
            }, this);

            return {
                frameId: this.frameId,
                title: this.title,
                timeoutMs: this.timeoutMs,
                timeoutEnable: this.timeoutEnable,
                transitionDurationMs: this.transitionDurationMs,
                showInFrameList: this.showInFrameList,
                layerProperties: layerProperties,
                cameraStates: cameraStates,
                cameraOffsets: cameraOffsets
            };
        },
        
        toMinimalStorable: function () {
            var layerProperties = {};
            var cameraStates = {};

            this.owner.layers.forEach(function (layer, index) {
                var lp = this.layerProperties.at(index);
                var cs = this.cameraStates.at(index);

                var key = layer.auto ? "__sozi_auto__" : layer.svgNodes.first.getAttribute("id");
                layerProperties[key] = lp.toMinimalStorable();
                cameraStates[key] = cs.toMinimalStorable();
            }, this);

            return {
                frameId: this.frameId,
                title: this.title,
                timeoutMs: this.timeoutMs,
                timeoutEnable: this.timeoutEnable,
                transitionDurationMs: this.transitionDurationMs,
                showInFrameList: this.showInFrameList,
                layerProperties: layerProperties,
                cameraStates: cameraStates
            };
        },

        fromStorable: function (obj) {
            this.frameId = obj.frameId;
            this.title = obj.title;
            this.timeoutMs = obj.timeoutMs;
            this.timeoutEnable = obj.timeoutEnable;
            this.transitionDurationMs = obj.transitionDurationMs;
            this.showInFrameList = obj.showInFrameList;

            // TODO if obj.LayerProperties has keys not in layers, create fake layers marked as "deleted"
            this.owner.layers.forEach(function (layer, index) {
                var key = layer.auto ? "__sozi_auto__" : layer.svgNodes.first.getAttribute("id");
                if (key in obj.layerProperties) {
                    var lp = this.layerProperties.at(index);
                    lp.fromStorable(obj.layerProperties[key]);

                    var cs = this.cameraStates.at(index).fromStorable(obj.cameraStates[key]);
                    var re = lp.referenceElement;
                    if (re) {
                        var ofs = obj.cameraOffsets[key] || {};
                        cs.setAtElement(re,
                                        ofs.deltaX || 0,
                                        ofs.deltaY || 0,
                                        ofs.scaleFactor || 1,
                                        ofs.deltaAngle || 0);
                        if (this.index === 0)
                            console.log(key + ": " + ofs.scaleFactor);
                        // TODO compare current camera state with stored camera state.
                        // If different, mark the current layer as "dirty".
                    }
                }
                // TODO else, link to "auto" layer
            }, this);

            return this;
        },
        
        get index() {
            return this.owner.frames.indexOf(this);
        },

        setAtStates: function (states) {
            states.forEach(function (state, index) {
                this.cameraStates.at(index).copy(state);
            }, this);
        }
    });

    exports.Layer = sozi.model.Object.clone({

        label: "",
        auto: false,
        svgNodes: [],
        
        init: function (label, auto) {
            this.label = label;
            this.auto = auto;
            return this;
        },

        get index() {
            return this.owner.layers.indexOf(this);
        },

        get isVisible() {
            return this.svgNodes.some(function (node) {
                return window.getComputedStyle(node).visibility === "visible";
            });
        },

        set isVisible(visible) {
            this.svgNodes.forEach(function (node) {
                node.style.visibility = visible ? "visible" : "hidden";
            });
            this.fire("change:isVisible");
        }
    });

    // Constant: the SVG namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    // Constant: the Inkscape namespace
    // var INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

    // Constant: The SVG element names that can be found in layers
    var DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
        "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

    exports.Presentation = sozi.model.Object.clone({

        svgRoot: null,
        frames: {own: []},
        layers: {own: []},
        
        /*
         * Initialize a Sozi document object.
         *
         * Returns:
         *    - The current presentation object.
         */
        init: function (svgRoot) {
            this.svgRoot = svgRoot;
            this.frames.clear();
            this.layers.clear();

            // Remove attributes that prevent correct rendering
            svgRoot.removeAttribute("viewBox");
            svgRoot.style.width = svgRoot.style.height = "auto";
            
            // Create an empty wrapper layer for elements that do not belong to a valid layer
            var autoLayer = exports.Layer.clone().init("auto", true);

            var svgWrapper = document.createElementNS(SVG_NS, "g");

            // Get all child nodes of the SVG root.
            // Make a copy of svgRoot.childNodes before modifying the document.
            var svgNodeList = Array.prototype.slice.call(svgRoot.childNodes);

            svgNodeList.forEach(function (svgNode) {
                // Remove text nodes and comments
                if (svgNode.tagName === undefined) {
                    svgRoot.removeChild(svgNode);
                }
                // Reorganize SVG elements
                else {
                    var nodeName = svgNode.localName.toLowerCase();
                    var nodeId = svgNode.getAttribute("id");

                    if (DRAWABLE_TAGS.indexOf(nodeName) >= 0) {
                        // The current node is a valid layer if it has the following characteristics:
                        //    - it is an SVG group element
                        //    - it has an id that has not been met before
                        if (nodeName === "g" && nodeId !== null &&
                            this.layers.every(function (layer) { return layer.nodeId !== nodeId; })) {
                            // If the current wrapper layer contains elements,
                            // add it to the document and to the list of layers.
                            if (svgWrapper.firstChild) {
                                svgRoot.insertBefore(svgWrapper, svgNode);
                                autoLayer.svgNodes.push(svgWrapper);

                                // Create a new empty wrapper layer
                                svgWrapper = document.createElementNS(SVG_NS, "g");
                            }

                            // Add the current node as a new layer.
                            var layer = exports.Layer.clone().init(svgNode.hasAttribute("inkscape:label") ? svgNode.getAttribute("inkscape:label") : ("#" + nodeId), false);
                            layer.svgNodes.push(svgNode);
                            this.layers.push(layer);
                        }
                        else {
                            svgWrapper.appendChild(svgNode);
                        }
                    }
                }
            }, this);

            // If the current wrapper layer contains elements,
            // add it to the document and to the list of layers.
            if (svgWrapper.firstChild) {
                svgRoot.appendChild(svgWrapper);
                autoLayer.svgNodes.push(svgWrapper);
            }

            this.layers.push(autoLayer);

            return this;
        },

        get title() {
            var svgTitles = this.svgRoot.getElementsByTagNameNS(SVG_NS, "title");
            return svgTitles.length ? svgTitles[0].firstChild.wholeText.trim() : "Untitled";
        },

        makeFrameId: function () {
            var prefix = "frame";
            var suffix = Math.floor(1000 * (1 + 9 * Math.random()));
            var frameId;
            do {
                frameId = prefix + suffix;
                suffix ++;
            } while (this.frames.some(function (frame) {
                return frame.frameId === frameId;
            }));
            return frameId;
        },
        
        toStorable: function () {
            return {
                frames: this.frames.map(function (frame) {
                    return frame.toStorable();
                })
            };
        },
        
        toMinimalStorable: function () {
            return {
                frames: this.frames.map(function (frame) {
                    return frame.toMinimalStorable();
                })
            };
        },

        fromStorable: function (obj) {
            this.frames.clear();
            obj.frames.forEach(function (f) {
                var frame = exports.Frame.clone().init(this);
                this.frames.push(frame);
                frame.fromStorable(f);
            }, this);
            return this;
        },

        toJSON: function () {
            return JSON.stringify(this.toStorable());
        },

        toMinimalJSON: function () {
            return JSON.stringify(this.toMinimalStorable());
        },

        fromJSON: function (json) {
            return this.fromStorable(JSON.parse(json));
        }
    });
});
