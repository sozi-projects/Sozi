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
};

sozi.Player.prototype.soziNs = "http://sozi.baierouge.fr";

sozi.Player.prototype.dragButton = 1; // Middle button

sozi.Player.prototype.defaultDurationMs = 500;
sozi.Player.prototype.defaultZoomPercent = -10;
sozi.Player.prototype.scaleFactor = 1.05;

sozi.Player.prototype.defaults = {
   "title": "Untitled",
   "sequence": "0",
   "hide": "true",
   "clip": "true",
   "timeout-enable": "false",
   "timeout-ms": "5000",
   "transition-duration-ms": "1000",
   "transition-zoom-percent": "100",
   "transition-profile": "linear"
};

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

   this.display.svgRoot.addEventListener("DOMMouseScroll", wheelHandler, false); // Mozilla
   window.onmousewheel = wheelHandler;

   this.dragging = false;
};

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

sozi.Player.prototype.readAttribute = function (rect, attr) {
   var value = rect.getAttributeNS(this.soziNs, attr);
   return value === "" ? this.defaults[attr] : value;
};

sozi.Player.prototype.readFrames = function () {
   var frameElements = document.getElementsByClassName("sozi-frame"),
       i, newFrame;

   for (i = 0; i < frameElements.length; i ++) {
      newFrame = {
         rect: frameElements[i],
         geometry: this.display.getElementGeometry(frameElements[i]),
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
         frameElements[i].setAttribute("visibility", "hidden");
      }
      newFrame.geometry.clip = this.readAttribute(frameElements[i], "clip") === "true";
      this.frames.push(newFrame);
   }
   this.frames.sort(
      function (a, b) {
         return a.sequence - b.sequence;
      }
   );
};

/*
 * Dragging the mouse produces a "click" event in Firefox.
 * Attribute "dragged" is set by "onMouseMove" when the left button is down.
 *
 * No "click" event is generated for the middle button.
 * See "onMouseDown" for middle click handling.
 */
sozi.Player.prototype.onClick = function (evt) {
   if (!this.dragged) {
      this.moveToNext();
   }
   evt.stopPropagation();
};

sozi.Player.prototype.onMouseDown = function (evt) {
   if (evt.button === 0) {
      this.dragging = true;
      this.dragged = false;
      this.dragClientX = evt.clientX;
      this.dragClientY = evt.clientY;
      this.dragTranslateX = this.display.translateX;
      this.dragTranslateY = this.display.translateY;
   }
   else if (evt.button === 1) {
      if (this.display.tableOfContentsIsVisible()) {
         this.display.hideTableOfContents();
      }
      else {
         this.stop();
         this.display.showTableOfContents();
      }
   }
   evt.stopPropagation();
};

sozi.Player.prototype.onMouseUp = function (evt) {
   if (evt.button === 0) {
      this.dragging = false;
   }
   evt.stopPropagation();
};

sozi.Player.prototype.onMouseMove = function (evt) {
   if (this.dragging) {
      this.stop();
      this.dragged = true;
      this.display.drag(evt.clientX - this.dragClientX, evt.clientY - this.dragClientY);
      this.dragClientX = evt.clientX;
      this.dragClientY = evt.clientY;
      this.dragTranslateX = this.display.translateX;
      this.dragTranslateY = this.display.translateY;
   }
   evt.stopPropagation();
};

// TODO test this with Webkit, Opera, IE
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
      this.zoom(delta);
   }
   evt.stopPropagation();
   evt.preventDefault();
};

sozi.Player.prototype.onKeyPress = function (evt) {
   switch (evt.charCode) {
   case 43: // +
      this.zoom(1);
      break;
   case 45: // -
      this.zoom(-1);
      break;
   case 61: // =
      this.moveToCurrent();
      break;
   case 70: // F
   case 102: // f
      this.showAll();
      break;
   }
   evt.stopPropagation();
};

