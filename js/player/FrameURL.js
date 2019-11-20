/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let player;

export function init(aPlayer) {
    player = aPlayer;

    window.addEventListener("hashchange", onHashChange, false);

    if (player.presentation.updateURLOnFrameChange) {
        player.addListener("frameChange", onFrameChange);
    }
}

export function getFrame() {
    if (window.location.hash) {
        const indexOrId = window.location.hash.slice(1);
        const frame = player.presentation.getFrameWithId(indexOrId);
        if (frame) {
            return frame;
        }
        else {
            const index = parseInt(indexOrId);
            return !isNaN(index) && index > 0 && index <= player.presentation.frames.length ?
                player.presentation.frames[index - 1] :
                player.currentFrame;
        }
    }
    else {
        return player.currentFrame;
    }
}

function onHashChange() {
    const frame = getFrame();
    if (player.currentFrame !== frame) {
        player.moveToFrame(frame);
    }
}

function onFrameChange() {
    window.location.hash = "#" + player.currentFrame.frameId;
}
