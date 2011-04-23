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

sozi.Player = function () {
   this.display = new sozi.Display(this, false);
   this.animator = new sozi.Animator(40, this.onAnimationStep.bind(this), this.onAnimationDone.bind(this));
   this.frames = [];
   this.playing = false;
   this.waiting = false;
   this.sourceFrameIndex = 0;
   this.currentFrameIndex = 0;
};

sozi.Player.prototype.profiles = {
   "linear": function (x) {
      return x;
   },

   "accelerate": function (x) {
      return Math.pow(x, 3);
   },

   "strong-accelerate": function (x) {
      return Math.pow(x, 5);
   },

   "decelerate": function (x) {
      return 1 - Math.pow(1 - x, 3);
   },

   "strong-decelerate": function (x) {
      return 1 - Math.pow(1 - x, 5);
   },

   "accelerate-decelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = Math.pow(2 * xs, 3) / 2;
      return x <= 0.5 ? y : 1 - y;
   },

   "strong-accelerate-decelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = Math.pow(2 * xs, 5) / 2;
      return x <= 0.5 ? y : 1 - y;
   },

   "decelerate-accelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = (1 - Math.pow(1 - 2 * xs, 2)) / 2;
      return x <= 0.5 ? y : 1 - y;
   },

   "strong-decelerate-accelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = (1 - Math.pow(1 - 2 * xs, 3)) / 2;
      return x <= 0.5 ? y : 1 - y;
   }
};

sozi.Player.prototype.soziNs = "http://sozi.baierouge.fr";

sozi.Player.prototype.dragButton = 1; // Middle button

sozi.Player.prototype.defaultDurationMs = 500;
sozi.Player.prototype.defaultZoomPercent = -10;
sozi.Player.prototype.defaultProfile = sozi.Player.prototype.profiles.linear;

sozi.Player.prototype.scaleFactor = 1.05;

sozi.Player.prototype.defaults = {
   "title": "Untitled",
   "sequence": "0",
   "hide": "true",
   "clip": "true",
   "timeout-enable": "false",
   "timeout-ms": "5000",
   "transition-duration-ms": "1000",
   "transition-zoom-percent": "0",
   "transition-profile": "linear"
};

/*
 * Event handler: document load.
 *
 * This method initializes the display object, reads the frames, and registers all other
 * event handlers for the current document.
 * The first frame, or the frame which number is given in the URL, is shown.
 */
sozi.Player.prototype.onLoad = function () {
   var wheelHandler = this.onWheel.bind(this);

   this.display.onLoad();

   this.readFrames();
   this.display.installTableOfContents();

   this.startFromIndex(this.getFrameIndexFromURL());

   // TODO also use shift-click as an alternative for middle-click
   this.display.svgRoot.addEventListener("click", this.onClick.bind(this), false);
   this.display.svgRoot.addEventListener("mousedown", this.onMouseDown.bind(this), false);
   this.display.svgRoot.addEventListener("mouseup", this.onMouseUp.bind(this), false);
   this.display.svgRoot.addEventListener("mousemove", this.onMouseMove.bind(this), false);
   this.display.svgRoot.addEventListener("keypress", this.onKeyPress.bind(this), false);
   this.display.svgRoot.addEventListener("keydown", this.onKeyDown.bind(this), false);
   window.addEventListener("hashchange", this.onHashChange.bind(this), false);
   window.addEventListener("resize", this.display.resize.bind(this.display), false);

   this.display.svgRoot.addEventListener("DOMMouseScroll", wheelHandler, false); // Mozilla
   window.onmousewheel = wheelHandler;

   this.dragButtonIsDown = false;
};

/*
 * Event handler: mouse down.
 *
 * When the left button is pressed, we register the current coordinates
 * in case the mouse will be dragged. Flag "dragButtonIsDown" is set until
 * the button is released (onMouseUp). This flag is used by onMouseMove.
 *
 * When the middle button is pressed, the table of contents is shown or hidden.
 */
sozi.Player.prototype.onMouseDown = function (evt) {
   if (evt.button === 0) {
      this.dragButtonIsDown = true;
      this.dragged = false;
      this.dragClientX = evt.clientX;
      this.dragClientY = evt.clientY;
   }
   else if (evt.button === 1) {
      this.toggleTableOfContents();
   }
   evt.stopPropagation();
};

/*
 * Event handler: mouse move.
 *
 * If the left mouse button is down, then the mouse move is a drag action.
 * This method computes the displacement since the button was pressed or
 * since the last move, and updates the reference coordinates for the next move.
 */
