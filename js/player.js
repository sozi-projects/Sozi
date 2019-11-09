/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {SVGDocumentWrapper} from "./svg/SVGDocumentWrapper";
import {Presentation} from "./model/Presentation";
import {Viewport} from "./player/Viewport";
import {Player} from "./player/Player";
import * as Media from "./player/Media";
import * as FrameList from "./player/FrameList";
import * as FrameNumber from "./player/FrameNumber";
import * as FrameURL from "./player/FrameURL";

function setPresenterMode() {
    sozi.player.disableMedia();
    sozi.player.pause();

    sozi.presentation.enableMouseTranslation =
    sozi.presentation.enableMouseNavigation =
    sozi.presentation.enableKeyboardZoom =
    sozi.presentation.enableKeyboardRotation =
    sozi.presentation.enableKeyboardNavigation = false;
}

function notifyOnLoad(target, id) {
    function checkSozi() {
        if (sozi) {
            target.postMessage({name: "loaded", id}, "*");
        }
        else {
            setTimeout(checkSozi, 1);
        }
    }
    checkSozi();
}

function notifyOnFrameChange(target) {
    sozi.player.addListener("frameChange", () => {
        target.postMessage({name: "frameChange", index: sozi.player.currentFrame.index}, "*");
    });
}

window.addEventListener("message", evt => {
    switch (evt.data.name) {
        case "notifyOnLoad":
            notifyOnLoad(evt.source, evt.data.id);
            break;
        case "notifyOnFrameChange":
            notifyOnFrameChange(evt.source);
            break;
        case "setPresenterMode":
            setPresenterMode();
            break;
        case "jumpToFrame":
            if (evt.data.index >= 0 && evt.data.index < sozi.presentation.frames.length) {
                sozi.player.jumpToFrame(evt.data.index);
            }
            else {
                sozi.player.enableBlankScreen();
            }
            break;
        case "moveToNext":
            sozi.player.moveToNext();
            break;
        case "moveToPrevious":
            sozi.player.moveToNext();
            break;
    }
}, false);

window.addEventListener("load", () => {
    const svgRoot = document.querySelector("svg");
    svgRoot.style.display = "inline";

    const presentation = new Presentation();
    presentation.setSVGDocument(new SVGDocumentWrapper(svgRoot));

    const viewport = new Viewport(presentation, false);
    viewport.onLoad();

    presentation.fromStorable(window.soziPresentationData);
    const player = new Player(viewport, presentation);

    Media.init(player);
    FrameList.init(player);
    FrameNumber.init(player);
    FrameURL.init(player);

    window.sozi = {
        presentation,
        viewport,
        player
    };

    player.addListener("stateChange", () => {
        if (player.playing) {
            document.title = presentation.title;
        }
        else {
            document.title = presentation.title + " (Paused)";
        }
    });

    window.addEventListener("resize", () => viewport.repaint());

    if (presentation.frames.length) {
        player.playFromFrame(FrameURL.getFrame());
    }

    viewport.repaint();
    player.disableBlankScreen();

    document.querySelector(".sozi-blank-screen .spinner").style.display = "none";
});
