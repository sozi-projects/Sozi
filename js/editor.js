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
        let key = "";
        if (evt.ctrlKey) {
            key += "Ctrl+";
        }
        if (evt.altKey) {
            key += "Alt+";
        }
        if (evt.shiftKey) {
            key += "Shift+"
        }
        key += evt.key.toUpperCase();

        let actionFound = null;

        for (let action in Preferences.keys) {
            if (Preferences.keys[action] === key) {
                actionFound = action;
                break;
            }
        }

        switch (actionFound) {
            case "fitElement":
                Controller.fitElement();
                break;
            case "resetLayer":
                Controller.resetLayer();
                break;
            case "addFrame":
                Controller.addFrame();
                break;
            case "save":
                Controller.save();
                break;
            case "redo":
                Controller.redo();
                break;
            case "undo":
                Controller.undo();
                break;
            case "focusTitleField":
                document.getElementById('field-title').select();
                break;
            case "reload":
                Controller.reload();
                break;
            case "toggleFullscreen":
                document.getElementById('btn-fullscreen').click();
                break;
            case "toggleDevTools":
                Storage.backend.toggleDevTools();
                break;
        }

        // Keyboard acctions that may collide with text inputs.
        if (!actionFound && !/INPUT|SELECT|TEXTAREA|SECTION/.test(document.activeElement.tagName)) {
            actionFound = true;
            switch (evt.key) {
                case "End":
                    Controller.selectFrame(-1);
                    break;
                case "Home":
                    Controller.selectFrame(0);
                    break;
                case "ArrowLeft":
                    Controller.selectRelativeFrame(-1);
                    break;
                case "ArrowRight":
                    Controller.selectRelativeFrame(1);
                    break;
                case "Delete":
                    Controller.deleteFrames();
                    break;
                case "a":
                    if (evt.ctrlKey) {
                        Controller.selectAllFrames();
                    }
                    else {
                        actionFound = false;
                    }
                    break;
                default:
                    actionFound = false;
            }
        }

        if (actionFound) {
            evt.preventDefault();
        }
    }, false);
}, false);