sozi.Player.prototype.onMouseMove = function (evt) {
   if (this.dragButtonIsDown) {
      this.stop();
      this.dragged = true;
      this.display.drag(evt.clientX - this.dragClientX, evt.clientY - this.dragClientY);
      this.dragClientX = evt.clientX;
      this.dragClientY = evt.clientY;
   }
   evt.stopPropagation();
};

/*
 * Event handler: mouse up.
 *
 * Releasing the left button resets the "dragButtonIsDown" flag.
 */
sozi.Player.prototype.onMouseUp = function (evt) {
   if (evt.button === 0) {
      this.dragButtonIsDown = false;
   }
   evt.stopPropagation();
};

/*
 * Event handler: mouse click.
 *
 * Left-click moves the presentation to the next frame.
 *
 * No "click" event is generated for the middle button.
 * See "onMouseDown" for middle click handling.
 *
 * Dragging the mouse produces a "click" event when the button is released.
 * If flag "dragged" was set by "onMouseMove", then the click event is the result
 * of a drag action.
 */
sozi.Player.prototype.onClick = function (evt) {
   if (!this.dragged) {
      this.moveToNext();
   }
   evt.stopPropagation();
};

/*
 * Event handler: mouse wheel.
 *
 * Rolling the mouse wheel stops the presentation and zooms the current display.
 */
sozi.Player.prototype.onWheel = function (evt) {
   var delta = 0;
   if (!evt) {
      evt = window.event;
   }
   if (evt.wheelDelta) { // IE and Opera
      delta = evt.wheelDelta; 
      if (window.opera) { // Opera
         delta = - delta;
      }
   }
   else if (evt.detail) { // Mozilla
      delta = - evt.detail;
   }

   if (delta !== 0) {
      this.zoom(delta, evt.clientX, evt.clientY);
   }
   evt.stopPropagation();
   evt.preventDefault();
};

/*
 * Event handler: key press.
 *
 * Keyboard handling is split into two methods: onKeyPress and onKeyDown
 * in order to get the same behavior in Mozilla and Webkit.
 *
 * This method handles character keys "+", "-", "=", "F" and "T".
 */
sozi.Player.prototype.onKeyPress = function (evt) {
   switch (evt.charCode) {
   case 43: // +
      this.zoom(1, window.innerWidth / 2, window.innerHeight / 2);
      break;
   case 45: // -
      this.zoom(-1, window.innerWidth / 2, window.innerHeight / 2);
      break;
   case 61: // =
      this.moveToCurrent();
      break;
   case 70: // F
   case 102: // f
      this.showAll();
      break;
   case 84: // T
   case 116: // t
      this.toggleTableOfContents();
   }
   evt.stopPropagation();
};

/*
 * Event handler: key down.
 *
 * Keyboard handling is split into two methods: onKeyPress and onKeyDown
 * in order to get the same behavior in Mozilla and Webkit.
 *
 * This method handles navigation keys (arrows, page up/down, home, end)
 * and the space and enter keys.
 */
sozi.Player.prototype.onKeyDown = function (evt) {
   switch (evt.keyCode) {
   case 36: // Home
      this.moveToFirst();
      break;
   case 35: // End
      this.moveToLast();
      break;
   case 38: // Arrow up
      this.jumpToPrevious();
      break;
   case 33: // Page up
   case 37: // Arrow left
      this.moveToPrevious();
      break;
   case 40: // Arrow down
      this.jumpToNext();
      break;
   case 34: // Page down
   case 39: // Arrow right
   case 13: // Enter
      this.moveToNext();
      break;
   case 32: // Space
      this.moveToNext();
      break;
   }
   evt.stopPropagation();
};

/*
 * Event handler: hash change.
 *
 * This method is called when the URL hash is changed.
 * If the hash was changed manually in the address bar, and if it corresponds to
 * a valid frame number, then the presentation moves to that frame.
 *
 * The hashchange event can be triggered externally, by the user modifying the URL,
 * or internally, by the script modifying window.location.hash.
 * We move to the given index only if the hash is different from the current frame index. 
 */
sozi.Player.prototype.onHashChange = function () {
   var index = this.getFrameIndexFromURL();
   if (index !== this.currentFrameIndex) {
      this.moveToFrame(index);
   }
};

