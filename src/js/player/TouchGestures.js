/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/** Max time in ms to accept a touch move as quick swipe gesture
 *
 * @readonly
 * @default
 * @type {number}
 */
const MAX_FLICK_TIME = 200;

/** Min distance to accept a touch move as quick swipe gesture.
 *
 * Threshhold to prevent any touch to be interpreted as swipe.
 *
 * @readonly
 * @default
 * @type {number}
 */
const MIN_FLICK_TRAVEL = 20;

/** Max distance to accept a tap gesture.
 *
 * Threshhold to prevent any touch to be interpreted as tap.
 *
 * @readonly
 * @default
 * @type {number}
 */
const MAX_TAP_DISTANCE = 10;

/** Minimum distance to accept a touch move as slow swipe gesture in horizontal direction.
 *
 * Value depends on screen size and therefore is (re)calculated
 *
 * @default
 * @type {number}
 */
let MIN_SLOW_TRAVEL_X;

/** Minimum distance to accept a touch move as slow swipe gesture in vertical direction.
 *
 * Value depends on screen size and therefore is (re)calculated
 *
 * @default
 * @type {number}
 */
let MIN_SLOW_TRAVEL_Y;       // minimum distance to accept a touch move as slow swipe gesture in vertical direction


/** Tolerance of slight rotation gesture movement assumed to be unintentional.
 *
 * The Threshhold adds some visual stability to pan movements.
 * Must be exceeded once to accept a rotating gesture.
 *
 * @readonly
 * @default
 * @type {number}
 */
const ROTATE_THRESHOLD = 10;

/** Upper tolerance of slight zoom gesture movement assumed to be unintentional.
 *
 * The Threshhold adds some visual stability to pan movements.
 * Must be exceeded once to accept a zoom gesture.
 *
 * @readonly
 * @default
 * @type {number}
 */
const ZOOM_UP_THRESHOLD = 1.5;

/** Lower tolerance of slight zoom gesture movement assumed to be unintentional.
 *
 * The Threshhold adds some visual stability to pan movements.
 * Must be exceeded once to accept a zoom gesture.
 *
 * @readonly
 * @default
 * @type {number}
 */
const ZOOM_LOW_THRESHOLD = 1/ZOOM_UP_THRESHOLD;

/** The current Sozi player.
 *
 * @type {module:player/Player.Player}
 */
let player;

/** The current Sozi UI controller.
 *
 * @type {module:player/PlayerController.PlayerController}
 */
let playerController;

/** The current Sozi presentation.
 *
 * @type {module:model/Presentation.Presentation}
 */
let presentation;

/** When playing the presentation, are touch gestures enabled?
 *
 * Inferred from
 * {@link module:model/Presentation.Presentation#enableMouseZoom|enableMouseZoom},
 * {@link module:model/Presentation.Presentation#enableMouseTranslation|enableMouseTranslation},
 * or {@link module:model/Presentation.Presentation#enableMouseRotation|enableMouseRotation}
 * in the current presentation.
 *
 * @type {boolean}
 */
let interactionGestureEnabled;

/** The currently active gesture handler depending on the amount of touchpoints.
 *
 * `null`, if no touches on the screen.
 *
 * @type {module:player/TouchGestures.Gesture}
 */
let currentGesture;

/** Helper class defining a line for geometric calculations.
 *
 * It is used to interpret changes in two finger gestures.
 */
class Line {

    /** Creates  a new line defined by 2 points.
     *
     * @param {number} x1 - The X coordinate of the first point.
     * @param {number} y1 - The Y coordinate of the first point.
     * @param {number} x2 - The X coordinate of the second point.
     * @param {number} y2 - The Y coordinate of the second point.
     */
     constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    /** Calculate the angle between this line and another.
     *
     * @param {module:player/TouchGestures.Line} otherLine - The line defining the second leg of the angle.
     * @returns {number} the angle in degree
     *
     */
    getAngle(otherLine) {
        const dAx = this.x2 - this.x1;
        const dAy = this.y2 - this.y1;
        const dBx = otherLine.x2 - otherLine.x1;
        const dBy = otherLine.y2 - otherLine.y1;
        const angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);
        const degree_angle = angle * (180 / Math.PI);
        return degree_angle;
    }


    /** Calculates the average horizontal distance to another line according to the two definition points.
     *
     * @param {module:player/TouchGestures.Line} otherLine - The line to calculate the distance to.
     * @returns {number} the average horizontal distance.
     */
    getXDist(otherLine) {
        return (this.x1 - otherLine.x1 + this.x2 - otherLine.x2) / 2;
    }

    /** Calculates the average vertical distance to another line according to the two definition points.
     *
     * @param {module:player/TouchGestures.Line} otherLine - The line to calculate the distance to.
     * @returns {number} the average vertical distance.
     */
    getYDist(otherLine) {
        return (this.y1 - otherLine.y1 + this.y2 - otherLine.y2) / 2;
    }

    /** Calculates the square of the line's length.
     *
     * @returns {number} the square to the line's length.
     */
    getSqrLength() {
        return Math.pow(this.x1 - this.x2, 2) + Math.pow(this.y1 - this.y2, 2);
    }

    /** The Midpoint of this line in x and y coordinate
     *
     * @returns {object} - X and Y coordinate of the midpoint.
     *
     */
    getMidpoint() {
        return {
            x: (this.x1 + this.x2) / 2,
            y: (this.y1 + this.y2) / 2
        };
    }
}

