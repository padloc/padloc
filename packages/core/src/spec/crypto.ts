import { byteLength, isBase64 } from "../base64";
import { stringToBase64 } from "../encoding";
import {
    CryptoProvider,
    HashParams,
    defaultPBKDF2Params,
    defaultRSAKeyParams,
    defaultRSASigningParams
} from "../crypto";
import { Spec } from "./spec";

export function cryptoProviderSpec(provider: CryptoProvider): Spec {
    return (test, assert) => {
        test("randomBytes", async () => {
            const random = await provider.randomBytes(8);
            assert(isBase64(random) && byteLength(random) === 8, "Should return an 8 byte base64 string");
        });

        test("hash", async () => {
            const input = stringToBase64("Hello World");

            assert((await provider.hash(input, { algorithm: "SHA-1" })) === "Ck1VqNd45QIvq3AZd8XYQLvEhtA");
            assert(
                (await provider.hash(input, { algorithm: "SHA-256" })) === "pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4"
            );

            let err;
            try {
                await provider.hash(input, ({ algorithm: "BLAH" } as any) as HashParams);
            } catch (e) {
                err = e;
            }

            assert(!!err, "calling with invalid algorithm should throw an error");
            // assert.instanceOf(err, Err, "Error should be an instance of error.Err");
            // assert.equal(err.code, ErrorCode.NOT_SUPPORTED);
        });

        test("generateKey", async () => {
            const aesKey = await provider.generateKey({ algorithm: "AES", keySize: 256 });
            assert(isBase64(aesKey) && byteLength(aesKey) === 32);
            const hmacKey = await provider.generateKey({ algorithm: "HMAC", keySize: 256 });
            assert(isBase64(hmacKey) && byteLength(hmacKey) === 32);
            const { publicKey, privateKey } = await provider.generateKey(defaultRSAKeyParams());
            assert(isBase64(publicKey) && isBase64(privateKey));
        });

        test("deriveKey", async () => {
            const params = {
                ...defaultPBKDF2Params(),
                iterations: 1,
                salt: "ZvVbzn9zR6qaJ2fUL0d1IQ"
            };
            const key = await provider.deriveKey("password", params);
            assert(key === "hVqESmWUEEnaxQ-wpONtJ-r9ngB9GlnnY7u2ZuGMY6A");
        });

        test("encrypt", async () => {});

        test("sign/verify", async () => {
            const data = await provider.randomBytes(8);
            const { privateKey, publicKey } = await provider.generateKey(defaultRSAKeyParams());
            const params = defaultRSASigningParams();
            const signature = await provider.sign(privateKey, data, params);
            const verified = await provider.verify(publicKey, signature, data, params);
            assert(verified);
        });
    };
}
