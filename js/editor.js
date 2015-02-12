/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import {Presentation} from "./model/Presentation";
import "./model/Presentation.upgrade";
import {Selection} from "./model/Selection";
import {Storage} from "./Storage";
import {Viewport} from "./player/Viewport";
import {Controller} from "./Controller";
import {Preview} from "./view/Preview";
import {Properties} from "./view/Properties";
import {Toolbar} from "./view/Toolbar";
import {Timeline} from "./view/Timeline";
import nunjucks from "nunjucks";

window.addEventListener("load", () => {
    nunjucks.configure({watch: false});
    
    Selection.init(Presentation);
    Viewport.init(Presentation);

    Controller.init(Storage, Presentation, Selection, Viewport);

    Preview.init(document.getElementById("sozi-editor-view-preview"), Presentation, Selection, Viewport, Controller);
    Properties.init(document.getElementById("sozi-editor-view-properties"), Selection, Controller);
    Toolbar.init(document.getElementById("sozi-editor-view-toolbar"), Storage, Presentation, Viewport, Controller);
    Timeline.init(document.getElementById("sozi-editor-view-timeline"), Presentation, Selection, Controller);

    Storage.init(Controller, Presentation, Selection, Timeline);
}, false);
