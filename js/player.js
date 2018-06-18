/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {SVGDocumentWrapper} from "./svg/SVGDocumentWrapper";
import {VideoDocumentWrapper} from "./svg/VideoDocumentWrapper";
import {Presentation} from "./model/Presentation";
import {Viewport} from "./player/Viewport";
import {Player} from "./player/Player";
import * as Media from "./player/Media";
import * as FrameList from "./player/FrameList";
import * as FrameNumber from "./player/FrameNumber";
import * as FrameURL from "./player/FrameURL";

window.addEventListener("load", function () {
    const svgRoot = document.querySelector("svg");
    const videoRoot = document.querySelector("video");
    svgRoot.style.display = "inline";
    // svgRoot.style.display = "absolute"; ??
    console.log("player window addEventListener", videoRoot);

    SVGDocumentWrapper.init(svgRoot);
    VideoDocumentWrapper.init(videoRoot);
    Presentation.init().setSVGDocument(SVGDocumentWrapper).setVideoDocument(VideoDocumentWrapper);
    Viewport.init(Presentation, false).onLoad();

    Presentation.fromStorable(window.soziPresentationData);
    Player.init(Viewport, Presentation);

    Media.init(Player);
    FrameList.init(Player);
    FrameNumber.init(Player);
    FrameURL.init(Player);

    window.sozi = {
        presentation: Presentation,
        viewport: Viewport,
        player: Player
    };

    Player.addListener("stateChange", () => {
        if (Player.playing) {
            document.title = Presentation.title;
        }
        else {
            document.title = Presentation.title + " (Paused)";
        }
    });

    window.addEventListener('resize', () => Viewport.repaint());

    if (Presentation.frames.length) {
        Player.playFromFrame(FrameURL.getFrame());
    }

    Viewport.repaint();
    Player.disableBlankScreen();

    document.querySelector(".sozi-blank-screen .spinner").style.display = "none";
    let videoUrl = window.sozi.presentation.video;
    if (videoUrl) {
        let videoElement = document.querySelector("#sozi-video");
        videoElement.querySelector("source").setAttribute("src", videoUrl);
        videoElement.load();
        videoElement.addEventListener("pause", () => window.sozi.player.pause());
        videoElement.addEventListener("play", () => window.sozi.player.resume());
        videoElement.style.display = "block";
        videoElement.style.position = "absolute";
        videoElement.style.width = window.sozi.presentation.videoWidth+"px";
        videoElement.style.height = window.sozi.presentation.videoHeight+"px";
        window.sozi.player.pause();
        if(window.sozi.presentation.videoPosition == '0'){
            videoElement.style.top = "0px";
            videoElement.style.left = "0px";
        }
        if(window.sozi.presentation.videoPosition == '1'){
            videoElement.style.top = "0px";
            videoElement.style.left = "0px";
        }
        if(window.sozi.presentation.videoPosition == '2'){
            videoElement.style.bottom = "0px";
            videoElement.style.right = "0px";
        }
        if(window.sozi.presentation.videoPosition == '3'){
            videoElement.style.bottom = "0px";
            videoElement.style.right = "0px";
        }
    }
});
