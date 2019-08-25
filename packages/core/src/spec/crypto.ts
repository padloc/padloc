import { stringToBytes, bytesToBase64, base64ToBytes } from "../encoding";
import {
    CryptoProvider,
    HashParams,
    AESKeyParams,
    HMACKeyParams,
    PBKDF2Params,
    RSAKeyParams,
    RSASigningParams
} from "../crypto";
import { Spec } from "./spec";

export function cryptoProviderSpec(provider: CryptoProvider): Spec {
    return (test, assert) => {
        test("randomBytes", async () => {
            const random = await provider.randomBytes(8);
            assert(random instanceof Uint8Array && random.length === 8, "Should return an 8 byte base64 string");
        });

        test("hash", async () => {
            const input = stringToBytes("Hello World");

            assert(
                bytesToBase64(await provider.hash(input, new HashParams().fromRaw({ algorithm: "SHA-1" }))) ===
                    "Ck1VqNd45QIvq3AZd8XYQLvEhtA"
            );
            assert(
                bytesToBase64(await provider.hash(input, new HashParams().fromRaw({ algorithm: "SHA-256" }))) ===
                    "pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4"
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
            const aesKey = await provider.generateKey(new AESKeyParams());
            assert(aesKey.length === 32);
            const hmacKey = await provider.generateKey(new HMACKeyParams());
            assert(hmacKey.length === 32);
            // TODO
            // const { publicKey, privateKey } = await provider.generateKey(new RSAKeyParams());
        });

        test("deriveKey", async () => {
            const params = new PBKDF2Params();
            params.iterations = 1;
            params.salt = base64ToBytes("ZvVbzn9zR6qaJ2fUL0d1IQ");
            const key = await provider.deriveKey(stringToBytes("password"), params);
            assert(bytesToBase64(key) === "hVqESmWUEEnaxQ-wpONtJ-r9ngB9GlnnY7u2ZuGMY6A");
        });

        test("encrypt", async () => {});

        test("sign/verify", async () => {
            const data = await provider.randomBytes(8);
            const { privateKey, publicKey } = await provider.generateKey(new RSAKeyParams());
            const params = new RSASigningParams();
            const signature = await provider.sign(privateKey, data, params);
            const verified = await provider.verify(publicKey, signature, data, params);
            assert(verified);
        });
    };
}
