/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Animator} from "./Animator";
import * as Timing from "./Timing";

const DURATION_MS = 500;

var tocElement;
var animator;
var isOpen = false;
var startOffset = -1;
var endOffset = -1;
var currentOffset = startOffset;

export function init(viewport) {
    tocElement = document.querySelector(".sozi-toc");
    animator = Object.create(Animator).init();
    animator.addListener("step", onAnimatorStep);
    window.addEventListener("keypress", onKeyPress, false);
    viewport.addListener("mouseDown", onMouseDown);
    tocElement.addEventListener("mouseout", onMouseOut, false);
    setCurrentOffset(startOffset);
}

function setCurrentOffset(offset) {
    currentOffset = offset;
    tocElement.style.left = currentOffset * tocElement.clientWidth + "px";
}

export function toggle() {
    startOffset = currentOffset;
    endOffset = -1 - endOffset;
    animator.start(Math.abs(endOffset - startOffset) * DURATION_MS);
}

function onKeyPress(evt) {
    // Keys with modifiers are ignored
    if (evt.altKey || evt.ctrlKey || evt.metaKey) {
        return;
    }

    switch (evt.charCode || evt.which) {
        case 84: // T
        case 116: // t
            toggle();
            break;
        default:
            return;
    }

    evt.stopPropagation();
    evt.preventDefault();
}

function onAnimatorStep(progress) {
    var p = Timing.ease(progress);
    setCurrentOffset(endOffset * p + startOffset * (1 - p));
}

function onMouseDown(button) {
    console.log(button);
    if (button === 1) {
        toggle();
    }
}

function onMouseOut(evt) {
    var rel = evt.relatedTarget;
    while (rel && rel !== tocElement && rel !== document.documentElement) {
        rel = rel.parentNode;
    }
    if (rel !== tocElement) {
        toggle();
        evt.stopPropagation();
    }
}
