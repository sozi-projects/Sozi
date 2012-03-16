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

module("sozi.framenumber", function (exports) {
    var window = this,
        document = window.document,
        group, text, circle, textNode,
        SVG_NS = "http://www.w3.org/2000/svg";
    
    function adjust() {
        var textBBox = text.getBBox(),
            d = Math.max(textBBox.width, textBBox.height) * 0.75,
            t = d * 1.25;
        circle.setAttribute("r", d);
        group.setAttribute("transform", "translate(" + t + "," + t + ")");
    }
    
    function onDisplayReady() {
        group = document.createElementNS(SVG_NS, "g");
        text = document.createElementNS(SVG_NS, "text");
        circle = document.createElementNS(SVG_NS, "circle");
        
        group.setAttribute("id", "sozi-framenumber");

        circle.setAttribute("cx", 0);
        circle.setAttribute("cy", 0);
        group.appendChild(circle);
        
        textNode = document.createTextNode(sozi.location.getFrameIndex() + 1);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central");
        text.setAttribute("x", 0);
        text.setAttribute("y", 0);
        text.appendChild(textNode);
        group.appendChild(text);
        
        document.documentElement.appendChild(group);
        
        adjust();
    }

    function onFrameChange(index) {
        textNode.nodeValue = index + 1;
    }
    
	sozi.events.listen("displayready", onDisplayReady);
	sozi.events.listen("framechange", onFrameChange);
});
