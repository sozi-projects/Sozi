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

namespace("sozi", function (exports) {
    "use strict";
    
    // Constant: the SVG namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    var DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
        "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

    exports.Document = sozi.model.Object.create({
        
        /*
         * Initialize a Sozi document object.
         *
         * Parameters:
         *    - svgRoot: The root element of the SVG document.
         *
         * Returns:
         *    - The current document object.
         */
        init: function (svgRoot) {
            sozi.model.Object.init.call(this);
            
            this.svgRoot = svgRoot;

            this.layers = {};
            
            // Create an empty wrapper layer for elements that do not belong to a valid layer
            var wrapperCount = 0;
            var svgWrapper = document.createElementNS(SVG_NS, "g");
            svgWrapper.setAttribute("id", "sozi-wrapper-" + this.id + "-" + wrapperCount);
            
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
                    if (DRAWABLE_TAGS.indexOf(nodeName) !== -1) {
                        // The current node is a valid layer if it has the following characteristics:
                        //    - it is an SVG group element
                        //    - it has an id
                        //    - the id has not been met before.
                        if (nodeName === "g" && svgNode.getAttribute("id") && !(svgNode.getAttribute("id") in this.layers)) {
                            // If the current wrapper layer contains elements,
                            // add it to the document and to the list of layers.
                            if (svgWrapper.firstChild) {
                                svgRoot.insertBefore(svgWrapper, svgNode);
                                this.layers[svgWrapper.getAttribute("id")] = {
                                    auto: true,
                                    selected: true,
                                    svgNode: svgWrapper
                                };
                                
                                // Create a new empty wrapper layer
                                wrapperCount ++;
                                svgWrapper = document.createElementNS(SVG_NS, "g");
                                svgWrapper.setAttribute("id", "sozi-wrapper-" + this.id + "-" + wrapperCount);
                            }
                            
                            // Add the current node to the list of layers.
                            this.layers[svgNode.getAttribute("id")] = {
                                auto: false,
                                selected: true,
                                svgNode: svgNode
                            };
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
                this.layers[svgWrapper.getAttribute("id")] = {
                    auto: true,
                    selected: true,
                    svgNode: svgWrapper
                };
            }
        
            return this;
        },
        
        /*
         * Mark all layers as selected.
         *
         * Returns:
         *    - The current object.
         */
        selectAllLayers: function () {
            for (var layerId in this.layers) {
                this.layers[layerId].selected = true;
            }
            return this;
        },
        
        /*
         * Mark all layers as deselected.
         *
         * Returns:
         *    - The current object.
         */
        deselectAllLayers: function () {
            for (var layerId in this.layers) {
                this.layers[layerId].selected = false;
            }
            return this;
        },
        
        /*
         * Mark a layers as selected.
         *
         * When selecting a layer, the previously selected layers are not deselected.
         *
         * Parameters:
         *    - layerId: The id of the layer to select.
         *
         * Returns:
         *    - The current object.
         */
        selectLayer: function (layerId) {
            this.layers[layerId].selected = true;
            return this;
        },
        
        /*
         * Mark a layers as deselected.
         *
         * Parameters:
         *    - layerId: The id of the layer to deselect.
         *
         * Returns:
         *    - The current object.
         */
        deselectLayer: function (layerId) {
            this.layers[layerId].selected = false;
            return this;
        }
    });
});
