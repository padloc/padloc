import "chai";
import { Err } from "../error";

export type Spec = (test: (name: string, fn: () => Promise<void>) => void, assert: any) => void;

export async function assertResolve(assert: any, fn: () => Promise<any>, message?: string) {
    let err: Err | null = null;
    try {
        await fn();
    } catch (e) {
        err = e;
    }

    assert.isNull(err, message);
}

export async function assertReject(assert: any, fn: () => Promise<any>, code: string, message?: string) {
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
