/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var	svgNs = "http://www.w3.org/2000/svg";
var soziNs = "http://sozi.baierouge.fr";
var xhtmlNs = "http://www.w3.org/1999/xhtml";

var player;

function defaultEventHandler(evt) {
    evt.stopPropagation();
}

var mediaToStartByFrameId = {};
var mediaToStopByFrameId = {};

function onFrameChange() {
    var frameId = player.currentFrame.frameId;
    var mediaToStart = mediaToStartByFrameId[frameId];
    if (mediaToStart) {
        mediaToStart.play();
    }
    var mediaToStop = mediaToStopByFrameId[frameId];
    if (mediaToStop) {
        mediaToStop.pause();
    }
}

function toArray(collection) {
    return Array.prototype.slice.call(collection);
}

export function init(aPlayer) {
    player = aPlayer;

    player.addListener("frameChange", onFrameChange);

    // Find namespace prefix for Sozi.
    // Inlining SVG inside HTML does not allow to use
    // namespace-aware DOM methods.
    var svgRoot = player.presentation.svgRoot;
    var svgAttributes = svgRoot.attributes;
    var soziPrefix;
    for (var attrIndex = 0; attrIndex < svgAttributes.length; attrIndex ++) {
        if (svgAttributes[attrIndex].value === soziNs) {
            soziPrefix = svgAttributes[attrIndex].name.slice(6);
            break;
        }
    }

    if (!soziPrefix) {
        return;
    }

    // Get custom video and audio elements
    var videoSources = svgRoot.getElementsByTagName(soziPrefix + ":video");
    var audioSources = svgRoot.getElementsByTagName(soziPrefix + ":audio");

    var mediaSources = Array.prototype.slice.call(videoSources).concat(Array.prototype.slice.call(audioSources));

    // Replace them with HTML5 audio and video elements
    var mediaList = [];
    mediaSources.forEach(source => {
        var rect = source.parentNode;
        var tagName = source.localName.slice(soziPrefix.length + 1);

        // Create HTML media source element
        var htmlSource = document.createElementNS(xhtmlNs, "source");
        htmlSource.setAttribute("type", source.getAttribute(soziPrefix + ":type"));
        htmlSource.setAttribute("src",  source.getAttribute(soziPrefix + ":src"));

        for (var j = 0; j < mediaList.length; j += 1) {
            if (mediaList[j].rect === rect) {
                break;
            }
        }

        if (j === mediaList.length) {
            rect.setAttribute("visibility", "hidden");

            // Create HTML media element
            var htmlMedia = document.createElementNS(xhtmlNs, tagName);
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
            var html = document.createElementNS(xhtmlNs, "html");
            html.appendChild(htmlMedia);

            // Create SVG foreign object
            var foreignObject = document.createElementNS(svgNs, "foreignObject");
            foreignObject.setAttribute("x", rect.getAttribute("x"));
            foreignObject.setAttribute("y", rect.getAttribute("y"));
            foreignObject.setAttribute("width", rect.getAttribute("width"));
            foreignObject.setAttribute("height", rect.getAttribute("height"));
            foreignObject.appendChild(html);

            rect.parentNode.insertBefore(foreignObject, rect.nextSibling);

            if (source.hasAttribute(soziPrefix + ":start-frame")) {
                mediaToStartByFrameId[source.getAttribute(soziPrefix + ":start-frame")] = htmlMedia;
                mediaToStopByFrameId[source.getAttribute(soziPrefix + ":stop-frame")] = htmlMedia;
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
