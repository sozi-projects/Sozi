/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Timing functions for transitions.
 *
 * This module is based on the article by Gaëtan Renaudeau, with code released under an MIT license.
 *
 * @module
 * @see {@link http://greweb.me/2012/02/bezier-curve-based-easing-functions-from-concept-to-implementation/ Bézier Curve based easing functions – from concept to implementation}
 */

/** Helper function to compute a Bézier curve.
 *
 * @param {number} xy1 - X or Y coordinate of the first control point.
 * @param {number} xy2 - X or Y coordinate of the second control point.
 * @returns {number} - A linear combination of the arguments.
 */
function A(xy1, xy2) {
    return 1.0 - 3.0 * xy2 + 3.0 * xy1;
}

/** Helper function to compute a Bézier curve.
 *
 * @param {number} xy1 - X or Y coordinate of the first control point.
 * @param {number} xy2 - X or Y coordinate of the second control point.
 * @returns {number} - A linear combination of the arguments.
 */
function B(xy1, xy2) {
    return 3.0 * xy2 - 6.0 * xy1;
}

/** Helper function to compute a Bézier curve.
 *
 * @param {number} xy1 - X or Y coordinate of the first control point.
 * @returns {number} - A linear combination of the arguments.
 */
function C(xy1) {
    return 3.0 * xy1;
}

/** Compute a coordinate of a point of the Bézier curve.
 *
 * @param {number} t - The location of the point along the curve.
 * @param {number} a - The output of function `A` for the control points of the curve.
 * @param {number} b - The output of function `B` for the control points of the curve.
 * @param {number} c - The output of function `C` for the control points of the curve.
 * @returns {number} - The X or Y coordinate of a point of the Bézier curve.
 */
function bezier(t, a, b, c) {
    return ((a * t + b) * t + c) * t;
}

/** Compute the derivative of a coordinate at a point of the Bézier curve.
 *
 * @param {number} t - The location of the point along the curve.
 * @param {number} a - The output of function `A` for the control points of the curve.
 * @param {number} b - The output of function `B` for the control points of the curve.
 * @param {number} c - The output of function `C` for the control points of the curve.
 * @returns {number} - The derivative dX/dt or dY/dt of a coordinate at a point of the Bézier curve.
 */
function bezierSlope(t, a, b, c) {
    return (3.0 * a * t + 2.0 * b) * t + c;
}

/** Create a Bézier curve with the given control points.
 *
 * @param {number} x1 - The X coordinate of the first control point.
 * @param {number} y1 - The Y coordinate of the first control point.
 * @param {number} x2 - The X coordinate of the second control point.
 * @param {number} y2 - The Y coordinate of the second control point.
 * @returns {Function} - A function that takes a coordinates X and computes the Y coordinate of the corresponding point of the Bézier curve.
 */
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

/** Create a staircase function.
 *
 * @param {number} n - The number of steps.
 * @param {boolean} start - Step at the beginning or at the end of each interval?
 * @returns {Function} - A function that takes a coordinates X and computes the Y coordinate of the corresponding point of the step function.
 */
export function makeSteps(n, start) {
    const trunc = start ? Math.ceil : Math.floor;
    return function (x) {
        return trunc(n * x) / n;
    };
}

/** A linear timing function.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export const linear = makeBezier(0.0,  0.0, 1.0,  1.0);
linear.reverse = linear;

/** An easing timing function.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export const ease = makeBezier(0.25, 0.1, 0.25, 1.0);
ease.reverse = ease;

/** An ease-in timing function.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export const easeIn = makeBezier(0.42, 0.0, 1.0,  1.0);

/** An ease-out timing function.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export const easeOut = makeBezier(0.0,  0.0, 0.58, 1.0);

easeIn.reverse = easeOut;
easeOut.reverse = easeIn;

/** A timing function with ease-in and ease-out.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export const easeInOut = makeBezier(0.42, 0.0, 0.58, 1.0);
easeInOut.reverse = easeInOut;

/** A single immediate step timing function.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export const stepStart = makeSteps(1, true);

/** A single final step timing function.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export const stepEnd = makeSteps(1, false);

stepStart.reverse = stepEnd;
stepEnd.reverse = stepStart;

/** A middle step timing function.
 *
 * @param {number} t - The current time, between 0 and 1.
 * @returns {number} - The actual progress, between 0 and 1.
 */
export function stepMiddle(t) {
    return t >= 0.5 ? 1 : 0;
}
stepMiddle.reverse = stepMiddle;
