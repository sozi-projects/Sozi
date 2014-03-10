namespace("sozi.player.timing", function (exports) {
    "use strict";

    /*
     * From Gaëtan Renaudeau, released under MIT license.
     * http://greweb.me/2012/02/bezier-curve-based-easing-functions-from-concept-to-implementation/
     * itself inspired from Firefox's nsSMILKeySpline.cpp
     */
    function A(xy1, xy2) {
        return 1.0 - 3.0 * xy2 + 3.0 * xy1;
    }

    function B(xy1, xy2) {
        return 3.0 * xy2 - 6.0 * xy1;
    }

    function C(xy1) {
        return 3.0 * xy1;
    }

    function bezier(t, a, b, c) {
        return ((a * t + b) * t + c) * t;
    }

    function bezierSlope(t, a, b, c) {
        return (3.0 * a * t + 2.0 * b) * t + c;
    }

    exports.makeBezier = function (x1, y1, x2, y2) {
        var ax = A(x1, x2), bx = B(x1, x2), cx = C(x1);
        var ay = A(y1, y2), by = B(y1, y2), cy = C(y1);

        if (x1 === y1 && x2 === y2) {
            // Linear
            return function (x) {
                return x;
            };
        }

        return function(x) {
            // Newton raphson iteration
            var t = x;
            for (var i = 0; i < 4; i++) {
                var currentSlope = bezierSlope(t, ax, bx, cx);
                if (currentSlope === 0.0) {
                    break;
                }
                var currentX = bezier(t, ax, bx, cx) - x;
                t -= currentX / currentSlope;
            }
            return bezier(t, ay, by, cy);
        };
    };

    exports.makeSteps = function (n, direction) {
        var trunc = direction === "start" ? Math.ceil : Math.floor;
        return function (x) {
            return trunc(n * x) / n;
        };
    };

    exports.linear    = exports.makeBezier(0.0,  0.0, 1.0,  1.0);
    exports.ease      = exports.makeBezier(0.25, 0.1, 0.25, 1.0);
    exports.easeIn    = exports.makeBezier(0.42, 0.0, 1.0,  1.0);
    exports.easeInOut = exports.makeBezier(0.42, 0.0, 0.58, 1.0);
    exports.easeOut   = exports.makeBezier(0.0,  0.0, 0.58, 1.0);
    exports.stepStart = exports.makeSteps(1, "start");
    exports.stepEnd   = exports.makeSteps(1, "end");
    exports.stepMiddle = function (x) {
        return x >= 0.5 ? 1 : 0;
    }
});
