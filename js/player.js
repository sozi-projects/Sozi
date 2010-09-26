
var sozi = sozi || {};

sozi.Player = function() {
   this.display = new sozi.Display(this, false);
   this.animator = new sozi.Animator(40, this.display, this.display.update.bind(this.display), this.waitTimeout.bind(this));
   this.frames = [];
   this.playing = false;
   this.waiting = false;
};

sozi.Player.prototype.soziNs = "http://sozi.org";

sozi.Player.prototype.dragButton = 1; // Middle button

sozi.Player.prototype.defaults = {
   "title": "Untitled",
   "sequence": "0",
   "hide": "true",
   "timeout-enable": "false",
   "timeout-ms": "5000",
   "transition-duration-ms": "1000",
   "transition-profile": "linear"
};

sozi.Player.prototype.onLoad = function() {
   this.display.onLoad();

   this.readFrames();
   this.display.installTableOfContents();

   this.startFromIndex(0);

   // TODO also use shift-click as an alternative for middle-click
   this.display.svgRoot.addEventListener("click", this.onClick.bind(this), false);
   this.display.svgRoot.addEventListener("mousedown", this.onMouseDown.bind(this), false);
   this.display.svgRoot.addEventListener("mouseup", this.onMouseUp.bind(this), false);
   this.display.svgRoot.addEventListener("mousemove", this.onMouseMove.bind(this), false);
   this.display.svgRoot.addEventListener("keypress", this.onKeyPress.bind(this), false);

   var wheelHandler = this.onWheel.bind(this);
   this.display.svgRoot.addEventListener("DOMMouseScroll", wheelHandler, false); // Mozilla
   window.onmousewheel = wheelHandler;

   this.dragging = false;
};

sozi.Player.prototype.readAttribute = function(rect, attr) {
   var value = rect.getAttributeNS(this.soziNs, attr)
   return value === "" ? this.defaults[attr] : value;
};

sozi.Player.prototype.readFrames = function() {
   var frameRects = document.getElementsByClassName("sozi-frame");
   for(var i=0; i<frameRects.length; i++) {
      var newFrame = {
         rect: frameRects[i],
         geometry: this.display.getRectangleGeometry(frameRects[i]),
         title: this.readAttribute(frameRects[i], "title"),
         sequence: this.readAttribute(frameRects[i], "sequence"),
         hide: this.readAttribute(frameRects[i], "hide") == "true",
         timeoutEnable: this.readAttribute(frameRects[i], "timeout-enable") == "true",
         timeoutMs: this.readAttribute(frameRects[i], "timeout-ms"),
         transitionDurationMs: this.readAttribute(frameRects[i], "transition-duration-ms"),
         transitionProfile: this.readAttribute(frameRects[i], "transition-profile")
      };
      if(newFrame.hide) {
         frameRects[i].setAttribute("visibility", "hidden");
      }
      this.frames.push(newFrame);
   }
   this.frames.sort(
      function(a, b) {
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
sozi.Player.prototype.onClick = function(evt) {
   if(!this.dragged) {
      if(this.display.tableOfContentsIsVisible()) {
         this.display.hideTableOfContents();
      }
      this.moveToNext();
   }
};

sozi.Player.prototype.onMouseDown = function(evt) {
   if(evt.button === 0) {
      this.dragging = true;
      this.dragged = false;
      this.dragClientX = evt.clientX;
      this.dragClientY = evt.clientY;
      this.dragTranslateX = this.display.translateX;
      this.dragTranslateY = this.display.translateY;
   }
   else if(evt.button === 1) {
      if(this.display.tableOfContentsIsVisible()) {
         this.display.hideTableOfContents();
      }
      else {
         this.stop();
         this.display.showTableOfContents();
      }
   }
};

sozi.Player.prototype.onMouseUp = function(evt) {
   if(evt.button === 0) {
      this.dragging = false;
   }
};

sozi.Player.prototype.onMouseMove = function(evt) {
   if(this.dragging) {
      this.stop();
      this.dragged = true;
      this.display.drag(evt.clientX - this.dragClientX, evt.clientY - this.dragClientY);
      this.dragClientX = evt.clientX;
      this.dragClientY = evt.clientY;
      this.dragTranslateX = this.display.translateX;
      this.dragTranslateY = this.display.translateY;
   }
};

// TODO test this with Webkit, Opera, IE
// FIXME scale should be centered on mouse pointer location
sozi.Player.prototype.onWheel = function(evt) {
   var delta = 0;
   if(!evt) {
      evt = window.event;
   }
   if(evt.wheelDelta) { // IE and Opera
      delta = evt.wheelDelta; 
      if (window.opera) { // Opera
         delta = - delta;
      }
   }
   else if(evt.detail) { // Mozilla
      delta = - evt.detail;
   }

   if(delta !== 0) {
      this.stop();
      this.display.zoom(delta);
   }
};

sozi.Player.prototype.onKeyPress = function(evt) {
   if(this.display.tableOfContentsIsVisible()) {
      this.display.hideTableOfContents();
   }
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
      case 0:
         switch(evt.charCode) {
            case 32 : // Space
               this.moveToNext();
               break;
         }
         break;
   }
};

/*
* pre: 0 <= index < this.frames.length
*/
sozi.Player.prototype.startFromIndex = function(index) {
   this.playing = true;
   this.waiting = false;
   this.currentFrameIndex = index;
   this.display.showFrame(this.frames[this.currentFrameIndex]);
   this.waitTimeout();
};

sozi.Player.prototype.stop = function() {
   this.animator.stop();
   if(this.waiting) {
      window.clearTimeout(this.nextFrameTimeout);
      this.waiting = false;
   }
   this.playing = false;
};

sozi.Player.prototype.waitTimeout = function() {
   if(this.frames[this.currentFrameIndex].timeoutEnable) {
      this.waiting = true;
      var index = this.currentFrameIndex + 1;
      if(index == this.frames.length) {
         index = 0;
      }
      this.nextFrameTimeout = window.setTimeout(
         this.moveToFrame.bind(this, index),
         this.frames[this.currentFrameIndex].timeoutMs
      );
   }
};

sozi.Player.prototype.moveToFrame = function(index) {
   if(this.waiting) {
      window.clearTimeout(this.nextFrameTimeout);
      this.waiting = false;
   }

   this.currentFrameIndex = index;
   this.animator.start(
      this.display.getCurrentGeometry(),
      this.frames[this.currentFrameIndex].geometry,
      this.frames[this.currentFrameIndex].transitionDurationMs,
      this.frames[this.currentFrameIndex].transitionProfile
   );
};

sozi.Player.prototype.moveToFirst = function() {
   this.moveToFrame(0);
};

sozi.Player.prototype.moveToPrevious = function() {
   var index = this.currentFrameIndex;
   for(index--; index >= 0; index--) {
      var frame = this.frames[index];
      if(!frame.timeoutEnable || frame.timeoutMs !== 0) {
         this.moveToFrame(index);
         break;
      }
   }
};

sozi.Player.prototype.moveToNext = function() {
   if(this.currentFrameIndex < this.frames.length - 1) {
      this.moveToFrame(this.currentFrameIndex + 1);
   }
};

sozi.Player.prototype.moveToLast = function() {
   this.moveToFrame(this.frames.length - 1);
};

window.addEventListener("load", sozi.Player.prototype.onLoad.bind(new sozi.Player()), false);

