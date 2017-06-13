/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { toCSV } from "../app/src/core/export";
import { Record } from "../app/src/core/data";

suite("export", () => {
    test("from CSV", () => {
        const records = [
            new Record("name1", [
                { name: "field1", value: "value1" }
            ], "category1"),
            new Record("name2", [
                { name: "field1", value: "value2" },
                { name: "field2", value: "multiline\nvalue" }
            ], "category2")
        ];
        const expected = 'name,category,field1,field2\r\n' +
            'name1,category1,value1,\r\n' +
            'name2,category2,value2,"multiline\nvalue"';

        const csv = toCSV(records);
        assert.equal(csv, expected);
    });
});
