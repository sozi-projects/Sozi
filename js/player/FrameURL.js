/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Manage the browser's location bar while playing a presentation.
 *
 * This module is part of the Sozi player embedded in each presentation.
 *
 * @module
 */

/** The current Sozi player.
 *
 * @type {module:player/Player.Player} */
let player;

/** Initialize the location bar management.
 *
 * This function registers `hashchange` and
 * {@linkcode module:player/Player.frameChange|frameChange} event handlers
 * to reflect the current frame ID in the current URL.
 *
 * @param {module:player/Player.Player} p - The current Sozi player.
 */
export function init(p) {
    player = p;

    window.addEventListener("hashchange", onHashChange, false);

    if (player.presentation.updateURLOnFrameChange) {
        player.on("frameChange", onFrameChange);
    }
}

/** Get the frame for the current URL.
 *
 * This function parses the current URL hash as a frame ID or a frame number.
 * It returns the corresponding frame, or the current frame if no match was found.
 *
 * @returns {module:model/Presentation.Frame} - The frame that corresponds to the current URL hash.
 */
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

/** Process the `hashchange` event.
 *
 * Move the presentation to the frame that corresponds to the current URL.
 *
 * @listens hashchange
 */
function onHashChange() {
    const frame = getFrame();
    if (player.currentFrame !== frame) {
        player.moveToFrame(frame);
    }
}

/** Update the URL hash in the location bar on frame change.
 *
 * @listens module:player/Player.frameChange
 */
function onFrameChange() {
    window.location.hash = "#" + player.currentFrame.frameId;
}
