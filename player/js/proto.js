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

/**
 * @name sozi.proto
 * @namespace Helpers for prototype inheritance.
 * @depend namespace.js
 */
namespace(this, "sozi.proto", function (exports) {
    "use strict";
    
    exports.Object = {
        installConstructors: function () {
            function InstanceConstructor() {}
            InstanceConstructor.prototype = this;
            
            this.instance = function () {
                var result = new InstanceConstructor();
                result.construct.apply(result, arguments);
                return result;
            };
            
            this.subtype = function (anObject) {
                var result = new InstanceConstructor();
                result.augment(anObject);
                result.installConstructors();
                return result;
            };
        },
        
        construct: function () {},
        
        augment: function (anObject) {
            for (var attr in anObject) {
                if (anObject.hasOwnProperty(attr)) {
                    this[attr] = anObject[attr];
                }
            }
            return this;
        },
        
        bind: function (aFunction) {
            var self = this;
            return function () {
                return aFunction.apply(self, arguments);
            }
        }
    };
    
    // Bootstrap the root object
    exports.Object.installConstructors();
});
