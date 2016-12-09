/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { Collection, Record } from "../app/src/core/data";

suite("data", function() {

    test("add records", function() {
        let coll = new Collection();
        let rec1 = new Record();

        coll.add(rec1);
        assert.equal(coll.records.length, 1);
    });

    test("remove record", function() {
        let coll = new Collection();
        let recs = [];
        for (let i=0; i<10; i++) {
            recs.push(new Record());
        }
        coll.add(recs);

        let rec = recs[3];

        rec.remove();

        assert(rec.removed, "Removed property should be set to true");
        assert(!rec.name, "Name property should have been removed");
        assert(!rec.fields, "Fields should have been removed");
    });

});
