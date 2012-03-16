/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 * 
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 */

module("sozi.animation", function (exports) {
    var window = this,
        TIME_STEP_MS = 40,
        animators = [],
        timer,
        requestAnimationFrame = window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame;

    /*
     * This function is called periodically and triggers the
     * animation steps in all animators managed by this module.
     *
     * If all animators are removed from the list of animators
     * managed by this module, then the periodic calling is disabled.
     *
     * This function can be called either through requestAnimationFrame()
     * if the browser supports it, or through setInterval().
     */
    function loop(timestamp) {
        var i;
        if (animators.length > 0) {
            // If there is at least one animator,
            // and if the browser provides animation frames,
            // schedule this function to be called again in the next frame.
            if (requestAnimationFrame) {
                requestAnimationFrame(loop);
            }

            // Step all animators
            for (i = 0; i < animators.length; i += 1) {
                animators[i].step(timestamp);
            }
        }
        else {
            // If all animators have been removed,
            // and if this function is called periodically
            // through setInterval, disable the periodic calling.
            if (!requestAnimationFrame) {
                window.clearInterval(timer);
            }
        }
    }
    
    /*
     * Start the animation loop.
     *
     * This function delegates the periodic update of all animators
     * to the loop() function, either through requestAnimationFrame()
     * if the browser supports it, or through setInterval().
     */
    function start() {
        if (requestAnimationFrame) {
            requestAnimationFrame(loop);
        }
        else {
            timer = window.setInterval(function () {
                loop(Date.now());
            }, TIME_STEP_MS);
        }
    }
    
    /*
     * Add a new animator object to the list of animators managed
     * by this module.
     *
     * If the animator list was empty before calling this function,
     * then the animation loop is started.
     */
    function addAnimator(animator) {
        animators.push(animator);
        if (animators.length === 1) {
            start();
        }
    }
    
    /*
     * Remove the given animator from the list of animators
     * managed by this module.
     */
    function removeAnimator(animator) {
        animators.splice(animators.indexOf(animator), 1);
    }
    
    /*
     * Construct a new animator.
     *
     * Parameters:
     * - onStep: the function to call on each animation step
     * - onDone: the function to call when the animation time is elapsed
     *
     * The onStep() function is expected to have the following parameters:
     *  - progress: a number between 0 and 1 (included) corresponding to
     *    the elapsed fraction of the total duration
     *  - data: an optional object passed to the application-specific animation code
     *
     * The new animator is initialized in the "stopped" state.
     */
    exports.Animator = function (onStep, onDone) {
        this.onStep = onStep;
        this.onDone = onDone;

        this.durationMs = 0;
        this.data = {};
        this.initialTime = 0;
        this.started = false;
    };

    /*
     * Start the current animator.
     *
     * Parameters:
     *  - durationMs: the animation duration, in milliseconds
     *  - data: an object to pass to the onStep function
     *
     * The current animator is added to the list of animators managed
     * by this module and is put in the "started" state.
     * It will be removed from the list automatically when the given duration
     * has elapsed.
     *
     * The onStep() function is called once before starting the animation.
     */
    exports.Animator.prototype.start = function (durationMs, data) {
        this.durationMs = durationMs;
        this.data = data;
        this.initialTime = Date.now();
        this.onStep(0, this.data);

        if (!this.started) {
            this.started = true;
            addAnimator(this);
        }
    };

    /*
     * Stop the current animator.
     *
     * The current animator is removed from the list of animators managed
     * by this module and is put in the "stopped" state.
     */
    exports.Animator.prototype.stop = function () {
        if (this.started) {
            removeAnimator(this);
            this.started = false;
        }
    };

    /*
     * Perform one animation step.
     *
     * This function is called automatically by the loop() function.
     * It calls the onStep() function of this animator.
     * If the animation duration has elapsed, the onDone() function of
     * the animator is called.
     */
    exports.Animator.prototype.step = function (timestamp) {
        var elapsedTime = timestamp - this.initialTime;
        if (elapsedTime >= this.durationMs) {
            this.stop();
            this.onStep(1, this.data);
            this.onDone();
        } else {
            this.onStep(elapsedTime / this.durationMs, this.data);
        }
    };

    /*
     * The acceleration profiles.
     *
     * Each profile is a function that operates in the interval [0, 1]
     * and produces a result in the same interval.
     *
     * These functions are meant to be called in onStep() functions
     * to transform the progress indicator according to the desired
     * acceleration effect.
     */
    exports.profiles = {
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
});

