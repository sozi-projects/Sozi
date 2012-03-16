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

module("sozi.display", function (exports) {
    var window = this,
        document = window.document,
        svgRoot,
        initialBBox,
        SVG_NS = "http://www.w3.org/2000/svg";

    exports.layers = {};

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
        var l, clippedArea, clipPath, groupId;

        svgRoot = document.documentElement; // TODO check SVG tag
        initialBBox = svgRoot.getBBox();
        svgRoot.setAttribute("width", window.innerWidth);
        svgRoot.setAttribute("height", window.innerHeight);
        
        // Initialize display geometry for all layers
        for (l = 0; l < sozi.document.idLayers.length; l += 1) {
            groupId = sozi.document.idLayers[l];
            exports.layers[groupId] = {
                geometry: {
                    cx: 0,
                    cy: 0,
                    width: 1,
                    height: 1,
                    rotate: 0,
                    clip: true
                },
                clipRect: document.createElementNS(SVG_NS, "rect"),
                group: document.getElementById(groupId)
            };

            // Add a clipping path
            clipPath = document.createElementNS(SVG_NS, "clipPath");
            clipPath.setAttribute("id", "sozi-clip-path-" + groupId);
            clipPath.appendChild(exports.layers[groupId].clipRect);
            svgRoot.appendChild(clipPath);

            // Create a group that will support the clipping operation
            // and move the layer group into that new group
            clippedArea = document.createElementNS(SVG_NS, "g");
            clippedArea.setAttribute("clip-path", "url(#sozi-clip-path-" + groupId + ")");
            
            // Adding the layer group to the clipped group must preserve layer ordering
            svgRoot.insertBefore(clippedArea, exports.layers[groupId].group);
            clippedArea.appendChild(exports.layers[groupId].group);
        }

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
    function getFrameGeometry(layer) {
        var g = exports.layers[layer].geometry,
            result = {};
        result.scale = Math.min(window.innerWidth / g.width, window.innerHeight / g.height);
        result.width = g.width * result.scale;
        result.height = g.height * result.scale;
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
        var l,
            result = { layers: {} },
            value = {
                geometry: {
                    cx: initialBBox.x + initialBBox.width / 2,
                    cy: initialBBox.y + initialBBox.height / 2,
                    width: initialBBox.width,
                    height: initialBBox.height,
                    rotate: 0,
                    clip: false
                }
            };
        for (l in exports.layers) {
            if (exports.layers.hasOwnProperty(l)) {
                result.layers[l] = value;
            }
        }
        return result;
    };

    /*
     * Apply geometrical transformations to the image according to the current
     * geometrical attributes of this Display.
     *
     * This method is called automatically when the window is resized.
     */
    exports.update = function () {
        var l, fg, lg, cr,
            translateX, translateY;

        for (l in exports.layers) {
            if (exports.layers.hasOwnProperty(l)) {
                lg = exports.layers[l].geometry;
                fg = getFrameGeometry(l);
                
                translateX = -lg.cx + lg.width / 2  + fg.x / fg.scale;
                translateY = -lg.cy + lg.height / 2 + fg.y / fg.scale;

                // Compute and apply the geometrical transformation to the layer group
                exports.layers[l].group.setAttribute("transform",
                    "scale(" + fg.scale + ")" +
                    "translate(" + translateX + "," + translateY + ")" +
                    "rotate(" + (-lg.rotate) + ',' + lg.cx + "," + lg.cy + ")"
                );

                // Adjust the location and size of the clipping rectangle and the frame rectangle
                cr = exports.layers[l].clipRect;
                cr.setAttribute("x", lg.clip ? fg.x : 0);
                cr.setAttribute("y", lg.clip ? fg.y : 0);
                cr.setAttribute("width", lg.clip ? fg.width : window.innerWidth);
                cr.setAttribute("height", lg.clip ? fg.height : window.innerHeight);
            }
        }

    };

    /*
     * Transform the SVG document to show the given frame.
     *
     * Parameters:
     *    - frame: the frame to show
     */
    exports.showFrame = function (frame) {
        var l, lg, fg, attr;
        for (l in frame.layers) {
            if (frame.layers.hasOwnProperty(l)) {
                fg = frame.layers[l].geometry;
                lg = exports.layers[l].geometry;
                for (attr in fg) {
                    if (fg.hasOwnProperty(attr)) {
                        lg[attr] = fg[attr];
                    }
                }
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
        var l, lg, fg,
            angleRad;
        
        for (l in exports.layers) {
            if (exports.layers.hasOwnProperty(l)) {
                lg = exports.layers[l].geometry;
                fg = getFrameGeometry(l);
                angleRad = lg.rotate * Math.PI / 180;
                lg.cx -= (deltaX * Math.cos(angleRad) - deltaY * Math.sin(angleRad)) / fg.scale;
                lg.cy -= (deltaX * Math.sin(angleRad) + deltaY * Math.cos(angleRad)) / fg.scale;
                lg.clip = false;
            }
        }
        exports.update();
    };

    /*
     * Zooms the display with the given factor.
     *
     * The zoom is centered around (x, y) with respect to the center of the display area.
     */
    exports.zoom = function (factor, x, y) {
        var l,
            deltaX = (1 - factor) * (x - window.innerWidth / 2),
            deltaY = (1 - factor) * (y - window.innerHeight / 2);
            
        for (l in exports.layers) {
            if (exports.layers.hasOwnProperty(l)) {
                exports.layers[l].geometry.width /= factor;
                exports.layers[l].geometry.height /= factor;
            }
        }
        
        exports.drag(deltaX, deltaY);
    };

    /*
     * Rotate the display with the given angle.
     *
     * The rotation is centered around the center of the display area.
     */
    exports.rotate = function (angle) {
        var l;
        for (l in exports.layers) {
            if (exports.layers.hasOwnProperty(l)) {
                exports.layers[l].geometry.rotate += angle;
                exports.layers[l].geometry.rotate %= 360;
            }
        }
        exports.update();
    };
    
    sozi.events.listen("documentready", onDocumentReady);
    window.addEventListener("resize", resize, false);
});
