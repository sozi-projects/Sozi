/*
* Sozi - A presentation tool using the SVG standard
*
* Copyright (C) 2010-2012 Guillaume Savaton
*
* This program is dual licensed under the terms of the MIT license
* or the GNU General Public License (GPL) version 3.
* A copy of both licenses is provided in the doc/ folder of the
* official release of Sozi.
* 
* See http://sozi.baierouge.fr/wiki/en:license for details.
*
* @depend module.js
* @depend events.js
*/

/*global module:true sozi:true */

module("sozi.document", function (exports) {
    var window = this,
        document = window.document,
        SOZI_NS = "http://sozi.baierouge.fr",
        DEFAULTS = {
            "title": "Untitled",
            "sequence": "0",
            "hide": "true",
            "clip": "true",
            "timeout-enable": "false",
            "timeout-ms": "5000",
            "transition-duration-ms": "1000",
            "transition-zoom-percent": "0",
            "transition-profile": "linear"
        };

    exports.frames = [];
    exports.idLayers = [];
    
    /*
    * Returns the value of an attribute of a given Sozi SVG element.
    *
    * If the attribute is not set, then a default value is returned.
    * See DEFAULTS.
    */
    function readAttribute(soziElement, attr) {
        var value = soziElement.getAttributeNS(SOZI_NS, attr);
        return value === "" ? DEFAULTS[attr] : value;
    }

    function readLayerProperties(frame, idLayer, soziElement) {
        var layer = frame.layers[idLayer] = frame.layers[idLayer] || {
                idLayer: idLayer, // FIXME never used
                geometry: {
                    clip: DEFAULTS.clip
                }
            },
            clip = layer.geometry.clip,
            svgElement;
        
        if (typeof layer.hide === "undefined" || soziElement.hasAttributeNS(SOZI_NS, "hide")) {
            layer.hide = readAttribute(soziElement, "hide") === "true";
        }

        if (typeof layer.transitionZoomPercent === "undefined" || soziElement.hasAttributeNS(SOZI_NS, "transition-zoom-percent")) {
            layer.transitionZoomPercent = parseInt(readAttribute(soziElement, "transition-zoom-percent"), 10);
        }

        if (typeof layer.transitionProfile === "undefined" || soziElement.hasAttributeNS(SOZI_NS, "transition-profile")) {
            layer.transitionProfile = sozi.animation.profiles[readAttribute(soziElement, "transition-profile") || "linear"];
        }
        
        if (soziElement.hasAttributeNS(SOZI_NS, "refid")) {
            // The previous value of the "clip" attribute will be preserved
            // when setting the new geometry object.
            svgElement = document.getElementById(soziElement.getAttributeNS(SOZI_NS, "refid"));
            if (svgElement) {
                if (layer.hide) {
                    svgElement.style.visibility = "hidden";
                }
                layer.geometry = sozi.display.getElementGeometry(svgElement);
                layer.geometry.clip = clip;
            }
        }
            
        if (soziElement.hasAttributeNS(SOZI_NS, "clip")) {
            layer.geometry.clip = readAttribute(soziElement, "clip") === "true";
        }
    }
    
    /*
    * Builds the list of frames from the current document.
    *
    * This method collects all elements with tag "sozi:frame" and
    * retrieves their geometrical and animation attributes.
    * SVG elements that should be hidden during the presentation are hidden.
    *
    * The resulting list is available in frames, sorted by frame indices.
    */
    function readFrames() {
        var soziFrames,
            soziLayers, idLayer,
            svgWrapper, indexWrapper,
            svgRoot = document.documentElement,
            svgRootChilren,
            n, f, l, svgElement,
            newFrame,
            SVG_NS = "http://www.w3.org/2000/svg";

        // Collect all group ids of <layer> elements
        soziLayers = document.getElementsByTagNameNS(SOZI_NS, "layer");
        for (l = 0; l < soziLayers.length; l += 1) {
            idLayer = soziLayers[l].getAttributeNS(SOZI_NS, "group");
            if (idLayer && exports.idLayers.indexOf(idLayer) === -1 && document.getElementById(idLayer)) {
                exports.idLayers.push(idLayer);
            }
        }

        // If at least one <frame> element has a refid attribute,
        // reorganize the document, grouping objects that do not belong
        // to a group referenced in <layer> elements
        soziFrames = Array.prototype.slice.call(document.getElementsByTagNameNS(SOZI_NS, "frame"));
        if (soziFrames.filter(function (f) {
                return f.hasAttributeNS(SOZI_NS, "refid");
            }).length > 0)
        {
            // Create the first wrapper group
            svgWrapper = document.createElementNS(SVG_NS, "g");

            // For each child of the root SVG element
            svgRootChilren = Array.prototype.slice.call(svgRoot.childNodes);
            for (n = 0; n < svgRootChilren.length; n += 1) {
                svgElement = svgRootChilren[n];
     
                if (!svgElement.getAttribute) {
                    // Remove text elements
                    svgRoot.removeChild(svgElement);
                }
                else if (exports.idLayers.indexOf(svgElement.getAttribute("id")) === -1) {
                    // If the current element is not a referenced layer,
                    // move it to the current wrapper element
                    // FIXME move graphic elements only
                    svgRoot.removeChild(svgElement);
                    svgWrapper.appendChild(svgElement);
                }
                else if (svgWrapper.firstChild) {
                    // If the current element is a referenced layer,
                    // and if there were other non-referenced elements before it,
                    // insert the wrapper group before the current element
                    svgWrapper.setAttribute("id", "sozi-wrapper-" + n);
                    exports.idLayers.push("sozi-wrapper-" + n);
                    svgRoot.insertBefore(svgWrapper, svgElement);
                    
                    // Prepare a new wrapper element                
                    svgWrapper = document.createElementNS(SVG_NS, "g");
                }
            }

            // Append last wrapper if needed
            if (svgWrapper.firstChild) {
                svgWrapper.setAttribute("id", "sozi-wrapper-" + n);
                exports.idLayers.push("sozi-wrapper-" + n);
                svgRoot.appendChild(svgWrapper);
            }            
        }

        // Analyze <frame> elements
        for (f = 0; f < soziFrames.length; f += 1) {
            // Create a new frame object with layer-independent properties
            newFrame = {
                id: soziFrames[f].getAttribute("id"),
                title: readAttribute(soziFrames[f], "title"),
                sequence: parseInt(readAttribute(soziFrames[f], "sequence"), 10),
                timeoutEnable: readAttribute(soziFrames[f], "timeout-enable") === "true",
                timeoutMs: parseInt(readAttribute(soziFrames[f], "timeout-ms"), 10),
                transitionDurationMs: parseInt(readAttribute(soziFrames[f], "transition-duration-ms"), 10),
                layers: {}
            };

            // The <frame> element defines default properties for all layers
            for (l = 0; l < exports.idLayers.length; l += 1) {
                readLayerProperties(newFrame, exports.idLayers[l], soziFrames[f]);
            }

            // Collect and analyze <layer> elements in the current <frame> element
            soziLayers = soziFrames[f].getElementsByTagNameNS(SOZI_NS, "layer");
            for (l = 0; l < soziLayers.length; l += 1) {
                idLayer = soziLayers[l].getAttributeNS(SOZI_NS, "group");
                if (idLayer && exports.idLayers.indexOf(idLayer) !== -1) {
                    readLayerProperties(newFrame, idLayer, soziLayers[l]);
                }
            }
            
            // If the <frame> element has at least one valid layer,
            // add it to the frame list
            for (l in newFrame.layers) {
                if (newFrame.layers.hasOwnProperty(l)) {
                    exports.frames.push(newFrame);
                    break;
                }
            }
        }
        
        exports.frames.sort(
            function (a, b) {
                return a.sequence - b.sequence;
            }
        );
    }

    /*
    * Event handler: document load.
    *
    * This function reads the frames from the document.
    */
    function onLoad() {
        document.documentElement.removeAttribute("viewBox");
        readFrames();
        sozi.events.fire("documentready");
    }

    window.addEventListener("load", onLoad, false);
});
