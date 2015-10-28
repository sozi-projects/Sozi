/* Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var	startAt = 0;
var lapTime = 0;	// Time of last start / resume. (0 if not running)
var isRunning = false;
var $time
var clocktimer;
var stopButton = document.getElementById("sozi-stop-stopwatch");

export function init() {
    stopButton.onclick = function() {toggle()};
    document.getElementById("sozi-reset-stopwatch").onclick = function() {reset()};
    show();
    start();
}

function now() {
    return (new Date()).getTime(); 
} 

export function start() {
    startAt	= startAt ? startAt : now();
    isRunning = true;
    stopButton.firstChild.innerHTML = "Stop";
    stopButton.setAttribute("title", "Stop stopwatch");
    clocktimer = setInterval(update, 100);
}

export function stop() {
    lapTime	= startAt ? lapTime + now() - startAt : lapTime;
    startAt	= 0; // Paused
    isRunning = false;
    stopButton.firstChild.innerHTML = "Start";
    stopButton.setAttribute("title", "Start stopwatch");
    clearInterval(clocktimer);
}

export function reset() {
    lapTime = 0;
    startAt = 0;
    update();
    isRunning ? start() : stop();
}

function pad(num) {
    var s = "0000" + num;
    return s.substr(s.length - 2);
}

function formattedTime() {
    var time = lapTime + (startAt ? now() - startAt : 0);
    var hours = 0;
    var mins = 0;
    var secs = 0;
    var newTime = '';
    hours = Math.floor( time / (60 * 60 * 1000) );
    time = time % (60 * 60 * 1000);
    mins = Math.floor( time / (60 * 1000) );
    time = time % (60 * 1000);
    secs = Math.floor( time / 1000 );
    newTime = pad(hours) + ':' + pad(mins) + ':' + pad(secs);
    return newTime;
}

function show() {
    $time = document.getElementById('time');
    update();
}

export function update() {
    $time.innerHTML = formattedTime();
}

export function toggle() {
    isRunning ? stop() : start();
}

