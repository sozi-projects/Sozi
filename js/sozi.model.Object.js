
namespace("sozi.model", function (exports) {
    "use strict";

    var creationCount = 0;

    exports.Object = {
        /*
         * Initialize the current object.
         */
        init: function () {
            this.listeners = {};
            this.id = String(creationCount);
            creationCount ++;
            return this;
        },

        /*
         * Create a new object with the current object as prototype.
         *
         * Optionally augment the new object with the given properties.
         */
        create: function (properties) {
            return Object.create(this).set(properties || {});
        },

        get proto() {
            return Object.getPrototypeOf(this);
        },

        /*
         * Augment the current object with the properties of the given object.
         */
        set: function (supplier) {
            Object.keys(supplier).forEach(function(property) {
                Object.defineProperty(this, property, Object.getOwnPropertyDescriptor(supplier, property));
            }, this);
            return this;
        },

        toStorable: function () {
            return {};
        },

        fromStorable: function (obj) {
            // Abstract
            return this;
        },

        bind: function (fn) {
            var self = this;
            return function () {
                return fn.apply(self, arguments);
            };
        },

        /*
         * Add a listener for a given event.
         *
         * model.addListener("anEvent", aFunction, anObject);
         *    emitter.fire("anEvent", ...) -> anObject.aFunction(emitter, ...);
         *
         * model.addListener("anEvent", aFunction);
         *    emitter.fire("anEvent", ...) -> aFunction(emitter, ...);
         */
        addListener: function (event, callback, context) {
            if (!(event in this.listeners)) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback, context);
            return this;
        },

        /*
         * Remove a listener for a given event.
         *
         * This method accepts the same arguments as addListener.
         */
        removeListener: function (event, callback, context) {
            if (event in this.listeners) {
                var listeners = this.listeners[event];
                for (var i = 0; i < listeners.length;) {
                    if (listeners[i] === callback && listeners[i + 1] === context) {
                        listeners.splice(i, 2);
                    }
                    else {
                        i += 2;
                    }
                }
            }
            return this;
        },

        /*
         * Fire an event.
         *
         * fire("anEvent", ...) -> context.callback(emitter, ...)
         */
        fire: function (event) {
            if (event in this.listeners) {
                var args = Array.prototype.slice.call(arguments, 1);
                args.unshift(this);
                
                var listeners = this.listeners[event];
                for (var i = 0; i < listeners.length; i += 2) {
                    listeners[i].apply(listeners[i+1], args);
                }
            }
            return this;
        }
    };
});