/*
 * Event handler: animation step.
 *
 * This method is called periodically by this.animator after the animation
 * has been started, and until the animation time is elapsed.
         zoomWidth: null,
         zoo
 *
 * Parameter data provides the following information:
 *    - initialState and finalState contain the geometrical properties of the display
 *      at the start and end of the animation.
 *    - profile is a reference to the speed profile function to use.
 *    - zoomWidth and zoomHeight are the parameters of the zooming polynomial if the current
 *      animation has a non-zero zooming effect.
 *
 * Parameter progress is a float number between 0 (start of the animation)
 * and 1 (end of the animation).
 */
sozi.Player.prototype.onAnimationStep = function (progress, data) {
   var remaining = 1 - progress,
       profileProgress = data.profile(progress),
       profileRemaining = 1 - profileProgress,
       attr, ps;

   for (attr in data.initialState) {
      if (data.initialState.hasOwnProperty(attr)) {
         if (typeof data.initialState[attr] === "number" &&
             typeof data.finalState[attr] === "number") {
            this.display[attr] = data.finalState[attr] * profileProgress + data.initialState[attr] * profileRemaining;
         }
      }
   }

   if (data.zoomWidth && data.zoomWidth.k !== 0) {
      ps = progress - data.zoomWidth.ts;
      this.display.width = data.zoomWidth.k * ps * ps + data.zoomWidth.ss;
   }

   if (data.zoomHeight && data.zoomHeight.k !== 0) {
      ps = progress - data.zoomHeight.ts;
      this.display.height = data.zoomHeight.k * ps * ps + data.zoomHeight.ss;
   }

   this.display.clip = data.finalState.clip;

   this.display.update();
};

/*
 * Event handler: animation done.
 *
 * This method is called by this.animator when the current animation is finished.
 *
 * If the animation was a transition in the normal course of the presentation,
 * then we call the waitTimeout method to process the timeout property of the current frame.
 */
sozi.Player.prototype.onAnimationDone = function () {
   this.sourceFrameIndex = this.currentFrameIndex;
   if (this.playing) {
      this.waitTimeout();
   }
};

/*
 * Returns the frame index given in the URL hash.
 *
 * In the URL, the frame index starts a 1.
 * This method converts it into a 0-based index.
 *
 * If the URL hash is not a positive integer, then 0 is returned.
 * It the URL hash is an integer greater than the last frame index, then
 * the last frame index is returned.
 */
sozi.Player.prototype.getFrameIndexFromURL = function () {
   var index = window.location.hash ? parseInt(window.location.hash.slice(1), 10) - 1 : 0;
   if (isNaN(index) || index < 0) {
      return 0;
   }
   else if (index >= this.frames.length) {
      return this.frames.length - 1;
   }
   else {
      return index;
   }
};

/*
 * Returns the value of an attribute of a given SVG element.
 *
 * If the attribute is not set, then a default value is returned.
 * See this.defaults.
 */
sozi.Player.prototype.readAttribute = function (elt, attr) {
   var value = elt.getAttributeNS(this.soziNs, attr);
   return value === "" ? this.defaults[attr] : value;
};

/*
 * Builds the list of frames from the current document.
 *
 * This method collects all elements with tag "sozi:frame" and
 * retrieves their geometrical and animation attributes.
 * SVG elements that should be hidden during the presentation are hidden.
 *
 * The resulting list is available in this.frames, sorted by frame indices.
 */
sozi.Player.prototype.readFrames = function () {
   var frameElements = document.getElementsByTagNameNS(this.soziNs, "frame"),
       svgElement, i, newFrame;

   for (i = 0; i < frameElements.length; i ++) {
      svgElement = document.getElementById(frameElements[i].getAttributeNS(this.soziNs, "refid"));
      if (svgElement) {
         newFrame = {
            geometry: this.display.getElementGeometry(svgElement),
            title: this.readAttribute(frameElements[i], "title"),
            sequence: parseInt(this.readAttribute(frameElements[i], "sequence"), 10),
            hide: this.readAttribute(frameElements[i], "hide") === "true",
            timeoutEnable: this.readAttribute(frameElements[i], "timeout-enable") === "true",
            timeoutMs: parseInt(this.readAttribute(frameElements[i], "timeout-ms"), 10),
            transitionDurationMs: parseInt(this.readAttribute(frameElements[i], "transition-duration-ms"), 10),
            transitionZoomPercent: parseInt(this.readAttribute(frameElements[i], "transition-zoom-percent"), 10),
            transitionProfile: this.profiles[this.readAttribute(frameElements[i], "transition-profile") || "linear"]
         };
         if (newFrame.hide) {
            svgElement.setAttribute("visibility", "hidden");
         }
         newFrame.geometry.clip = this.readAttribute(frameElements[i], "clip") === "true";
         this.frames.push(newFrame);
      }
   }
   this.frames.sort(
      function (a, b) {
         return a.sequence - b.sequence;
      }
   );
};

