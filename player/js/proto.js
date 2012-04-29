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
 * @depend module.js
 */

module(this, "sozi.proto", function (exports) {
    "use strict";
    
    exports.Object = {
        installConstructors: function () {
            var thisObject = this;
            
            this.instance = function () {
                thisObject.construct.apply(this, arguments);
                this.installConstructors();
                this.type = thisObject;
                this.supertype = exports.Object;
            };
            
            this.subtype = function (anObject) {
                this.augment(anObject);
                this.installConstructors();
                this.supertype = thisObject;
            };
            
            this.instance.prototype = this;
            this.subtype.prototype = this;
        },
        
        construct: function () {},
        
        augment: function (anObject) {
            for (var attr in anObject) {
                if (anObject.hasOwnProperty(attr)) {
                    this[attr] = anObject[attr];
                }
            }
        },
        
        isInstanceOf: function (anObject) {
            return this.type === anObject
                || exports.Object.isPrototypeOf(this.type) && this.type.isSubtypeOf(anObject);
        },
        
        isSubtypeOf: function (anObject) {
            return this.supertype === anObject
                || exports.Object.isPrototypeOf(this.supertype) && this.supertype.isSubtypeOf(anObject);
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
