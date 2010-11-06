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
 * Create a new Display with default settings.
 *
 * Parameters:
 *    - controller: the object that holds the frame list (attribute "frames")
 */
sozi.Display = function (controller) {
   this.controller = controller;

   // Initial display properties
   this.aspectWidth = 4;
   this.aspectHeight = 3;
   this.translateX = 0;
   this.translateY = 0;
   this.scale = 1;
   this.rotate = 0;
   this.clip = true;
};

/*
 * Initialize the current Display.
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
   this.svgNs = "http://www.w3.org/2000/svg";

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

   window.addEventListener("resize", this.resize.bind(this), false);
};

/*
 * Resize the SVG document to fit the browser window.
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

   // Get the current frame location, size and scale
   result.width = window.innerWidth;
   result.height = window.innerHeight;

   if (result.width * this.aspectHeight > result.height * this.aspectWidth) {
      result.width = result.height * this.aspectWidth / this.aspectHeight;
   }
   else {
      result.height = result.width * this.aspectHeight / this.aspectWidth;
   }

   result.x = (window.innerWidth - result.width) / 2;
   result.y = (window.innerHeight - result.height) / 2;
   result.scale = result.width / this.aspectWidth;

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
 *    - The default aspect ratio, translation, scale and rotation for the given element 
 */
sozi.Display.prototype.getElementGeometry = function (elem) {
   var x, y, width, height, b,
       matrix = elem.getCTM().inverse();

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

   return {
      aspectWidth: width,
      aspectHeight: height,
      translateX: matrix.e - x,
      translateY: matrix.f - y,
      scale: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
      rotate: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
   };
};

/*
 * Returns the geometrical properties of the SVG document
 *
 * Returns:
 *    - The default aspect ratio, translation, scale and rotation for the document's bounding box
 */
sozi.Display.prototype.getDocumentGeometry = function () {
   return {
      aspectWidth: this.initialBBox.width,
      aspectHeight: this.initialBBox.height,
      translateX: - this.initialBBox.x,
      translateY: - this.initialBBox.y,
      scale: 1,
      rotate: 0,
      clip: false
   };
};

/*
 * Returns the geometrical properties of the Display.
 *
 * Returns:
 *    - An object with the current aspect ratio, translation, rotation and scale
 */
sozi.Display.prototype.getCurrentGeometry = function () {
   return {
      aspectWidth: this.aspectWidth,
      aspectHeight: this.aspectHeight,
      translateX: this.translateX,
      translateY: this.translateY,
      scale: this.scale,
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
   var g = this.getFrameGeometry();
   this.translateX += deltaX / g.scale;
   this.translateY += deltaY / g.scale;
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
       translateX = this.translateX * g.scale + g.x,
       translateY = this.translateY * g.scale + g.y,
       scale = g.scale * this.scale;

   // Compute and apply the geometrical transformation to the wrapper group
   this.wrapper.setAttribute("transform",
      "translate(" + translateX + "," + translateY + ")" +
      "scale(" + scale + ")" +
      "rotate(" + this.rotate + ")"
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

// FIXME text size and coordinates
sozi.Display.prototype.installTableOfContents = function () {
   var textSize = Math.floor(window.innerHeight / Math.max((this.controller.frames.length + 1), 40)),
       tocBackground = document.createElementNS(this.svgNs, "rect"),
       tocWidth = 0,
       i, frame, text, textWidth;

   this.tocGroup = document.createElementNS(this.svgNs, "g");
   this.tocGroup.setAttribute("visibility", "hidden");
   this.tocGroup.appendChild(tocBackground);
   this.svgRoot.appendChild(this.tocGroup);

   tocBackground.setAttribute("fill", "#eee");
   tocBackground.setAttribute("stroke", "#888");
   tocBackground.setAttribute("x", "0");
   tocBackground.setAttribute("y", "0");
   tocBackground.setAttribute("height", (this.controller.frames.length + 1) * textSize);


   for (i = 0; i < this.controller.frames.length; i ++) {
      frame = this.controller.frames[i];
      text = document.createElementNS(this.svgNs, "text");
      text.appendChild(document.createTextNode(frame.title));
      text.setAttribute("x", textSize / 2);
      text.setAttribute("y", textSize * (i + 1.3));
      text.setAttribute("fill", "black");
      text.setAttribute("style",
         "font-size: " + (textSize * 0.9) + "px;" +
         "font-family: Verdana, sans-serif"
      );

      // FIXME: does not pass JSLint
      text.addEventListener("click",
         function (index, evt) {
            this.hideTableOfContents();
            this.controller.moveToFrame(index);
            evt.stopPropagation();
         }.bind(this, i), false
      );

      // FIXME: use CSS
      text.addEventListener("mouseover",
         function () {
            this.setAttribute("fill", "#08c");
         }, false
      );

      // FIXME: use CSS
      text.addEventListener("mouseout",
         function () {
            this.setAttribute("fill", "black");
         }, false
      );

      this.tocGroup.appendChild(text);
      textWidth = text.getBBox().width;
      if (textWidth > tocWidth) {
         tocWidth = textWidth;
      }
   }

   tocBackground.setAttribute("width", tocWidth + textSize);
};

sozi.Display.prototype.showTableOfContents = function () {
   // Expand the clip path to the whole window
   this.clipRect.setAttribute("x", 0);
   this.clipRect.setAttribute("y", 0);
   this.clipRect.setAttribute("width", window.innerWidth);
   this.clipRect.setAttribute("height", window.innerHeight);

   // Show table of contents
   this.tocGroup.setAttribute("visibility", "visible");
};

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

sozi.Display.prototype.tableOfContentsIsVisible = function () {
   return this.tocGroup.getAttribute("visibility") === "visible";
};

// vim: sw=3

