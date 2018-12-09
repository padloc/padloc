/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import { setProvider } from "@padlock/core/lib/crypto.js";
import { appSpec } from "@padlock/core/lib/spec/app.js";
import { WebCryptoProvider } from "../../dist/crypto.js";

setProvider(new WebCryptoProvider());

suite("Full App Integration Test", () => {
    appSpec()(test, chai.assert);
});
