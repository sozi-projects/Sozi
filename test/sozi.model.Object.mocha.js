
var assert = require("assert");
require("../js/namespace.js");
require("../js/sozi.model.Object.js");

describe("sozi.model.Object", function () {
    describe("cloning", function () {
        it("should set the prototype chain", function () {
            var a = sozi.model.Object.clone();
            var b = a.clone();
            assert.equal(a.proto, sozi.model.Object);
            assert.equal(b.proto, a);
        });
    });

    describe("accessing simple values", function () {
        it("should set a property at definition", function () {
            var a = sozi.model.Object.clone({
                answer: 42
            });
            assert.equal(a.answer, 42);
        });

        it("should set a property by accessor", function () {
            var a = sozi.model.Object.clone({
                answer: 42
            });
            a.answer = 21;
            assert.equal(a.answer, 21);
        });

        it("should copy attributes", function () {
            var a = sozi.model.Object.clone({
                answer: 42,
            });
            var b = a.clone();
            assert.equal(b.answer, 42);
        });

        it("should set a property in a clone", function () {
            var a = sozi.model.Object.clone({
                answer: 42,
            });
            var b = a.clone();
            b.answer = 21;
            assert.equal(a.answer, 42);
            assert.equal(b.answer, 21);
        });
    });
    
    describe("accessing collections", function () {
        it("should set a collection at definition", function () {
            var a = sozi.model.Object.clone({
                odd: [1, 3, 5]
            });
            assert.equal(a.odd.owner, a);
            assert.equal(a.odd.owningProperty, "odd");
            assert.equal(a.odd.at(0), 1);
            assert.equal(a.odd.at(1), 3);
            assert.equal(a.odd.at(2), 5);
        });

        it("should add values to a collection", function () {
            var a = sozi.model.Object.clone({
                odd: []
            });
            a.odd.add(1).add(3).add(5);
            assert.equal(a.odd.at(0), 1);
            assert.equal(a.odd.at(1), 3);
            assert.equal(a.odd.at(2), 5);
        });

        it("should copy all values", function () {
            var a = sozi.model.Object.clone({
                odd: [1, 3, 5]
            });
            var b = a.clone();
            assert.equal(b.odd.at(0), 1);
            assert.equal(b.odd.at(1), 3);
            assert.equal(b.odd.at(2), 5);
        });

        it("should put a value in a clone", function () {
            var a = sozi.model.Object.clone({
                odd: [1, 3, 5]
            });
            var b = a.clone();
            b.odd.put(7, 1);
            assert.equal(a.odd.at(1), 3);
            assert.equal(b.odd.at(1), 7);
        });
    });
    
    describe("accessing object references", function () {
        it("should set a property at definition", function () {
            var a = sozi.model.Object.clone();
            var b = sozi.model.Object.clone({
                ref: a
            });
            assert.equal(b.ref, a);
            assert.equal(a.owner, null);
            assert.equal(a.owningProperty, null);
        });

        it("should set a property by accessor", function () {
            var a = sozi.model.Object.clone();
            var b = sozi.model.Object.clone({
                ref: null
            });
            b.ref = a
            assert.equal(b.ref, a);
            assert.equal(a.owner, null);
            assert.equal(a.owningProperty, null);
        });

        it("should copy attributes", function () {
            var a = sozi.model.Object.clone();
            var b = sozi.model.Object.clone({
                ref: a
            });
            var c = b.clone();
            assert.equal(c.ref, a);
        });

        it("should set a property in a clone", function () {
            var a = sozi.model.Object.clone();
            var b = sozi.model.Object.clone({
                ref: a
            });
            var c = b.clone();
            var d = sozi.model.Object.clone();
            c.ref = d;
            assert.equal(b.ref, a);
            assert.equal(c.ref, d);
        });
    });
    
    describe("owning", function () {
        it("should initialize owner", function () {
            var a = sozi.model.Object.clone();
            assert.equal(a.owner, null);
            assert.equal(a.owningProperty, null);
        });

        it("should set the owner at definition", function () {
            var a = sozi.model.Object.clone();
            var b = sozi.model.Object.clone({
                content: {own: a},
            });
            assert.equal(b.content, a);
            assert.equal(a.owner, b);
            assert.equal(a.owningProperty, "content");
        });
        
        it("should set the owner by accessor", function () {
            var a = sozi.model.Object.clone();
            var b = sozi.model.Object.clone({
                content: {own: null},
            });
            b.content = a;
            assert.equal(b.content, a);
            assert.equal(a.owner, b);
            assert.equal(a.owningProperty, "content");
        });
        
        it("should change the owner", function () {
            var a = sozi.model.Object.clone();
            var b = sozi.model.Object.clone({
                content: {own: a},
            });
            var c = sozi.model.Object.clone();
            b.content = c;
            assert.equal(b.content, c);
            assert.equal(a.owner, null);
            assert.equal(a.owningProperty, null);
            assert.equal(c.owner, b);
            assert.equal(c.owningProperty, "content");
        });
        
        describe("collections", function () {
            it("should set the owner at definition", function () {
                var a = sozi.model.Object.clone();
                var b = sozi.model.Object.clone();
                var c = sozi.model.Object.clone();
                var d = sozi.model.Object.clone({
                    content: {own: [a, b, c]},
                });
                assert.equal(d.content.at(0), a);
                assert.equal(d.content.at(1), b);
                assert.equal(d.content.at(2), c);
                assert.equal(a.owner, d);
                assert.equal(a.owningProperty, "content");
                assert.equal(b.owner, d);
                assert.equal(b.owningProperty, "content");
                assert.equal(c.owner, d);
                assert.equal(c.owningProperty, "content");
            });

            it("should set the owner by accessor", function () {
                var a = sozi.model.Object.clone();
                var b = sozi.model.Object.clone();
                var c = sozi.model.Object.clone();
                var d = sozi.model.Object.clone({
                    content: {own: []},
                });
                d.content.add(a).add(b).add(c);
                assert.equal(d.content.at(0), a);
                assert.equal(d.content.at(1), b);
                assert.equal(d.content.at(2), c);
                assert.equal(a.owner, d);
                assert.equal(a.owningProperty, "content");
                assert.equal(b.owner, d);
                assert.equal(b.owningProperty, "content");
                assert.equal(c.owner, d);
                assert.equal(c.owningProperty, "content");
            });

            it("should change the owner", function () {
                var a = sozi.model.Object.clone();
                var b = sozi.model.Object.clone();
                var c = sozi.model.Object.clone();
                var d = sozi.model.Object.clone({
                    content: {own: [a, b, c]},
                });
                var e = sozi.model.Object.clone();
                d.content.put(e, 1); // Replace b with e
                d.content.remove(a);
                assert.equal(a.owner, null);
                assert.equal(a.owningProperty, null);
                assert.equal(b.owner, null);
                assert.equal(b.owningProperty, null);
                assert.equal(e.owner, d);
                assert.equal(e.owningProperty, "content");
            });
        });
    });
});
