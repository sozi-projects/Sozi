/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import "./backend";
import "./svg";
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

    const presentation = new Presentation();
    const selection    = new Selection(presentation);
    const viewport     = new Viewport(presentation, true);
    const player       = new Player(viewport, presentation, true);

    const locale       = i18n.init();
    const preferences  = new Preferences();
    const controller   = new Controller(preferences, presentation, selection, viewport, player, locale);
    const preview      = new Preview(document.getElementById("sozi-editor-view-preview"), presentation, selection, viewport, controller);
    const properties   = new Properties(document.getElementById("sozi-editor-view-properties"), selection, controller);
    const toolbar      = new Toolbar(document.getElementById("sozi-editor-view-toolbar"), properties, presentation, viewport, controller);
    const timeline     = new Timeline(document.getElementById("sozi-editor-view-timeline"), presentation, selection, controller);
    const storage      = new Storage(controller, presentation, selection);

    const body         = document.querySelector("body");
    const left         = document.querySelector(".left");
    const right        = document.querySelector(".right");
    const top          = document.querySelector(".top");
    const bottom       = document.querySelector(".bottom");
    const hsplitter    = document.querySelector(".hsplitter");
    const vsplitter    = document.querySelector(".vsplitter");

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
            key += "Shift+";
        }
        key += evt.key.toUpperCase();

        let actionFound = null;

        for (let action in preferences.keys) {
            if (preferences.keys[action] === key) {
                actionFound = action;
                break;
            }
        }

        switch (actionFound) {
            case "autoselectOutlineElement":
                controller.autoselectOutlineElement();
                break;
            case "resetLayer":
                controller.resetLayer();
                break;
            case "addFrame":
                controller.addFrame();
                break;
            case "save":
                controller.save();
                break;
            case "redo":
                controller.redo();
                break;
            case "undo":
                controller.undo();
                break;
            case "focusTitleField":
                document.getElementById('field-title').select();
                break;
            case "reload":
                controller.reload();
                break;
            case "toggleFullscreen":
                document.getElementById('btn-fullscreen').click();
                break;
            case "toggleDevTools":
                storage.backend.toggleDevTools();
                break;
        }

        // Keyboard acctions that may collide with text inputs.
        if (!actionFound && !/INPUT|SELECT|TEXTAREA|SECTION/.test(document.activeElement.tagName)) {
            actionFound = true;
            switch (evt.key) {
                case "End":
                    controller.selectFrame(-1);
                    break;
                case "Home":
                    controller.selectFrame(0);
                    break;
                case "ArrowLeft":
                    controller.selectRelativeFrame(-1);
                    break;
                case "ArrowRight":
                    controller.selectRelativeFrame(1);
                    break;
                case "Delete":
                    controller.deleteFrames();
                    break;
                case "a":
                    if (evt.ctrlKey) {
                        controller.selectAllFrames();
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
