/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { MemorySource, LocalStorageSource, EncryptedSource } from "../app/src/core/source";

async function testSource(source) {
    let data = await source.get();
    console.log(data);
    assert.equal(data, "");
    await source.set("test");
    data = await source.get();
    console.log(data);
    assert.equal(data, "test");
    await source.clear();
    data = await source.get();
    assert.equal(data, "");
}

suite("source", () => {
    test("MemorySource", () => testSource(new MemorySource()));
    test("LocalStorageSource", () => testSource(new LocalStorageSource("test")));
    test("EncryptedSource", () => {
        const source = new EncryptedSource(new MemorySource());
        source.password = "secret";
        testSource(source);
    });
});
