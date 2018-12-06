import * as encoding from "../src/encoding";
import { assert } from "chai";
import { suite, test } from "mocha";

suite("encoding", () => {
    test("stringToBase64", () => {
        const input = "Hello World";
        assert.equal(encoding.stringToBase64(input), "SGVsbG8gV29ybGQ");
        assert.equal(encoding.stringToBase64(input, false), "SGVsbG8gV29ybGQ=");
    });

    test("base64ToString", () => {
        assert.equal(encoding.base64ToString("SGVsbG8gV29ybGQ="), "Hello World");
        assert.equal(encoding.base64ToString("SGVsbG8gV29ybGQ"), "Hello World");
    });
});
