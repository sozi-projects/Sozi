/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Presentation} from "./model/Presentation";
import {Viewport} from "./player/Viewport";
import {Player} from "./player/Player";
import * as Media from "./player/Media";
import * as FrameList from "./player/FrameList";

window.addEventListener("load", function () {

    Presentation.init(document.querySelector("svg"));
    Viewport.init(Presentation).onLoad();
    Presentation.fromStorable(window.soziPresentationData);
    Player.init(Viewport, Presentation);
    Media.init(Player);
    FrameList.init(Viewport, Player);

    Player.addListener("change:playing", function (player, playing) {
        if (playing) {
            document.title = Presentation.title;
        }
        else {
            document.title = Presentation.title + "(Paused)";
        }
    });

    window.addEventListener('resize', Viewport.repaint.bind(Viewport));

    if (Presentation.frames.length) {
        Player.playFromIndex(0);
    }

    Viewport.repaint();
});
