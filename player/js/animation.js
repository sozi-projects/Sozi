/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2011 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 * 
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

var sozi = sozi || {};

(function () {
    var exports = sozi.animation = sozi.animation || {},
        window = this,
        TIME_STEP_MS = 40,
        animators = [],
        timer,
        requestAnimationFrame = window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame;

    function loop(timestamp) {
        var i;
        if (animators.length > 0) {
            if (requestAnimationFrame) {
                requestAnimationFrame(loop);
            }
            for (i = 0; i < animators.length; i += 1) {
                animators[i].step(timestamp);
            }
        }
        else {
            if (!requestAnimationFrame) {
                window.clearInterval(timer);
            }
        }
    }
    
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
    
    function addAnimator(animator) {
        animators.push(animator);
        if (animators.length === 1) {
            start();
        }
    }
    
    function removeAnimator(animator) {
        animators.splice(animators.indexOf(animator), 1);
    }
    
    exports.Animator = function (onStep, onDone) {
        this.onStep = onStep;
        this.onDone = onDone;

        this.durationMs = 0;
        this.data = {};
        this.initialTime = 0;
        this.started = false;
    };

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

    exports.Animator.prototype.stop = function () {
        if (this.started) {
            removeAnimator(this);
            this.started = false;
        }
    };

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
}());

