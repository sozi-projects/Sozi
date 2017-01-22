/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import * as FrameList from "./FrameList";

export function init(player) {
    const frameNumber = document.querySelector(".sozi-frame-number");

    player.addListener("frameChange", () => {
        frameNumber.innerHTML = player.currentFrameIndex + 1;
        frameNumber.style.visibility = player.currentFrame.showFrameNumber ? "visible" : "hidden";
    });

    frameNumber.addEventListener("click", FrameList.open);
}