/*
 * Starts the presentation from the given frame index (0-based).
 *
 * This method sets the "playing" flag, shows the desired frame
 * and calls waitTimeout.
 */
sozi.Player.prototype.startFromIndex = function (index) {
   this.playing = true;
   this.waiting = false;
   this.sourceFrameIndex = index;
   this.currentFrameIndex = index;
   this.display.showFrame(this.frames[index]);
   this.waitTimeout();
};

sozi.Player.prototype.restart = function() {
   this.startFromIndex(this.currentFrameIndex);
}

/*
 * Stops the presentation.
 *
 * This method clears the "playing".
 * If the presentation was in "waiting" mode due to a timeout
 * in the current frame, then it stops waiting.
 * The current animation is stopped in its current state.
 */
sozi.Player.prototype.stop = function () {
   this.animator.stop();
   if (this.waiting) {
      window.clearTimeout(this.nextFrameTimeout);
      this.waiting = false;
   }
   this.playing = false;
   this.sourceFrameIndex = this.currentFrameIndex;
};

/*
 * Starts waiting before moving to the next frame.
 *
 * It the current frame has a timeout set, this method
 * will register a timer to move to the next frame automatically
 * after the specified time.
 *
 * If the current frame is the last, the presentation will
 * move to the first frame.
 */
sozi.Player.prototype.waitTimeout = function () {
   var index;
   if (this.frames[this.currentFrameIndex].timeoutEnable) {
      this.waiting = true;
      index = (this.currentFrameIndex + 1) % this.frames.length;
      this.nextFrameTimeout = window.setTimeout(
         this.moveToFrame.bind(this, index),
         this.frames[this.currentFrameIndex].timeoutMs
      );
   }
};

sozi.Player.prototype.getZoomData = function (zoomPercent, s0, s1) {
   var result = {
      ss: ((zoomPercent < 0) ? Math.max(s0, s1) : Math.min(s0, s1)) * (100 - zoomPercent) / 100,
      ts: 0.5,
      k: 0
   },
   a, b, c, d, u, v;

   if (zoomPercent !== 0) {
      a = s0 - s1;
      b = s0 - result.ss;
      c = s1 - result.ss;

      if (a !== 0) {
         d = Math.sqrt(b * c);

         u = (b - d) / a;
         v = (b + d) / a;

         result.ts = (u > 0 && u <= 1) ? u : v;
      }

      result.k = b / result.ts / result.ts;
   }

   return result;
};

/*
 * Jump to a frame with the given index (0-based).
 *
 * This method does not animate the transition from the current
 * state of the display to the desired frame.
 *
 * The presentation is stopped: if a timeout has been set for the
 * target frame, it will be ignored.
 *
 * The URL hash is set to the given frame index (1-based).
 */
sozi.Player.prototype.jumpToFrame = function (index) {
   this.stop();

   if (this.display.tableOfContentsIsVisible()) {
      this.display.hideTableOfContents();
   }

   this.sourceFrameIndex = index;
   this.currentFrameIndex = index;
   this.display.showFrame(this.frames[index]);

   // Update URL hash with the current frame index
   window.location.hash = "#" + (index + 1);
};

sozi.Player.prototype.previewFrame = function (index) {
   var finalState = this.frames[index].geometry,
       zw, zh;
   finalState.clip = false;

   if (this.defaultZoomPercent !== 0) {
      zw = this.getZoomData(this.defaultZoomPercent, this.display.width, finalState.width);
      zh = this.getZoomData(this.defaultZoomPercent, this.display.height, finalState.height);
   }

   this.currentFrameIndex = index;
   this.animator.start(this.defaultDurationMs,
      {
         initialState: this.display.getCurrentGeometry(),
         finalState: finalState,
         profile: this.defaultProfile,
         zoomWidth: zw,
         zoomHeight: zh
      }
   );

   // Update URL hash with the current frame index
   window.location.hash = "#" + (index + 1);
};

/*
 * Moves to a frame with the given index (0-based).
 *
 * This method animates the transition from the current
 * state of the display to the desired frame.
 *
 * If the given frame index corresponds to the next frame in the list,
 * the transition properties of the next frame are used.
 * Otherwise, default transition properties are used.
 *
 * The URL hash is set to the given frame index (1-based).
 */
