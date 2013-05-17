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

/**
 * @name sozi.framenumber
 * @namespace Show the frame number.
 * @depend namespace.js
 */
namespace(this, "sozi.framenumber", function (exports, window) {
    "use strict";
    
    // An alias to the global document object
    var document = window.document;
    
    // The SVG group containing the frame number
    var svgGroup;
    
    // The SVG text element and its text node containing the frame number
    var svgText, svgTextNode;
    
    // The SVG circle enclosing the frame number
    var svgCircle;
    
    // Constant: the SVG namespace
    var SVG_NS = "http://www.w3.org/2000/svg";
    
    function adjust() {
        var textBBox = svgText.getBBox(),
            d = Math.max(textBBox.width, textBBox.height) * 0.75,
            t = d * 1.25;
        svgCircle.setAttribute("r", d);
        svgGroup.setAttribute("transform", "translate(" + t + "," + t + ")");
    }
    
    function onPlayerReady() {
        svgGroup = document.createElementNS(SVG_NS, "g");
        svgText = document.createElementNS(SVG_NS, "text");
        svgCircle = document.createElementNS(SVG_NS, "circle");
        
        svgGroup.setAttribute("id", "sozi-framenumber");

        svgCircle.setAttribute("cx", 0);
        svgCircle.setAttribute("cy", 0);
        svgGroup.appendChild(svgCircle);
        
        svgTextNode = document.createTextNode(sozi.player.currentFrameIndex + 1);
        svgText.setAttribute("text-anchor", "middle");
        svgText.setAttribute("dominant-baseline", "central");
        svgText.setAttribute("x", 0);
        svgText.setAttribute("y", 0);
        svgText.appendChild(svgTextNode);
        svgGroup.appendChild(svgText);
        
        document.documentElement.appendChild(svgGroup);
        
        adjust();
    }

    function onFrameChange(index) {
        svgTextNode.nodeValue = index + 1;
    }
    
    // @depend events.js
	sozi.events.listen("sozi.player.ready", onPlayerReady);
	sozi.events.listen("sozi.player.framechange", onFrameChange);
});
