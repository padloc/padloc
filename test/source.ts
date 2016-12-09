/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { MemorySource, LocalStorageSource, EncryptedSource } from "../app/src/core/source";

function testSource(source) {
    return source.get()
        .then(data => assert.equal(data, ""))
        .then(() => source.set("test"))
        .then(() => source.get())
        .then(data => assert.equal(data, "test"))
        .then(() => source.clear())
        .then(() => source.get())
        .then(data => assert.equal(data, ""));
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
