/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Show/hide the frame list.
 *
 * This module is part of the Sozi player embedded in each presentation.
 *
 * @module
 */

import {Animator} from "./Animator";
import * as Timing from "./Timing";

/** The duration of the open/close animation of the frame list.
 *
 * @readonly
 * @type {number} */
const DURATION_MS = 500;

/** The HTML element that contains the frame list.
 *
 * @type {HTMLElement} */
let frameList;

/** The HTML links to each frame in the frame list.
 *
 * @type {HTMLAnchorElement[]} */
let links;

/** The current Sozi player.
 *
 * @type {module:player/Player.Player} */
let player;

/** An animator to open/close the frame list.
 *
 * @type {module:player/Animator.Animator} */
let animator;

/** The current open status of the frame list.
 *
 * @default
 * @type {boolean} */
let isOpen = false;

/** The start location of the frame list with respect to the left border of the viewport.
 *
 * 1 represents the width of the frame list.
 *
 * @default
 * @type {number} */
let startOffset = -1;

/** The start location of the frame list with respect to the left border of the viewport.
 *
 * 1 represents the width of the frame list.
 *
 * @default
 * @type {number} */
let endOffset = -1;

/** The current location of the frame list with respect to the left border of the viewport.
 *
 * 1 represents the width of the frame list.
 *
 * @default
 * @type {number} */
let currentOffset = startOffset;

/** Initialize the frame list management.
 *
 * This function creates an {@linkcode module:player/Animator.Animator|animator}
 * to manage the open/close animations and registers its {@linkcode module:player/Animator.step|step}
 * even handler.
 *
 * It registers a {@linkcode module:player/Player.frameChange|frameChange} event handler
 * to highlight the current frame title in the frame list.
 *
 * It also registers mouse and keyboard events related to the frame list.
 *
 * @param {module:player/Player.Player} p - The current Sozi player.
 */
export function init(p) {
    player = p;

    frameList = document.querySelector(".sozi-frame-list");
    links = frameList.querySelectorAll("li a");

    for (let link of links) {
        link.addEventListener("click", evt => {
            if (evt.button === 0) {
                player.previewFrame(link.hash.slice(1));
                evt.preventDefault();
            }
        });
    }

    animator = new Animator();
    animator.addListener("step", onAnimatorStep);
    window.addEventListener("keypress", onKeyPress, false);
    window.addEventListener("resize", () => setCurrentOffset(currentOffset));
    player.viewport.addListener("mouseDown", onMouseDown);
    frameList.addEventListener("mouseout", onMouseOut, false);
    p.addListener("frameChange", onFrameChange);
    setCurrentOffset(startOffset);
}

/** Set the location of the frame list with respect to the left border of the viewport.
 *
 * 1 represents the width of the frame list.
 *
 * @param {number} offset - The new location.
 */
function setCurrentOffset(offset) {
    currentOffset = offset;
    frameList.style.left = currentOffset * frameList.offsetWidth + "px";
}

/** Move the frame list to the given location, with an animation.
 *
 * 1 represents the width of the frame list.
 *
 * @param {number} offset - The target location.
 */
function moveTo(offset) {
    player.pause();
    startOffset = currentOffset;
    endOffset = offset;
    animator.start(Math.abs(endOffset - startOffset) * DURATION_MS);
}

/** Open the frame list. */
export function open() {
    moveTo(0);
}

/** Close the frame list. */
export function close() {
    moveTo(-1);
}

/** Toggle the open/closed status of the frame list. */
export function toggle() {
    moveTo(-1 - endOffset);
}

/** Process a keypress event related to the frame list.
 *
 * If enabled by the presentation, pressing the key `T` will toggle the open/close status of the frame list.
 *
 * @param {KeyboardEvent} evt - The DOM event representing the keypress.
 *
 * @listens keypress
 */
function onKeyPress(evt) {
    // Keys with modifiers are ignored
    if (evt.altKey || evt.ctrlKey || evt.metaKey) {
        return;
    }

    switch (evt.charCode || evt.which) {
        case 84: // T
        case 116: // t
            if (player.presentation.enableKeyboardNavigation) {
                player.disableBlankScreen();
                toggle();
            }
            break;
        default:
            return;
    }

    evt.stopPropagation();
    evt.preventDefault();
}

/** Perform an animation step while moving the frame list.
 *
 * This function is called by the current animator.
 *
 * @param {number} progress - The current progress indicator, between 0 and 1.
 *
 * @listens module:player/Animator.step
 */
function onAnimatorStep(progress) {
    const p = Timing.ease(progress);
    setCurrentOffset(endOffset * p + startOffset * (1 - p));
}

/** Process a mouse-down event.
 *
 * If enabled by the presentation, pressing the middle mouse button will
 * toggle the open/close status of the frame list.
 *
 * @param {number} button - The index of the button that was pressed.
 *
 * @listens module:player/Viewport.mouseDown
 */
function onMouseDown(button) {
    if (player.presentation.enableMouseNavigation && button === 1) {
        toggle();
    }
}

/** Process a mouse-out event.
 *
 * When the mouse cursor moves out of the frame list area,
 * this function closes it.
 *
 * @param {MouseEvent} evt - The DOM event representing the mouse gesture.
 *
 * @listens mouseout
 */
function onMouseOut(evt) {
    let rel = evt.relatedTarget;
    while (rel && rel !== frameList && rel !== document.documentElement) {
        rel = rel.parentNode;
    }
    if (rel !== frameList) {
        close();
        evt.stopPropagation();
    }
}

/** Highlight the current frame in the frame list.
 *
 * @listens module:player/Player.frameChange
 */
function onFrameChange() {
    for (let link of links) {
        link.className = link.hash === "#" + player.currentFrame.frameId ?
            "current" :
            "";
    }
}
