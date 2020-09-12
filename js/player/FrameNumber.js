/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 /** Show the current frame number.
  *
  * This module is part of the Sozi player embedded in each presentation.
  *
  * @module
  */

import * as FrameList from "./FrameList";

/** Initialize the frame number management.
 *
 * This function registers event handlers:
 * - A {@linkcode module:player/Viewport.frameChange|frameChange} event from the Sozi player will update the frame number.
 * - A `click` event on the frame number will open the frame list.
 *
 * @param {module:player/Player.Player} player - The current Sozi player.
 */
export function init(player) {
    const frameNumber = document.querySelector(".sozi-frame-number");

    player.addListener("frameChange", () => {
        frameNumber.innerHTML = player.currentFrame.index + 1;
        frameNumber.style.visibility = player.currentFrame.showFrameNumber ? "visible" : "hidden";
    });

    frameNumber.addEventListener("click", FrameList.open);
}
