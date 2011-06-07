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
 */

var sozi = sozi || {};

sozi.document = (function () {
    var exports = {
            frames: []
        },
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
            svgElement,
            i,
            newFrame;

        for (i = 0; i < frameCount; i++) {
            svgElement = document.getElementById(frameElements[i].getAttributeNS(SOZI_NS, "refid"));
            if (svgElement) {
                newFrame = {
                    geometry: sozi.display.getElementGeometry(svgElement),
                    title: readAttribute(frameElements[i], "title"),
                    sequence: parseInt(readAttribute(frameElements[i], "sequence"), 10),
                    hide: readAttribute(frameElements[i], "hide") === "true",
                    timeoutEnable: readAttribute(frameElements[i], "timeout-enable") === "true",
                    timeoutMs: parseInt(readAttribute(frameElements[i], "timeout-ms"), 10),
                    transitionDurationMs: parseInt(readAttribute(frameElements[i], "transition-duration-ms"), 10),
                    transitionZoomPercent: parseInt(readAttribute(frameElements[i], "transition-zoom-percent"), 10),
                    transitionProfile: sozi.animation.profiles[readAttribute(frameElements[i], "transition-profile") || "linear"]
                };
                if (newFrame.hide) {
                    svgElement.setAttribute("visibility", "hidden");
                }
                newFrame.geometry.clip = readAttribute(frameElements[i], "clip") === "true";
                exports.frames.push(newFrame);
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
        readFrames();
        // TODO create event handlers
        sozi.display.onLoad();
        sozi.display.installTableOfContents();
        sozi.player.onLoad();
    }

    window.addEventListener("load", onLoad, false);

    return exports;
}());
