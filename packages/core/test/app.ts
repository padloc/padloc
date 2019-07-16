import { test, suite } from "mocha";
import { assert } from "chai";
import { appSpec } from "../src/spec/app";

suite("Full App Integration Test", () => {
    appSpec()(test, assert);
});