/** abstract class for touch gesture handlers.
 */
class Gesture {

    /** Touchpoints have been moved.
     *
     * Specific behaviour to be implemented by derived classes
     *
     * @param {object[]} touches - Array of touchpoints from the touch event.
     */
    move(touches) {
        // Not implemented
    }

    /** Checks whether the given touches (e.g. by number) cannot be processed by the specific gesture object.
     *
     * Must be implemented by derived classes.
     *
     * @param {object[]} touches - Array of touchpoints from the touch event.
     * @returns {boolean} - `true`, if touches are rejected, `false` if accepted.
     *
     */
    rejects(touches) {
        // Not implemented
        return true;
    }

    /** Gesture has been completed successfully.
     *
     * Specific behaviour to be implemented by derived classes
     *
     * @param {Event} evt - The touch event that triggered this method call.
     */
    finish(evt) {
        // Not implemented
    }

    /** Execute a swipe.
     *
     * Must be implemented by derived class.
     */
    doSwipe() {
        // Not implemented
    }

    /** Tests for vertical or horizontal swipes according to a given minimum movement.
     *
     * Performs the swipe in the dominant direction (longer absolute move)
     *
     * @param {number} distX - Touch movement in horizontal direction
     * @param {number} distY - Touch movement in vertical direction
     * @param {number} minX  - Minimum distance in horizontal direction to accept as swipe
     * @param {number} minY  - Minimum distance in vertical direction to accept as swipe
     * @returns {boolean}    - `true`, if a swipe was ececuted
     */
    checkSwipe(distX, distY, minX, minY) {
        const dXAbs = Math.abs(distX);
        const dYAbs = Math.abs(distY);

        if (dXAbs > dYAbs) { //potential horizontal swipe
            if (dXAbs >= minX) {
                this.doSwipe((distX < 0) ? "left" : "right");
                return true;
            }
        }
        else { // potental vertical swipe
            if (dYAbs>= minY) {
                this.doSwipe((distY < 0) ? "up" : "down");
                return true;
            }
        }

        return false;
    }
}


/** Handles single touch gestures.
 *
 * Single touch gestures are swipes controlling navigation.
 * A Swipe is detected either as a  quick flick (any/very short minimum length within restricted time
 * or a slow movement across the screen (any time but minimum length of movement).
 * Swipes are accepted in both vertical and horizontal direction.
 * Only one swipe is performed however, determined by the dominant direction (longer absolute length in px).
 *
 * @extends Gesture
 */
class SingleGesture extends Gesture {

    /** Creates a new single touch gesture handler.
     *
     * @param {object[]} touches - The initial touchpoint objects when the gesture is first detected
     */
     constructor(touches) {
         super();

         this.flickTime  = Date.now(); // start time for quick swipes
         this.firstTouch = { // first touched point for long swipes
             x: touches[0].clientX,
             y: touches[0].clientY
         };
         this.lastTouch  = this.firstTouch;  // last touched point
         this.prevTouch  = this.firstTouch;  // point touched before the last
         this.swipeDone  = false;  // swipe performed while moving
     }

    /** Performs a swipe.
     *
     * @param {string} direction - Currently recognized "up", "down", "left", "right"
     * @override
     */
    doSwipe(direction) {
        switch (direction) {
            case "down":
            case "left":
                playerController.moveToNext();
                break;
            case "up":
            case "right":
                playerController.moveToPrevious();
                break;
        }
    }

    /** Checks for long swipes when the touch point moves.
     *
     * Also updates the last touch value to check  quick swipes when gesture is finished.
     *
     * @param {object[]} touches - The touchpoints.
     * @override
     */
    move(touches) {
        const current = {
            x: touches[0].clientX,
            y: touches[0].clientY
        };
        // check slow swipe at every movement
        // slow swipe only needs a touch to travel a certain distance
        // without releasing the touchpoint.
        // the distance is about 1/2 of the display width to prevent accidental swipes
        if (this.checkSwipe(current.x - this.firstTouch.x,
                            current.y - this.firstTouch.y,
                            MIN_SLOW_TRAVEL_X,
                            MIN_SLOW_TRAVEL_Y)) {
            this.swipeDone = true;
        }
        else {
          this.flickTime = Date.now();
          this.prevTouch = this.lastTouch;
          this.lastTouch = current;
        }
    }

