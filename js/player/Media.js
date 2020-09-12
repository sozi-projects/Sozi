/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Manage the video or audio elements embedded in a presentation.
 *
 * This module is part of the Sozi player embedded in each presentation.
 *
 * @module
 */

/** The SVG namespace URI.
 *
 * @readonly
 * @type {string} */
const svgNs = "http://www.w3.org/2000/svg";

/** The Sozi namespace URI.
 *
 * @readonly
 * @type {string} */
const soziNs = "http://sozi.baierouge.fr";

/** The XHTML namespace URI.
 *
 * @readonly
 * @type {string} */
const xhtmlNs = "http://www.w3.org/1999/xhtml";

/** The current Sozi player.
 *
 * @type {module:player/Player.Player} */
let player;

/** A default event handler that prevents the propagation of an event.
 *
 * For instance, this function prevents a click event inside a video element
 * from also triggering a transition in the current presentation.
 *
 * @param {Event} evt - The DOM event to stop.
 */
function defaultEventHandler(evt) {
    evt.stopPropagation();
}

/** A dictionary of video and audio elements to start in each frame.
 *
 * @type {object} */
const mediaToStartByFrameId = {};

/** A dictionary of video and audio elements to stop in each frame.
 *
 * @type {object} */
const mediaToStopByFrameId = {};

/** Process the {@linkcode module:player/Viewport.frameChange|frameChange} event.
 *
 * This function will start or stop the video and audio elements
 * that are registered for the current frame.
 */
function onFrameChange() {
    const frameId = player.currentFrame.frameId;
    if (frameId in mediaToStartByFrameId) {
        for (let m of mediaToStartByFrameId[frameId]) {
            m.play();
        }
    }
    if (frameId in mediaToStopByFrameId) {
        for (let m of mediaToStopByFrameId[frameId]) {
            m.pause();
        }
    }
}

/** Initialize the video and audio element management.
 *
 * This function transforms custom XML `video` and `audio` into their
 * HTML counterparts.
 *
 * It extracts the start/stop frame information for each media element,
 * and registers a {@linkcode module:player/Viewport.frameChange|frameChange} event handler
 * to start and stop media in the appropriate frames.
 *
 * @param {module:player/Player.Player} p - The current Sozi player.
 */
export function init(p) {
    player = p;

    player.addListener("frameChange", onFrameChange);

    // Find namespace prefix for Sozi.
    // Inlining SVG inside HTML does not allow to use
    // namespace-aware DOM methods.
    const svgRoot = player.presentation.document.root;
    const svgAttributes = svgRoot.attributes;
    let soziPrefix;
    for (let attrIndex = 0; attrIndex < svgAttributes.length; attrIndex ++) {
        if (svgAttributes[attrIndex].value === soziNs) {
            soziPrefix = svgAttributes[attrIndex].name.slice(6);
            break;
        }
    }

    if (!soziPrefix) {
        return;
    }

    // Get custom video and audio elements
    const videoSources = Array.from(svgRoot.getElementsByTagName(soziPrefix + ":video"));
    const audioSources = Array.from(svgRoot.getElementsByTagName(soziPrefix + ":audio"));

    // Replace them with HTML5 audio and video elements
    const mediaList = [];
    for (let source of videoSources.concat(audioSources)) {
        const rect = source.parentNode;
        const tagName = source.localName.slice(soziPrefix.length + 1);

        // Create HTML media source element
        const htmlSource = document.createElementNS(xhtmlNs, "source");
        htmlSource.setAttribute("type", source.getAttribute(soziPrefix + ":type"));
        htmlSource.setAttribute("src",  source.getAttribute(soziPrefix + ":src"));

        let j;
        for (j = 0; j < mediaList.length; j += 1) {
            if (mediaList[j].rect === rect) {
                break;
            }
        }

        if (j === mediaList.length) {
            rect.setAttribute("visibility", "hidden");

            const width  = rect.getAttribute("width");
            const height = rect.getAttribute("height");

            // Create HTML media element
            const htmlMedia = document.createElementNS(xhtmlNs, tagName);
            if (source.getAttribute(soziPrefix + ":controls") === "true") {
                htmlMedia.setAttribute("controls", "controls");
                htmlMedia.setAttribute("style", `width:${width}px;height:${height}px;`);
            }
            if (tagName === "video") {
                htmlMedia.setAttribute("width", width);
                htmlMedia.setAttribute("height", height);
            }
            htmlMedia.addEventListener("click", defaultEventHandler, false);
            htmlMedia.addEventListener("mousedown", defaultEventHandler, false);
            htmlMedia.addEventListener("mouseup", defaultEventHandler, false);
            htmlMedia.addEventListener("mousemove", defaultEventHandler, false);
            htmlMedia.addEventListener("contextmenu", defaultEventHandler, false);

            // Create HTML root element
            const html = document.createElementNS(xhtmlNs, "html");
            html.appendChild(htmlMedia);

            // Create SVG foreign object
            const foreignObject = document.createElementNS(svgNs, "foreignObject");
            foreignObject.setAttribute("x", rect.getAttribute("x"));
            foreignObject.setAttribute("y", rect.getAttribute("y"));
            foreignObject.setAttribute("width", width);
            foreignObject.setAttribute("height", height);
            foreignObject.appendChild(html);

            rect.parentNode.insertBefore(foreignObject, rect.nextSibling);

            if (source.hasAttribute(soziPrefix + ":start-frame")) {
                const startFrameId = source.getAttribute(soziPrefix + ":start-frame");
                const stopFrameId = source.getAttribute(soziPrefix + ":stop-frame");
                if (!(startFrameId in mediaToStartByFrameId)) {
                    mediaToStartByFrameId[startFrameId] = [];
                }
                if (!(stopFrameId in mediaToStopByFrameId)) {
                    mediaToStopByFrameId[stopFrameId] = [];
                }
                mediaToStartByFrameId[startFrameId].push(htmlMedia);
                mediaToStopByFrameId[stopFrameId].push(htmlMedia);
            }

            if (source.getAttribute(soziPrefix + ":loop") === "true") {
                htmlMedia.setAttribute("loop", "true");
            }

            mediaList.push({
                rect: source.parentNode,
                htmlMedia
            });
        }

        // Append HTML source element to current HTML media element
        mediaList[j].htmlMedia.appendChild(htmlSource);
    }
}

/** Disable video and audio support in the current presentation.
 *
 * This function disables the {@linkcode module:player/Viewport.frameChange|frameChange} event handler
 * and pauses all playing videos.
 */
export function disable() {
    player.removeListener("frameChange", onFrameChange);

    const frameId = player.currentFrame.frameId;
    if (frameId in mediaToStartByFrameId) {
        for (let m of mediaToStartByFrameId[frameId]) {
            m.pause();
        }
    }
}
