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
    url, dir, width, height, resolution,
    
    // These settings provide an accurate A4 landscape page format
    DEFAULT_RESOLUTION = 7.2, // Dots per millimeter
    DEFAULT_WIDTH = 297,    // Millimeters
    DEFAULT_HEIGHT = 210;   // Millimeters

/*
 * Custom implementation of console.log()
 * for sandboxed Javascript.
 */
page.onConsoleMessage = function (msg) {
    console.log("sozi2pdf> " + msg);
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
    for (var i = 0; i < sozi.document.frames.length; i ++) {
        console.log("Exporting frame: " + i);
        sozi.player.jumpToFrame(i);
        alert(i);
    }
}

function getFloatArg(index, defaultValue) {
    var result;
    if (phantom.args.length > index) {
        result = parseFloat(phantom.args[index]);
        if (isNaN(result)) {
            console.log("Invalid numeric value: " + phantom.args[index]);
            phantom.exit();
        }
    }
    else {
        result = defaultValue;
    }
    return result;
}

if (phantom.args.length < 1) {
    console.log("Usage: sozi2pdf.js url.svg [dir [width [height [resolution]]]]");
    phantom.exit();
}
else {
    url = phantom.args[0];
    
    dir = "";
    if (phantom.args.length > 1) {
        dir = phantom.args[1] + "/";
    }

    width = getFloatArg(2, DEFAULT_WIDTH);
    height = getFloatArg(3, width * DEFAULT_HEIGHT / DEFAULT_WIDTH);
    resolution = getFloatArg(4, DEFAULT_RESOLUTION);
    
    page.viewportSize = {
        width: width * resolution,
        height: height * resolution
    };

    page.onInitialized = function () {
        page.evaluate(function (onPlayerReady) {
            window.addEventListener("load", function () {
                sozi.events.listen("sozi.player.ready", onPlayerReady);
            }, false);
        }, renderFrames);
    }
    
    page.open(url,function (status) {
        if (status !== "success") {
            console.log("Unable to load the document " + url);
        }
        phantom.exit();
    });
}

