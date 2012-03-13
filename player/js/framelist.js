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
        MARGIN = 5,
        translateXHidden,
        translateXVisible,
        translateXStart,
        translateXEnd,
        translateX,
        animator,
        ANIMATION_TIME_MS = 300,
        ANIMATION_PROFILE = "decelerate",
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
        } else if (ty + tocHeight > window.innerHeight + 2 * MARGIN) {
            ty = window.innerHeight - tocHeight - 4 * MARGIN;
        }
        linksBox.setAttribute("transform", "translate(0," + ty + ")");
        evt.stopPropagation();
    }	

    function onAnimationStep(progress) {
        var profileProgress = sozi.animation.profiles[ANIMATION_PROFILE](progress),
            remaining = 1 - profileProgress;
        translateX = translateXEnd * profileProgress + translateXStart * remaining;
        tocGroup.setAttribute("transform", "translate(" + translateX + ",0)");
    }
    
    function onAnimationDone() {
        // Empty
    }
    
    /*
     * Adds a table of contents to the document.
     *
     * The table of contents is a rectangular region with the list of frame titles.
     * Clicking on a title moves the presentation to the corresponding frame.
     *
     * The table of contents is hidden by default.
     */
    function onDisplayReady() {
        var tocBackground = document.createElementNS(SVG_NS, "rect"),
            tocUp = document.createElementNS(SVG_NS, "path"),
            tocDown = document.createElementNS(SVG_NS, "path"),
            tocWidth = 0,
            textWidth,
            frameCount = sozi.document.frames.length,
            frameIndex = sozi.location.getFrameIndex(),
            i,
            text;

		svgRoot = document.documentElement;

        tocGroup = document.createElementNS(SVG_NS, "g");
        tocGroup.setAttribute("id", "sozi-toc");
        svgRoot.appendChild(tocGroup);

        linksBox = document.createElementNS(SVG_NS, "g");
        tocGroup.appendChild(linksBox);
    
        tocBackground.setAttribute("id", "sozi-toc-background");
        tocBackground.setAttribute("x", MARGIN);
        tocBackground.setAttribute("y", MARGIN);
        tocBackground.setAttribute("rx", MARGIN);
        tocBackground.setAttribute("ry", MARGIN);
        tocBackground.addEventListener("click", defaultEventHandler, false);
        tocBackground.addEventListener("mousedown", defaultEventHandler, false);
        tocBackground.addEventListener("mouseout", onMouseOut, false);
        linksBox.appendChild(tocBackground);

        for (i = 0; i < frameCount; i += 1) {
            text = document.createElementNS(SVG_NS, "text");
            text.appendChild(document.createTextNode(sozi.document.frames[i].title));
            linksBox.appendChild(text);

            if (i === frameIndex) {
                text.setAttribute("class", "sozi-toc-current");
            }
                     
            textWidth = text.getBBox().width;
            tocHeight += text.getBBox().height;
            if (textWidth > tocWidth) {
                tocWidth = textWidth;
            }

            text.setAttribute("x", 2 * MARGIN);
            text.setAttribute("y", tocHeight + MARGIN);
            text.addEventListener("click", makeClickHandler(i), false);
            text.addEventListener("mousedown", defaultEventHandler, false);
        }

        tocUp.setAttribute("class", "sozi-toc-arrow");
        tocUp.setAttribute("d", "M" + (tocWidth + 3 * MARGIN) + "," + (5 * MARGIN) + 
                           " l" + (4 * MARGIN) + ",0" +
                           " l-" + (2 * MARGIN) + ",-" + (3 * MARGIN) +
                           " z");
        tocUp.addEventListener("click", onClickArrowUp, false);
        tocUp.addEventListener("mousedown", defaultEventHandler, false);
        tocGroup.appendChild(tocUp);
      
        tocDown.setAttribute("class", "sozi-toc-arrow");
        tocDown.setAttribute("d", "M" + (tocWidth + 3 * MARGIN) + "," + (7 * MARGIN) + 
                             " l" + (4 * MARGIN) + ",0" +
                             " l-" + (2 * MARGIN) + "," + (3 * MARGIN) +
                             " z");
        tocDown.addEventListener("click", onClickArrowDown, false);
        tocDown.addEventListener("mousedown", defaultEventHandler, false);      
        tocGroup.appendChild(tocDown);

        tocBackground.setAttribute("width", tocWidth + 7 * MARGIN);
        tocBackground.setAttribute("height", tocHeight + 2 * MARGIN);
        
        translateXHidden = -tocWidth - 9 * MARGIN;
        translateXVisible = 0;
        translateX = translateXEnd = translateXHidden;
        
        tocGroup.setAttribute("transform", "translate(" + translateXHidden + ",0)");
        animator = new sozi.animation.Animator(onAnimationStep, onAnimationDone);
    }

    function onFrameChange(index) {
        var current = document.getElementsByClassName("sozi-toc-current"),
            textElements = linksBox.getElementsByTagName("text"),
            i;
        for (i = 0; i < current.length; i += 1) {
            current[i].removeAttribute("class");
        }
        textElements[index].setAttribute("class", "sozi-toc-current");
    }
    
    /*
     * Makes the table of contents visible.
     */
    exports.show = function () {
        translateXStart = translateX;
        translateXEnd = translateXVisible;
        animator.start(ANIMATION_TIME_MS); // FIXME depends on current elapsed time
    };

    /*
     * Makes the table of contents invisible.
     */
    exports.hide = function () {
        translateXStart = translateX;
        translateXEnd = translateXHidden;
        animator.start(ANIMATION_TIME_MS); // FIXME depends on current elapsed time
    };

    /*
     * Returns true if the table of contents is visible, false otherwise.
     */
    exports.isVisible = function () {
        return translateXEnd === translateXVisible;
    };

	sozi.events.listen("displayready", onDisplayReady);
	sozi.events.listen("cleanup", exports.hide);
	sozi.events.listen("framechange", onFrameChange);
}());
