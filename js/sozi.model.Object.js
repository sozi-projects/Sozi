
namespace(this, "sozi.model", function (exports, globals) {
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
         * model.addListener("anEvent", anObject);
         *    emitter.fire("anEvent", ...) -> anObject.anEvent(emitter, ...);
         *
         * model.addListener("anEvent", aFunction);
         *    emitter.fire("anEvent", ...) -> aFunction(emitter, ...);
         */
        addListener: function (event, a, b) {
            if (!(event in this.listeners)) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(this.makeListenerRecord(event, a, b));
            return this;
        },

        /*
         * Remove a listener for a given event.
         *
         * This method accepts the same arguments as addListener.
         */
        removeListener: function (event, a, b) {
            if (event in this.listeners) {
                var listeners = this.listeners[event];
                var record = this.makeListenerRecord(event, a, b);
                for (var i = 0; i < listeners.length;) {
                    if (listeners[i].callback === record.callback && listeners[i].receiver === record.receiver) {
                        listeners.splice(i, 1);
                    }
                    else {
                        i ++;
                    }
                }
            }
            return this;
        },

        /*
         * Fire an event.
         *
         * fire("anEvent", ...) -> receiver.callback(emitter, ...)
         */
        fire: function (event) {
            if (event in this.listeners) {
                var args = Array.prototype.slice.call(arguments, 1);
                args.unshift(this);
                this.listeners[event].forEach(function (listener) {
                    listener.callback.apply(listener.receiver, args);
                });
            }
            return this;
        },

        /*
         * Returns an event listener definition object.
         */
        makeListenerRecord: function (event, a, b) {
            if (b === undefined) {
                if (typeof a === "function") {
                    return {
                        callback: a,
                        receiver: globals
                    };
                }
                else {
                    return {
                        callback: a[event],
                        receiver: a
                    };
                }
            }
            else {
                return {
                    callback: a,
                    receiver: b
                };
            }
        }
    };
});
