/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {EventEmitter} from "events";

/*
 * The browser-specific function to request an animation frame.
 */
var requestAnimationFrame =
        window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame;

var perf = window.performance && window.performance.now ? window.performance : Date;

/*
 * The default time step.
 * For browsers that do not support animation frames.
 */
var TIME_STEP_MS = 40;

/*
 * The handle provided by setInterval().
 * For browsers that do not support animation frames.
 */
var timer;

// The number of running animators.
var runningAnimators = 0;

/*
 * The list of managed animators.
 */
var animatorList = [];

/*
 * The main animation loop.
 *
 * This function is called periodically and triggers the
 * animation steps in all running animators.
 *
 * If all animators are removed from the list of running animators,
 * then the periodic calling is disabled.
 *
 * This function can be called either through requestAnimationFrame()
 * or through setInterval().
 */
function loop() {
    if (runningAnimators > 0) {
        // If there is at least one animator,
        // and if the browser provides animation frames,
        // schedule this function to be called again in the next frame.
        if (requestAnimationFrame) {
            requestAnimationFrame(loop);
        }

        // Step all animators. We iterate over a copy of the animator list
        // in case the step() method removes an animator from the list.
        animatorList.forEach(animator => {
            if (animator.running) {
                animator.step();
            }
        });
    }
    else if (!requestAnimationFrame) {
        // If all animators have been removed,
        // and if this function is called periodically
        // by setInterval(), disable the periodic calling.
        window.clearInterval(timer);
    }
}

/*
 * Start the animation loop.
 *
 * This function delegates the periodic update of all animators
 * to the loop() function, either using requestAnimationFrame()
 * if the browser supports it, or using setInterval().
 */
function start() {
    if (requestAnimationFrame) {
        requestAnimationFrame(loop);
    }
    else {
        timer = window.setInterval(loop, TIME_STEP_MS);
    }
}

/*
 * An animator provides the logic for animating other objects.
 *
 * The main purpose of an animator is to schedule the update
 * operations in the animated objects.
 */
export var Animator = Object.create(EventEmitter.prototype);

Animator.init = function () {
    EventEmitter.call(this);
    this.durationMs = 500;
    this.initialTime = 0;
    this.running = false;
    animatorList.push(this);
    return this;
};

/*
 * Start the current animator.
 *
 * The "step" event is fired once before starting the animation.
 */
Animator.start = function (durationMs) {
    this.durationMs = durationMs;
    this.initialTime = perf.now();
    this.emit("step", 0);
    if (!this.running) {
        this.running = true;
        runningAnimators ++;
        if (runningAnimators === 1) {
            start();
        }
    }
};

/*
 * Stop the current animator.
 */
Animator.stop = function () {
    if (this.running) {
        this.running = false;
        runningAnimators --;
        this.emit("stop");
    }
};

/*
 * Perform one animation step.
 *
 * This function is called automatically by the loop() function.
 * It fires the "step" event with the current progress (elapsed time / duration).
 * If the animation duration has elapsed, the "done" event is fired.
 */
Animator.step = function () {
    var elapsedTime = perf.now() - this.initialTime;
    if (elapsedTime >= this.durationMs) {
        this.emit("step", 1);
        this.running = false;
        runningAnimators --;
        this.emit("done");
    } else {
        this.emit("step", elapsedTime / this.durationMs);
    }
};
