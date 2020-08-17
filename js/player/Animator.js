/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {EventEmitter} from "events";

/*
 * The browser-specific function to request an animation frame.
 */
const doRequestAnimationFrame =
        window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame;

const perf = window.performance && window.performance.now ? window.performance : Date;

/*
 * The default time step.
 * For browsers that do not support animation frames.
 */
const TIME_STEP_MS = 40;

/*
 * The handle provided by setInterval().
 * For browsers that do not support animation frames.
 */
let timer;

// The number of running animators.
let runningAnimators = 0;

/*
 * The list of managed animators.
 */
const animatorList = [];

/*
 * The main animation loop.
 *
 * This function is called periodically and triggers the
 * animation steps in all running animators.
 *
 * If all animators are removed from the list of running animators,
 * then the periodic calling is disabled.
 *
 * This function can be called either through doRequestAnimationFrame()
 * or through setInterval().
 */
function loop() {
    if (runningAnimators > 0) {
        // If there is at least one animator,
        // and if the browser provides animation frames,
        // schedule this function to be called again in the next frame.
        if (doRequestAnimationFrame) {
            doRequestAnimationFrame(loop);
        }

        // Step all animators. We iterate over a copy of the animator list
        // in case the step() method removes an animator from the list.
        for (let animator of animatorList) {
            if (animator.running) {
                animator.step();
            }
        }
    }
    else if (!doRequestAnimationFrame) {
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
 * to the loop() function, either using doRequestAnimationFrame()
 * if the browser supports it, or using setInterval().
 */
function start() {
    if (doRequestAnimationFrame) {
        doRequestAnimationFrame(loop);
    }
    else {
        timer = window.setInterval(loop, TIME_STEP_MS);
    }
}

/** An animator provides the logic for animating other objects.
 *
 * The main purpose of an animator is to schedule the update
 * operations in the animated objects.
 *
 * @extends EventEmitter
 * @todo Add documentation
 */
export class Animator extends EventEmitter {

    constructor() {
        super();
        this.durationMs = 500;
        this.initialTime = 0;
        this.running = false;
        animatorList.push(this);
    }

    /*
     * Start the current animator.
     *
     * The "step" event is fired once before starting the animation.
     */
    start(durationMs) {
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
    }

    /*
     * Stop the current animator.
     */
    stop() {
        if (this.running) {
            this.running = false;
            runningAnimators --;
            this.emit("stop");
        }
    }

    /*
     * Perform one animation step.
     *
     * This function is called automatically by the loop() function.
     * It fires the "step" event with the current progress (elapsed time / duration).
     * If the animation duration has elapsed, the "done" event is fired.
     */
    step() {
        const elapsedTime = perf.now() - this.initialTime;
        if (elapsedTime >= this.durationMs) {
            this.emit("step", 1);
            this.running = false;
            runningAnimators --;
            this.emit("done");
        } else {
            this.emit("step", elapsedTime / this.durationMs);
        }
    }
}
