/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let player;

export function init(aPlayer) {
    player = aPlayer;

    window.addEventListener("hashchange", onHashChange, false);
    player.addListener("frameChange", onFrameChange);
}

export function getFrameIndex() {
    if (window.location.hash) {
        const indexOrId = window.location.hash.slice(1);
        const frame = player.presentation.getFrameWithId(indexOrId);
        if (frame) {
            return frame.index;
        }
        else {
            const index = parseInt(indexOrId);
            return !isNaN(index) && index > 0 && index <= player.presentation.frames.length ?
                index - 1 : player.currentFrameIndex;
        }
    }
    else {
        return player.currentFrameIndex;
    }
}

function onHashChange() {
    const index = getFrameIndex();
    if (player.currentFrameIndex !== index) {
        player.moveToFrame(index);
    }
}

function onFrameChange() {
    window.location.hash = "#" + player.currentFrame.frameId;
}
