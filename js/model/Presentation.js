/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

namespace("sozi.model", function (exports) {
    "use strict";

    var LayerProperties = {

        init: function (frame) {
            this.frame = frame;
            this.link = false;
            this.referenceElementId = "";
            this.referenceElementAuto = true;
            this.transitionTimingFunction = "linear";
            this.transitionRelativeZoom = 0;
            this.transitionPathId = "";
            return this;
        },

        initFrom: function (other) {
            this.frame = other.frame;
            this.link = other.link;
            this.referenceElementId = other.referenceElementId;
            this.referenceElementAuto = other.referenceElementAuto;
            this.transitionTimingFunction = other.transitionTimingFunction;
            this.transitionRelativeZoom = other.transitionRelativeZoom;
            this.transitionPathId = other.transitionPathId;
            return this;
        },

        get index() {
            return this.frame.layerProperties.indexOf(this);
        },

        get referenceElement() {
            return this.frame.presentation.svgRoot.getElementById(this.referenceElementId);
        },

        get transitionPath() {
            return this.frame.presentation.svgRoot.getElementById(this.transitionPathId);
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

        fromStorable: function (storable) {
            this.link = storable.link;
            this.referenceElementId = storable.referenceElementId;
            this.referenceElementAuto = storable.referenceElementAuto;
            this.transitionTimingFunction = storable.transitionTimingFunction;
            this.transitionRelativeZoom = storable.transitionRelativeZoom;
            this.transitionPathId = storable.transitionPathId;
            return this;
        }
    };

    exports.Frame = {

        init: function (presentation) {
            this.presentation = presentation;
            this.frameId = presentation.makeFrameId();
            this.title = "New frame";
            this.timeoutMs = 0;
            this.timeoutEnable = false;
            this.transitionDurationMs = 1000;
            this.showInFrameList = true;
            this.layerProperties = presentation.layers.map(function () {
                return Object.create(LayerProperties).init(this);
            }, this);
            this.cameraStates = presentation.layers.map(function () {
                return Object.create(exports.CameraState).init(presentation.svgRoot);
            });
            return this;
        },

        initFrom: function (other) {
            this.presentation = other.presentation;
            this.frameId = other.presentation.makeFrameId();
            this.title = other.title;
            this.timeoutMs = other.timeoutMs;
            this.timeoutEnable = other.timeoutEnable;
            this.transitionDurationMs = other.transitionDurationMs;
            this.showInFrameList = other.showInFrameList;
            this.layerProperties = other.layerProperties.map(function (lp) {
                return Object.create(LayerProperties).initFrom(lp);
            });
            this.cameraStates = other.cameraStates.map(function (cs) {
                return Object.create(exports.CameraState).initFrom(cs);
            });
            return this;
        },

        toStorable: function () {
            var layerProperties = {};
            var cameraStates = {};
            var cameraOffsets = {};

            this.presentation.layers.forEach(function (layer, index) {
                var lp = this.layerProperties[index];
                var cs = this.cameraStates[index];
                var re = lp.referenceElement;

                var key = layer.groupId;
                layerProperties[key] = lp.toStorable();
                cameraStates[key] = cs.toStorable();
                if (re) {
                    cameraOffsets[key] = this.cameraStates[index].offsetFromElement(re);
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

            this.presentation.layers.forEach(function (layer, index) {
                var lp = this.layerProperties[index];
                var cs = this.cameraStates[index];

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
            this.presentation.layers.forEach(function (layer, index) {
                var key = layer.groupId;
                if (key in obj.layerProperties) {
                    var lp = this.layerProperties[index];
                    lp.fromStorable(obj.layerProperties[key]);

                    var cs = this.cameraStates[index].fromStorable(obj.cameraStates[key]);
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
            return this.presentation.frames.indexOf(this);
        },

        setAtStates: function (states) {
            states.forEach(function (state, index) {
                this.cameraStates[index].initFrom(state);
            }, this);
        }
    };

    exports.Layer = {

        init: function (presentation, label, auto) {
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
            return this.svgNodes.some(function (node) {
                return window.getComputedStyle(node).visibility === "visible";
            });
        },

        set isVisible(visible) {
            this.svgNodes.forEach(function (node) {
                node.style.visibility = visible ? "visible" : "hidden";
            });
        }
    };

    // Constant: the SVG namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    // Constant: the Inkscape namespace
    // var INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

    // Constant: The SVG element names that can be found in layers
    var DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
        "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

    exports.Presentation = {

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
            this.frames = [];
            this.layers = [];
            this.elementsToHide = [];
            this.aspectWidth = 4;
            this.aspectHeight = 3;

            // Remove attributes that prevent correct rendering
            svgRoot.removeAttribute("viewBox");
            svgRoot.style.width = svgRoot.style.height = "auto";

            // Create an empty wrapper layer for elements that do not belong to a valid layer
            var autoLayer = Object.create(exports.Layer).init(this, "auto", true);

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
                            var layer = Object.create(exports.Layer).init(this, svgNode.hasAttribute("inkscape:label") ? svgNode.getAttribute("inkscape:label") : ("#" + nodeId), false);
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
            for (var i = 0; i < this.frames.length; i ++) {
                if (this.frames[i].frameId === frameId) {
                    return this.frames[i];
                }
            }
            return null;
        },

        getLayerWithId: function (groupId) {
            for (var i = 0; i < this.layers.length; i ++) {
                if (this.layers[i].groupId === groupId) {
                    return this.layers[i];
                }
            }
            return null;
        },

        toStorable: function () {
            return {
                aspectWidth: this.aspectWidth,
                aspectHeight: this.aspectHeight,
                frames: this.frames.map(function (frame) {
                    return frame.toStorable();
                }),
                elementsToHide: this.elementsToHide.slice()
            };
        },

        toMinimalStorable: function () {
            return {
                frames: this.frames.map(function (frame) {
                    return frame.toMinimalStorable();
                }),
                elementsToHide: this.elementsToHide.slice()
            };
        },

        fromStorable: function (obj) {
            this.aspectWidth = obj.aspectWidth;
            this.aspectHeight = obj.aspectHeight;

            this.frames = obj.frames.map(function (f) {
                return Object.create(exports.Frame).init(this).fromStorable(f);
            }, this);

            this.elementsToHide = obj.elementsToHide.slice();

            return this;
        },

        updateLinkedLayers: function () {
            if (!this.frames.length) {
                return;
            }

            var firstCameraStates = this.frames[0].cameraStates;
            var defaultCameraState = firstCameraStates[firstCameraStates.length - 1];

            this.layers.forEach(function (layer, layerIndex) {
                var cameraState = defaultCameraState;

                this.frames.forEach(function (frame) {
                    if (frame.layerProperties[layerIndex].link) {
                        frame.cameraStates[layerIndex].initFrom(cameraState);
                    }
                    else {
                        cameraState = frame.cameraStates[layerIndex];
                    }
                }, this);
            }, this);
        }
    };
});
