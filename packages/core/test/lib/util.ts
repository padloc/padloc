import { assert } from "chai";
import { Err } from "../../src/error";

export async function assertReject(fn: () => Promise<any>, code: string, message?: string) {
    let err: Err | null = null;
    try {
        await fn();
    } catch (e) {
        err = e;
    }

    assert.isNotNull(err, message);
    assert.instanceOf(err, Err, message);
    assert.equal(err!.code, code, message);
}
