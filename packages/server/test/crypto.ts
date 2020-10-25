import { test, suite } from "mocha";
import { assert } from "chai";
import { cryptoProviderSpec } from "@padloc/core/src/spec/crypto";
import { NodeCryptoProvider } from "../src/crypto";

const spec = cryptoProviderSpec(new NodeCryptoProvider());

suite("NodeCryptoProvider", () => {
    spec(test, assert);
});
