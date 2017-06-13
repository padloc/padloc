/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";

export function assertError(fn: () => any, code: string) {
    try {
        fn();
    } catch (e) {
        assert.equal(e.code, code);
        return;
    }
    assert.fail();
}

export async function asyncAssertError(fn: () => any, code: string) {
    try {
        await fn();
    } catch (e) {
        assert.equal(e.code, code);
        return;
    }
    assert.fail();
}
