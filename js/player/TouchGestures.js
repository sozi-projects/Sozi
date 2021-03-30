/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */


/** Max time in ms to accept a touch move as quick swipe gesture
 *
 * @readonly
 * @default
 * @type {number} */
const MAX_FLICK_TIME = 100; 

/** Min distance to accept a touch move as quick swipe gesture.
 * Threshhold to prevent any touch to be interpreted as swipe.
 *
 * @readonly
 * @default
 * @type {number} */
const MIN_FLICK_TRAVEL = 20;

/** Minimum distance to accept a touch move as slow swipe gesture in horizontal direction.
 * value depends on screen size and therefore is (re)calculated 
 *
 * @default
 * @type {number} */
var MIN_SLOW_TRAVEL_X;

/** Minimum distance to accept a touch move as slow swipe gesture in vertical direction.
 * value depends on screen size and therefore is (re)calculated 
 *
 * @default
 * @type {number} */
var MIN_SLOW_TRAVEL_Y;       // minimum distance to accept a touch move as slow swipe gesture in vertical direction


/** Tolerance of slight rotation gesture movement assumed to be unintentional.
 * The Threshhold adds some visual stability to pan movements.
 * Must be exceeded once to accept a rotating gesture.
 *
 * @readonly
 * @default
 * @type {number} */
const ROTATE_THRESHHOLD = 10;   

/** Upper tolerance of slight zoom gesture movement assumed to be unintentional.
 * The Threshhold adds some visual stability to pan movements.
 * Must be exceeded once to accept a zoom gesture.
 *
 * @readonly
 * @default
 * @type {number} */
const ZOOM_UP_THRESHHOLD = 1.5;

/** Lower tolerance of slight zoom gesture movement assumed to be unintentional.
 * The Threshhold adds some visual stability to pan movements.
 * Must be exceeded once to accept a zoom gesture.
 *
 * @readonly
 * @default
 * @type {number} */
const ZOOM_LOW_THRESHHOLD = 1/ZOOM_UP_THRESHHOLD;

/** The current Sozi player.
 * @type {module:player/Player.Player} */
let player;

/** The current Sozi presentation.
 * @type {module:model/Presentation.Presentation} */
let presentation;

/** flag according to any of the states mouseZoomEnabled, 
 * mouseTranslationEnabled or mouseRotationEnabled in presentation 
 * @type {boolean} */
let interactionGestureEnabled;

/** The currently active gesture handler depending on the amount of touchpoints.
 * null, if no touches on the screen.
 * @type {module:player/TouchGestures.Gesture} */
let currentGesture;



/**
 *
 * Helper class defining a line for geometric calculations.
 * It is used to interpret changes in two finger gestures.
 *
 */
class Line {

    
    /** Creates  a new line defined by 2 points.
     *
     * @param x1 - the X coordinate of the first point.
     * @param y1 - the Y coordinate of the first point.
     * @param x2 - the x coordinate of the second point.
     * @param y2 - the y coordinate of the second point.
     */
     constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    
    /** Calculate the angle between this line and another.
     * 
     @param {module:player/TouchGestures.Line} otherLine - the line defining the second leg of the angle.
     @returns {number} the angle in degree
     * 
     */
    getAngle(otherLine) {
        var dAx = this.x2 - this.x1;
        var dAy = this.y2 - this.y1;
        var dBx = otherLine.x2 - otherLine.x1;
        var dBy = otherLine.y2 - otherLine.y1;
        var angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);
        var degree_angle = angle * (180 / Math.PI);
        return degree_angle;
    }
    

    /** Calculates the average horizontal distance to another line according to the two definition points.
     *
     * @param {module:player/TouchGestures.Line} otherLine - the line to calculate the distance to.
     * @returns {number} the average horizontal distance.
     */
    getXDist (otherLine) {
        return (this.x1 - otherLine.x1 + this.x2 - otherLine.x2) / 2;
    };

    /** Calculates the average vertical distance to another line according to the two definition points.
     *
     * @param {module:player/TouchGestures.Line} otherLine - the line to calculate the distance to.
     * @returns {number} the average vertical distance.
     */
    getYDist (otherLine) {
        return (this.y1 - otherLine.y1 + this.y2 - otherLine.y2) / 2;
    };

    /** Calculates the square of the line's length.
     *
     * @returns {number} the square to the line's length.
     */
    getSqrLength() {
        return Math.pow(this.x1 - this.x2, 2) + Math.pow(this.y1 - this.y2, 2);
    };

    /** The Midpoint of this line in x and y coordinate
     * 
     * @returns {object} - x and y coordinate of the midpoint
     * 
     */
    getMidpoint() {
        return { x: (this.x1 + this.x2) / 2, y: (this.y1 + this.y2) / 2 };
    };
}

