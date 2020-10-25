import { test, suite } from "mocha";
import { assert } from "chai";
import { appSpec } from "@padloc/core/src/spec/app";
import { setPlatform } from "@padloc/core/src/platform";
import { NodePlatform } from "../src/platform";

setPlatform(new NodePlatform());

suite("Full App Integration Test", () => {
    appSpec()(test, assert);
});
