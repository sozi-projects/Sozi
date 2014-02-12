/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2014 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

namespace("sozi.display", function (exports) {
    "use strict";

    /*
     * The browser-specific function to request an animation frame.
     */
    var requestAnimationFrame =
            window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame;

    var getCurrentTime = window.performance && window.performance.now || Date.now;

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

    /*
     * The list of running animators.
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
        if (animatorList.length > 0) {
            // If there is at least one animator,
            // and if the browser provides animation frames,
            // schedule this function to be called again in the next frame.
            if (requestAnimationFrame) {
                requestAnimationFrame(loop);
            }

            // Step all animators
            animatorList.forEach(function (animator) {
                animator.step();
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
     * Add a new animator object to the list of running animators.
     *
     * If the animator list was empty before calling this function,
     * then the animation loop is started.
     */
    function addAnimator(animator) {
        if (animatorList.push(animator) === 1) {
            start();
        }
    }

    /*
     * Remove the given animator from the list of running animators.
     */
    function removeAnimator(animator) {
        animatorList.splice(animatorList.indexOf(animator), 1);
    }

    /*
     * An animator provides the logic for animating other objects.
     *
     * The main purpose of an animator is to schedule the update
     * operations in the animated objects.
     */
    exports.Animator = sozi.model.Object.create({

        init: function () {
            // The animation duration, in milliseconds.
            this.durationMs = 500;

            // The animation timing function.
            this.timingFunction = exports.timing.linear;

            // The start time of the animation.
            this.initialTime = 0;

            // The current state of this animator.
            this.started = false;
        },

        /*
         * Start the current animator.
         *
         * The current animator is added to the list of running animators
         * and is put in the "started" state.
         * It will be removed from the list automatically when the given duration
         * has elapsed.
         *
         * The "step" event is fired once before starting the animation.
         */
        start: function (durationMs, timingFunctionName) {
            this.durationMs = durationMs || 500;
            this.timingFunction = exports.timing[timingFunctionName || "linear"];
            this.initialTime = getCurrentTime();
            this.fire("step", 0);
            if (!this.started) {
                this.started = true;
                addAnimator(this);
            }
        },

        /*
         * Stop the current animator.
         *
         * The current animator is removed from the list of running animators
         * and is put in the "stopped" state.
         */
        stop: function () {
            if (this.started) {
                removeAnimator(this);
                this.started = false;
            }
        },

        /*
         * Perform one animation step.
         *
         * This function is called automatically by the loop() function.
         * It fires the "step" event with the current progress (elapsed time / duration).
         * If the animation duration has elapsed, the "done" event is fired.
         */
        step: function () {
            var elapsedTime = getCurrentTime() - this.initialTime;
            if (elapsedTime >= this.durationMs) {
                this.fire("step", 1);
                this.stop();
                this.fire("done");
            } else {
                this.fire("step", this.timingFunction(elapsedTime / this.durationMs));
            }
        }
    });
});
