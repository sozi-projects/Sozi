/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2013 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

var page = require("webpage").create(),
    url, tmpDir;

/*
 * Custom implementation of console.log().
 * Called from sandboxed Javascript.
 */
page.onConsoleMessage = function (msg) {
    console.log("sozi2video.js> " + msg);
};

/*
 * Render the current page into a PNG file.
 * Called from sandboxed Javascript.
 */
page.onCallback = function (fileName) {
    page.render(tmpDir + fileName + ".png");
};

/*
 * Sandboxed function
 */
function main(options) {
    var TIME_STEP_MS = 20;
    var SOZI_VERSION_MIN = "13.02";
    var SOZI_NS = "http://sozi.baierouge.fr";

    function renderFrames() {
        var frameCount = sozi.document.frames.length;
        var imageIndex = 0;

        for(currentFrameIndex = 0; currentFrameIndex < frameCount; currentFrameIndex +=1) {
            console.log("Exporting frame: " + (currentFrameIndex + 1));

            sozi.player.jumpToFrame(currentFrameIndex);
            var currentFrame = sozi.document.frames[currentFrameIndex];
                
            // Generate images for the duration of the current frame
            for (var timeMs = 0; timeMs < currentFrame.timeoutMs; timeMs += TIME_STEP_MS, imageIndex += 1) {
                window.callPhantom("frame-" + imageIndex);
            }
            
            // Generate images for the transition to the next frame.
            // If the last frame has a timeout enabled, transition to the first frame.
            if (currentFrameIndex < frameCount - 1 || currentFrame.timeoutEnable) {
                var nextFrame = sozi.document.frames[(currentFrameIndex + 1) % frameCount];
                
                var animationData = sozi.player.getAnimationData(
                    currentFrame.states, nextFrame.states,
                    undefined, undefined, true, false
                );

                for (timeMs = 0; timeMs < nextFrame.transitionDurationMs; timeMs += TIME_STEP_MS, imageIndex += 1) {
                    sozi.player.onAnimationStep(timeMs / nextFrame.transitionDurationMs, animationData);
                    window.callPhantom("frame-" + imageIndex);
                }
            }
        }
    }

    window.addEventListener("load", function () {
        var script = document.getElementById("sozi-script");
        if (!script || script.getAttributeNS(SOZI_NS, "version") < SOZI_VERSION_MIN) {
            console.log("Your document must include Sozi version " + SOZI_VERSION_MIN + " or above, found " + script.getAttributeNS(SOZI_NS, "version") + ".")
        }
        else {
            sozi.events.listen("sozi.player.ready", renderFrames);
        }
    }, false);
}

if (phantom.args.length < 4) {
    console.log("Usage: sozi2video.js url.svg dir width_px height_px");
    phantom.exit();
}
else {
    page.viewportSize = {
        width: parseFloat(phantom.args[2]),
        height: parseFloat(phantom.args[3])
    };

    page.onInitialized = function () {
        page.evaluate(function (main, options) {
            main(options);
        }, main);
    };
    
    url = phantom.args[0];    
    tmpDir = phantom.args[1] + "/";
    
    page.open(url,function (status) {
        if (status !== "success") {
            console.log("sozi2video.js> Unable to load the document: " + url);
        }
        phantom.exit();
    });
}