sozi.Player.prototype.onKeyDown = function (evt) {
   switch (evt.keyCode) {
   case 36: // Home
      this.moveToFirst();
      break;
   case 35: // End
      this.moveToLast();
      break;
   case 33: // Page up
   case 37: // Arrow left
   case 38: // Arrow up
      this.moveToPrevious();
      break;
   case 34: // Page down
   case 39: // Arrow right
   case 40: // Arrow down
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
 * The hashchange event can be triggered externally, by the user modifying the URL,
 * or internally, by the script modifying window.location.hash.
 * If the hash is different from the current frame index, we move to the given index.
 */
sozi.Player.prototype.onHashChange = function () {
   var index = this.getFrameIndexFromURL();
   if (index !== this.currentFrameIndex) {
      this.moveToFrame(index);
   }
};

/*
* pre: 0 <= index < this.frames.length
*/
sozi.Player.prototype.startFromIndex = function (index) {
   this.playing = true;
   this.waiting = false;
   this.currentFrameIndex = index;
   this.display.showFrame(this.frames[this.currentFrameIndex]);
   this.waitTimeout();
};

sozi.Player.prototype.stop = function () {
   this.animator.stop();
   if (this.waiting) {
      window.clearTimeout(this.nextFrameTimeout);
      this.waiting = false;
   }
   this.playing = false;
};

// FIXME: zooming effect should be a quadratic function of raw progress
sozi.Player.prototype.onAnimationStep = function (progress, data) {
   var remaining = 1 - progress,
       profileProgress = data.profile(progress),
       profileRemaining = 1 - profileProgress,
       attr, scale;

   for (attr in data.initialState) {
      if (data.initialState.hasOwnProperty(attr)) {
         if (typeof data.initialState[attr] === "number" &&
             typeof data.finalState[attr] === "number") {
            this.display[attr] = data.finalState[attr] * profileProgress + data.initialState[attr] * profileRemaining;
         }
      }
   }

   if (data.k !== 0) {
      scale = data.k * (progress - data.ts) * (progress - data.ts) + data.ss;
      this.display.applyZoomFactor(scale / this.display.scale);
   }

   this.display.clip = data.finalState.clip;

   this.display.update();
};

sozi.Player.prototype.onAnimationDone = function () {
   if (this.playing) {
      this.waitTimeout();
   }
};

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

sozi.Player.prototype.moveToFrame = function (index) {
   var durationMs = this.defaultDurationMs,
       zoomPercent = this.defaultZoomPercent,
       profile = this.defaultProfile,
       s0, s1, ss, a, b, c, d, u, v, ts, k = 0;

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
      s0 = this.frames[this.currentFrameIndex].geometry.scale;
      s1 = this.frames[index].geometry.scale;
      ss = ((zoomPercent > 0) ? Math.max(s0, s1) : Math.min(s0, s1)) * (100 + zoomPercent) / 100;

      a = s0 - s1;
      b = s0 - ss;
      c = s1 - ss;

      if (a === 0) {
         ts = 0.5;
      }
      else {
         d = Math.sqrt(b * c);

         u = (b - d) / a;
         v = (b + d) / a;

         ts = (u > 0 && u <= 1) ? u : v;
      }
      k = b / ts / ts;
   }

   this.playing = true;
   this.currentFrameIndex = index;
   this.animator.start(durationMs,
      {
         initialState: this.display.getCurrentGeometry(),
         finalState: this.frames[this.currentFrameIndex].geometry,
         profile: profile,
         ts: ts,
         ss: ss,
         k: k
      }
   );

   // Update URL hash with the current frame index
   window.location.hash = "#" + (index + 1);
};

sozi.Player.prototype.moveToFirst = function () {
   this.moveToFrame(0);
};

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

sozi.Player.prototype.moveToNext = function () {
   if (this.currentFrameIndex < this.frames.length - 1 || this.frames[this.currentFrameIndex].timeoutEnable) {
      this.moveToFrame((this.currentFrameIndex + 1) % this.frames.length);
   }
};

sozi.Player.prototype.moveToLast = function () {
   this.moveToFrame(this.frames.length - 1);
};

sozi.Player.prototype.moveToCurrent = function () {
   this.moveToFrame(this.currentFrameIndex);
};

/*
 * Show all the document in the browser window.
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
         profile: this.defaultProfile,
         k: 0
      }
   );
};

sozi.Player.prototype.zoom = function (delta) {
   this.stop();
   if (this.display.tableOfContentsIsVisible()) {
      this.display.hideTableOfContents();
   }

   this.display.applyZoomFactor(delta > 0 ? this.scaleFactor : 1 / this.scaleFactor);
   this.display.clip = false;
   this.display.update();
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

sozi.Player.prototype.defaultProfile = sozi.Player.prototype.profiles.linear;

window.addEventListener("load", sozi.Player.prototype.onLoad.bind(new sozi.Player()), false);

// vim: sw=3

