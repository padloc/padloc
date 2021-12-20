import { stringToBytes, bytesToString, bytesToBase64, base64ToBytes } from "../encoding";
import {
    CryptoProvider,
    HashParams,
    AESKeyParams,
    AESEncryptionParams,
    HMACKeyParams,
    PBKDF2Params,
    RSASigningParams,
    RSAEncryptionParams,
} from "../crypto";
import { Spec } from "./spec";

const fixtures = {
    rsa: {
        privateKey: base64ToBytes(
            "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDj62aokh6EDbYLbqHaMJvsf1GBx6P_ht7RvVyuBmL3L4uDhmFKWlnNvhZxvtUXM0R3zvuGtsS7l-fNRj_ljTztaT0oA9Z7QOvv6LZqDssd6QCPNMF_p56ZHEVjSUyC8qFjpk2zC_tSebWT_QSbeRQq9QnGcOhjOjp50SGH1ONdzjto5L7Y9uVFno14Q1IO29U-Xrai_H3B-ApUMdGAdVU-bgBKZnbArIUmcjWSkPSfPDvE4m8gLEvYbyFzegS0x1EhkaCj-X1LrJSiav8SKFNtTs7PX3cXuIw9uGPzNTOGFwoK2WFC6sRnwRUaZGwrxbZSjDEOwx13GdCy_aLo5_3LAgMBAAECggEBALSiCAZpZ834n-KHl7a495qDfTGB67PETCumDCHP5fdJsyRWCB1JZgrtMBSNzYxJkWXyoN2vVFPonEnP9ywSt8rgsRtZj063sUW-BXQgrVHTLCJTCVgGnGd0RHnfyceuS8ISN1pDkLdYxlO3H0OovhcdhNXE_ihGKboJyK1CR8A7BzKBsQrbv-TGK3i911i44cVP52FAVoBfM-12MT0mfSb3iaSlgsscWhWP98CON8wYvE8a8JSoYVn9uKmwbW8F4fSrpW4hEOfWbcEC2XA9fbXs1tNqhX_uOiEHLxFAfjqkH72ogVPJ4MQjtQCCnCoqRAzQjgx73CbG_9ttLq4NFkECgYEA-luzC5l6Fc3DpEBiLHFowuZDRD3RTaW-nFp_WTvZX6_65xWLpVTmH2R7ymzTME0mIkv6P657kZirdhJJoMvO7fEtyL-WfaNzmxQu5NYn9iW1xTAYpEFa3Vd7zbwznkCpbvk43RAQxLYLntw8CTM5kf9nQIavhAAjTCCxj-87nnMCgYEA6Q5BHp0NIXrwsec3_ccqWamUzzAyG_AxNPnTH9RaYCYJB0jZmTXWvEIFfnw9wVoblAqk9WKfkMbRKUNf3lLS4nTzehRDJNXTprxENoesTznI4eAX1o0qULll7cRsqHpZ-j6OcVRzLpsnCOHfnXEh6ABRgE7u0-gmuleZrpH-NUkCgYBIbd8OrAg15qGDE11TnjvApv0u8PNsk1bhxQyytC3fEPp1gDY2TqmEy31EwtcWUjuGEJUFd2UoahKwxfmnG09yZyPnwAW5s1_urZgjfBFzlNVRhuiaHI49GuImUxxb3DkocdGRouQ3BLO38d8sijVNl6Y3dL-yYJfVnl_AVGXbIQKBgQClcKwDimN23-obsFLMAWVr7vknN0RrFtAnli0sjDd3x6hjFnD51QFR9OAnkRTZvBiVuBSv6UnyoWB7lUtp7IutnG32vImJjY1I8J7PwvIr745N4iGp-d4PHf1gky67Tteu0FeX1eZKMHO-V3HBNz1lj0xL9DyQC13qrCL5jMPTmQKBgQCnC98PEayu27weEf1wG_u-RBnq6ON7JVMfm8dhYb3k1pbgzmEaW1qNo1bFGPgbOP7VWWLKlLJXDuiSshJtfy6hmTl2zVMM0qkpepVhp5O3Vq-ABFANleJ4LbVDGdiz5ikGL5IKx3Ra5BbtTj4vX4NOTAKTGvgNjjvYcDYoI62DZg"
        ),
        publicKey: base64ToBytes(
            "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4-tmqJIehA22C26h2jCb7H9Rgcej_4be0b1crgZi9y-Lg4ZhSlpZzb4Wcb7VFzNEd877hrbEu5fnzUY_5Y087Wk9KAPWe0Dr7-i2ag7LHekAjzTBf6eemRxFY0lMgvKhY6ZNswv7Unm1k_0Em3kUKvUJxnDoYzo6edEhh9TjXc47aOS-2PblRZ6NeENSDtvVPl62ovx9wfgKVDHRgHVVPm4ASmZ2wKyFJnI1kpD0nzw7xOJvICxL2G8hc3oEtMdRIZGgo_l9S6yUomr_EihTbU7Oz193F7iMPbhj8zUzhhcKCtlhQurEZ8EVGmRsK8W2UowxDsMddxnQsv2i6Of9ywIDAQAB"
        ),
        sigData: base64ToBytes("Fm3BL9O9py8ImFOsQ9MLPuPDWORdNeV6xks48loc4EU"),
        signature: base64ToBytes(
            "sh6hSSYUER2MISzKD9fUW1KGBILaP8THFX7BKR8RO4oFMpfZTioy8O3yQ726rO69zaGKP5kxY_iP1R_-5t4_3QuWEItZFvy8Ja1bFF8S80OIyap3Nx0nKWAwiU6aPz0yy2HrYNxd6zJufojcM1_dVKlq954sLq45yhNuQPVBAKsfrPHYoqWiuyP820wD1ysghg6h6EtB6SZzNsAL9tg5uuyQo-bO6VqqsccE-aaVFxD4w_xA9pGmjQe3HUTaNdi7cfPnMTygHN2qoTzSuFVbUAOQ1KGWRWdLnz3Wj9yJb_-FyBAzGbKxNANqnQyCIVrlD4zGCe_f6JsS-kvTxSu9fw"
        ),
        plain: stringToBytes("Hello World!"),
        encrypted: base64ToBytes(
            "eAJDfWUdgL4Wl0UDsA0WsmHE29MNAnTvSjus3N0BP6foD0fFZBlrfmRbF-KjY_2zYhgaqn7E4pEKMB20tPDC-JYcAJO8PMWOR6PdLBsBCUTbdYy062iwFWgWfzSFV2LDy-G2t9HL2CbDoDAdsh1fNGIm81nY9sXbB0kKM4uNXKTdVl49Cwf30jiRRpABV_tSPmQjkHDVWOphVEY5ex0hhveRC6vfO1YZ21-CuoTa1gRq-ab21V-Pl5rfQ0RHsDgtvvSJ8_3ihzCkOTjd2Anj0GiKEsCeV0NaEgT-e5WyDj2zYNIsVOoMmB65UUkXX002Ycc2cGuoYw2uudZQSaAlqg"
        ),
    },
    aes: {
        key: base64ToBytes("fe8Chv8F4je2wW3u67H6KFVtlRuH4VWBgN1FXPoOKAw"),
        data: base64ToBytes("SGVsbG8gV29ybGQh"),
        iv: base64ToBytes("Tg9aODkCqoBQDktZAXLEhw"),
        additionalData: base64ToBytes("dJvkr9MnycfsAHiqZStEOg"),
        plain: stringToBytes("Hello World!"),
        encrypted: base64ToBytes("A4ODqQsZrMQ4hXxV-RyYVDhdjTvk1MQ7MG8j_A"),
    },
};

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
                await provider.hash(input, { algorithm: "BLAH" } as any as HashParams);
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
            const expect = "hVqESmWUEEnaxQ-wpONtJ-r9ngB9GlnnY7u2ZuGMY6A";
            const params = new PBKDF2Params();
            params.iterations = 1;
            params.salt = base64ToBytes("ZvVbzn9zR6qaJ2fUL0d1IQ");
            const key = bytesToBase64(await provider.deriveKey(stringToBytes("password"), params));
            assert(key === expect, `Expected ${key} to equal ${expect}`);
        });

        test("encrypt (AES)", async () => {
            const { key, iv, additionalData, encrypted, plain } = fixtures.aes;
            const params = new AESEncryptionParams();
            params.iv = iv;
            params.additionalData = additionalData;
            const enc = await provider.encrypt(key, plain, params);
            assert(bytesToBase64(enc) === bytesToBase64(encrypted));
        });

        test("decrypt (AES)", async () => {
            const { key, iv, additionalData, encrypted, plain } = fixtures.aes;
            const params = new AESEncryptionParams();
            params.iv = iv;
            params.additionalData = additionalData;
            const decrypted = await provider.decrypt(key, encrypted, params);
            assert(bytesToString(plain) === bytesToString(decrypted), "Decrypted string should equal original");
        });

        test("encrypt (RSA)", async () => {
            const { publicKey, privateKey, plain } = fixtures.rsa;
            const params = new RSAEncryptionParams();
            const enc = await provider.encrypt(publicKey, plain, params);
            const dec = await provider.decrypt(privateKey, enc, params);
            assert(bytesToString(plain) === bytesToString(dec));
        });

        test("decrypt (RSA)", async () => {
            const { privateKey, plain, encrypted } = fixtures.rsa;
            const decrypted = await provider.decrypt(privateKey, encrypted, new RSAEncryptionParams());
            assert(bytesToString(plain) === bytesToString(decrypted));
        });

        test("sign (RSA)", async () => {
            const { sigData, privateKey } = fixtures.rsa;
            await provider.sign(privateKey, sigData, new RSASigningParams());
        });

        test("verify (RSA)", async () => {
            const { sigData, signature, publicKey } = fixtures.rsa;
            const verified = await provider.verify(publicKey, signature, sigData, new RSASigningParams());
            assert(verified, "Verify should return true");
        });
    };
}