    rejects(touches) {
        return this.swipeDone || touches.length != 1;
    }

    /** Check quick swipe when the touchpoint is released from the screen.
     *
     * A quick swipe happend, when the last movement before release was a quick flick in one direction.
     * The touchpoint has to be moved for a certain distance within a short timeframe right before release.
     *
     * @override
     */
    finish(evt) {
        // Do not swipe again, if long swipe already fired.
        // this prevents double swipe glitches for long AND fast swipe gestures.
        if (this.swipeDone) {
            return;
        }

        // Reject long touch.
        const travelTime = Date.now() - this.flickTime;
        if (travelTime > MAX_FLICK_TIME) {
            return;
        }

        // Execute swipe or tap action.
        if (this.checkSwipe(this.lastTouch.x - this.prevTouch.x,
                            this.lastTouch.y - this.prevTouch.y,
                            MIN_FLICK_TRAVEL,
                            MIN_FLICK_TRAVEL)) {
            return;
        }

        if (Math.abs(this.lastTouch.x - this.firstTouch.x) > MAX_TAP_DISTANCE ||
            Math.abs(this.lastTouch.y - this.firstTouch.y) > MAX_TAP_DISTANCE)  {
            return;
        }

        evt.target.dispatchEvent(new MouseEvent("mousedown", {button: 0, bubbles: true}));
        evt.target.dispatchEvent(new MouseEvent("mouseup",   {button: 0, bubbles: true}));
        evt.target.dispatchEvent(new MouseEvent("click",     {button: 0, bubbles: true}));
    }
}

/** Handles double touch gestures.
 *
 * Double touch gestures control screen interactions like zoom, rotate and panning (translate).
 * To interpret changes the handler uses line objects which
 * virtually connect two touchpoints.
 *
 * @extends Gesture
 */
class DoubleGesture extends Gesture {

    /** Creates a new double touch gesture handler.
     *
     * @param {object[]} touches - The initial touchpoint objects when the gesture is first detected
     */
    constructor(touches) {
        super();

        // initial line connecting the very first touchpoints as reference for all upcomming gestures
        this.startLine = new Line(
            touches[0].clientX,
            touches[0].clientY,
            touches[1].clientX,
            touches[1].clientY
        );

        // buffer for the previous touchpoints.
        this.lastLine = this.startLine;

        // mark if rotation and zoom threshholds are reached at least once during gesture.
        this.rotateEnabled = false;
        this.zoomEnabled = false;

        // stop transitions
        if (player.playing) {
            player.pause();
        }
    }

    /** Checks zoom threshhold and performs the actual zoom.
     *
     * @param {module:player/TouchGestures.Line} actLine - The currently processed line.
     */
    zoom(actLine) {
        if (this.zoomEnabled) {
            const zoom = (actLine.getSqrLength() / this.lastLine.getSqrLength());
            const mid = actLine.getMidpoint();
            playerController.zoom(zoom, mid.x, mid.y);
        }
        else {
            // Check threshhold to enable zoom.
            const zoom = Math.abs(actLine.getSqrLength() / this.startLine.getSqrLength());
            if (zoom > ZOOM_UP_THRESHOLD || zoom < ZOOM_LOW_THRESHOLD) {
                this.zoomEnabled = true;
            }
        }
    }

    /** Checks roatation threshhold and performs the actual rotation.
     *
     * @param {module:player/TouchGestures.Line} actLine - The currently processed line.
     */
    rotate(actLine) {
        if (this.rotateEnabled) {
            const rotate = actLine.getAngle(this.lastLine);
            playerController.rotate(rotate);
        }
        else {
            // Check threshhold to enable rotation.
            if (Math.abs(actLine.getAngle(this.startLine)) >= ROTATE_THRESHOLD) {
                this.rotateEnabled = true;
            }
        }
    }

    /** Performs the actual translation/pan.
     *
     * @param {module:player/TouchGestures.Line} actLine - The currently processed line.
     */
    translate(actLine) {
        const panX = actLine.getXDist(this.lastLine);
        const panY = actLine.getYDist(this.lastLine);
        playerController.translate(panX, panY);
    }


