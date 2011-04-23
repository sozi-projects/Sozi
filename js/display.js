/*
 * Sozi - A presentation tool using the SVG standard
 * 
 * Copyright (C) 2010 Guillaume Savaton
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jslint plusplus: false, indent: 3, browser: true */
/*global window: true */

var sozi = sozi || {};

/*
 * Creates a new Display with default settings.
 *
 * Parameters:
 *    - controller: the object that holds the frame list (attribute "frames")
 */
sozi.Display = function (controller) {
   this.controller = controller;

   // Initial display properties
   this.cx = 0;
   this.cy = 0;
   this.width = 1;
   this.height = 1;
   this.rotate = 0;
   this.clip = true;
};

sozi.Display.prototype.svgNs = "http://www.w3.org/2000/svg";

/*
 * Initializes the current Display.
 *
 * This method prepares the DOM representation of the current SVG document.
 * All the image is embedded into a global "g" element on which transformations will be applied.
 * A clipping rectangle is added.
 *
 * This method must be called when the document is ready to be manipulated.
 */
sozi.Display.prototype.onLoad = function () {
   var n,
       clipPath = document.createElementNS(this.svgNs, "clipPath");

   this.svgRoot = document.documentElement; // TODO check SVG tag

   // Remove viewbox if needed
   this.svgRoot.removeAttribute("viewBox");

   this.initialBBox = this.svgRoot.getBBox();

   // Create a new wrapper group element and move all the image to the group
   this.wrapper = document.createElementNS(this.svgNs, "g");
   this.wrapper.setAttribute("id", "sozi-wrapper");

   while (true) {
      n = this.svgRoot.firstChild;
      if (!n) {
         break;
      }
      this.svgRoot.removeChild(n);
      this.wrapper.appendChild(n);
   }
   this.svgRoot.appendChild(this.wrapper);

   // Add a clipping path
   this.clipRect = document.createElementNS(this.svgNs, "rect");
   this.clipRect.setAttribute("id", "sozi-clip-rect");

   clipPath.setAttribute("id", "sozi-clip-path");
   clipPath.appendChild(this.clipRect);
   this.svgRoot.appendChild(clipPath);
   this.svgRoot.setAttribute("clip-path", "url(#sozi-clip-path)");

   this.svgRoot.setAttribute("width", window.innerWidth);
   this.svgRoot.setAttribute("height", window.innerHeight);
};

/*
 * Resizes the SVG document to fit the browser window.
 */
sozi.Display.prototype.resize = function () {
   this.svgRoot.setAttribute("width", window.innerWidth);
   this.svgRoot.setAttribute("height", window.innerHeight);
   this.update();
};

/*
 * Returns an object with the geometrical properties of the current display.
 *
 * Attributes of the returned object :
 *    - x, y: the location of the top-left corner, in pixels
 *    - width, height: the size of the visible area, in pixels
 *    - scale: the scale factor to apply to the SVG document so that is fits the visible area
 */
sozi.Display.prototype.getFrameGeometry = function () {
   var result = {};

   result.scale = Math.min(window.innerWidth / this.width,
                           window.innerHeight / this.height);

   result.width = this.width * result.scale;
   result.height = this.height * result.scale;

   result.x = (window.innerWidth - result.width) / 2;
   result.y = (window.innerHeight - result.height) / 2;

   return result;
};

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
sozi.Display.prototype.getElementGeometry = function (elem) {
   var x, y, width, height, b, c,
       matrix = elem.getCTM(),
       scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);

   if (elem.nodeName === "rect") {
      x = elem.x.baseVal.value;
      y = elem.y.baseVal.value;
      width = elem.width.baseVal.value;
      height = elem.height.baseVal.value;
   }
   else {
      b = elem.getBBox();
      x = b.x;
      y = b.y;
      width = b.width;
      height = b.height;
   }

   c = document.documentElement.createSVGPoint();
   c.x = x + width / 2;
   c.y = y + height / 2;
   c = c.matrixTransform(matrix);

   return {
      cx: c.x,
      cy: c.y,
      width: width * scale,
      height: height * scale,
      rotate: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
   };
};

/*
 * Returns the geometrical properties of the SVG document
 *
 * Returns:
 *    - The default size, translation and rotation for the document's bounding box
 */
