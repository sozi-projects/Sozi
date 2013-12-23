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
        
        init: function (id, svgRoot) {
            this.id = id;
            this.svgRoot = svgRoot;

            this.layers = {};
            
            // Create an empty wrapper layer for elements that do not belong to a valid layer
            var wrapperCount = 0;
            var svgWrapper = document.createElementNS(SVG_NS, "g");
            svgWrapper.setAttribute("id", "sozi-wrapper-" + id + "-" + wrapperCount);
            
            // Get all child nodes of the SVG root.
            // Make a copy of svgRoot.childNodes before modifying the document.
            var svgNodeList = Array.prototype.slice.call(svgRoot.childNodes);
            
            for (var nodeIndex = 0; nodeIndex < svgNodeList.length; nodeIndex ++) {
                var svgNode = svgNodeList[nodeIndex];
                
                if (svgNode.tagName === undefined) {
                    svgRoot.removeChild(svgNode);
                }
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
                                    svgNode: svgWrapper
                                };
                                
                                // Create a new empty wrapper layer
                                wrapperCount ++;
                                svgWrapper = document.createElementNS(SVG_NS, "g");
                                svgWrapper.setAttribute("id", "sozi-wrapper-" + id + "-" + wrapperCount);
                            }
                            
                            // Add the current node to the list of layers.
                            this.layers[svgNode.getAttribute("id")] = {
                                auto: false,
                                svgNode: svgNode
                            };
                        }
                        else {
                            svgWrapper.appendChild(svgNode);
                        }
                    }
                }
            }
            
            // If the current wrapper layer contains elements,
            // add it to the document and to the list of layers.
            if (svgWrapper.firstChild) {
                svgRoot.appendChild(svgWrapper);
                this.layers[svgWrapper.getAttribute("id")] = {
                    auto: true,
                    svgNode: svgWrapper
                };
            }
        
            return this;
        }
    });
});