/**
 * abstract class for touch gesture handler.
 */
class Gesture {
    
    /** Touchpoints have been moved.
     * Specific behaviour to be implemented by derived classes
     *  
     * @param {object[]}touches - array of touchpoints from the touch event.
     * 
     */
    move(touches){}
    
    /** Checks, if the given touches (e.g. by number) cannot be processed by the specific gesture object
     * Must be implemented by derived classes.
     * 
     * @param {object[]}touches - array of touchpoints from the touch event.
     * @returns {boolean} - true, if touches are rejected, false if accepted
     * 
     */
    rejects(touches){}
    
    /** Gesture has been completed successfully.
     * Specific behaviour to be implemented by derived classes*/
    finish(){}
    
    /** Execute a swipe. 
     * Must be implemented by derived class.
     */
    doSwipe(){}

    /** Tests for vertical or horizontal swipes according to a given minimum movement.
     * Performs the swipe in the dominant direction (longer absolute move) 
     * 
     * @param {Number} distX - touch movement in horizontal direction
     * @param {Number} distY - touch movement in vertical direction
     * @param {Number} minX - minimum distance in horizontal direction to accept as swipe
     * @param {Number} minY - minimum distance in vertical direction to accept as swipe
     * @returns {boolean} - true, if a swipe was ececuted
     * 
     */
    checkSwipe(distX, distY, minX, minY){
        var dXAbs = Math.abs(distX);
        var dYAbs = Math.abs(distY);      
      
        if( dXAbs > dYAbs){ //potential horizontal swipe
            if( dXAbs >= minX){
                this.doSwipe((distX < 0) ? "left" : "right");
                return true;
            }
        } else { // potental vertical swipe
            if( dYAbs>= minY){
                this.doSwipe((distY < 0) ? "up" : "down");
                return true;
            } 
        }
      
        return false;
    }

}


