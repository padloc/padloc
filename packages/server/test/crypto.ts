import { cryptoProviderSpec } from "@padloc/core/src/spec/crypto";
import { assert } from "chai";
import { suite, test } from "mocha";
import { NodeCryptoProvider } from "../src/crypto/node";

const spec = cryptoProviderSpec(new NodeCryptoProvider());

suite("NodeCryptoProvider", () => {
    spec(test, assert);
});
