/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import { cryptoProviderSpec } from "@padloc/core/lib/spec/crypto.js";
import { WebCryptoProvider } from "../../dist/crypto.js";

const provider = new WebCryptoProvider();

const spec = cryptoProviderSpec(provider);

suite("WebCryptoProvider", () => {
    spec(test, chai.assert);
});
