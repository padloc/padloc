/// <reference types="mocha" />
/// <reference types="chai" />
import { loadScript } from "../../dist/util.js";

const { assert } = chai;

suite("util", () => {
    test("Async Load Script", async () => {
        const global = await loadScript("res/my-script.js", "myscript");
        assert.equal(global, "Hello World!");
    });
});
