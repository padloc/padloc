/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";

export function assertError(fn: () => any, code: string) {
    try {
        fn();
        assert.fail();
    } catch (e) {
        assert.equal(e.code, code);
    }
}