/**
 * Handles single touch gestures.
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
     * @param {object[]} touches - the initial touchpoint objects when the gesture is first detected
    */
    constructor(touches){
      super();
      
      this.flickTime = Date.now(); // start time for quick swipes
      this.firstTouch = {x:touches[0].clientX, y:touches[0].clientY}; // first touched point for long swipes
      this.lastTouch = this.firstTouch;  // last touched point 
      this.prevTouch = this.firstTouch;  // point touched before the last
      this.swipeDone = false;  // swipe performed while moving
    }
    
    /** Performs a swipe. 
     * @param {string} direction - currently recognized "up", "down", "left", "right"
     * @override
     */
    doSwipe(direction){
        switch(direction){
            case "down":
            case "left":
                player.moveToNext();            
                break;
            case "up":
            case "right":
                player.moveToPrevious();
                break;
        }
    }
      
    /** Checks for long swipes when the touch point moves.
     * Also updates the last touch value to check  quick swipes when gesture is finished.
     *
     * @param {object[]} touches - the touchpoints
     * @override
     */
    move(touches){
        let current = {x:touches[0].clientX, y:touches[0].clientY};
        // check slow swipe at every movement
        // slow swipe only needs a touch to travel a certain distance 
        // without releasing the touchpoint.
        // the distance is about 1/2 of the display width to prevent accidental swipes
        if(this.checkSwipe( current.x - this.firstTouch.x,
                            current.y - this.firstTouch.y,
                            MIN_SLOW_TRAVEL_X,
                            MIN_SLOW_TRAVEL_Y)){
            this.swipeDone = true;
        } else {
          this.flickTime = Date.now();
          this.prevTouch = this.lastTouch;
          this.lastTouch = current;
        }
    }
    
    rejects(touches){
        return this.swipeDone || touches.length != 1;
    }
    
    /** check quick swipe when the touchpint is released from the screen.
     * A quick swipe happend, when the last movement before release was a quick flick in one direction. 
     * The touchpoint has to be moved for a certain distance within a short timeframe right before release.
     *
     * @override
     */
    finish(){
        // Do not swipe again, if long swipe already fired.
        // this prevents double swipe glitches for long AND fast swipe gestures.
        if(!this.swipeDone) {
            let travelTime = Date.now() - this.flickTime;
            if( travelTime < MAX_FLICK_TIME){
          
                this.checkSwipe(  this.lastTouch.x - this.prevTouch.x,
                                  this.lastTouch.y - this.prevTouch.y,
                                  MIN_FLICK_TRAVEL,
                                  MIN_FLICK_TRAVEL);
            }
        }
    }
    
}

/** Handles double touch gestures.
 * Double touch gestures control screen interactions like zoom, rotate and panning (translate).
 * To interpret changes the handler uses line objects which
 * virtuallyvirtually connect two touchpoints. 
 * 
 * @extends Gesture
 */
class DoubleGesture extends Gesture {
    
    /** Creates a new double touch gesture handler.
     * @param {object[]} touches - the initial touchpoint objects when the gesture is first detected
    */
    constructor(touches){
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
    }
       
    /** checks zoom threshhold and performs the actual zoom.
     * @param {module:player/TouchGestures.Line] actLine - the currently processed line.
     */
    zoom(actLine) {
        if( this.zoomEnabled){
          var zoom = (actLine.getSqrLength() / this.lastLine.getSqrLength());
          var mid = actLine.getMidpoint();
          player.viewport.zoom(zoom, mid.x, mid.y);
        } else {
        // check threshhold to enable zoom
          var zoom = Math.abs(actLine.getSqrLength() / this.startLine.getSqrLength());
          if ( zoom > ZOOM_UP_THRESHHOLD || zoom < ZOOM_LOW_THRESHHOLD) this.zoomEnabled = true;           
        }
    }
    
    /** checks roatation threshhold and performs the actual rotation.
     * @param {module:player/TouchGestures.Line] actLine - the currently processed line.
     */
    rotate(actLine){
        if ( this.rotateEnabled){
          var rotate = actLine.getAngle(this.lastLine);
          player.viewport.rotate(rotate);
        } else {
        // check threshhold to enable rotation
        if (Math.abs(actLine.getAngle(this.startLine)) >= ROTATE_THRESHHOLD) this.rotateEnabled = true;          
        }
    }
    
    /** performes the actual translation/pan.
     * @param {module:player/TouchGestures.Line] actLine - the currently processed line.
     */
    translate(actLine){
        var panX = actLine.getXDist(this.lastLine);
        var panY = actLine.getYDist(this.lastLine);
        player.viewport.translate(panX, panY);
    }
        
    
    /** Processes touchpoint moves.
     * checks, if each of translate, zoom or rotate are allowed by presentation's mouse enabled policy
     * and delegates the interaction to helper classes.
     * @param {object[]} touches - array of touchpoints.
     * @override
     */
    move(touches){
        let actLine = new Line(
            touches[0].clientX,
            touches[0].clientY,
            touches[1].clientX,
            touches[1].clientY
          );

        if(presentation.enableMouseZoom) this.zoom(actLine);
        if(presentation.enableMouseRotation) this.rotate(actLine);
        if(presentation.enableMouseTranslation) this.translate(actLine);
        
        this.lastLine = actLine;
    }
    
