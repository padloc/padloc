QUnit.config.autostart = false;

require(["safe/crypto", "safe/util", "safe/model"], function(crypto, util, model) {

    module("safe/crypto");

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

    module("safe/util");

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

    module("safe/model");

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

    QUnit.start();
});