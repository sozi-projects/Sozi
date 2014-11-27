/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.model", function (exports) {
    "use strict";

    var LayerProperties = sozi.model.Object.clone({
        // TODO define default properties separately
        link: false,
        referenceElementId: "",
        referenceElementAuto: true,
        transitionTimingFunction: "linear",
        transitionRelativeZoom: 0,
        transitionPathId: "",
        
        init: function () {
            this.addListener("change:link", this.onChangeLink, this);
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

        get referenceElementHide() {
            return this.owner.owner.elementsToHide.contains(this.referenceElementId);
        },
        
        set referenceElementHide(hide) {
            var hidden = this.referenceElementHide;
            if (hide && !hidden) {
                this.owner.owner.elementsToHide.push(this.referenceElementId);
            }
            else if (!hide && hidden) {
                this.owner.owner.elementsToHide.remove(this.referenceElementId);
            }
        },

        get transitionPathHide() {
            return this.owner.owner.elementsToHide.contains(this.transitionPathId);
        },

        set transitionPathHide(hide) {
            var hidden = this.transitionPathHide;
            if (hide && !hidden) {
                this.owner.owner.elementsToHide.push(this.transitionPathId);
            }
            else if (!hide && hidden) {
                this.owner.owner.elementsToHide.remove(this.transitionPathId);
            }
        },

        onChangeLink: function () {
            this.owner.owner.updateLinkedLayers();
        },

        toStorable: function () {
            return {
                link: this.link,
                referenceElementId: this.referenceElementId,
                referenceElementAuto: this.referenceElementAuto,
                transitionTimingFunction: this.transitionTimingFunction,
                transitionRelativeZoom: this.transitionRelativeZoom,
                transitionPathId: this.transitionPathId
            };
        },
        
        toMinimalStorable: function () {
            return {
                transitionTimingFunction: this.transitionTimingFunction,
                transitionRelativeZoom: this.transitionRelativeZoom,
                transitionPathId: this.transitionPathId
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
                this.layerProperties.push(LayerProperties.clone().init());
            }, this);

            return this;
        },

        copy: function (other) {
            var frameId = this.frameId;
            sozi.model.Object.copy.call(this, other);
            this.frameId = frameId;
        },

        toStorable: function () {
            var layerProperties = {};
            var cameraStates = {};
            var cameraOffsets = {};

            this.owner.layers.forEach(function (layer, index) {
                var lp = this.layerProperties.at(index);
                var cs = this.cameraStates.at(index);
                var re = lp.referenceElement;

                var key = layer.groupId;
                layerProperties[key] = lp.toStorable();
                cameraStates[key] = cs.toStorable();
                if (re) {
                    cameraOffsets[key] = this.cameraStates.at(index).offsetFromElement(re);
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

                var key = layer.groupId;
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
                var key = layer.groupId;
                if (key in obj.layerProperties) {
                    var lp = this.layerProperties.at(index);
                    lp.fromStorable(obj.layerProperties[key]);

                    var cs = this.cameraStates.at(index).fromStorable(obj.cameraStates[key]);
                    var re = lp.referenceElement;
                    if (re) {
                        var ofs = obj.cameraOffsets[key] || {};
                        cs.setAtElement(re, ofs.deltaX, ofs.deltaY,
                                        ofs.widthFactor, ofs.heightFactor,
                                        ofs.deltaAngle);
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

        get groupId() {
            return this.auto ? "__sozi_auto__" : this.svgNodes.first.getAttribute("id");
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
        elementsToHide: {own: []},
        
        /*
         * Initialize a Sozi document object.
         *
         * Returns:
         *    - The current presentation object.
         *
         * TODO listen to frame add/remove and update linked camera states accordingly
         */
        init: function (svgRoot) {
            this.svgRoot = svgRoot;
            this.frames.clear();
            this.layers.clear();

            this.addListener("change:frames", this.updateLinkedLayers, this);
            this.elementsToHide.addListener("add", this.onAddElementToHide, this);
            this.elementsToHide.addListener("remove", this.onRemoveElementToHide, this);

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
        
        getFrameWithId: function (frameId) {
            return this.frames.find(function (frame) {
                return frame.frameId === frameId;
            });
        },

        getLayerWithId: function (groupId) {
            return this.layers.find(function (layer) {
                return layer.groupId === groupId;
            });
        },

        toStorable: function () {
            return {
                frames: this.frames.map(function (frame) {
                    return frame.toStorable();
                }),
                elementsToHide: this.elementsToHide.values
            };
        },
        
        toMinimalStorable: function () {
            return {
                frames: this.frames.map(function (frame) {
                    return frame.toMinimalStorable();
                }),
                elementsToHide: this.elementsToHide.values
            };
        },

        fromStorable: function (obj) {
            this.frames.clear();
            obj.frames.forEach(function (f) {
                var frame = exports.Frame.clone().init(this);
                this.frames.push(frame);
                frame.fromStorable(f);
            }, this);

            this.elementsToHide.clear();
            this.elementsToHide.pushAll(obj.elementsToHide);

            return this;
        },

        onAddElementToHide: function (collection, id) {
            var elt = document.getElementById(id);
            if (elt) {
                elt.style.visibility = "hidden";
            }
        },

        onRemoveElementToHide: function (collection, id) {
            var elt = document.getElementById(id);
            if (elt) {
                elt.style.visibility = "visible";
            }
        },

        updateLinkedLayers: function () {
            if (!this.frames.length) {
                return this;
            }

            var defaultCameraState = this.frames.at(0).cameraStates.last;

            this.layers.forEach(function (layer, layerIndex) {
                var cameraState = defaultCameraState;

                this.frames.forEach(function (frame) {
                    if (frame.layerProperties.at(layerIndex).link) {
                        frame.cameraStates.at(layerIndex).copy(cameraState);
                    }
                    else {
                        cameraState = frame.cameraStates.at(layerIndex);
                    }
                }, this);
            }, this);
        }
    });
});
