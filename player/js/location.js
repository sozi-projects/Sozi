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

/**
 * @name sozi.location
 * @namespace Manage the URL in the address bar of the browser window.
 * @depend namespace.js
 */
namespace(this, "sozi.location", function (exports, window) {
    "use strict";
    
    var changedFromWithin = false;

    /*
     * Returns the frame index corresponding to the URL hash.
     *
     * This is a shortcut for sozi.location.getFrameIndexForHash(window.location.hash)
     */
    exports.getFrameIndex = function () {
        return exports.getFrameIndexForHash(window.location.hash);
    };
    
    /*
     * Returns the frame index corresponding to the given URL hash.
     *
     * The URL hash can be either a frame index or a frame id.
     * In the URL, the frame index starts a 1.
     * This method converts it into a 0-based index.
     *
     * If the URL hash is not a positive integer, then 0 is returned.
     * It the URL hash is an integer greater than the last frame index, then
     * the last frame index is returned.
     */
    exports.getFrameIndexForHash = function (hash) {
        var indexOrId = hash ? hash.slice(1) : "1";
        var index;
        if (/^[0-9]+$/.test(indexOrId)) {
            index = parseInt(indexOrId, 10) - 1;
        }
        else {
            index = sozi.document.getFrameIndexForId(indexOrId);
        }
        
        if (index < 0) {
            return 0;
        }
        else if (index >= sozi.document.frames.length) {
            return sozi.document.frames.length - 1;
        }
        else {
            return index;
        }
    };

    /*
     * Event handler: hash change.
     *
     * This function is called when the URL hash is changed.
     * If the hash was changed manually in the address bar, and if it corresponds to
     * a valid frame number, then the presentation moves to that frame.
     *
     * The hashchange event can be triggered externally, by the user modifying the URL,
     * or internally, by the script modifying window.location.hash.
     */
    function onHashChange() {
        var index = exports.getFrameIndex();
        if (!changedFromWithin) {
            sozi.player.moveToFrame(index);
        }
        changedFromWithin = false;
    }
    
    /*
     * Event handler: frame change.
     *
     * This function is called when the presentation has reached a new frame.
     * The URL hash is set to the current frame id.
     */
    function onFrameChange(index) {
        changedFromWithin = true;
        window.location.hash = "#" + sozi.document.frames[index].id;
    }

    window.addEventListener("hashchange", onHashChange, false);
    sozi.events.listen("sozi.player.framechange", onFrameChange); // @depend events.js
});
