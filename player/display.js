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

sozi.display = (function () {
    var exports = {},
        player,
        tocGroup,
        clipRect,
        wrapper,
        SVG_NS = "http://www.w3.org/2000/svg";
        
    exports.geometry = {
        cx: 0,
        cy: 0,
        width: 1,
        height: 1,
        rotate: 0
    };
       
    exports.clip = true;

    /*
     * Initializes the current Display.
     *
     * This method prepares the DOM representation of the current SVG document.
     * All the image is embedded into a global "g" element on which transformations will be applied.
     * A clipping rectangle is added.
     *
     * This method must be called when the document is ready to be manipulated.
     */
    exports.onLoad = function () {
        var n,
            clipPath = document.createElementNS(SVG_NS, "clipPath");

        player = sozi.player;
      
        exports.svgRoot = document.documentElement; // TODO check SVG tag

        // Remove viewbox if needed
        exports.svgRoot.removeAttribute("viewBox");

        initialBBox = exports.svgRoot.getBBox();

        // Create a new wrapper group element and move all the image to the group
        wrapper = document.createElementNS(SVG_NS, "g");
        wrapper.setAttribute("id", "sozi-wrapper");

        while (true) {
            n = exports.svgRoot.firstChild;
            if (!n) {
                break;
            }
            exports.svgRoot.removeChild(n);
            wrapper.appendChild(n);
        }
        exports.svgRoot.appendChild(wrapper);

        // Add a clipping path
        clipRect = document.createElementNS(SVG_NS, "rect");
        clipRect.setAttribute("id", "sozi-clip-rect");

        clipPath.setAttribute("id", "sozi-clip-path");
        clipPath.appendChild(clipRect);
        exports.svgRoot.appendChild(clipPath);
        exports.svgRoot.setAttribute("clip-path", "url(#sozi-clip-path)");

        exports.svgRoot.setAttribute("width", window.innerWidth);
        exports.svgRoot.setAttribute("height", window.innerHeight);
        
        window.addEventListener("resize", resize, false);
    };

    /*
     * Resizes the SVG document to fit the browser window.
     */
    function resize() {
        exports.svgRoot.setAttribute("width", window.innerWidth);
        exports.svgRoot.setAttribute("height", window.innerHeight);
        exports.update();
    }

    /*
     * Returns an object with the geometrical properties of the current display.
     *
     * Attributes of the returned object :
     *    - x, y: the location of the top-left corner, in pixels
     *    - width, height: the size of the visible area, in pixels
     *    - scale: the scale factor to apply to the SVG document so that is fits the visible area
     */
    function getFrameGeometry() {
        var result = {};
        result.scale = Math.min(window.innerWidth / exports.geometry.width, window.innerHeight / exports.geometry.height);
        result.width = exports.geometry.width * result.scale;
        result.height = exports.geometry.height * result.scale;
        result.x = (window.innerWidth - result.width) / 2;
        result.y = (window.innerHeight - result.height) / 2;
        return result;
    }

    /*
     * Returns the geometrical properties of the frame that can be
     * created from a given element.
     *
     * If the element is a rectangle, the properties of the frames are based
     * on the geometrical properties of the rectangle.
     * Otherwise, the properties of the frame are based on the bounding box
     * of the given element.
     *
     * Parameters:
     *    - elem: an element from the SVG DOM
     *
     * Returns:
     *    - The default size, translation and rotation for the given element 
     */
    exports.getElementGeometry = function (elem) {
        var x, y, w, h, b, c,
            matrix = elem.getCTM(),
            scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);

        if (elem.nodeName === "rect") {
            x = elem.x.baseVal.value;
            y = elem.y.baseVal.value;
            w = elem.width.baseVal.value;
            h = elem.height.baseVal.value;
        } else {
            b = elem.getBBox();
            x = b.x;
            y = b.y;
            w = b.width;
            h = b.height;
        }

        c = document.documentElement.createSVGPoint();
        c.x = x + w / 2;
        c.y = y + h / 2;
        c = c.matrixTransform(matrix);

        return {
            cx: c.x,
            cy: c.y,
            width: w * scale,
            height: h * scale,
            rotate: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
        };
    };

    /*
     * Returns the geometrical properties of the SVG document
     *
     * Returns:
     *    - The default size, translation and rotation for the document's bounding box
     */
    exports.getDocumentGeometry = function () {
        return {
            cx: initialBBox.x + initialBBox.width / 2,
            cy: initialBBox.y + initialBBox.height / 2,
            width: initialBBox.width,
            height: initialBBox.height,
            rotate: 0,
            clip: false
        };
    };

    /*
     * Returns the geometrical properties of the Display.
     *
     * Returns:
     *    - An object with the current size, translation and rotation
     */
    exports.getCurrentGeometry = function () {
        return {
            cx: exports.geometry.cx,
            cy: exports.geometry.cy,
            width: exports.geometry.width,
            height: exports.geometry.height,
            rotate: exports.geometry.rotate,
            clip: exports.clip
        };
    };

    /*
     * Apply an additional translation to the SVG document based on onscreen coordinates.
     *
     * Parameters:
     *    - deltaX: the horizontal displacement, in pixels
     *    - deltaY: the vertical displacement, in pixels
     */
    exports.drag = function (deltaX, deltaY) {
        var g = getFrameGeometry(),
            angleRad = exports.geometry.rotate * Math.PI / 180;
        exports.geometry.cx -= (deltaX * Math.cos(angleRad) - deltaY * Math.sin(angleRad)) / g.scale;
        exports.geometry.cy -= (deltaX * Math.sin(angleRad) + deltaY * Math.cos(angleRad)) / g.scale;
        exports.clip = false;
        if (exports.tableOfContentsIsVisible()) {
            exports.hideTableOfContents();
        }
        exports.update();
    };

    /*
     * Apply geometrical transformations to the image according to the current
     * geometrical attributes of this Display.
     *
     * This method is called automatically when the window is resized.
     */
    exports.update = function () {
        var g = getFrameGeometry(),
            translateX = -exports.geometry.cx + exports.geometry.width / 2  + g.x / g.scale,
            translateY = -exports.geometry.cy + exports.geometry.height / 2 + g.y / g.scale;

        // Compute and apply the geometrical transformation to the wrapper group
        wrapper.setAttribute("transform",
            "scale(" + g.scale + ")" +
            "translate(" + translateX + "," + translateY + ")" +
            "rotate(" + (-exports.geometry.rotate) + ',' + exports.geometry.cx + "," + exports.geometry.cy + ")"
        );

        // Adjust the location and size of the clipping rectangle and the frame rectangle
        clipRect.setAttribute("x", exports.clip ? g.x : 0);
        clipRect.setAttribute("y", exports.clip ? g.y : 0);
        clipRect.setAttribute("width", exports.clip ? g.width : window.innerWidth);
        clipRect.setAttribute("height", exports.clip ? g.height : window.innerHeight);
    };

    /*
     * Transform the SVG document to show the given frame.
     *
     * Parameters:
     *    - frame: the frame to show
     */
    exports.showFrame = function (frame) {
        var attr;
        for (attr in frame.geometry) {
            if (frame.geometry.hasOwnProperty(attr)) {
                exports.geometry[attr] = frame.geometry[attr];
            }
        }
        exports.update();
    };

    /*
     * Zooms the display with the given factor.
     *
     * The zoom is centered around (x, y) with respect to the center of the display area.
     *
     * This method computes the new geometry of the display, but
     * does not update the document. Method update must be called after
     * calling this method.
     */
    exports.applyZoomFactor = function (factor, x, y) {
        var deltaX = (1 - factor) * (x - window.innerWidth / 2),
            deltaY = (1 - factor) * (y - window.innerHeight / 2);
        exports.geometry.width /= factor;
        exports.geometry.height /= factor;
        exports.drag(deltaX, deltaY);
    };

    function makeTocClickHandler(index) {
        return function (evt) {
            player.previewFrame(index);
            evt.stopPropagation();
        };
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
    exports.installTableOfContents = function () {
        var linksBox = document.createElementNS(SVG_NS, "g"),
            tocBackground = document.createElementNS(SVG_NS, "rect"),
            tocUp = document.createElementNS(SVG_NS, "path"),
            tocDown = document.createElementNS(SVG_NS, "path"),
            tocMargin = 5,
            tocWidth = 0,
            textY = 0,
            textWidth,
            frameCount = player.frames.length,
            i,
            text;

        tocGroup = document.createElementNS(SVG_NS, "g");
        tocGroup.setAttribute("id", "sozi-toc");
        tocGroup.setAttribute("visibility", "hidden");
        tocGroup.appendChild(linksBox);
        exports.svgRoot.appendChild(tocGroup);

        tocBackground.setAttribute("id", "sozi-toc-background");
        tocBackground.setAttribute("x", tocMargin);
        tocBackground.setAttribute("y", tocMargin);
        tocBackground.setAttribute("rx", tocMargin);
        tocBackground.setAttribute("ry", tocMargin);
        linksBox.appendChild(tocBackground);

        tocBackground.addEventListener("click", function (evt) {
            evt.stopPropagation();
        }, false);
         
        tocBackground.addEventListener("mousedown", function (evt) {
            evt.stopPropagation();
        }, false);
         
        tocBackground.addEventListener("mouseout", function (evt) {
            var rel = evt.relatedTarget;
            while (rel !== tocGroup && rel !== exports.svgRoot) {
                rel = rel.parentNode;
            }
            if (rel === exports.svgRoot) {
                exports.hideTableOfContents();
                player.restart();
                evt.stopPropagation();
            }
        }, false);

        function tocMouseDownHandler(evt) {
            evt.stopPropagation();
        }
        
        for (i = 0; i < frameCount; i++) {
            text = document.createElementNS(SVG_NS, "text");
            text.appendChild(document.createTextNode(player.frames[i].title));

            linksBox.appendChild(text);
            textWidth = text.getBBox().width;
            textY += text.getBBox().height;
            if (textWidth > tocWidth) {
                tocWidth = textWidth;
            }

            text.setAttribute("x", 2 * tocMargin);
            text.setAttribute("y", textY + tocMargin);

            text.addEventListener("click", makeTocClickHandler(i), false);

            text.addEventListener("mousedown", tocMouseDownHandler, false);
        }

        tocUp.setAttribute("class", "sozi-toc-arrow");
        tocUp.setAttribute("d", "M" + (tocWidth + 3 * tocMargin) + "," + (5 * tocMargin) + 
                           " l" + (4 * tocMargin) + ",0" +
                           " l-" + (2 * tocMargin) + ",-" + (3 * tocMargin) +
                           " z");
      
        tocDown.setAttribute("class", "sozi-toc-arrow");
        tocDown.setAttribute("d", "M" + (tocWidth + 3 * tocMargin) + "," + (7 * tocMargin) + 
                             " l" + (4 * tocMargin) + ",0" +
                             " l-" + (2 * tocMargin) + "," + (3 * tocMargin) +
                             " z");

        tocUp.addEventListener("click", function (evt) {
            var ty = linksBox.getCTM().f;
            if (ty <= -window.innerHeight / 2) {
                ty += window.innerHeight / 2;
            } else if (ty < 0) {
                ty = 0;
            }
            linksBox.setAttribute("transform", "translate(0," + ty + ")");
            evt.stopPropagation();
        }, false);

        tocUp.addEventListener("mousedown", function (evt) {
            evt.stopPropagation();
        }, false);
         
        tocDown.addEventListener("click", function (evt) {
            var ty = linksBox.getCTM().f;
            if (ty + textY >= window.innerHeight * 3 / 2) {
                ty -= window.innerHeight / 2;
            } else if (ty + textY + 2 * tocMargin > window.innerHeight + 4 * tocMargin) {
                ty = window.innerHeight - textY - 4 * tocMargin;
            }
            linksBox.setAttribute("transform", "translate(0," + ty + ")");
            evt.stopPropagation();
        }, false);

        tocDown.addEventListener("mousedown", function (evt) {
            evt.stopPropagation();
        }, false);
      
        tocGroup.appendChild(tocUp);
        tocGroup.appendChild(tocDown);

        tocBackground.setAttribute("width", tocWidth + 7 * tocMargin);
        tocBackground.setAttribute("height", textY + 2 * tocMargin);
    };

    /*
     * Makes the table of contents visible.
     */
    exports.showTableOfContents = function () {
        // Expand the clip path to the whole window
        clipRect.setAttribute("x", 0);
        clipRect.setAttribute("y", 0);
        clipRect.setAttribute("width", window.innerWidth);
        clipRect.setAttribute("height", window.innerHeight);

        // Show table of contents
        tocGroup.setAttribute("visibility", "visible");
    };

    /*
     * Makes the table of contents invisible.
     */
    exports.hideTableOfContents = function () {
        var g = getFrameGeometry();

        // Hide table of contents
        tocGroup.setAttribute("visibility", "hidden");

        // Adjust the location and size of the clipping rectangle and the frame rectangle
        clipRect.setAttribute("x", g.x);
        clipRect.setAttribute("y", g.y);
        clipRect.setAttribute("width", g.width);
        clipRect.setAttribute("height", g.height);
    };

    /*
     * Returns true if the table of contents is visible, false otherwise.
     */
    exports.tableOfContentsIsVisible = function () {
        return tocGroup.getAttribute("visibility") === "visible";
    };
    
    return exports;
}());
