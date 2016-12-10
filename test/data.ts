/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { Collection, Record, Settings } from "../app/src/core/data";
import { MemorySource } from "../app/src/core/source";

suite("data", () => {

    test("add record to collection", () => {
        let coll = new Collection();
        let rec1 = new Record();
        let rec2 = new Record();
        let rec3 = new Record();

        // Add single record
        coll.add(rec1);
        assert.equal(coll.records.length, 1);
        assert(coll.records.includes(rec1));

        // Add multiple records
        coll.add([rec2, rec3]);
        assert(coll.records.includes(rec2));
        assert(coll.records.includes(rec3));

        assert.equal(coll.records.length, 3);
    });

    test("remove record from collection", () => {
        let coll = new Collection();
        let rec = new Record();
        coll.add(rec);

        rec.remove();

        assert(rec.removed);
        assert.equal(rec.fields.length, 0);
        assert(!coll.records.includes(rec));
    });

    test("record ordering", function() {
        let rec1 = new Record("a", [], "a");
        let rec2 = new Record("b", [], "a");
        let rec3 = new Record("a", [], "b");
        let rec4 = new Record("b", [], "b");
        let coll = new Collection();

        coll.add([rec2, rec3, rec1, rec4]);

        assert.deepEqual(coll.records, [rec1, rec2, rec3, rec4]);
    });

    test("save/fetch collection", async function() {
        let coll = new Collection();
        let rec = new Record(
            "some name",
            [{ name: "username", value: "blah"}],
            "my category"
        );
        let source = new MemorySource();
        coll.add(rec);

        await coll.save(source);

        coll = new Collection();
        await coll.fetch(source);

        assert.equal(coll.records.length, 1);
        assert.deepEqual(coll.records[0], rec);
    });

    test("Settings", async function() {
        let s1 = new Settings();
        let s2 = new Settings();
        let source = new MemorySource();

        assert.deepEqual(s1.raw(), Settings.defaults);

        s1.autoLock = false;
        s1.autoLockDelay = 10;
        s1.syncHostUrl = "asdf";

        await s1.save(source);
        await s2.fetch(source);

        assert.deepEqual(s1.raw(), s2.raw());

        s1.clear();
        assert.deepEqual(s1.raw(), Settings.defaults);
    });

});
