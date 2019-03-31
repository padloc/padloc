import "chai";
import { Err } from "../error";

export type Spec = (test: (name: string, fn: () => Promise<void>) => void, assert: Chai.Assert) => void;

export async function assertResolve(assert: Chai.Assert, fn: () => Promise<any>, message?: string) {
    let err: Err | null = null;
    try {
        await fn();
    } catch (e) {
        err = e;
    }

    assert.isNull(err, message);
}

export async function assertReject(assert: Chai.Assert, fn: () => Promise<any>, code: string, message?: string) {
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
