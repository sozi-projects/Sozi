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
 * @depend namespace.js
 * @depend events.js
 */

namespace(this, "sozi.framelist", function (exports, window) {
    "use strict";
    
    // An alias to the global document object
	var document = window.document;
	
    // Constant: the margin around the text of the frame list
    var MARGIN = 5;
    
	// The SVG group that will contain the frame list
    var svgTocGroup;
    
    // The SVG group that will contain the frame titles
    var svgTitlesGroup;
    
    // The current height of the frame list,
    // computed during the initialization
    var tocHeight = 0;
    
    // The X coordinate of the frame list in its hidden state
    var translateXHidden;
    
    // The X coordinate of the frame list when it is completely visible
    var translateXVisible;
    
    // The initial X coordinate of the frame list before starting an animation.
    // This variable is set before showing/hiding the frame list.
    var translateXStart;
    
    // The final X coordinate of the frame list for the starting animation.
    // This variable is set before showing/hiding the frame list.
    var translateXEnd;
    
    // The current X coordinate of the frame list for the running animation.
    // This variable is updated on each animation step.
    var translateX;
    
    // The animator object that will manage animations of the frame list
    var animator;
    
    // Constant: the duration of the showing/hiding animation, in milliseconds
    var ANIMATION_TIME_MS = 300;
    
    // Constant: the acceleration profile of the showing/hiding animation
    var ANIMATION_PROFILE = "decelerate";
    
    // Constant: the SVG namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

	function onMouseOut(evt) {
        var rel = evt.relatedTarget,
            svgRoot = document.documentElement;
        while (rel && rel !== svgTocGroup && rel !== svgRoot) {
            rel = rel.parentNode;
        }
        if (rel !== svgTocGroup) {
            exports.hide();
            sozi.player.restart();
            evt.stopPropagation();
        }
    }

	function onClickArrowUp(evt) {
        var ty = svgTitlesGroup.getCTM().f;
        if (ty <= -window.innerHeight / 2) {
            ty += window.innerHeight / 2;
        } else if (ty < 0) {
            ty = 0;
        }
        svgTitlesGroup.setAttribute("transform", "translate(0," + ty + ")");
        evt.stopPropagation();
	}

	function onClickArrowDown(evt) {
        var ty = svgTitlesGroup.getCTM().f;
        if (ty + tocHeight >= window.innerHeight * 3 / 2) {
            ty -= window.innerHeight / 2;
        } else if (ty + tocHeight > window.innerHeight + 2 * MARGIN) {
            ty = window.innerHeight - tocHeight - 4 * MARGIN;
        }
        svgTitlesGroup.setAttribute("transform", "translate(0," + ty + ")");
        evt.stopPropagation();
    }

    /*
     * Create a function that responds to clicks on frame list entries.
     */
    function makeClickHandler(index) {
        return function (evt) {
            sozi.player.previewFrame(index);
            evt.stopPropagation();
        };
    }
    
    /*
     * The default event handler, to prevent event propagation
     * through the frame list.
     */
    function defaultEventHandler(evt) {
	    evt.stopPropagation();
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
        svgTocGroup = document.createElementNS(SVG_NS, "g");
        svgTocGroup.setAttribute("id", "sozi-toc");
        document.documentElement.appendChild(svgTocGroup);

        svgTitlesGroup = document.createElementNS(SVG_NS, "g");
        svgTocGroup.appendChild(svgTitlesGroup);
    
        // The background rectangle of the frame list
        var tocBackground = document.createElementNS(SVG_NS, "rect");
        tocBackground.setAttribute("id", "sozi-toc-background");
        tocBackground.setAttribute("x", MARGIN);
        tocBackground.setAttribute("y", MARGIN);
        tocBackground.setAttribute("rx", MARGIN);
        tocBackground.setAttribute("ry", MARGIN);
        tocBackground.addEventListener("click", defaultEventHandler, false);
        tocBackground.addEventListener("mousedown", defaultEventHandler, false);
        tocBackground.addEventListener("mouseout", onMouseOut, false);
        svgTitlesGroup.appendChild(tocBackground);

        var tocWidth = 0;
        var currentFrameIndex = sozi.location.getFrameIndex();
        sozi.document.frames.forEach(function (frame, frameIndex) {
            var text = document.createElementNS(SVG_NS, "text");
            text.appendChild(document.createTextNode(frame.title));
            svgTitlesGroup.appendChild(text);

            if (frameIndex === currentFrameIndex) {
                text.setAttribute("class", "sozi-toc-current");
            }
                     
            var textWidth = text.getBBox().width;
            tocHeight += text.getBBox().height;
            if (textWidth > tocWidth) {
                tocWidth = textWidth;
            }

            text.setAttribute("x", 2 * MARGIN);
            text.setAttribute("y", tocHeight + MARGIN);
            text.addEventListener("click", makeClickHandler(frameIndex), false);
            text.addEventListener("mousedown", defaultEventHandler, false);
        });

        // The "up" button
        var tocUp = document.createElementNS(SVG_NS, "path");
        tocUp.setAttribute("class", "sozi-toc-arrow");
        tocUp.setAttribute("d", "M" + (tocWidth + 3 * MARGIN) + "," + (5 * MARGIN) +
                           " l" + (4 * MARGIN) + ",0" +
                           " l-" + (2 * MARGIN) + ",-" + (3 * MARGIN) +
                           " z");
        tocUp.addEventListener("click", onClickArrowUp, false);
        tocUp.addEventListener("mousedown", defaultEventHandler, false);
        svgTocGroup.appendChild(tocUp);

        // The "down" button
        var tocDown = document.createElementNS(SVG_NS, "path");
        tocDown.setAttribute("class", "sozi-toc-arrow");
        tocDown.setAttribute("d", "M" + (tocWidth + 3 * MARGIN) + "," + (7 * MARGIN) +
                             " l" + (4 * MARGIN) + ",0" +
                             " l-" + (2 * MARGIN) + "," + (3 * MARGIN) +
                             " z");
        tocDown.addEventListener("click", onClickArrowDown, false);
        tocDown.addEventListener("mousedown", defaultEventHandler, false);
        svgTocGroup.appendChild(tocDown);

        tocBackground.setAttribute("width", tocWidth + 7 * MARGIN);
        tocBackground.setAttribute("height", tocHeight + 2 * MARGIN);
        
        translateXHidden = -tocWidth - 9 * MARGIN;
        translateXVisible = 0;
        translateX = translateXEnd = translateXHidden;
        
        svgTocGroup.setAttribute("transform", "translate(" + translateXHidden + ",0)");
        animator = sozi.animation.Animator.instance().augment({
            onStep: function (progress) {
                var profileProgress = sozi.animation.profiles[ANIMATION_PROFILE](progress),
                    remaining = 1 - profileProgress;
                translateX = translateXEnd * profileProgress + translateXStart * remaining;
                svgTocGroup.setAttribute("transform", "translate(" + translateX + ",0)");
            }
        });
    }

	/*
	 * Highlight the current frame title in the frame list.
	 *
	 * This handler is called on each frame change,
	 * even when the frame list is hidden.
	 */
    function onFrameChange(index) {
        var currentElementList = Array.prototype.slice.call(document.getElementsByClassName("sozi-toc-current"));
        currentElementList.forEach(function (svgElement) {
            svgElement.removeAttribute("class");
        });

        var textElements = svgTitlesGroup.getElementsByTagName("text");
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

	sozi.events.listen("sozi.display.ready", onDisplayReady);
	sozi.events.listen("sozi.player.cleanup", exports.hide);
	sozi.events.listen("sozi.player.framechange", onFrameChange);
});
