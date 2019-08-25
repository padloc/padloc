/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import { setProvider } from "@padloc/core/lib/crypto.js";
import { appSpec } from "@padloc/core/lib/spec/app.js";
import { WebCryptoProvider } from "../../dist/crypto.js";

setProvider(new WebCryptoProvider());

suite("Full App Integration Test", () => {
    appSpec()(test, chai.assert);
});
