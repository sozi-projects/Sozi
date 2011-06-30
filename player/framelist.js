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
	var exports = sozi.framelist = sozi.framelist || {},
        window = this,
        document = window.document,
        svgRoot,
        tocGroup,
        linksBox,
        tocHeight = 0,
        tocMargin = 5,
        previousClip,
        SVG_NS = "http://www.w3.org/2000/svg";

    function makeClickHandler(index) {
        return function (evt) {
            sozi.player.previewFrame(index);
            evt.stopPropagation();
        };
    }
      
    function defaultEventHandler(evt) {
	    evt.stopPropagation();
    }
    
	function onMouseOut(evt) {
        var rel = evt.relatedTarget;
        while (rel !== tocGroup && rel !== svgRoot) {
            rel = rel.parentNode;
        }
        if (rel === svgRoot) {
            exports.hide();
            sozi.player.restart();
            evt.stopPropagation();
        }
    }

	function onClickArrowUp(evt) {
        var ty = linksBox.getCTM().f;
        if (ty <= -window.innerHeight / 2) {
            ty += window.innerHeight / 2;
        } else if (ty < 0) {
            ty = 0;
        }
        linksBox.setAttribute("transform", "translate(0," + ty + ")");
        evt.stopPropagation();
	}

	function onClickArrowDown(evt) {
        var ty = linksBox.getCTM().f;
        if (ty + tocHeight >= window.innerHeight * 3 / 2) {
            ty -= window.innerHeight / 2;
        } else if (ty + tocHeight > window.innerHeight + 2 * tocMargin) {
            ty = window.innerHeight - tocHeight - 4 * tocMargin;
        }
        linksBox.setAttribute("transform", "translate(0," + ty + ")");
        evt.stopPropagation();
    }	

    /*
     * Adds a table of contents to the document.
     *
     * The table of contents is a rectangular region with the list of frame titles.
     * Clicking on a title moves the presentation to the corresponding frame.
     *
     * The table of contents is hidden by default.
     *
     * FIXME text size and coordinates
     */
    function onDisplayReady() {
        var tocBackground = document.createElementNS(SVG_NS, "rect"),
            tocUp = document.createElementNS(SVG_NS, "path"),
            tocDown = document.createElementNS(SVG_NS, "path"),
            tocWidth = 0,
            textWidth,
            frameCount = sozi.document.frames.length,
            i,
            text;

		svgRoot = document.documentElement;

        tocGroup = document.createElementNS(SVG_NS, "g");
        tocGroup.setAttribute("id", "sozi-toc");
        tocGroup.setAttribute("visibility", "hidden");
        svgRoot.appendChild(tocGroup);

        linksBox = document.createElementNS(SVG_NS, "g");
        tocGroup.appendChild(linksBox);
    
        tocBackground.setAttribute("id", "sozi-toc-background");
        tocBackground.setAttribute("x", tocMargin);
        tocBackground.setAttribute("y", tocMargin);
        tocBackground.setAttribute("rx", tocMargin);
        tocBackground.setAttribute("ry", tocMargin);
        tocBackground.addEventListener("click", defaultEventHandler, false);
        tocBackground.addEventListener("mousedown", defaultEventHandler, false);
        tocBackground.addEventListener("mouseout", onMouseOut, false);
        linksBox.appendChild(tocBackground);

        for (i = 0; i < frameCount; i += 1) {
            text = document.createElementNS(SVG_NS, "text");
            text.appendChild(document.createTextNode(sozi.document.frames[i].title));
            linksBox.appendChild(text);
            
            textWidth = text.getBBox().width;
            tocHeight += text.getBBox().height;
            if (textWidth > tocWidth) {
                tocWidth = textWidth;
            }

            text.setAttribute("x", 2 * tocMargin);
            text.setAttribute("y", tocHeight + tocMargin);
            text.addEventListener("click", makeClickHandler(i), false);
            text.addEventListener("mousedown", defaultEventHandler, false);
        }

        tocUp.setAttribute("class", "sozi-toc-arrow");
        tocUp.setAttribute("d", "M" + (tocWidth + 3 * tocMargin) + "," + (5 * tocMargin) + 
                           " l" + (4 * tocMargin) + ",0" +
                           " l-" + (2 * tocMargin) + ",-" + (3 * tocMargin) +
                           " z");
        tocUp.addEventListener("click", onClickArrowUp, false);
        tocUp.addEventListener("mousedown", defaultEventHandler, false);
        tocGroup.appendChild(tocUp);
      
        tocDown.setAttribute("class", "sozi-toc-arrow");
        tocDown.setAttribute("d", "M" + (tocWidth + 3 * tocMargin) + "," + (7 * tocMargin) + 
                             " l" + (4 * tocMargin) + ",0" +
                             " l-" + (2 * tocMargin) + "," + (3 * tocMargin) +
                             " z");
        tocDown.addEventListener("click", onClickArrowDown, false);
        tocDown.addEventListener("mousedown", defaultEventHandler, false);      
        tocGroup.appendChild(tocDown);

        tocBackground.setAttribute("width", tocWidth + 7 * tocMargin);
        tocBackground.setAttribute("height", tocHeight + 2 * tocMargin);
    }

    /*
     * Makes the table of contents visible.
     */
    exports.show = function () {
        previousClip = sozi.display.clip;
        sozi.display.clip = false;
        sozi.display.update();
        tocGroup.setAttribute("visibility", "visible");
    };

    /*
     * Makes the table of contents invisible.
     */
    exports.hide = function () {
        tocGroup.setAttribute("visibility", "hidden");
    };

    /*
     * Returns true if the table of contents is visible, false otherwise.
     */
    exports.isVisible = function () {
        return tocGroup.getAttribute("visibility") === "visible";
    };

	sozi.events.listen("displayready", onDisplayReady);
	sozi.events.listen("cleanup", exports.hide);
}());