    /** rejects any number of touchpoints but 2.
     * @param {object[]} touches - array of touchpoints.
     * @override
     */
    rejects(touches){
        return touches.length != 2;
    }
}

/** A dummy gesture handler used when a gesture is restricted by mouse configuration.
 * The dummy pretends to handle a given number of touchpoints, but does nothing in effect.
 *
 * @extends Gesture
 */
class DummyGesture extends Gesture {

    /** constructs the dummy gesture handler
     * @param {Number} touchNum - the number of touches this dummy should pretend to handle.
     */
    constructor(touchNum){
        super();
        this.touchNum = touchNum;
    }
    
    /** rejects touch events that do not exaclty match the initial number of touches to be handled.
     * @override
     * @param {Object[]} touches - array of touch objects from the touch event
     */
    rejects(touches){
        return touches.length != this.touchNum;
    }
}

/** Updates all parameters depending on screen dimensions.
 * @listens window resize
 */
function updateScreenValues(){
    MIN_SLOW_TRAVEL_X = Math.floor(window.innerWidth/2);
    MIN_SLOW_TRAVEL_Y = Math.floor(window.innerHeight/2);
}
      
/** Creates a new gesture handler according to the number of currently applied touches.
 * If no appropriate handler can be identified according to number of touch points or the presentation's mouse enabled policy, 
 * a dummy handler is returned. 
 * The dummy does nothing in effect, but avoids the createGesture function to be called repeatedly.
 * 
 * @param {object[]} touches - array of currently active touches
 * @returns {module:player/TouchGestures.Gesture} - a new gesturehandler matching the number of touches or null, if no Handler matches.
 */
function createGesture(touches) {
    switch(touches.length){
        case 1: return presentation.enableMouseNavigation ? new SingleGesture(touches) : new DummyGesture(1);
        case 2: return interactionGestureEnabled ? new DoubleGesture(touches) : new DummyGesture(2);
        default: return new DummyGesture(touches.length);
    }
}

/** Checks, if the current gesture handler is appropriate for the given touches.
 * If not, a new gesture handler is put in place.
 * 
 * @param {object[]} touches - array of currently active touches
 */
function updateGesture(touches) {
    if(currentGesture == null || currentGesture.rejects(touches)){
        currentGesture = createGesture(touches);
    }    
}

/** Processes touch start.
 * initializes a gesture handler.
 *
 * @param {touchEvent} evt - the DOM event to process.
 * @listens touchstart
 */
function onTouchStart(evt) {
    evt.preventDefault();
    updateGesture(evt.touches);
}

/** Processes touch moves.
 * 
 * @param {touchEvent} evt - the DOM event to process.
 * @listens touchmove
 */
function onTouchMove(evt) {
    updateGesture(evt.touches);
    currentGesture.move(evt.touches);
}


/** Processes touch end.
 * @param {touchEvent} evt - the DOM event to process.
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
 *  This function adds touch listeners to the given parent.
 *
 * @param {module:player/Player.Player} player - The current Player.
 * @param {module:model/Presentation.Presentation} presentation - The presentation to play.
 */
export function init(p, pr){
    
    player = p;
    presentation = pr;

    interactionGestureEnabled = presentation.enableMouseRotation ||
        presentation.enableMouseZoom || presentation.enableMouseTranslation;
    
    if( presentation.enableMouseNavigation || interactionGestureEnabled ) {

        let root = player.viewport.svgRoot;
        
        updateScreenValues();
        window.addEventListener("resize", updateScreenValues);
        
        root.addEventListener("touchstart", onTouchStart, false);
        root.addEventListener("touchend", onTouchEnd, false);
        root.addEventListener("touchcancel", onTouchEnd, false);
        root.addEventListener("touchmove", onTouchMove, false);
    }
}

