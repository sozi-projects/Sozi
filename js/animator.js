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

sozi.Animator = function (timeStepMs, target, onStep, onDone) {
   this.timeStepMs = timeStepMs || 40;
   this.target = target;
   this.onStep = onStep;
   this.onDone = onDone;

   this.durationMs = 0;
   this.initialState = {};
   this.finalState = {};
   this.initialTime = 0;
   this.started = false;
   this.timer = 0;
};

sozi.Animator.prototype.start = function (initialState, finalState, durationMs, profileName) {
   var attr;

   this.durationMs = durationMs;
   this.initialState = initialState;
   this.finalState = finalState;
   this.profile = this.profiles[profileName] || this.profiles.linear;

   this.initialTime = Date.now();

   for (attr in this.initialState) {
      if (this.initialState.hasOwnProperty(attr)) {
         this.target[attr] = this.initialState[attr];
      }
   }
   this.onStep();

   if (!this.started) {
      this.started = true;
      this.timer = window.setInterval(this.step.bind(this), this.timeStepMs);
   }
};

sozi.Animator.prototype.stop = function () {
   if (this.started) {
      window.clearInterval(this.timer);
      this.started = false;
   }
};

sozi.Animator.prototype.step = function () {
   var elapsedTime = Date.now() - this.initialTime,
       attr,
       progress, remaining,
       initialValue, finalValue;

   if (elapsedTime >= this.durationMs) {
      for (attr in this.finalState) {
         if (this.finalState.hasOwnProperty(attr)) {
            this.target[attr] = this.finalState[attr];
         }
      }
      this.stop();
      this.onStep();
      this.onDone();
   }
   else {
      progress = this.profile(elapsedTime / this.durationMs);
      remaining = 1 - progress;
      for (attr in this.initialState) {
         if (this.initialState.hasOwnProperty(attr)) {
            initialValue = this.initialState[attr];
            finalValue = this.finalState[attr];
            if (typeof initialValue === "number") {
               this.target[attr] = (finalValue || 0) * progress + initialValue * remaining;
            }
            else if (typeof finalValue !== "undefined") {
               this.target[attr] = finalValue;
            }
         }
      }
      this.onStep();
   }
};

sozi.Animator.prototype.power = function (x, p) {
   var r = 1, i;
   for (i = 0; i < p; i ++) {
      r *= x;
   }
   return r;
};

sozi.Animator.prototype.profiles = {
   "linear": function (x) {
      return x;
   },

   "accelerate": function (x) {
      return this.power(x, 3);
   },

   "strong-accelerate": function (x) {
      return this.power(x, 5);
   },

   "decelerate": function (x) {
      return 1 - this.power(1 - x, 3);
   },

   "strong-decelerate": function (x) {
      return 1 - this.power(1 - x, 5);
   },

   "accelerate-decelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = this.power(2 * xs, 3) / 2;
      return x <= 0.5 ? y : 1 - y;
   },

   "strong-accelerate-decelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = this.power(2 * xs, 5) / 2;
      return x <= 0.5 ? y : 1 - y;
   },

   "decelerate-accelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = (1 - this.power(1 - 2 * xs, 2)) / 2;
      return x <= 0.5 ? y : 1 - y;
   },

   "strong-decelerate-accelerate": function (x) {
      var xs = x <= 0.5 ? x : 1 - x,
          y = (1 - this.power(1 - 2 * xs, 3)) / 2;
      return x <= 0.5 ? y : 1 - y;
   }
};

// vim: sw=3

