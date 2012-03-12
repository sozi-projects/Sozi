/*
* Sozi - A presentation tool using the SVG standard
*
* Copyright (C) 2010-2011 Guillaume Savaton
*
* This program is dual licensed under the terms of the MIT license
* or the GNU General Public License (GPL) version 3.
* A copy of both licenses is provided in the doc/ folder of the
* official release of Sozi.
* 
* See http://sozi.baierouge.fr/wiki/en:license for details.
*
* @depend events.js
*/

var sozi = sozi || {};

(function () {
    var exports = sozi.document = sozi.document || {},
        window = this,
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
    exports.layers = [];
    
    /*
    * Returns the value of an attribute of a given SVG element.
    *
    * If the attribute is not set, then a default value is returned.
    * See DEFAULTS.
    */
    function readAttribute(elt, attr) {
        var value = elt.getAttributeNS(SOZI_NS, attr);
        return value === "" ? DEFAULTS[attr] : value;
    }

    function readLayerProperties(frame, groupId, element) {
        var layer = frame.layers[groupId] = frame.layers[groupId] || {
                group: groupId,
                geometry: {
                    clip: DEFAULTS.clip
                }
            },
            clip = layer.geometry.clip,
            svgElement;
        
        if (typeof layer.hide === "undefined" || element.hasAttributeNS(SOZI_NS, "hide")) {
            layer.hide = readAttribute(element, "hide") === "true";
        }

        if (typeof layer.transitionZoomPercent === "undefined" || element.hasAttributeNS(SOZI_NS, "transition-zoom-percent")) {
            layer.transitionZoomPercent = parseInt(readAttribute(element, "transition-zoom-percent"), 10);
        }

        if (typeof layer.transitionProfile === "undefined" || element.hasAttributeNS(SOZI_NS, "transition-profile")) {
            layer.transitionProfile = sozi.animation.profiles[readAttribute(element, "transition-profile") || "linear"];
        }
        
        if (element.hasAttributeNS(SOZI_NS, "refid")) {
            // The previous value of the "clip" attribute will be preserved
            // when setting the new geometry object.
            svgElement = document.getElementById(element.getAttributeNS(SOZI_NS, "refid"));
            if (svgElement) {
                if (layer.hide) {
                    svgElement.style.visibility = "hidden";
                }
                layer.geometry = sozi.display.getElementGeometry(svgElement);
                layer.geometry.clip = clip;
            }
        }
            
        if (element.hasAttributeNS(SOZI_NS, "clip")) {
            layer.geometry.clip = readAttribute(element, "clip") === "true";
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
        var frameElements = document.getElementsByTagNameNS(SOZI_NS, "frame"),
            frameCount = frameElements.length,
            layerElements, groupId,
            svgElement, wrapper,
            svgRoot = document.documentElement,
            f, l, n,
            newFrame, newLayer,
            SVG_NS = "http://www.w3.org/2000/svg";

        layerElements = document.getElementsByTagNameNS(SOZI_NS, "layer");
        if (layerElements.length === 0) {
            // Create a default layer if the document has none
            // and move all the document into the new layer
            wrapper = document.createElementNS(SVG_NS, "g");
            wrapper.setAttribute("id", "sozi-wrapper");
            
            while (true) {
                n = svgRoot.firstChild;
                if (!n) {
                    break;
                }
                svgRoot.removeChild(n);
                wrapper.appendChild(n);
            }

            svgRoot.appendChild(wrapper);
            
            exports.layers.push("sozi-wrapper");
        }
        else {
            // Collect all layer ids
            for (l = 0; l < layerElements.length; l += 1) {
                groupId = layerElements[l].getAttributeNS(SOZI_NS, "group");
                if (groupId && exports.layers.indexOf(groupId) === -1 && document.getElementById(groupId)) {
                    exports.layers.push(groupId);
                }
            }
            
            if (exports.layers.length === 0) {
                window.alert("Invalid layer information");
            }
        }
        
        // Analyze <frame> elements
        for (f = 0; f < frameCount; f += 1) {
            // Create a new frame object with layer-independent properties
            newFrame = {
                id: frameElements[f].getAttribute("id"),
                title: readAttribute(frameElements[f], "title"),
                sequence: parseInt(readAttribute(frameElements[f], "sequence"), 10),
                timeoutEnable: readAttribute(frameElements[f], "timeout-enable") === "true",
                timeoutMs: parseInt(readAttribute(frameElements[f], "timeout-ms"), 10),
                transitionDurationMs: parseInt(readAttribute(frameElements[f], "transition-duration-ms"), 10),
                layers: {}
            };

            // The <frame> element defines default properties for all layers
            for (l = 0; l < exports.layers.length; l += 1) {
                readLayerProperties(newFrame, exports.layers[l], frameElements[f]);
            }

            // Collect and analyze <layer> elements in the current <frame> element
            layerElements = frameElements[f].getElementsByTagNameNS(SOZI_NS, "layer");
            for (l = 0; l < layerElements.length; l += 1) {
                groupId = layerElements[l].getAttributeNS(SOZI_NS, "group");
                if (groupId && exports.layers.indexOf(groupId) !== -1) {
                    readLayerProperties(newFrame, groupId, layerElements[l]);
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
}());