    /** Processes touchpoint moves.
     *
     * Checks whether each of translate, zoom or rotate are allowed by presentation's
     * mouse enabled policy and delegates the interaction to helper classes.
     *
     * @param {object[]} touches - Array of touchpoints.
     * @override
     */
    move(touches) {
        const actLine = new Line(
            touches[0].clientX,
            touches[0].clientY,
            touches[1].clientX,
            touches[1].clientY
        );

        if (presentation.enableMouseZoom) {
            this.zoom(actLine);
        }
        if (presentation.enableMouseRotation) {
            this.rotate(actLine);
        }
        if (presentation.enableMouseTranslation) {
            this.translate(actLine);
        }

        this.lastLine = actLine;
    }

    /** Rejects any number of touchpoints but two.
     *
     * @param {object[]} touches - Array of touchpoints.
     * @override
     */
    rejects(touches) {
        return touches.length != 2;
    }
}

/** A dummy gesture handler used when a gesture is restricted by mouse configuration.
 *
 * The dummy pretends to handle a given number of touchpoints, but does nothing in effect.
 *
 * @extends Gesture
 */
class DummyGesture extends Gesture {

    /** Constructs the dummy gesture handler.
     *
     * @param {number} touchNum - The number of touches this dummy should pretend to handle.
     */
    constructor(touchNum) {
        super();
        this.touchNum = touchNum;
    }

    /** Rejects touch events that do not exaclty match the initial number of touches to be handled.
     *
     * @param {object[]} touches - Array of touch objects from the touch event
     * @override
     */
    rejects(touches) {
        return touches.length != this.touchNum;
    }
}

/** Updates all parameters depending on screen dimensions.
 *
 * @listens resize
 */
function updateScreenValues() {
    MIN_SLOW_TRAVEL_X = Math.floor(window.innerWidth/2);
    MIN_SLOW_TRAVEL_Y = Math.floor(window.innerHeight/2);
}

/** Creates a new gesture handler according to the number of currently applied touches.
 *
 * If no appropriate handler can be identified according to number of touch points or the presentation's mouse enabled policy,
 * a dummy handler is returned.
 * The dummy does nothing in effect, but avoids the createGesture function to be called repeatedly.
 *
 * @param {object[]} touches - Array of currently active touches
 * @returns {module:player/TouchGestures.Gesture} - A new gesture handler matching the number of touches, or `null` if no handler matches.
 */
function createGesture(touches) {
    switch (touches.length) {
        case 1: return presentation.enableMouseNavigation ? new SingleGesture(touches) : new DummyGesture(1);
        case 2: return interactionGestureEnabled ? new DoubleGesture(touches) : new DummyGesture(2);
        default: return new DummyGesture(touches.length);
    }
}

/** Checks, if the current gesture handler is appropriate for the given touches.
 *
 * If not, a new gesture handler is put in place.
 *
 * @param {object[]} touches - Array of currently active touches.
 */
function updateGesture(touches) {
    if (currentGesture == null || currentGesture.rejects(touches)) {
        currentGesture = createGesture(touches);
    }
}

/** Processes a touch start event.
 *
 * Initializes a gesture handler.
 *
 * @param {TouchEvent} evt - The DOM event to process.
 *
 * @listens touchstart
 */
function onTouchStart(evt) {
    evt.preventDefault();
    updateGesture(evt.touches);
}

/** Processes a touch move event.
 *
 * @param {TouchEvent} evt - The DOM event to process.
 *
 * @listens touchmove
 */
function onTouchMove(evt) {
    updateGesture(evt.touches);
    currentGesture.move(evt.touches);
}


/** Processes a touch end event.
 *
 * @param {TouchEvent} evt - The DOM event to process.
 *
 * @listens touchend
 */
function onTouchEnd(evt) {
    if (currentGesture) {
        currentGesture.finish(evt);
    }
    currentGesture = null;
}

/** Initializes touch gestures.
 *
 * This function adds touch listeners to the given parent.
 *
 * @param {module:player/Player.Player} pl - The current Player.
 * @param {module:model/Presentation.Presentation} pr - The presentation to play.
 * @param {module:player/PlayerController.PlayerController} pc - The current Player UI controller.
 */
export function init(pl, pr, pc) {
    player = pl;
    presentation = pr;
    playerController = pc;

    interactionGestureEnabled = presentation.enableMouseRotation ||
        presentation.enableMouseZoom || presentation.enableMouseTranslation;

    if (presentation.enableMouseNavigation || interactionGestureEnabled) {
        const root = player.viewport.svgRoot;

        updateScreenValues();
        window.addEventListener("resize", updateScreenValues);

        root.addEventListener("touchstart",  onTouchStart, false);
        root.addEventListener("touchend",    onTouchEnd,   false);
        root.addEventListener("touchcancel", onTouchEnd,   false);
        root.addEventListener("touchmove",   onTouchMove,  false);
    }
}
