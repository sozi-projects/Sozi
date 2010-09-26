
var sozi = sozi || {};

/*
 * Create a new Display with default settings.
 *
 * Parameters:
 *    - controller: the object that holds the frame list (attribute "frames")
 */
sozi.Display = function(controller) {
   this.controller = controller;

   // Initial display properties
   this.aspectWidth = 4;
   this.aspectHeight = 3;
   this.translateX = 0;
   this.translateY = 0;
   this.scale = 1;
   this.rotate = 0;
};

sozi.Display.prototype.scaleFactor = 1.05;

/*
 * Initialize the current Display.
 *
 * This method prepares the DOM representation of the current SVG document.
 * All the image is embedded into a global "g" element on which transformations will be applied.
 * A clipping rectangle is added.
 *
 * This method must be called when the document is ready to be manipulated.
 */
sozi.Display.prototype.onLoad = function() {
   this.svgRoot = document.documentElement; // TODO check SVG tag
   this.svgNs = this.svgRoot.getAttribute("xmlns:svg");

   // Create a new wrapper group element and move all the image to the group
   this.wrapper = document.createElementNS(this.svgNs, "g");
   this.wrapper.setAttribute("id", "sozi-wrapper");

   while(true) {
      var n = this.svgRoot.firstChild;
      if(!n) {
         break;
      }
      this.svgRoot.removeChild(n);
      this.wrapper.appendChild(n);
   }
   this.svgRoot.appendChild(this.wrapper);

   // Add a clipping path
   this.clipRect = document.createElementNS(this.svgNs, "rect");
   this.clipRect.setAttribute("id", "sozi-clip-rect");

   var clipPath = document.createElementNS(this.svgNs, "clipPath");
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
sozi.Display.prototype.resize = function() {
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
sozi.Display.prototype.getFrameGeometry = function() {
   var result = {};

   // Get the current frame location, size and scale
   result.width = window.innerWidth;
   result.height = window.innerHeight;

   if(result.width * this.aspectHeight > result.height * this.aspectWidth) {
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
 * Returns the geometrical properties of the given rectangle element.
 *
 * Parameters:
 *    - rect: a rectangle element from the SVG DOM
 *
 * Returns:
 *    - The default aspect ratio, translation, scale and rotation for this rectangle
 */
sozi.Display.prototype.getRectangleGeometry = function(rect) {
   var matrix = rect.getCTM().inverse();

   return {
      aspectWidth: rect.width.baseVal.value,
      aspectHeight: rect.height.baseVal.value,
		translateX: matrix.e - rect.x.baseVal.value,
		translateY: matrix.f - rect.y.baseVal.value,
      scale: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
      rotate: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
   };
};

/*
 * Returns the geometrical properties of the Display.
 *
 * Returns:
 *    - An object with the current aspect ratio, translation, rotation and scale
 */
sozi.Display.prototype.getCurrentGeometry = function() {
   return {
      aspectWidth: this.aspectWidth,
      aspectHeight: this.aspectHeight,
      translateX: this.translateX,
      translateY: this.translateY,
      scale: this.scale,
      rotate: this.rotate
   };
};

sozi.Display.prototype.zoom = function(delta) {
   if(delta > 0) {
      this.scale *= this.scaleFactor;
   }
   else {
      this.scale /= this.scaleFactor;
   }
   if(this.tableOfContentsIsVisible()) {
      this.hideTableOfContents();
   }
   this.update(true);
};

/*
 * Apply an additional translation to the SVG document based on onscreen coordinates.
 *
 * Parameters:
 *    - deltaX: the horizontal displacement, in pixels
 *    - deltaY: the vertical displacement, in pixels
 */
sozi.Display.prototype.drag = function(deltaX, deltaY) {
   var g = this.getFrameGeometry();
   this.translateX += deltaX / g.scale;
   this.translateY += deltaY / g.scale;
   if(this.tableOfContentsIsVisible()) {
      this.hideTableOfContents();
   }
   this.update(true);
};

/*
 * Apply geometrical transformations to the image according to the current
 * geometrical attributes of this Display.
 *
 * This method is called automatically when the window is resized.
 *
 * Parameters:
 *    - unclip: do not clip to the desired aspect ratio
 */
sozi.Display.prototype.update = function(unclip) {
   var g = this.getFrameGeometry();

   // Adjust the location and size of the clipping rectangle and the frame rectangle
   this.clipRect.setAttribute("x", unclip ? 0 : g.x);
   this.clipRect.setAttribute("y", unclip ? 0 : g.y);
   this.clipRect.setAttribute("width", unclip ? window.innerWidth : g.width);
   this.clipRect.setAttribute("height", unclip ? window.innerHeight : g.height);

   // Compute and apply the geometrical transformation to the wrapper group
   var translateX = this.translateX * g.scale + g.x;
   var translateY = this.translateY * g.scale + g.y;
   var scale = g.scale * this.scale;

   this.wrapper.setAttribute("transform",
      "translate(" + translateX + "," + translateY + ")" +
      "scale(" + scale + ")" +
      "rotate(" + this.rotate + ")"
   );
};

/*
 * Transform the SVG document to show the given frame.
 *
 * Parameters:
 *    - frame: the frame to show
 */
sozi.Display.prototype.showFrame = function(frame) {
   for(attr in frame.geometry) {
      this[attr] = frame.geometry[attr];
   }
   this.update();
};

// FIXME text size and coordinates
sozi.Display.prototype.installTableOfContents = function() {
   this.tocGroup = document.createElementNS(this.svgNs, "g");
   this.tocGroup.setAttribute("visibility", "hidden");
   this.svgRoot.appendChild(this.tocGroup);

   var textSize = Math.floor(window.innerHeight /
      Math.max((this.controller.frames.length + 1), 40)
   );

   var tocBackground = document.createElementNS(this.svgNs, "rect");
   this.tocGroup.appendChild(tocBackground);

   tocBackground.setAttribute("fill", "#eee");
   tocBackground.setAttribute("stroke", "#888");
   tocBackground.setAttribute("x", "0");
   tocBackground.setAttribute("y", "0");
   tocBackground.setAttribute("height", (this.controller.frames.length + 1) * textSize);

   var tocWidth = 0;

   for(var i=0; i<this.controller.frames.length; i++) {
      var frame = this.controller.frames[i];
      var text = document.createElementNS(this.svgNs, "text");
      text.appendChild(document.createTextNode(frame.title));
      text.setAttribute("x", textSize / 2);
      text.setAttribute("y", textSize * (i+1.3));
      text.setAttribute("fill", "black");
      text.setAttribute("style",
         "font-size: " + (textSize * 0.9) + "px;" +
         "font-family: Verdana, sans-serif"
      );

      text.addEventListener("click",
         function(index, evt) {
            this.hideTableOfContents();
            this.controller.moveToFrame(index);
            evt.stopPropagation();
         }.bind(this, i), false
      );

      // FIXME: use CSS
      text.addEventListener("mouseover",
         function() {
            this.setAttribute("fill", "#08c");
         }, false
      );

      text.addEventListener("mouseout",
         function() {
            this.setAttribute("fill", "black");
         }, false
      );

      this.tocGroup.appendChild(text);
      var textWidth = text.getBBox().width;
      if(textWidth > tocWidth) {
         tocWidth = textWidth;
      }
   }

   tocBackground.setAttribute("width", tocWidth + textSize);
};

sozi.Display.prototype.showTableOfContents = function() {
   // Expand the clip path to the whole window
   this.clipRect.setAttribute("x", 0);
   this.clipRect.setAttribute("y", 0);
   this.clipRect.setAttribute("width", window.innerWidth);
   this.clipRect.setAttribute("height", window.innerHeight);

   // Show table of contents
   this.tocGroup.setAttribute("visibility", "visible");
};

sozi.Display.prototype.hideTableOfContents = function() {
   // Hide table of contents
   this.tocGroup.setAttribute("visibility", "hidden");

   // Adjust the location and size of the clipping rectangle and the frame rectangle
   var g = this.getFrameGeometry();
   this.clipRect.setAttribute("x", g.x);
   this.clipRect.setAttribute("y", g.y);
   this.clipRect.setAttribute("width", g.width);
   this.clipRect.setAttribute("height", g.height);
};

sozi.Display.prototype.tableOfContentsIsVisible = function() {
   return this.tocGroup.getAttribute("visibility") == "visible";
};

