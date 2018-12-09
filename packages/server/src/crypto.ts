// @ts-ignore
import { randomBytes, createHash, createHmac, createSign, createVerify, constants } from "crypto";
import { Base64String, bytesToBase64, base64ToBytes } from "@padloc/core/src/encoding";
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
} from "@padloc/core/src/crypto";
import { Err, ErrorCode } from "@padloc/core/src/error";

export class NodeCryptoProvider implements CryptoProvider {
    async randomBytes(n: number) {
        return new Promise<Base64String>((resolve, reject) => {
            randomBytes(n, (err, buf) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(bytesToBase64(new Uint8Array(buf)));
                }
            });
        });
    }

    async hash(input: Base64String, params: HashParams) {
        const alg = params.algorithm.replace("-", "").toLowerCase();
        const hash = createHash(alg);
        hash.update(Buffer.from(base64ToBytes(input)));
        return bytesToBase64(new Uint8Array(hash.digest()));
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
            case "RSA-PSS":
                return this._signRSA(key, data, params);
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
            case "RSA-PSS":
                return this._verifyRSA(key, signature, data, params);
            default:
                throw new Err(ErrorCode.NOT_SUPPORTED);
        }
    }

    private async _signHMAC(key: HMACKey, data: Base64String, params: HMACParams): Promise<Base64String> {
        const hash = params.hash.replace("-", "").toLowerCase();
        const hmac = createHmac(hash, Buffer.from(base64ToBytes(key)));
        hmac.update(Buffer.from(base64ToBytes(data)));
        return bytesToBase64(new Uint8Array(hmac.digest()));
    }

    private async _verifyHMAC(
        key: HMACKey,
        signature: Base64String,
        data: Base64String,
        params: HMACParams
    ): Promise<boolean> {
        const sig = await this._signHMAC(key, data, params);
        return signature === sig;
    }

    _signRSA(key: RSAPrivateKey, data: Base64String, params: RSASigningParams) {
        key = `-----BEGIN PRIVATE KEY-----
${Buffer.from(base64ToBytes(key)).toString("base64")}
-----END PRIVATE KEY-----`;
        const hash = params.hash.replace("-", "").toLowerCase();
        const signer = createSign(hash);
        signer.update(Buffer.from(base64ToBytes(data)));
        const sig = signer.sign({
            key: key,
            passphrase: "",
            // @ts-ignore
            saltLength: params.saltLength,
            padding: constants.RSA_PKCS1_PSS_PADDING
        });

        return bytesToBase64(new Uint8Array(sig));
    }

    _verifyRSA(key: RSAPublicKey, signature: Base64String, data: Base64String, params: RSASigningParams) {
        key = `-----BEGIN PUBLIC KEY-----
${Buffer.from(base64ToBytes(key)).toString("base64")}
-----END PUBLIC KEY-----`;
        const hash = params.hash.replace("-", "").toLowerCase();
        const verifier = createVerify(hash);
        verifier.update(Buffer.from(base64ToBytes(data)));
        const verified = verifier.verify(
            {
                key: key,
                saltLength: params.saltLength,
                padding: constants.RSA_PKCS1_PSS_PADDING
            },
            Buffer.from(base64ToBytes(signature))
        );

        return verified;
    }
}
