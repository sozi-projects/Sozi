/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

const MAX_FLICK_TIME = 100;  // max time in ms to accept a touch move as flick gesture
const MIN_FLICK_TRAVEL = 20; // min distance to accept a touch move as flick gesture

var MIN_SLOW_TRAVEL_X;       // minimum distance to accept a touch move as slow swipe gesture in horizontal direction 
var MIN_SLOW_TRAVEL_Y;       // minimum distance to accept a touch move as slow swipe gesture in vertical direction

var MIN_SCROLL_TRAVEL_X;       // minimum distance to accept a touch move as scroll swipe gesture in horizontal direction 
var MIN_SCROLL_TRAVEL_Y;       // minimum distance to accept a touch move as scroll swipe gesture in vertical direction

const ROTATE_THRESHHOLD = 10;   // must be exceeded once to accept rotating gesture - for more stability
const ZOOM_UP_THRESHHOLD = 1.5; // must be exceeded once to accept zooming gesture - for more stability
const ZOOM_LOW_THRESHHOLD = 1/ZOOM_UP_THRESHHOLD;

/** The current Sozi player.
 *
 * @type {module:player/Player.Player} */
let player;

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
    
    /**
     *
     * calculate the angle between this line and another.
     * @param {module:player/TouchGestures.Line} otherLine - the line defining the second leg of the angle.
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
    

    /**
     *
     * returns the average distance in x direction between this line and another.
     * @param {module:player/TouchGestures.Line} otherLine - the line to calculate the distance to.
     * 
     */
    getXDist = function(otherLine) {
/*
        var dist1 = this.x1 - otherLine.x1;
        var dist2 = this.x2 - otherLine.x2;
        return (dist1 + dist2) / 2;
 */
        return (this.x1 - otherLine.x1 + this.x2 - otherLine.x2) / 2;
    };

    /**
     *
     * returns the average distance in y direction between this line and another.
     * @param {module:player/TouchGestures.Line} otherLine - the line to calculate the distance to.
     * 
     */
    getYDist = function(otherLine) {
/*
        var dist1 = this.y1 - otherLine.y1;
        var dist2 = this.y2 - otherLine.y2;
        return (dist1 + dist2) / 2;
*/
        return (this.y1 - otherLine.y1 + this.y2 - otherLine.y2) / 2;
    };

    /**
     *
     * the square of this line's length.
     * 
     */
    getSqrLength() {
        return Math.pow(this.x1 - this.x2, 2) + Math.pow(this.y1 - this.y2, 2);
    };

    /**
     *
     * the Midpoint of this line
     * @returns {object} - x and y coordinate of the midpoint
     * 
     */
    getMidpoint() {
        return { x: (this.x1 + this.x2) / 2, y: (this.y1 + this.y2) / 2 };
    };
}

/**
 *
 */
class Gesture {
    move(touches){}
    rejects(touches){}
    finish(){}
    
    doSwipe(){}
    // tests for vertical or horizontal swipes according to a given minimum movement
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

class SingleGesture extends Gesture {
    constructor(touches){
      super();
      
      this.flickTime = Date.now(); //   
      this.firstTouch = {x:touches[0].clientX, y:touches[0].clientY}; // first touched point
      this.lastTouch = this.firstTouch;  // last touched point
      this.prevTouch = this.firstTouch;  // point touched before the last
      this.swipeDone = false;  // swipe performed while moving
    }
    
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
    
    finish(){
        // check quick swipe when finger is released.
        // a quick swipe happend, when the last movement before release 
        // was a quick flick in one direction. The finger has to be moved for a certain distance
        // within a short timeframe right before release.
        let travelTime = Date.now() - this.flickTime;
        if( travelTime < MAX_FLICK_TIME){
      
            this.checkSwipe(  this.lastTouch.x - this.prevTouch.x,
                              this.lastTouch.y - this.prevTouch.y,
                              MIN_FLICK_TRAVEL,
                              MIN_FLICK_TRAVEL);
        } 
    }
    
}

class DoubleGesture extends Gesture {
    constructor(touches){
        super();
        
        this.startLine = new Line(
            touches[0].clientX,
            touches[0].clientY,
            touches[1].clientX,
            touches[1].clientY
        );
        
        this.lastLine = this.startLine;
        this.rotateEnabled = false;
        this.zoomEnabled = false;
    }
       
    move(touches){
        let actLine = new Line(
            touches[0].clientX,
            touches[0].clientY,
            touches[1].clientX,
            touches[1].clientY
          );

        if( this.zoomEnabled){
          var zoom = (actLine.getSqrLength() / this.lastLine.getSqrLength());
          var mid = actLine.getMidpoint();
          player.viewport.zoom(zoom, mid.x, mid.y);
        } else {
        // check threshhold to enable zoom
          var zoom = Math.abs(actLine.getSqrLength() / this.startLine.getSqrLength());
          if ( zoom > ZOOM_UP_THRESHHOLD || zoom < ZOOM_LOW_THRESHHOLD) this.zoomEnabled = true;           
        }
        if ( this.rotateEnabled){
          var rotate = actLine.getAngle(this.lastLine);
          player.viewport.rotate(rotate);
        } else {
        // check threshhold to enable rotation
        if (Math.abs(actLine.getAngle(this.startLine)) >= ROTATE_THRESHHOLD) this.rotateEnabled = true;          
        }

        var panX = actLine.getXDist(this.lastLine);
        var panY = actLine.getYDist(this.lastLine);

        player.viewport.translate(panX, panY);

        this.lastLine = actLine;
    }
    
    rejects(touches){
        return touches.length != 2;
    }
}

function updateScreenValues(){
    MIN_SLOW_TRAVEL_X = Math.floor(window.innerWidth/2);
    MIN_SLOW_TRAVEL_Y = Math.floor(window.innerHeight/2);
    MIN_SCROLL_TRAVEL_X = Math.floor(window.innerWidth/20);
    MIN_SCROLL_TRAVEL_Y = Math.floor(window.innerHeight/20);
}
      
function createGesture(touches) {
    switch(touches.length){
        case 1: return new SingleGesture(touches);
        case 2: return new DoubleGesture(touches);
        case 3: return new TripleGesture(touches);
        default: return null;
    }
}

function updateGesture(touches) {
    if(currentGesture == null || currentGesture.rejects(touches)){
        currentGesture = createGesture(touches);
    }    
}

function onTouchStart(evt) {
    evt.preventDefault();
    updateGesture(evt.touches);
}

function onTouchMove(evt) {
    updateGesture(evt.touches);
    currentGesture.move(evt.touches);
}

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
 * @param parent - The dom object to add touch gestures to.
 */
export function init(p){
    
    player = p;
    let root = player.viewport.svgRoot;
    
    updateScreenValues();
    window.addEventListener("resize", updateScreenValues);
    
    root.addEventListener("touchstart", onTouchStart, false);
    root.addEventListener("touchend", onTouchEnd, false);
    root.addEventListener("touchcancel", onTouchEnd, false);
    root.addEventListener("touchmove", onTouchMove, false);
}