sozi.Display.prototype.getDocumentGeometry = function () {
   return {
      cx: this.initialBBox.x + this.initialBBox.width / 2,
      cy: this.initialBBox.y + this.initialBBox.height / 2,
      width: this.initialBBox.width,
      height: this.initialBBox.height,
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
sozi.Display.prototype.getCurrentGeometry = function () {
   return {
      cx: this.cx,
      cy: this.cy,
      width: this.width,
      height: this.height,
      rotate: this.rotate,
      clip: this.clip
   };
};

/*
 * Apply an additional translation to the SVG document based on onscreen coordinates.
 *
 * Parameters:
 *    - deltaX: the horizontal displacement, in pixels
 *    - deltaY: the vertical displacement, in pixels
 */
sozi.Display.prototype.drag = function (deltaX, deltaY) {
   var g = this.getFrameGeometry(),
       angleRad = this.rotate * Math.PI / 180;
   this.cx -= (deltaX * Math.cos(angleRad) - deltaY * Math.sin(angleRad)) / g.scale;
   this.cy -= (deltaX * Math.sin(angleRad) + deltaY * Math.cos(angleRad)) / g.scale;
   this.clip = false;
   if (this.tableOfContentsIsVisible()) {
      this.hideTableOfContents();
   }
   this.update();
};

/*
 * Apply geometrical transformations to the image according to the current
 * geometrical attributes of this Display.
 *
 * This method is called automatically when the window is resized.
 */
sozi.Display.prototype.update = function () {
   var g = this.getFrameGeometry(),
       translateX = - this.cx + this.width / 2 + g.x / g.scale,
       translateY = - this.cy + this.height / 2 + g.y / g.scale;

   // Compute and apply the geometrical transformation to the wrapper group
   this.wrapper.setAttribute("transform",
      "scale(" + g.scale + ")" +
      "translate(" + translateX + "," + translateY + ")" +
      "rotate(" + (- this.rotate) + ',' + this.cx + "," + this.cy + ")"
   );

   // Adjust the location and size of the clipping rectangle and the frame rectangle
   this.clipRect.setAttribute("x", this.clip ? g.x : 0);
   this.clipRect.setAttribute("y", this.clip ? g.y : 0);
   this.clipRect.setAttribute("width", this.clip ? g.width : window.innerWidth);
   this.clipRect.setAttribute("height", this.clip ? g.height : window.innerHeight);
};

/*
 * Transform the SVG document to show the given frame.
 *
 * Parameters:
 *    - frame: the frame to show
 */
sozi.Display.prototype.showFrame = function (frame) {
   var attr;
   for (attr in frame.geometry) {
      if (frame.geometry.hasOwnProperty(attr)) {
         this[attr] = frame.geometry[attr];
      }
   }
   this.update();
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
sozi.Display.prototype.applyZoomFactor = function (factor, x, y) {
   var deltaX = (1 - factor) * (x - window.innerWidth / 2),
       deltaY = (1 - factor) * (y - window.innerHeight / 2);
   this.width /= factor;
   this.height /= factor;
   this.drag(deltaX, deltaY);
};

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
sozi.Display.prototype.installTableOfContents = function () {
   var tocBackground = document.createElementNS(this.svgNs, "rect"),
       tocMargin = 5, tocWidth = 0, textY = 0, textWidth,
       i, text;

   this.tocGroup = document.createElementNS(this.svgNs, "g");
   this.tocGroup.setAttribute("id", "sozi-toc");
   this.tocGroup.setAttribute("visibility", "hidden");
   this.tocGroup.appendChild(tocBackground);
   this.svgRoot.appendChild(this.tocGroup);

   tocBackground.setAttribute("id", "sozi-toc-background");
   tocBackground.setAttribute("x", tocMargin);
   tocBackground.setAttribute("y", tocMargin);
   tocBackground.setAttribute("rx", tocMargin);
   tocBackground.setAttribute("ry", tocMargin);

   tocBackground.addEventListener("mouseout", function(evt) {
         var rel = evt.relatedTarget;
         while (rel != this.tocGroup && rel != this.svgRoot) {
            rel = rel.parentNode;
         }
         if (rel == this.svgRoot) {
            this.hideTableOfContents();
            this.controller.restart();
            evt.stopPropagation();
         }
      }.bind(this), false
   );

   for (i = 0; i < this.controller.frames.length; i ++) {
      text = document.createElementNS(this.svgNs, "text");
      text.appendChild(document.createTextNode(this.controller.frames[i].title));

      this.tocGroup.appendChild(text);
      textWidth = text.getBBox().width;
      textY += text.getBBox().height;
      if (textWidth > tocWidth) {
         tocWidth = textWidth;
      }

      text.setAttribute("x", 2 * tocMargin);
      text.setAttribute("y", textY + tocMargin);

      text.addEventListener("click", function (index, evt) {
            this.controller.previewFrame(index);
            evt.stopPropagation();
         }.bind(this, i), false
      );
   }

   tocBackground.setAttribute("width", tocWidth + 2 * tocMargin);
   tocBackground.setAttribute("height", textY + 2 * tocMargin);
};

/*
 * Makes the table of contents visible.
 */
sozi.Display.prototype.showTableOfContents = function () {
   // Expand the clip path to the whole window
   this.clipRect.setAttribute("x", 0);
   this.clipRect.setAttribute("y", 0);
   this.clipRect.setAttribute("width", window.innerWidth);
   this.clipRect.setAttribute("height", window.innerHeight);

   // Show table of contents
   this.tocGroup.setAttribute("visibility", "visible");
};

/*
 * Makes the table of contents invisible.
 */
sozi.Display.prototype.hideTableOfContents = function () {
   var g = this.getFrameGeometry();

   // Hide table of contents
   this.tocGroup.setAttribute("visibility", "hidden");

   // Adjust the location and size of the clipping rectangle and the frame rectangle
   this.clipRect.setAttribute("x", g.x);
   this.clipRect.setAttribute("y", g.y);
   this.clipRect.setAttribute("width", g.width);
   this.clipRect.setAttribute("height", g.height);
};

/*
 * Returns true if the table of contents is visible, false otherwise.
 */
sozi.Display.prototype.tableOfContentsIsVisible = function () {
   return this.tocGroup.getAttribute("visibility") === "visible";
};

// vim: sw=3

