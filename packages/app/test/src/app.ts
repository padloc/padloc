/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import { setProvider } from "@padloc/core/src/crypto";
import { appSpec } from "@padloc/core/src/spec/app";
import { WebCryptoProvider } from "../../src/lib/crypto";

setProvider(new WebCryptoProvider());

suite("Full App Integration Test", () => {
    appSpec()(test, chai.assert);
});
