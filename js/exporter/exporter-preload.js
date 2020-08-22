/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {ipcRenderer} from "electron";

function exportFrames(callerId, frameIndex) {
    if (sozi.player.disableMedia) {
        sozi.player.disableMedia();
    }

    document.querySelector(".sozi-blank-screen").style.display = "none";

    sozi.player.addListener("frameChange", () => {
        ipcRenderer.sendTo(callerId, "frameChange", sozi.player.currentFrame.index);
    });

    sozi.player.jumpToFrame(frameIndex);
}

ipcRenderer.on("exportFrames", (evt, {callerId, frameIndex}) => exportFrames(callerId, frameIndex));
ipcRenderer.on("jumpToFrame", (evt, frameIndex) => sozi.player.jumpToFrame(frameIndex));
