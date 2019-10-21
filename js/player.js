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

window.addEventListener("load", function () {
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
