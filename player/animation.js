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

sozi.animation = (function () {
    var exports = {};
    
    exports.Animator = function (timeStepMs, onStep, onDone) {
        this.timeStepMs = timeStepMs || 40;
        this.onStep = onStep;
        this.onDone = onDone;

        this.durationMs = 0;
        this.data = {};
        this.initialTime = 0;
        this.started = false;
        this.timer = 0;
    };

    exports.Animator.prototype.start = function (durationMs, data) {
        this.durationMs = durationMs;
        this.data = data;

        this.initialTime = Date.now();
        this.onStep(0, this.data);

        if (!this.started) {
            this.started = true;
            this.timer = window.setInterval(this.step.bind(this), this.timeStepMs);
        }
    };

    exports.Animator.prototype.stop = function () {
        if (this.started) {
            window.clearInterval(this.timer);
            this.started = false;
        }
    };

    exports.Animator.prototype.step = function () {
        var elapsedTime = Date.now() - this.initialTime;
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

    return exports;
}());

