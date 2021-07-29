/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global sozi */

import {SVGDocumentWrapper} from "./svg/SVGDocumentWrapper";
import {Presentation, Frame} from "./model/Presentation";
import {Viewport} from "./player/Viewport";
import {Player} from "./player/Player";
import {PlayerController} from "./player/PlayerController";
import * as Media from "./player/Media";
import * as FrameList from "./player/FrameList";
import * as FrameNumber from "./player/FrameNumber";
import * as FrameURL from "./player/FrameURL";
import * as TouchGestures from "./player/TouchGestures";

/** Identifies the current player to be in presenter mode.
 *
 * In presenter mode, message events are forwarded to the player
 * rather than to the player's controller.
 *
 * @default
 */
let isPresenterMode = false;

/** Put the current player in presenter mode.
 *
 * This function is used by the presenter console that uses several
 * players as *previews* of the previous, current and next frames.
 *
 * In presenter mode, keyboard and mouse navigation are disabled,
 * frame numbers are hidden, hyperlink in the previous and next views are
 * disabled, and in the current view, hyperlink clicks are forwarded to the
 * main presentation window.
 *
 * @param {Window} mainWindow - The browser window that plays the main presentation.
 * @param {boolean} isCurrent - Is the current player showing the current frame?
 */
function setPresenterMode(mainWindow, isCurrent) {
    isPresenterMode = true;
    sozi.player.disableMedia();
    sozi.player.pause();

    sozi.presentation.enableMouseTranslation =
    sozi.presentation.enableMouseNavigation =
    sozi.presentation.enableKeyboardZoom =
    sozi.presentation.enableKeyboardRotation =
    sozi.presentation.enableKeyboardNavigation = false;

    for (let frame of sozi.presentation.frames) {
        frame.showFrameNumber = false;
    }

    if (isCurrent) {
        // Forward hyperlink clicks to the main presentation window.
        for (let link of sozi.presentation.document.root.getElementsByTagName("a")) {
            link.addEventListener("click", evt => {
                if (link.id) {
                    mainWindow.postMessage({name: "click", id: link.id}, "*");
                }
                evt.preventDefault();
            }, false);
        }
    }
    else {
        sozi.presentation.document.disableHyperlinks(true);
    }
}

/** Process a frame change event.
 *
 * This event handler is setup when the current player is connected to
 * a presenter console.
 * On frame change, the event is forwarded to the presenter.
 *
 * @param {Window} presenterWindow - The window that shows the presenter console.
 *
 * @listens module:player/Player.frameChange
 */
function onFrameChange(presenterWindow) {
    presenterWindow.postMessage({
        name : "frameChange",
        index: sozi.player.currentFrame.index,
        title: sozi.player.currentFrame.title,
        notes: sozi.player.currentFrame.notes
    }, "*");
}

/** Setup an event handler to forward the frame change event to the presenter window.
 *
 * This function is called when initializing the connexion between the current
 * presentation and a presenter console in another window.
 *
 * @param {Window} presenterWindow - The window that shows the presenter console.
 */
function notifyOnFrameChange(presenterWindow) {
    sozi.player.on("frameChange", () => onFrameChange(presenterWindow));

    // Send the message to set the initial frame data in the presenter window.
    onFrameChange(presenterWindow);
}

// Process messages from a presenter console.
window.addEventListener("message", onMessage, false);

/** Process messages from or to presenter console windows.
 *
 * @param {MessageEvent} evt - The DOM event to process.
 */
function onMessage(evt) {
    switch (evt.data.name) {
        case "notifyOnFrameChange":
            // Install an event handler to forward the frame change event
            // to the presenter console.
            notifyOnFrameChange(evt.source);
            break;
        case "setPresenterMode":
            // Set this presentation into presenter mode.
            setPresenterMode(evt.source, evt.data.isCurrent);
            break;
        case "click": {
            // Forward the click event on a hyperlink in the presenter console
            // to the same hyperlink in the main presentation.
            const link = sozi.presentation.document.root.getElementById(evt.data.id);
            // We use dispatchEvent here because
            // SVG <a> elements do not have a click method.
            link.dispatchEvent(new MouseEvent("click"));
            break;
        }
        default: {
            // Interpret a message as a method call to the current Sozi player.
            // The message must be of the form: {name: string, args: any[]}.
            const receiver = isPresenterMode ? sozi.player : sozi.playerController;
            const method   = receiver[evt.data.name];
            const args     = evt.data.args || [];
            if (typeof method === "function") {
                method.apply(receiver, args);
            }
            else {
                console.log(`Unsupported message: ${evt.data.name}`);
            }
        }
    }
}

// Initialize the Sozi player when the document is loaded.
window.addEventListener("load", () => {
    const svgRoot = document.querySelector("svg");
    svgRoot.style.display = "initial";

    const presentation = new Presentation();
    presentation.setSVGDocument(new SVGDocumentWrapper(svgRoot));

    const viewport = new Viewport(presentation, false);
    viewport.onLoad();

    presentation.fromStorable(window.soziPresentationData);
    if (!presentation.frames.length) {
        const frame = new Frame(presentation);
        frame.setAtStates(viewport.cameras);
        presentation.frames.push(frame);
    }

    const player = new Player(viewport, presentation);
    const playerController = new PlayerController(player);
    playerController.onLoad();

    Media.init(player);
    FrameList.init(player, playerController);
    FrameNumber.init(player);
    FrameURL.init(player);
    TouchGestures.init(player, presentation, playerController);

    window.sozi = {
        get presentation() {
            return presentation;
        },
        get viewport() {
            return viewport;
        },
        get player() {
            return player;
        },
        get playerController() {
            return playerController
        }
    };

    player.on("stateChange", () => {
        if (player.playing) {
            document.title = presentation.title;
        }
        else {
            document.title = presentation.title + " (Paused)";
        }
    });

    window.addEventListener("resize", () => viewport.repaint());

    player.playFromFrame(FrameURL.getFrame());

    viewport.repaint();
    player.disableBlankScreen();

    document.querySelector(".sozi-blank-screen .spinner").style.display = "none";
});

/** Identifies the window that opened this presentation.
 *
 * This constant can typically have three possible values:
 * - a presenter console window that opened this window to display the main presentation,
 * - a parent window if this presentation is opened in a frame,
 * - the current window.
 *
 * @readonly
 * @type {Window}
 */
const opener = window.opener || window.parent;

/** Check that Sozi is loaded and notify a presenter console.
 *
 * This function will repeatedly check whether the `window.sozi` variable is populated.
 * On success, it will send the `loaded` message to the presenter console.
 */
function checkSozi() {
    if (window.sozi) {
        opener.postMessage({
            name: "loaded",
            length: sozi.presentation.frames.length,
        }, "*");
    }
    else {
        setTimeout(checkSozi, 1);
    }
}

if (opener) {
    checkSozi();
}