sozi.Player.prototype.moveToFrame = function (index) {
   var durationMs = this.defaultDurationMs,
       zoomPercent = this.defaultZoomPercent,
       profile = this.defaultProfile,
       zw, zh;

   if (this.waiting) {
      window.clearTimeout(this.nextFrameTimeout);
      this.waiting = false;
   }

   if (index === (this.currentFrameIndex + 1) % this.frames.length) {
      durationMs = this.frames[index].transitionDurationMs;
      zoomPercent = this.frames[index].transitionZoomPercent;
      profile = this.frames[index].transitionProfile;
   }

   if (this.display.tableOfContentsIsVisible()) {
      this.display.hideTableOfContents();
   }

   if (zoomPercent !== 0) {
      zw = this.getZoomData(zoomPercent, this.display.width, this.frames[index].geometry.width);
      zh = this.getZoomData(zoomPercent, this.display.height, this.frames[index].geometry.height);
   }

   this.playing = true;
   this.currentFrameIndex = index;
   this.animator.start(durationMs,
      {
         initialState: this.display.getCurrentGeometry(),
         finalState: this.frames[this.currentFrameIndex].geometry,
         profile: profile,
         zoomWidth: zw,
         zoomHeight: zh
      }
   );

   // Update URL hash with the current frame index
   window.location.hash = "#" + (index + 1);
};

/*
 * Moves to the first frame of the presentation.
 */
sozi.Player.prototype.moveToFirst = function () {
   this.moveToFrame(0);
};

/*
 * Jumps to the previous frame
 */
sozi.Player.prototype.jumpToPrevious = function () {
   var index = this.currentFrameIndex;
   if (!this.animator.started || this.sourceFrameIndex <= this.currentFrameIndex) {
      index -= 1;
   }
   if (index >= 0) {
      this.jumpToFrame(index);
   }
};

/*
 * Moves to the previous frame.
 */
sozi.Player.prototype.moveToPrevious = function () {
   var index = this.currentFrameIndex,
       frame;

   for (index --; index >= 0; index --) {
      frame = this.frames[index];
      if (!frame.timeoutEnable || frame.timeoutMs !== 0) {
         this.moveToFrame(index);
         break;
      }
   }
};

/*
 * Jumps to the next frame
 */
sozi.Player.prototype.jumpToNext = function () {
   var index = this.currentFrameIndex;
   if (!this.animator.started || this.sourceFrameIndex >= this.currentFrameIndex) {
      index += 1;
   }
   if (index < this.frames.length) {
      this.jumpToFrame(index);
   }
};

/*
 * Moves to the next frame.
 */
sozi.Player.prototype.moveToNext = function () {
   if (this.currentFrameIndex < this.frames.length - 1 || this.frames[this.currentFrameIndex].timeoutEnable) {
      this.moveToFrame((this.currentFrameIndex + 1) % this.frames.length);
   }
};

/*
 * Moves to the last frame of the presentation.
 */
sozi.Player.prototype.moveToLast = function () {
   this.moveToFrame(this.frames.length - 1);
};

/*
 * Restores the current frame.
 *
 * This method restores the display to fit the current frame,
 * e.g. after the display has been zoomed or dragged.
 */
sozi.Player.prototype.moveToCurrent = function () {
   this.moveToFrame(this.currentFrameIndex);
};

/*
 * Shows all the document in the browser window.
 */
sozi.Player.prototype.showAll = function () {
   this.stop();
   if (this.display.tableOfContentsIsVisible()) {
      this.display.hideTableOfContents();
   }
   this.animator.start(this.defaultDurationMs,
      {
         initialState: this.display.getCurrentGeometry(),
         finalState: this.display.getDocumentGeometry(),
         profile: this.defaultProfile
      }
   );
};

/*
 * Zooms the display in the given direction.
 *
 * Only the sign of direction is used:
 *    - zoom in when direction > 0
 *    - zoom out when direction < 0
 *
 * The scaling is centered around point (x, y).
 */
sozi.Player.prototype.zoom = function (direction, x, y) {
   this.stop();
   this.display.applyZoomFactor(direction > 0 ? this.scaleFactor : 1 / this.scaleFactor, x, y);
};

sozi.Player.prototype.toggleTableOfContents = function() {
   if (this.display.tableOfContentsIsVisible()) {
      this.display.hideTableOfContents();
      this.restart();
   }
   else {
      this.stop();
      this.display.showTableOfContents();
   }
};

window.addEventListener("load", sozi.Player.prototype.onLoad.bind(new sozi.Player()), false);

// vim: sw=3

