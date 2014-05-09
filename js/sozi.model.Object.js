
namespace("sozi.model", function (exports) {
    "use strict";

    var creationCount = 0;

    var ProtoObject = {
        _id: String(creationCount++),
        _owner: null,
        _owningProperty: null,
        _listeners: {},
        
        clone: function () {
            var object = Object.create(this);
            object._id = String(creationCount++);
            object._owner = null;
            object._owningProperty = null;
            object._listeners = {};
            return object;
        },
        
        get proto() {
            return Object.getPrototypeOf(this);
        },
        
        get owner() {
            return this._owner;
        },
        
        get owningProperty() {
            return this._owningProperty;
        },
        
        toStorable: function () {
            // TODO
            return {};
        },

        fromStorable: function (obj) {
            // TODO
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
            if (!(event in this._listeners)) {
                this._listeners[event] = [];
            }
            this._listeners[event].push(callback, context);
            return this;
        },

        /*
         * Remove a listener for a given event.
         *
         * This method accepts the same arguments as addListener.
         */
        removeListener: function (event, callback, context) {
            if (event in this._listeners) {
                var listeners = this._listeners[event];
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
         * fire("anEvent:anAttr", ...) -> context.callback(emitter, ...)
         */
        fire: function (event) {
            var args = Array.prototype.slice.call(arguments, 1);

            // For the fired event name "foo", the following
            // listeners will be called:
            //  - foo(this, args...)
            //  - *(this, "foo", args...)
            var extendedEvents = {};
            extendedEvents[event] = [this].concat(args);
            
            if (event !== "*") {
                extendedEvents["*"] = [this, event].concat(args);
            }
            
            // If the event name is of the form "bar:attr",
            // the following listeners will also be called:
            //  - bar(this, "attr", args...)
            //  - *:attr(this, "bar", args...)
            var fragments = event.split(":");
            if (fragments.length === 2) {
                extendedEvents[fragments[0]] = [this, fragments[1]].concat(args);
                if (fragments[0] !== "*") {
                    extendedEvents["*:" + fragments[1]] = [this, fragments[0]].concat(args);
                }
            }

            for (var name in extendedEvents) {
                if (name in this._listeners) {
                    var listeners = this._listeners[name];
                    for (var i = 0; i < listeners.length; i += 2) {
                        listeners[i].apply(listeners[i+1], extendedEvents[name]);
                    }
                }
            }
            
            return this;
        }
    };
    
    exports.Object = ProtoObject.clone();
    
    exports.Object._values = {};
        
    exports.Object.clone = function () {
        var object = ProtoObject.clone.call(this);
        object._values = {};
        for (var name in this._values) {
            var value = this._values[name];
            if (ProtoObject.isPrototypeOf(value) && value._owner === this && value._owningProperty === name) {
                setProperty(object, name, value.clone(), true);
            }
            else {
                setProperty(object, name, value, false);
            }
        }
        this.define.apply(object, arguments);
        return object;
    };

    function changeOwnership(owner, owningProperty, previousValue, newValue) {
        if (ProtoObject.isPrototypeOf(previousValue)) {
            previousValue._owner = null;
            previousValue._owningProperty = null;
        }
        if (ProtoObject.isPrototypeOf(newValue)) {
            newValue._owner = owner;
            newValue._owningProperty = owningProperty;
        }
    }
    
    function setProperty(object, name, value, isOwner) {
        var previousValue = object._values[name];
        if (value !== previousValue) {
            object._values[name] = value;
            if (isOwner) {
                changeOwnership(object, name, previousValue, value);
            }
            object.fire("change:" + name, value);
        }
    }
        
    exports.Object.define = function (properties) {
        function addProperty(object, name, value) {
            var isOwner = false;
            if (value instanceof Object) {
                isOwner = value.hasOwnProperty("own");
                if (isOwner) {
                    value = value.own;
                }
            }
            var accessors = {
                get: function () {
                    return this._values[name];
                }
            };
            if (value instanceof Array) {
                var collection = Collection.clone();
                setProperty(object, name, collection, true);
                collection._isOwner = isOwner;
                collection.pushAll(value);
            }
            else {
                setProperty(object, name, value, isOwner);
                accessors.set = function (value) {
                    setProperty(this, name, value, isOwner);
                };
            }
            Object.defineProperty(object, name, accessors);
        }

        if (properties instanceof Object) {
            Object.keys(properties).forEach(function (key) {
                var descriptor = Object.getOwnPropertyDescriptor(properties, key);
                if (descriptor.set || descriptor.get || descriptor.value instanceof Function) {
                    Object.defineProperty(this, key, descriptor);
                }
                else {
                    addProperty(this, key, descriptor.value);
                }
            }, this);
        }
        
        return this;
    };
    
    var Collection = ProtoObject.clone();
    
    Collection._values = [];
    Collection._isOwner = false;
    
    Collection.clone = function () {
        var object = ProtoObject.clone.call(this);
        object._isOwner = this._isOwner;
        object._values = this._values.map(function (value) {
            if (ProtoObject.isPrototypeOf(value) && this._isOwner) {
                return value.clone();
            }
            return value;
        }, this);
        return object;
    };
    
    Collection.push = function () {
        for (var i = 0; i < arguments.length; i++) {
            var value = arguments[i];
            this._values.push(value);
            if (this._isOwner) {
                changeOwnership(this._owner, this._owningProperty, null, value);
            }
            this.fire("add", value, this._values.length - 1);
            this._owner.fire("change:" + this._owningProperty, this);
        }
        return this;
    };

    Collection.pushAll = function (values) {
        values.forEach(function (elt) {
            this.push(elt);
        }, this);
        return this;
    };
    
    Collection.insert = function (value, index) {
        this._values.splice(index, 0, value);
        if (this._isOwner) {
            changeOwnership(this._owner, this._owningProperty, null, value);
        }
        this.fire("add", value, index);
        this._owner.fire("change:" + this._owningProperty, this);
        return this;
    };

    Collection.put = function (value, index) {
        var previousValue = this._values[index];
        if (value === previousValue) {
            return this;
        }
        this._values[index] = value;
        if (this._isOwner) {
            changeOwnership(this._owner, this._owningProperty, previousValue, value);
        }
        if (previousValue !== undefined) {
            this.fire("remove", previousValue, index);
        }
        this.fire("add", value, index);
        this._owner.fire("change:" + this._owningProperty, this);
        return this;
    };
    
    Collection.removeAt = function (index) {
        var values = this._values.splice(index, 1);
        if (values.length) {
            if (this._isOwner) {
                changeOwnership(this._owner, this._owningProperty, values[0], null);
            }
            this.fire("remove", values[0], index);
            this._owner.fire("change:" + this._owningProperty, this);
        }
        return this;
    };
    
    Collection.remove = function (value) {
        var index = this._values.indexOf(value);
        if (index < 0) {
            return this;
        }
        return this.removeAt(index);
    };

    Collection.removeAll = function (value) {
        while (this.contains(value)) {
            this.remove(value);
        }
        return this;
    };

    Collection.clear = function () {
        while (this._values.length) {
            this.removeAt(0);
        }
        return this;
    };
    
    Collection.contains = function (value) {
        return this._values.indexOf(value) >= 0;
    };

    Collection.at = function (index) {
        return this._values[index];
    };

    Object.defineProperty(Collection, "first", {
        get: function () {
            return this._values[0];
        }
    });
    
    Object.defineProperty(Collection, "last", {
        get: function () {
            return this._values[this._values.length - 1];
        }
    });
    
    Object.defineProperty(Collection, "length", {
        get: function () {
            return this._values.length;
        }
    });
    
    function makeAlias(name) {
        Collection[name] = function () {
            return Array.prototype[name].apply(this._values, arguments);
        };
    }
    
    makeAlias("indexOf");
    makeAlias("forEach");
    makeAlias("map");
    makeAlias("some");
    makeAlias("every");
    makeAlias("slice");
    makeAlias("filter");
    
});
