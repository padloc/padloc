import { randomBytes, createHash, createHmac } from "crypto";
import { Base64String } from "./encoding";
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
    AESEncryptionParams,
    RSAEncryptionParams,
    HashParams,
    RSASigningParams
} from "./crypto";
import { Err, ErrorCode } from "./error";

export class NodeCryptoProvider implements CryptoProvider {
    async randomBytes(n: number) {
        return new Promise<Base64String>((resolve, reject) => {
            randomBytes(n, (err, buf) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(buf.toString("base64"));
                }
            });
        });
    }

    async hash(input: Base64String, params: HashParams) {
        const alg = params.algorithm.replace("-", "").toLowerCase();
        const hash = createHash(alg);
        hash.update(input);
        return hash.digest("base64");
    }

    generateKey(params: AESKeyParams): Promise<AESKey>;
    generateKey(params: RSAKeyParams): Promise<{ privateKey: RSAPrivateKey; publicKey: RSAPublicKey }>;
    generateKey(params: HMACParams): Promise<HMACKey>;
    async generateKey(): Promise<any> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async deriveKey(): Promise<SymmetricKey> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    encrypt(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String>;
    encrypt(publicKey: RSAPublicKey, data: Base64String, params: RSAEncryptionParams): Promise<Base64String>;
    async encrypt(): Promise<Base64String> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    decrypt(key: AESKey, data: Base64String, params: AESEncryptionParams): Promise<Base64String>;
    decrypt(publicKey: RSAPublicKey, data: Base64String, params: RSAEncryptionParams): Promise<Base64String>;
    async decrypt(): Promise<Base64String> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async fingerprint(key: RSAPublicKey): Promise<Base64String> {
        return await this.hash(key, { algorithm: "SHA-256" });
    }

    async sign(key: HMACKey, data: Base64String, params: HMACParams): Promise<Base64String>;
    async sign(key: RSAPrivateKey, data: Base64String, params: RSASigningParams): Promise<Base64String>;
    async sign(
        key: HMACKey | RSAPrivateKey,
        data: Base64String,
        params: HMACParams | RSASigningParams
    ): Promise<Base64String> {
        switch (params.algorithm) {
            case "HMAC":
                return this._signHMAC(key, data, params);
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    async verify(key: HMACKey, signature: Base64String, data: Base64String, params: HMACParams): Promise<boolean>;
    async verify(
        key: RSAPrivateKey,
        signature: Base64String,
        data: Base64String,
        params: RSASigningParams
    ): Promise<boolean>;
    async verify(
        key: HMACKey | RSAPrivateKey,
        signature: Base64String,
        data: Base64String,
        params: HMACParams | RSASigningParams
    ): Promise<boolean> {
        switch (params.algorithm) {
            case "HMAC":
                return this._verifyHMAC(key, signature, data, params);
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    private async _signHMAC(key: HMACKey, data: Base64String, params: HMACParams): Promise<Base64String> {
        const hash = params.hash.replace("-", "").toLowerCase();
        const hmac = createHmac(hash, Buffer.from(key, "base64"));
        hmac.update(Buffer.from(data, "base64"));
        return hmac.digest("base64");
    }

    private async _verifyHMAC(
        key: HMACKey,
        signature: Base64String,
        data: Base64String,
        params: HMACParams
    ): Promise<boolean> {
        const hash = params.hash.replace("-", "").toLowerCase();
        const hmac = createHmac(hash, Buffer.from(key, "base64"));
        hmac.update(data);
        const sig = hmac.digest("base64");
        return signature === sig;
    }
}
