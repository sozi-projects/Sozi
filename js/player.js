import {Presentation} from "./model/Presentation";
import {Viewport} from "./player/Viewport";
import {Player} from "./player/Player";
import * as media from "./player/media";

window.addEventListener("load", function () {

    var presentation = Presentation.init(document.querySelector("svg"));
    var viewport = Viewport.init(presentation);
    viewport.onLoad();
    presentation.fromStorable(window.soziPresentationData);
    var player = Player.init(viewport, presentation);
    media.init(player);

    player.addListener("change:playing", function (player, playing) {
        if (playing) {
            document.title = presentation.title;
        }
        else {
            document.title = presentation.title + "(Paused)";
        }
    });

    window.addEventListener('resize', viewport.repaint.bind(viewport));

    if (presentation.frames.length) {
        player.playFromIndex(0);
    }

    viewport.repaint();
});
