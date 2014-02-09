QUnit.config.autostart = false;

require(["padlock/crypto", "padlock/util", "padlock/model", "padlock/import"], function(crypto, util, model, imp) {

    module("padlock/crypto");

    test("key generation", function() {
        var keyLength = 256, pwd = "password";

        var p = crypto.genKey(pwd);
        var p2 = crypto.genKey(pwd, p.salt);

        equal(p.key, p2.key, "Two keys created with the same password and salt should be equal.");
        equal(p.salt, p2.salt, "The correct salt should be passed back with the key object.");

        p2 = crypto.genKey(pwd);

        notEqual(p.key, p2.key, "A key generated with new salt should turn out differently.");
    });

    test("encrypt/decrypt roundtrip", function() {
        var pwd = "password", pt = "Hello World!";
        var p = crypto.genKey(pwd);

        var c = crypto.encrypt(p.key, pt);

        var newC = crypto.encrypt(p.key, pt);
        notEqual(newC.ct, c.ct, "Encrypting the same value twice with the same key should result " +
                                "in two different cipher texts.");

        var dec = crypto.decrypt(p.key, c);
        equal(dec, pt, "The decrypted value should be equal to the original value");
    });

    test("pwdEncrypt/pwdDecrypt roundtrip", function() {
        var pwd = "password", pt = "Hello World!";

        var c = crypto.pwdEncrypt(pwd, pt);
        var pt2 = crypto.pwdDecrypt(pwd, c);

        equal(pt2, pt, "The decrypted value should be equal to original value.");

        c2 = crypto.pwdEncrypt(pwd, pt);
        notEqual(c2.ct, c.ct, "The same plaintext/password pair should not result in the same cypher text");
    });

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

    module("padlock/model");

    test("add records", function() {
        var coll = new model.Collection();
        var rec = {name: "Hello", value: "World"};
        coll.add(rec);
        equal(coll.records.length, 1);
        equal(coll.records[0], rec);

        var rec2 = {name: "Orang", value: "Utan"}, rec3 = {name: "John", value: "Travolta"};
        coll.add([rec2, rec3]);
        equal(coll.records.length, 3);
        equal(coll.records[1], rec2);
        equal(coll.records[2], rec3);
    });

    test("remove records", function() {
        var coll = new model.Collection();
        var recs = [];
        for (var i=0; i<10; i++) {
            recs.push({name: "name", value: "value"});
        }
        coll.add(recs);
        equal(coll.records.length, recs.length);

        coll.removeAt(2);
        equal(coll.records.length, recs.length-1);
        ok(coll.records.indexOf(recs[2]) == -1);

        coll.remove(recs[3]);
        equal(coll.records.length, recs.length-2);
        ok(coll.records.indexOf(recs[3]) == -1);
    });

    test("replace a record", function() {
        var coll = new model.Collection();
        var recs = [{}, {}, {}];
        var orig = recs[1];
        var repl = {};

        coll.add(recs);
        coll.replace(orig, repl);

        equal(coll.records[1], repl);
    });

    test("save collection", function() {
        var collName = "test";
        // First, make sure that the collection in question does not exist yet
        localStorage.removeItem("coll_" + collName);

        var coll = new model.Collection(collName);

        coll.fetch();
        deepEqual(coll.records, [], "Collection should be empty initially.");

        coll.save();
        notEqual(localStorage.getItem("coll_" + collName), null, "There should be something in the localStorage now.");

        var recs = ["one", "two", "three"];
        coll.add(recs);
        coll.save();

        var newColl = new model.Collection(collName);

        newColl.fetch();
        deepEqual(newColl.records, coll.records, "After fetching, the collection should be populated with the correct records.");
    });

    test("fetch an existing collection", function() {
        var collName = "test", password = "password";
        localStorage.removeItem("coll_" + collName);

        var coll = new model.Collection(collName);
        coll.add(["one", "two"]);
        coll.store.password = password;
        coll.save();

        var coll2 = new model.Collection(collName);
        ok(!coll2.fetch("drowssap"), "Fetching with a wrong password should return false");
        ok(coll2.fetch(password), "Fetching with the correct password should return true");
        deepEqual(coll.records, coll2.records, "After fetching, the collection should contain the correct records");
    });

    test("test if a collection exists", function() {
        var collName = "test";
        localStorage.removeItem("coll_" + collName);

        var coll = new model.Collection(collName);

        ok(!coll.exists(), "Collection has not been saved yet, so it shouldn't exist in the store");

        coll.save();
        ok(coll.exists(), "After the collection has been saved, it should exist ist the store.");
    });

    test("set/get category", function() {
        var categories = new model.Categories(null, 5),
            catName = "my category",
            color = 1;

        categories.set(catName, color);
        equal(categories.get(catName), color, "Categories object should contain added category with correct value");
        equal(categories.get("not there"), undefined, "Looking up a non-existent category should return undefined");
    });

    test("save/fetch categories", function() {
        var name = "test",
            categories = new model.Categories(name, 5),
            catName = "my category",
            catName2 = "another category",
            color = 1,
            color2 = 2,
            color3 = 3;

        categories.set(catName, color);
        categories.set(catName2, color2);
        categories.save();

        categories = new model.Categories(name, 5);
        categories.set(catName2, color3);
        categories.fetch();

        equal(categories.get(catName), color, "The set should contain the saved category with the correct value");
        equal(categories.get(catName2), color3, "If a category name is already present in the set, the old value should be kept instead of overwriting it");
    });

    test("Get preferable color for a new category", function() {
        var categories = new model.Categories(null, 3),
            color = categories.autoColor();
        
        // The current implementation is hard to test as is just produces random values.
        // All we can do is to check if the value is inside a valid range.
        ok(color > 0 && color <= categories.numColors, "Returned number should be in range of available colors.");
    });

    test("Get array representation of categories", function() {
        var categories = new model.Categories();
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

    module("padlock/import");

    asyncTest("import secustore set", function() {
        var sample = "secustore-backup.txt",
            password = "password",
            expected = [
                {name: "My Record", category: "Import Test", fields: [
                    {name: "My field", value: "some value"}
                ]},
                {name: "Website", category: "Import Test", fields: [
                    {name: "url", value: "http://test.org"},
                    {name: "login name", value: "username"},
                    {name: "password", value: "password"}
                ]}
            ];

        expect(1);

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                var data = imp.importSecuStoreBackup(xmlhttp.responseText, password);
                deepEqual(data, expected, "Imported records did not match the exptected data");
                start();
            }
        };
        xmlhttp.open("GET", sample, true);
        xmlhttp.send();
    });

    QUnit.start();
});