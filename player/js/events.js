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
 *
 * @depend namespace.js
 */

/**
 * @name sozi.events
 * @namespace A simple event system for Sozi.
 */
namespace(this, "sozi.events", function (exports) {
    /** @lends sozi.events */

    "use strict";
    
    /**
     * A registry of callback functions for each event type.
     *
     * <p>Call {@link sozi.events.listen} to add a new listener.</p>
     */
    var listenerRegistry = {};

    /**
     * Adds a listener for a given event type.
     *
     * @memberOf sozi.events
     * @name listen
     * @function
     * @param {String} key The identifier of the event type to listen
     * @param {Function} handler The function to call when a corresponding event is fired
     */
    exports.listen = function (key, handler) {
        if (!listenerRegistry.hasOwnProperty(key)) {
            listenerRegistry[key] = [];
        }
        listenerRegistry[key].push(handler);
    };
    
    /**
     * Fire an event of a given type.
     *
     * <p>All event handlers added for the given event type are
     * executed.</p>
     *
     * <p>Additional arguments provided to this function are passed
     * to the event handlers.</p>
     *
     * @memberOf sozi.events
     * @name fire
     * @function
     * @param {String} key The identifier of the event type to fire
     */
    exports.fire = function (key) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (listenerRegistry.hasOwnProperty(key)) {
            listenerRegistry[key].forEach(function (listener) {
                listener.apply(null, args);
            });
        }
    };
});
