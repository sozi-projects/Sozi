/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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

export function makeBezier(x1, y1, x2, y2) {
    const ax = A(x1, x2), bx = B(x1, x2), cx = C(x1);
    const ay = A(y1, y2), by = B(y1, y2), cy = C(y1);

    if (x1 === y1 && x2 === y2) {
        // Linear
        return function (x) {
            return x;
        };
    }

    return function(x) {
        // Newton raphson iteration
        let t = x;
        for (let i = 0; i < 4; i++) {
            const currentSlope = bezierSlope(t, ax, bx, cx);
            if (currentSlope === 0.0) {
                break;
            }
            const currentX = bezier(t, ax, bx, cx) - x;
            t -= currentX / currentSlope;
        }
        return bezier(t, ay, by, cy);
    };
}

export function makeSteps(n, direction) {
    const trunc = direction === "start" ? Math.ceil : Math.floor;
    return function (x) {
        return trunc(n * x) / n;
    };
}

export const linear = makeBezier(0.0,  0.0, 1.0,  1.0);
linear.reverse = linear;

export const ease = makeBezier(0.25, 0.1, 0.25, 1.0);
ease.reverse = ease;

export const easeIn = makeBezier(0.42, 0.0, 1.0,  1.0);
export const easeOut = makeBezier(0.0,  0.0, 0.58, 1.0);
easeIn.reverse = easeOut;
easeOut.reverse = easeIn;

export const easeInOut = makeBezier(0.42, 0.0, 0.58, 1.0);
easeInOut.reverse = easeInOut;

export const stepStart = makeSteps(1, "start");
export const stepEnd = makeSteps(1, "end");
stepStart.reverse = stepEnd;
stepEnd.reverse = stepStart;

export function stepMiddle(x) {
    return x >= 0.5 ? 1 : 0;
}
stepMiddle.reverse = stepMiddle;
