/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { asyncAssertError as assertError } from "./helpers";
import { Settings } from "../app/src/core/data";
import { request } from "../app/src/core/ajax";
import { randomString } from "../app/src/core/util";
import { Source, MemorySource, LocalStorageSource, EncryptedSource, CloudSource } from "../app/src/core/source";

async function testSource(source: Source, testClear = true) {
    let data = await source.get();
    assert.equal(data, "", "Initial data should be empty");
    await source.set("test");
    data = await source.get();
    assert.equal(data, "test", "After setting data, get should return the same data");
    if (testClear) {
        await source.clear();
        data = await source.get();
        assert.equal(data, "", "After clearning data, get should return empty string");
    }
}

suite("source", () => {
    test("MemorySource", () => testSource(new MemorySource()));
    test("LocalStorageSource", () => testSource(new LocalStorageSource("test")));
    test("EncryptedSource", async () => {
        const source = new EncryptedSource(new MemorySource());
        source.password = "secret";
        await testSource(source);
        await source.clear();
        assert(!(await source.hasData()), "hasData for empty source should return with `false`");
        source.password = "secret";
        await source.set("test");
        assert(await source.hasData(), "hasData for non-empty source should return with `true`");
    });

    test("CloudSource", async () => {
        const settings = new Settings();
        settings.syncCustomHost = true;
        settings.syncHostUrl = "http://127.0.0.1:3000";
        const source = new CloudSource(settings);

        await assertError(() => source.get(), "invalid_auth_token");

        const email = randomString();
        const authToken = await source.requestAuthToken(email, true);
        assert(typeof authToken.id === "string");
        assert(typeof authToken.token === "string");
        assert.equal(authToken.email, email);

        await assertError(() => source.get(), "invalid_auth_token");

        await request("GET", authToken.actUrl!);

        const isActive = await source.testCredentials();
        assert(isActive);

        return await testSource(source, false);
    });
});
