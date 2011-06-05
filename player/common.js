/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2011 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 * 
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

Function.prototype.bind = function (obj) {
    var args = Array.prototype.slice.call(arguments, 1),
        f = this;
    return function () {
        f.apply(obj, args.concat(Array.prototype.slice.call(arguments)));
    };
};


