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
        animationFrameImpl = ["moz", "webkit", "ms"],
        i, impl,

		getAnimationStartTime = function () {
			return Date.now();
		},
	
		requestFirstAnimationFrame = function (callback, timeStepMs) {
			return window.setInterval(function () {
				callback(Date.now());
			}, timeStepMs);
		},
	
		requestNextAnimationFrame = function (callback) {},
	
		clearAnimationFrame = function (af) {
			window.clearInterval(af);
		};
	
	function lookupAnimationHandlers(impl) {
		if (typeof window[impl + "AnimationStartTime"] === "number") {
			getAnimationStartTime = function () {
				return window[impl + "AnimationStartTime"];
			};
		}
		if (typeof window[impl + "RequestAnimationFrame"] === "function") {
			requestFirstAnimationFrame = requestNextAnimationFrame = window[impl + "RequestAnimationFrame"];
			clearAnimationFrame = function (af) {};
		}
	}
	
	for (i = 0; i < animationFrameImpl.length; i += 1) {
		lookupAnimationHandlers(animationFrameImpl[i]);
	}
	
    exports.Animator = function (timeStepMs, onStep, onDone) {
        var that = this;
        
        this.timeStepMs = timeStepMs || 40;
        this.onStep = onStep;
        this.onDone = onDone;

        this.durationMs = 0;
        this.data = {};
        this.initialTime = 0;
        this.started = false;
        this.browserAnimationFrame = 0;
        
        this.callback = function (timestamp) {
            that.step(timestamp);
        };
    };

    exports.Animator.prototype.start = function (durationMs, data) {
        this.durationMs = durationMs;
        this.data = data;

        this.initialTime = getAnimationStartTime();
        this.onStep(0, this.data);

        if (!this.started) {
            this.started = true;
            this.browserAnimationFrame = requestFirstAnimationFrame(this.callback, this.timeStepMs);
        }
    };

    exports.Animator.prototype.stop = function () {
        if (this.started) {
            clearAnimationFrame(this.browserAnimationFrame);
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
            requestNextAnimationFrame(this.callback);
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

