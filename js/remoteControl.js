/* Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import * as Stopwatch from "./player/Stopwatch";
import {toArray} from "./utils";

var links;

function pm(data) {
    var json = JSON.stringify(data);
    parent.window.opener.postMessage(json, '*'); 
}

function init() {
    Stopwatch.init();

    document.getElementById("sozi-previous-button").onclick = function() {pm({action: 'moveToPrevious'})};
    document.getElementById("sozi-next-button").onclick = function() {pm({action: 'moveToNext'})};

    links = toArray(document.querySelectorAll(".sozi-frame-list li a"));
    links.forEach(link => {
        link.addEventListener("click", evt => {
            if (evt.button === 0) {
                var index = parseInt(link.dataset.frameIndex);
                pm({
                    action: 'moveToFrame',
                    frame: index
                });
                evt.preventDefault();
            }
        });
    });
}

window.addEventListener("keydown", function (ev) {
    pm({
        action: 'keydown',
        keyCode: ev.keyCode,
        shiftKey: ev.shiftKey
    });
}, false);

window.addEventListener("keypress", function (ev) {
    pm({
        action: 'keypress',
        keyCode: ev.charCode || ev.which,
        shiftKey: ev.shiftKey
    });
}, false);

window.addEventListener("message", function (event) {
    data = JSON.parse(event.data);
    if (data.action == "frameChange") {
        links.forEach(link => {
            link.className = parseInt(link.dataset.frameIndex) === data.currentFrameIndex ?
                "current" :
                "";
        });
    }
    else if (data.action == "init") {
       init(); 
    }
}, false);
