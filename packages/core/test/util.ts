import { strict as assert } from "assert";
import { suite, test } from "mocha";
import { setPath } from "../src/util";

suite("setPath", () => {
    test("rejects prototype paths before modifying any object", () => {
        for (const path of [
            "__proto__.padlocPolluted",
            "constructor.prototype.padlocPolluted",
            "nested.__proto__.padlocPolluted",
            "nested.constructor.prototype.padlocPolluted",
            "nested.prototype.padlocPolluted",
            "__proto__",
        ]) {
            const target = {};
            try {
                assert.throws(() => setPath(target, path, "polluted"));
                assert.deepEqual(target, {});
                assert.equal(Object.getOwnPropertyDescriptor(Object.prototype, "padlocPolluted"), undefined);
            } finally {
                Reflect.deleteProperty(Object.prototype, "padlocPolluted");
            }
        }
    });

    test("creates own properties rather than traversing inherited objects", () => {
        const inherited = { nested: { original: true } };
        const target = Object.create(inherited);
        setPath(target, "nested.value", "own");
        assert.deepEqual(inherited.nested, { original: true });
        assert.deepEqual(target.nested, { value: "own" });
        assert.equal(Object.prototype.hasOwnProperty.call(target, "nested"), true);
    });

    test("updates nested fields without losing sibling values", () => {
        const target = { name: { givenName: "Alice", familyName: "Example" }, active: false };
        setPath(target, "name.givenName", "Bob");
        setPath(target, "active", true);
        assert.deepEqual(target, { name: { givenName: "Bob", familyName: "Example" }, active: true });
    });
});
