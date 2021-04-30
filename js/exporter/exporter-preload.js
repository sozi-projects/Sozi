/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global sozi */

import {ipcRenderer} from "electron";

ipcRenderer.on("initializeExporter", (evt, {callerId, frameIndex}) => {
    if (sozi.player.disableMedia) {
        sozi.player.disableMedia();
    }

    document.querySelector(".sozi-blank-screen").style.display = "none";

    sozi.player.jumpToFrame(frameIndex);
    ipcRenderer.sendTo(callerId, "jumpToFrame.done", frameIndex);
});

ipcRenderer.on("jumpToFrame", (evt, {callerId, frameIndex}) => {
    sozi.player.jumpToFrame(frameIndex);
    ipcRenderer.sendTo(callerId, "jumpToFrame.done", frameIndex);
});

function ipcMessage(name) {
    return new Promise(resolve => {
        ipcRenderer.once(name, resolve);
    });
}

ipcRenderer.on("moveToNext", async (evt, {callerId, timeStepMs}) => {
    sozi.player.targetFrame = sozi.player.nextFrame;

    const layerProperties      = sozi.player.targetFrame.layerProperties;
    const transitionDurationMs = sozi.player.targetFrame.transitionDurationMs;
    const targetFrameIndex     = sozi.player.targetFrame.index;

    for (let camera of sozi.viewport.cameras) {
        const lp = layerProperties[camera.layer.index];
        sozi.player.setupTransition(camera, lp.transitionTimingFunction, lp.transitionRelativeZoom, lp.transitionPath);
    }

    for (let timeMs = 0; timeMs < transitionDurationMs; timeMs += timeStepMs) {
        sozi.player.onAnimatorStep(timeMs / transitionDurationMs);
        ipcRenderer.sendTo(callerId, "moveToNext.step");
        await ipcMessage("moveToNext.more");
    }

    sozi.player.jumpToFrame(targetFrameIndex);
    ipcRenderer.sendTo(callerId, "jumpToFrame.done", targetFrameIndex);
});
