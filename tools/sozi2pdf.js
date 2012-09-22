/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

var page = require('webpage').create(),
    url, dir;

/*
 * Custom implementation of console.log()
 * for sandboxed Javascript.
 */
page.onConsoleMessage = function (msg) {
    console.log("sozi2pdf.js> " + msg);
};

/*
 * Hacked alert() callback
 * Render the current browser window to a PDF file
 */
page.onAlert = function (msg) {
    page.render(dir + msg + ".pdf");
};

/*
 * Sandboxed function: render all frames
 */
function renderFrames() {
    var frameCount = sozi.document.frames.length;
    var digits = frameCount.toString().length;
    var fileName = "";
    for (var i = 0; i < frameCount; i ++) {
        console.log("Exporting frame: " + (i + 1));
        sozi.player.jumpToFrame(i);
        fileName = (i + 1).toString();
        while(fileName.length < digits) {
            fileName = "0" + fileName;
        }
        alert(fileName);
    }
}

if (phantom.args.length < 4) {
    console.log("Usage: sozi2pdf.js url.svg dir width_px height_px");
    phantom.exit();
}
else {
    page.viewportSize = {
        width: parseFloat(phantom.args[2]),
        height: parseFloat(phantom.args[3])
    };

    page.onInitialized = function () {
        page.evaluate(function (onPlayerReady) {
            window.addEventListener("load", function () {
                sozi.events.listen("sozi.player.ready", onPlayerReady);
            }, false);
        }, renderFrames);
    }
    
    url = phantom.args[0];    
    dir = phantom.args[1] + "/";
    
    page.open(url,function (status) {
        if (status !== "success") {
            console.log("sozi2pdf.js> Unable to load the document: " + url);
        }
        phantom.exit();
    });
}

