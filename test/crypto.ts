/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import { assertError } from "./helpers";
import { Container, CryptoError } from "../app/src/core/crypto";

suite("crypto", () => {
    test("encrypt/decrypt", () => {
        let cont = new Container();

        cont.password = "password";
        cont.set("secret");

        let data = cont.get();
        assert.equal(data, "secret");

        cont.password = "notmypassword";
        assertError(() => cont.get(), "decryption_failed");
    });

    test("fromJSON/toJSON", () => {
        let cont = new Container();
        cont.password = "password";
        cont.set("secret");

        let json = cont.toJSON();
        let cont2 = Container.fromJSON(json);
        cont2.password = "password";

        let data = cont.get();
        assert.equal(data, "secret");

        let invalid = [
            "",
            "{}",
            // Iter number too big
            `{
                "cipher": "aes",
                "mode": "ccm",
                "keySize": 256,
                "iter": 100000000000,
                "ts": 64,
                "salt": "",
                "iv": "",
                "adata": "",
                "ct": ""
            }
            `,
            // Bad cipher param
            `{
                "cipher": "notacipher",
                "mode": "ccm",
                "keySize": 256,
                "iter": 100000000000,
                "ts": 64,
                "salt": "",
                "iv": "",
                "adata": "",
                "ct": ""
            }
            `
        ];

        for (let json of invalid) {
            assertError(() => Container.fromJSON(json), "invalid_container_data");
        }
    });
});
