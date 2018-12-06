import { test, suite } from "mocha";
import { assert } from "chai";
import { setProvider } from "../src/crypto";
import { StubCryptoProvider } from "../src/stub-crypto-provider";
import { appSpec } from "../src/spec/app";

setProvider(new StubCryptoProvider());

suite("Full App Integration Test", () => {
    appSpec()(test, assert);
});
