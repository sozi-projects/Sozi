/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {toArray} from "../utils";

const	svgNs = "http://www.w3.org/2000/svg";
const soziNs = "http://sozi.baierouge.fr";
const xhtmlNs = "http://www.w3.org/1999/xhtml";

let player;

function defaultEventHandler(evt) {
    evt.stopPropagation();
}

const mediaToStartByFrameId = {};
const mediaToStopByFrameId = {};

function onFrameChange() {
    const frameId = player.currentFrame.frameId;
    if (frameId in mediaToStartByFrameId) {
        mediaToStartByFrameId[frameId].forEach(m => {
            m.play();
        });
    }
    if (frameId in mediaToStopByFrameId) {
        mediaToStopByFrameId[frameId].forEach(m => {
            m.pause();
        });
    }
}

export function init(aPlayer) {
    player = aPlayer;

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
    const videoSources = svgRoot.getElementsByTagName(soziPrefix + ":video");
    const audioSources = svgRoot.getElementsByTagName(soziPrefix + ":audio");

    const mediaSources = toArray(videoSources).concat(toArray(audioSources));

    // Replace them with HTML5 audio and video elements
    const mediaList = [];
    mediaSources.forEach(source => {
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

            // Create HTML media element
            const htmlMedia = document.createElementNS(xhtmlNs, tagName);
            htmlMedia.setAttribute("controls", "controls");
            if (tagName === "video") {
                htmlMedia.setAttribute("width", rect.getAttribute("width"));
                htmlMedia.setAttribute("height", rect.getAttribute("height"));
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
            foreignObject.setAttribute("width", rect.getAttribute("width"));
            foreignObject.setAttribute("height", rect.getAttribute("height"));
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
    });
}
