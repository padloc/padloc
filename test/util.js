define(["padlock/util"], function(util) {
    module("padlock/util");

    test("insert", function() {
        // Insert single element at the correct position
        var a = util.insert([0, 1, 2, 3, 4, 5], "a", 2);
        deepEqual(a, [0, 1, "a", 2, 3, 4, 5]);

        // Insert mutliple elements at the correct position
        var b = util.insert([0, 1, 2, 3, 4, 5], ["hello", "world"], 3);
        deepEqual(b, [0, 1, 2, "hello", "world", 3, 4, 5]);

        // For negative indexes, count from the end backwards
        var c = util.insert([0, 1, 2, 3, 4, 5], "a", -2);
        deepEqual(c, [0, 1, 2, 3, "a", 4, 5]);

        // Index should default to 0
        var d = util.insert([0, 1, 2, 3, 4, 5], "a");
        deepEqual(d, ["a", 0, 1, 2, 3, 4, 5]);

        // An out-of-range index should result in the value being inserted at the end
        var e = util.insert([0, 1, 2, 3, 4, 5], "a", 9);
        deepEqual(e, [0, 1, 2, 3, 4, 5, "a"]);
    });

    test("remove", function() {
        // Remove single element
        var a = util.remove(["a", "b", "c", "d", "e"], 3);
        deepEqual(a, ["a", "b", "c", "e"]);

        // Remove a range of elements
        var b = util.remove(["a", "b", "c", "d", "e"], 1, 3);
        deepEqual(b, ["a", "e"]);

        // If upper bound is smaller then lower bound, ignore it
        var c = util.remove(["a", "b", "c", "d", "e"], 1, -1);
        deepEqual(c, ["a", "c", "d", "e"]);

        // If upper bound is bigger than the length of the list, remove everything up to the end
        var d = util.remove(["a", "b", "c", "d", "e"], 1, 10);
        deepEqual(d, ["a"]);

        // If lower bound is out-of-range, return a simple copy
        var e = util.remove(["a", "b", "c", "d", "e"], 10);
        deepEqual(e, ["a", "b", "c", "d", "e"]);
    });

    test("mixin", function() {
        var a = {one: 1, two: "two"},
            b = {one: 2, three: "three"},
            c = util.mixin(a, b);

        equal(a, c, "Returned object should be identical with target object");
        deepEqual(a, {
            one: 1,
            two: "two",
            three: "three"
        }, "If overwrite is false, merge in all properties from source object without overwriting existing properties");

        var d = util.mixin({one: 1}, {one: "one"}, true);
        equal(d.one, "one", "If overwrte is true, overwrite existing properties in target object");
    });

    test("isArray", function() {
        ok(util.isArray([]));
        ok(util.isArray(new Array()));
        ok(!util.isArray(null));
        ok(!util.isArray(""));
        ok(!util.isArray({}));
    });
});