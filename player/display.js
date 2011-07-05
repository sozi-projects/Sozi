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
    var exports = sozi.display = sozi.display || {},
        window = this,
        document = window.document,
        svgRoot,
        clipRect,
        initialBBox,
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
    function onDocumentReady() {
        var n,
            clippedArea = document.createElementNS(SVG_NS, "g"),
            clipPath = document.createElementNS(SVG_NS, "clipPath");

        svgRoot = document.documentElement; // TODO check SVG tag

        // Remove viewbox if needed
        svgRoot.removeAttribute("viewBox");

        initialBBox = svgRoot.getBBox();

        // Create a new wrapper group element and move all the image to the group
        wrapper = document.createElementNS(SVG_NS, "g");
        while (true) {
            n = svgRoot.firstChild;
            if (!n) {
                break;
            }
            svgRoot.removeChild(n);
            wrapper.appendChild(n);
        }

        // Add a clipping path
        clipRect = document.createElementNS(SVG_NS, "rect");
        clipRect.setAttribute("id", "sozi-clip-rect");

        clipPath.setAttribute("id", "sozi-clip-path");
        clipPath.appendChild(clipRect);
        svgRoot.appendChild(clipPath);

        clippedArea.setAttribute("clip-path", "url(#sozi-clip-path)");
        clippedArea.appendChild(wrapper);
        svgRoot.appendChild(clippedArea);

        svgRoot.setAttribute("width", window.innerWidth);
        svgRoot.setAttribute("height", window.innerHeight);
        
        sozi.events.fire("displayready");
    }

    /*
     * Resizes the SVG document to fit the browser window.
     */
    function resize() {
        svgRoot.setAttribute("width", window.innerWidth);
        svgRoot.setAttribute("height", window.innerHeight);
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
        exports.update();
    };

    /*
     * Zooms the display with the given factor.
     *
     * The zoom is centered around (x, y) with respect to the center of the display area.
     */
    exports.zoom = function (factor, x, y) {
        var deltaX = (1 - factor) * (x - window.innerWidth / 2),
            deltaY = (1 - factor) * (y - window.innerHeight / 2);
        exports.geometry.width /= factor;
        exports.geometry.height /= factor;
        exports.drag(deltaX, deltaY);
    };

    /*
     * Rotate the display with the given angle.
     *
     * The rotation is centered around the center of the display area.
     */
    exports.rotate = function (angle) {
        exports.geometry.rotate += angle;
        exports.geometry.rotate %= 360;
        exports.update();
    };
    
    sozi.events.listen("documentready", onDocumentReady);
    window.addEventListener("resize", resize, false);
}());
