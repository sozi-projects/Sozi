/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import "./backend";
import "./svg";
import {SVGDocumentWrapper} from "./svg/SVGDocumentWrapper";
import {Presentation} from "./model/Presentation";
import {Selection} from "./model/Selection";
import {Preferences} from "./model/Preferences";
import {Storage} from "./Storage";
import {Viewport} from "./player/Viewport";
import {Player} from "./player/Player";
import {Controller} from "./Controller";
import {Preview} from "./view/Preview";
import {Properties} from "./view/Properties";
import {Toolbar} from "./view/Toolbar";
import {Timeline} from "./view/Timeline";

import nunjucks from "nunjucks";
import * as i18n from "./i18n";

window.addEventListener("load", () => {
    nunjucks.configure({watch: false});

    Notification.requestPermission();

    Presentation.init();
    Selection.init(Presentation);
    Viewport.init(Presentation, true);
    Player.init(Viewport, Presentation, true);

    const locale = i18n.init();

    Controller.init(Storage, Preferences, Presentation, Selection, Timeline, Viewport, Player, locale);

    Preview.init(document.getElementById("sozi-editor-view-preview"), Presentation, Selection, Viewport, Controller);

    Properties.init(document.getElementById("sozi-editor-view-properties"), Selection, Controller, Timeline, locale);
    Toolbar.init(document.getElementById("sozi-editor-view-toolbar"), Storage, Presentation, Viewport, Controller, locale);
    Timeline.init(document.getElementById("sozi-editor-view-timeline"), Presentation, Selection, Controller, locale);
    Storage.init(Controller, SVGDocumentWrapper, Presentation, Selection, Timeline, locale);

    const body      = document.querySelector("body");
    const left      = document.querySelector(".left");
    const right     = document.querySelector(".right");
    const top       = document.querySelector(".top");
    const bottom    = document.querySelector(".bottom");
    const hsplitter = document.querySelector(".hsplitter");
    const vsplitter = document.querySelector(".vsplitter");

    let hsplitterStartY, vsplitterStartX;

    const hsplitterHeight = hsplitter.getBoundingClientRect().height;
    const vsplitterWidth  = vsplitter.getBoundingClientRect().width;

    function hsplitterOnMouseMove(evt) {
        const topHeightPercent = 100 * (hsplitterStartY + evt.clientY) / window.innerHeight;
        top.style.height    = topHeightPercent + "%";
        hsplitter.style.top = topHeightPercent + "%";
        bottom.style.height = `calc(${100 - topHeightPercent}% - ${hsplitterHeight}px)`;
        window.dispatchEvent(new UIEvent("resize"));
        return false;
    }

    function hsplitterOnMouseUp() {
        body.removeEventListener("mousemove", hsplitterOnMouseMove);
        body.removeEventListener("mouseup",   hsplitterOnMouseUp);
    }

    function vsplitterOnMouseMove(evt) {
        const leftWidthPercent = 100 * (vsplitterStartX + evt.clientX) / window.innerWidth;
        left.style.width     = leftWidthPercent + "%";
        vsplitter.style.left = leftWidthPercent + "%";
        right.style.width    = `calc(${100 - leftWidthPercent}% - ${vsplitterWidth}px)`;
        window.dispatchEvent(new UIEvent("resize"));
        return false;
    }

    function vsplitterOnMouseUp() {
        body.removeEventListener("mousemove", vsplitterOnMouseMove);
        body.removeEventListener("mouseup",   vsplitterOnMouseUp);
    }

    hsplitter.addEventListener("mousedown", evt => {
        hsplitterStartY = hsplitter.getBoundingClientRect().top - evt.clientY;
        body.addEventListener("mousemove", hsplitterOnMouseMove);
        body.addEventListener("mouseup",   hsplitterOnMouseUp);
    });

    vsplitter.addEventListener("mousedown", evt => {
        vsplitterStartX = vsplitter.getBoundingClientRect().left - evt.clientX;
        body.addEventListener("mousemove", vsplitterOnMouseMove);
        body.addEventListener("mouseup",   vsplitterOnMouseUp);
    });

    window.addEventListener("keydown", evt => {
        if (evt.ctrlKey) {
            switch (evt.keyCode) {
                case 83: // Ctrl-s
                    Controller.save();
                    break;
                case 89: // Ctrl-y
                    Controller.redo();
                    break;
                case 90: // Ctrl-z
                    Controller.undo();
                    break;
                default:
                    return;
            }
        }
        else {
            if (!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
                switch (evt.keyCode) {
                    case 35: // End
                        Controller.selectFrame(-1);
                        break;
                    case 36: // Home
                        Controller.selectFrame(0);
                        break;
                    case 37: // Left
                    case 38: // Up
                        Controller.selectRelativeFrame(-1);
                        break;
                    case 39: // Right
                    case 40: // Down
                        Controller.selectRelativeFrame(1);
                        break;
                    case 46: // Delete
                        Controller.deleteFrames();
                        break;
                }
            }
            switch (evt.keyCode) {
                case 113: // F2
                    document.getElementById('field-title').select();
                    break;
                case 116: // F5
                    Controller.reload();
                    break;
                case 122: // F11
                    document.getElementById('btn-fullscreen').click();
                    break;
                case 123: // F12
                    Storage.backend.toggleDevTools();
                    break;
                default:
                    return;
            }
        }
        evt.preventDefault();
    }, false);
}, false);
