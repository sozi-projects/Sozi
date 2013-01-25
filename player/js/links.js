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
*/

/**
 * @name sozi.links
 * @namespace Links fix for Webkit.
 * @depend namespace.js
 */
namespace(this, "sozi.links", function (exports, window) {
    "use strict";
    
    var SVG_NS = "http://www.w3.org/2000/svg";
    var XLINK_NS = "http://www.w3.org/1999/xlink";
    
    function getClickHandler(index) {
        return function () {
            sozi.player.moveToFrame(index);
        };
    }
    
    /*
     * Event handler: document load.
     *
     * This function adds an event listener to each internal link.
     * Clicking on a link that targets a frame of this document
     * will call sozi.player.moveToFrame().
     */
    function onLoad() {
        var links = window.document.getElementsByTagNameNS(SVG_NS, "a");
        for (var i = 0; i < links.length; i += 1) {
            var href = links[i].getAttributeNS(XLINK_NS, "href");
            if (href && href[0] === "#") {
                links[i].addEventListener("click", getClickHandler(sozi.location.getFrameIndexForHash(href)), false);
            }
        }
    }

    window.addEventListener("load", onLoad, false);
});

