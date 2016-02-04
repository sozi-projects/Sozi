/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {SVGDocument} from "./svg/SVGDocument";
import {Presentation} from "./model/Presentation";
import {Selection} from "./model/Selection";
import {Storage} from "./Storage";
import {Viewport} from "./player/Viewport";
import {Controller} from "./Controller";
import {Preview} from "./view/Preview";
import {Properties} from "./view/Properties";
import {Toolbar} from "./view/Toolbar";
import {Timeline} from "./view/Timeline";
import nunjucks from "nunjucks";
import * as i18n from "./i18n";

window.addEventListener("load", () => {
    nunjucks.configure({watch: false});
    
    Selection.init(Presentation);
    Viewport.init(Presentation, true);

    Controller.init(Storage, Presentation, Selection, Viewport);

    Preview.init(document.getElementById("sozi-editor-view-preview"), Presentation, Selection, Viewport, Controller);

    var locale = i18n.init();
    Properties.init(document.getElementById("sozi-editor-view-properties"), Selection, Controller, locale);
    Toolbar.init(document.getElementById("sozi-editor-view-toolbar"), Storage, Presentation, Viewport, Controller, locale);
    Timeline.init(document.getElementById("sozi-editor-view-timeline"), Presentation, Selection, Controller, locale);
    Storage.init(Controller, SVGDocument, Presentation, Selection, Timeline, locale);

    var body = $("body");
    var left = $(".left");
    var right = $(".right");
    var top = $(".top");
    var bottom = $(".bottom");
    var hsplitter = $(".hsplitter");
    var vsplitter = $(".vsplitter");

    hsplitter.mousedown((evt) => {
        var startY = hsplitter.offset().top - evt.clientY;
        body.mousemove((evt) => {
            var topHeightPercent = 100 * (startY + evt.clientY) / $(window).height();
            top.css({ height: topHeightPercent + "%" });
            hsplitter.css({ top: topHeightPercent + "%" });
            bottom.css({height: `calc(${100 - topHeightPercent}% - ${hsplitter.height()}px)`});
            $(window).resize();
            return false;
        }).one("mouseup", evt => {
            body.off("mousemove");
            body.off("mouseup");
        });
    });

    vsplitter.mousedown((evt) => {
        var startX = vsplitter.offset().left - evt.clientX;
        body.mousemove((evt) => {
            var leftWidthPercent = 100 * (startX + evt.clientX) / $(window).width();
            left.css({ width: leftWidthPercent + "%" });
            vsplitter.css({ left: leftWidthPercent + "%" });
            right.css({width: `calc(${100 - leftWidthPercent}% - ${vsplitter.width()}px)` });
            $(window).resize();
            return false;
        }).one("mouseup", evt => {
            body.off("mousemove");
            body.off("mouseup");
        });
    });

    window.addEventListener("keydown", (evt) => {
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
                var pres = Controller.presentation;
                var selection = Controller.selection;
                var layers = selection.selectedLayers; 
                switch (evt.keyCode) {
                    case 35: // End
                        var lastFrame = pres.frames.length -1;
                        Controller.updateLayerAndFrameSelection(false, false, layers, lastFrame);
                        break;
                    case 36: // Home
                        Controller.updateLayerAndFrameSelection(false, false, layers, 0);
                        break;
                    case 37: // Left
                    case 38: // Up
                        var target = selection.currentFrame.index -1;
                        target = target < 0 ? 0 : target;
                        Controller.updateLayerAndFrameSelection(false, false, layers, target);
                        break;
                    case 39: // Right
                    case 40: // Down
                        var target = selection.currentFrame.index +1;
                        target = target > pres.frames.length -1 ? pres.frames.length -1 : target;
                        Controller.updateLayerAndFrameSelection(false, false, layers, target);
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
            }
        }
        return;
        // Chrome already supports undo/redo in input elements
        evt.preventDefault();
    }, false);
}, false);
