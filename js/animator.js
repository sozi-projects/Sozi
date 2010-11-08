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

sozi.Animator = function (timeStepMs, onStep, onDone) {
   this.timeStepMs = timeStepMs || 40;
   this.onStep = onStep;
   this.onDone = onDone;

   this.durationMs = 0;
   this.data = {};
   this.initialTime = 0;
   this.started = false;
   this.timer = 0;
};

sozi.Animator.prototype.start = function (durationMs, data) {
   this.durationMs = durationMs;
   this.data = data;

   this.initialTime = Date.now();
   this.onStep(0, this.data);

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
   var elapsedTime = Date.now() - this.initialTime;
   if (elapsedTime >= this.durationMs) {
      this.stop();
      this.onStep(1, this.data);
      this.onDone();
   }
   else {
      this.onStep(elapsedTime / this.durationMs, this.data);
   }
};

// vim: sw=3

