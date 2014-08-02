(function(Categories) {
    module("padlock/Categories");

    test("set/get category", function() {
        var categories = new Categories(null, 5),
            catName = "my category",
            color = 1;

        categories.set(catName, color);
        equal(categories.get(catName), color, "Categories object should contain added category with correct value");
        equal(categories.get("not there"), undefined, "Looking up a non-existent category should return undefined");
    });

    asyncTest("save/fetch categories", function() {
        expect(2);

        var mockSource = {
            save: function(opts) {
                this.data = opts.data;
                opts.success();
            },
            fetch: function(opts) {
                opts.success(this.data);
            }
        };

        var name = "test",
            categories = new Categories(name, 5, mockSource),
            catName = "my category",
            catName2 = "another category",
            color = 1,
            color2 = 2,
            color3 = 3;

        categories.set(catName, color);
        categories.set(catName2, color2);
        categories.save({success: function() {
            categories = new Categories(name, 5, mockSource);
            categories.set(catName2, color3);
            categories.fetch({success: function() {
                equal(categories.get(catName), color, "The set should contain the saved category with the correct value");
                equal(categories.get(catName2), color3, "If a category name is already present in the set, the old value should be kept instead of overwriting it");
                start();
            }});
        }});
    });

    test("Get preferable color for a new category", function() {
        var categories = new Categories(null, 3),
            color = categories.autoColor();
        
        // The current implementation is hard to test as is just produces random values.
        // All we can do is to check if the value is inside a valid range.
        ok(color > 0 && color <= categories.numColors, "Returned number should be in range of available colors.");
    });

    test("Get array representation of categories", function() {
        var categories = new Categories();
        categories.set("one", 1);
        categories.set("two", 2);

        var arr = categories.asArray();
        equal(arr.length, 2, "Array should have the right length");
        // This test is actually too strict as the order of the categories is not guaranteed.
        // Should be fine unless it produces false positives though.
        deepEqual(arr, [
            {name: "one", color: 1},
            {name: "two", color: 2}
        ], "Array should contain the correct information");
    });
})(padlock.Categories);