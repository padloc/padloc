/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { toCSV, toPadlock } from "../app/src/core/export";
import { fromPadlock } from "../app/src/core/import";
import { Record } from "../app/src/core/data";

const records = [
    new Record("name1", [
        { name: "field1", value: "value1" }
    ], "category1"),
    new Record("name2", [
        { name: "field1", value: "value2" },
        { name: "field2", value: "multiline\nvalue" }
    ], "category2")
];

suite("export", () => {
    test("to CSV", () => {
        const expected = 'name,category,field1,field2\r\n' +
            'name1,category1,value1,\r\n' +
            'name2,category2,value2,"multiline\nvalue"';

        const csv = toCSV(records);
        assert.equal(csv, expected);
    });

    test("to Encrypted", async () => {
        const data = await toPadlock(records, "asdf");
        const recs = await fromPadlock(data, "asdf");
        assert.deepEqual(recs, records);
    });
});
