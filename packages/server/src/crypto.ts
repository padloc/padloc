// @ts-ignore
import { randomBytes, createHash, createHmac, createSign, createVerify, constants } from "crypto";
import {
    CryptoProvider,
    AESKey,
    RSAPublicKey,
    RSAPrivateKey,
    HMACKey,
    SymmetricKey,
    AESKeyParams,
    RSAKeyParams,
    HMACParams,
    HMACKeyParams,
    AESEncryptionParams,
    RSAEncryptionParams,
    HashParams,
    RSASigningParams
} from "@padloc/core/src/crypto";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { equalCT } from "@padloc/core/src/encoding";

export class NodeCryptoProvider implements CryptoProvider {
    async randomBytes(n: number) {
        return new Promise<Uint8Array>((resolve, reject) => {
            randomBytes(n, (err, buf) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(new Uint8Array(buf));
                }
            });
        });
    }

    async hash(input: Uint8Array, params: HashParams) {
        const alg = params.algorithm.replace("-", "").toLowerCase();
        const hash = createHash(alg);
        hash.update(Buffer.from(input));
        return new Uint8Array(hash.digest());
    }

    generateKey(params: AESKeyParams): Promise<AESKey>;
    generateKey(params: RSAKeyParams): Promise<{ privateKey: RSAPrivateKey; publicKey: RSAPublicKey }>;
    generateKey(params: HMACKeyParams): Promise<HMACKey>;
    async generateKey(): Promise<any> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async deriveKey(): Promise<SymmetricKey> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    encrypt(key: AESKey, data: Uint8Array, params: AESEncryptionParams): Promise<Uint8Array>;
    encrypt(publicKey: RSAPublicKey, data: Uint8Array, params: RSAEncryptionParams): Promise<Uint8Array>;
    async encrypt(): Promise<Uint8Array> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    decrypt(key: AESKey, data: Uint8Array, params: AESEncryptionParams): Promise<Uint8Array>;
    decrypt(publicKey: RSAPublicKey, data: Uint8Array, params: RSAEncryptionParams): Promise<Uint8Array>;
    async decrypt(): Promise<Uint8Array> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async fingerprint(key: RSAPublicKey): Promise<Uint8Array> {
        return await this.hash(key, new HashParams({ algorithm: "SHA-256" }));
    }

    async sign(key: HMACKey, data: Uint8Array, params: HMACParams): Promise<Uint8Array>;
    async sign(key: RSAPrivateKey, data: Uint8Array, params: RSASigningParams): Promise<Uint8Array>;
    async sign(
        key: HMACKey | RSAPrivateKey,
        data: Uint8Array,
        params: HMACParams | RSASigningParams
    ): Promise<Uint8Array> {
        switch (params.algorithm) {
            case "HMAC":
                return this._signHMAC(key, data, params);
            case "RSA-PSS":
                return this._signRSA(key, data, params);
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    async verify(key: HMACKey, signature: Uint8Array, data: Uint8Array, params: HMACParams): Promise<boolean>;
    async verify(
        key: RSAPrivateKey,
        signature: Uint8Array,
        data: Uint8Array,
        params: RSASigningParams
    ): Promise<boolean>;
    async verify(
        key: HMACKey | RSAPrivateKey,
        signature: Uint8Array,
        data: Uint8Array,
        params: HMACParams | RSASigningParams
    ): Promise<boolean> {
        switch (params.algorithm) {
            case "HMAC":
                return this._verifyHMAC(key, signature, data, params);
            case "RSA-PSS":
                return this._verifyRSA(key, signature, data, params);
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    private async _signHMAC(key: HMACKey, data: Uint8Array, params: HMACParams): Promise<Uint8Array> {
        const hash = params.hash.replace("-", "").toLowerCase();
        const hmac = createHmac(hash, Buffer.from(key));
        hmac.update(Buffer.from(data));
        return new Uint8Array(hmac.digest());
    }

    private async _verifyHMAC(
        key: HMACKey,
        signature: Uint8Array,
        data: Uint8Array,
        params: HMACParams
    ): Promise<boolean> {
        const sig = await this._signHMAC(key, data, params);
        return equalCT(sig, signature);
    }

    _signRSA(key: RSAPrivateKey, data: Uint8Array, params: RSASigningParams) {
        const k = `-----BEGIN PRIVATE KEY-----
${Buffer.from(key).toString("base64")}
-----END PRIVATE KEY-----`;
        const hash = params.hash.replace("-", "").toLowerCase();
        const signer = createSign(hash);
        signer.update(Buffer.from(data));
        const sig = signer.sign({
            key: k,
            passphrase: "",
            // @ts-ignore
            saltLength: params.saltLength,
            padding: constants.RSA_PKCS1_PSS_PADDING
        });

        return new Uint8Array(sig);
    }

    _verifyRSA(key: RSAPublicKey, signature: Uint8Array, data: Uint8Array, params: RSASigningParams) {
        const k = `-----BEGIN PUBLIC KEY-----
${Buffer.from(key).toString("base64")}
-----END PUBLIC KEY-----`;
        const hash = params.hash.replace("-", "").toLowerCase();
        const verifier = createVerify(hash);
        verifier.update(Buffer.from(data));
        const verified = verifier.verify(
            {
                k: k,
                saltLength: params.saltLength,
                padding: constants.RSA_PKCS1_PSS_PADDING
            },
            Buffer.from(signature)
        );

        return verified;
    }
}
