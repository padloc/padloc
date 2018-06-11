import { Serializable, Base64String, marshal, unmarshal, Marshalable } from "./encoding";
import { SJCLProvider as provider } from "./providers";
import { JWK as Key, JWE, PrivateKey, PublicKey, SymmetricKey, Algorithm as JoseAlgorithm } from "./jose";

export { Key, PrivateKey, PublicKey, SymmetricKey };

// For backward compatibilty, AES in CCM mode needs to be supported,
// even though it is not defined in https://tools.ietf.org/html/rfc7518#section-6.4
export type Algorithm = JoseAlgorithm | "A256CCM";

// Minimum number of pbkdf2 iterations
// const PBKDF2_ITER_MIN = 1e4;
// Default number of pbkdf2 iterations
const PBKDF2_ITER_DEFAULT = 5e4;
// Maximum number of pbkdf2 iterations
// const PBKDF2_ITER_MAX = 1e7;

export type CipherText = Base64String;
export type PlainText = string;

// Available Symmetric Ciphers
export type SymmetricCipherAlgorithm = "aes";
// Available Symmetric Cipher Modes
export type SymmetricCipherMode = "ccm" | "gcm";
// Available Symmetric Key Sizes
export type SymmetricCipherKeySize = 128 | 192 | 256;
// Available authentication tag sizes
export type SymmetricCipherTagSize = 64 | 96 | 128;

export class CryptoError {
    constructor(
        public code:
            | "invalid_container_data"
            | "unsupported_container_version"
            | "invalid_cipher_params"
            | "invalid_key_params"
            | "decryption_failed"
            | "encryption_failed"
    ) {}
}

export type CipherType = "symmetric" | "asymmetric";

export interface BaseCipherParams {
    cipherType: CipherType;
    algorithm: Algorithm;
}

export interface SymmetricCipherParams extends BaseCipherParams {
    cipherType: "symmetric";
    tagSize?: SymmetricCipherTagSize;
    key?: SymmetricKey;
    iv?: Base64String;
    additionalData?: Base64String;
}

export function defaultSymmetricCipherParams(): SymmetricCipherParams {
    return {
        cipherType: "symmetric",
        algorithm: "A256GCM",
        tagSize: 64
    };
}

export interface AsymmetricCipherParams extends BaseCipherParams {
    cipherType: "asymmetric";
    publicKey?: PublicKey;
    privateKey?: PrivateKey;
}

export type CipherParams = SymmetricCipherParams | AsymmetricCipherParams;

interface RawContainerV2 {
    version: 2;
    jwe: JWE;
}

type RawContainer = RawContainerV2;

export interface Participant extends AsymmetricCipherParams {
    id: string;
    publicKey: PublicKey;
    privateKey?: PrivateKey;
}

export class Container<T extends Serializable> implements Serializable {
    constructor(
        public data: T,
        public currentParticipant?: Participant,
        public participants?: Participant[],
        public cipherParams: SymmetricCipherParams = defaultSymmetricCipherParams()
    ) {}

    async serialize(): Promise<RawContainer> {
        this.cipherParams.iv = provider.randomBytes(16);
        // TODO: useful additional authenticated data?
        this.cipherParams.additionalData = provider.randomBytes(16);

        const pt = marshal(await this.data.serialize());
        const ct = await provider.encrypt(pt, this.cipherParams);
        // We have to cast this since we are including A256CCM for backward compatibilty
        // This is against the spec but can't be helped
        const enc = this.cipherParams.algorithm as JoseAlgorithm;

        const jwe: JWE = {
            unprotected: { enc: enc },
            iv: this.cipherParams.iv,
            aad: this.cipherParams.additionalData,
            ciphertext: ct
        };

        if (this.participants) {
            jwe.recipients = await Promise.all(
                this.participants.map(async p => {
                    const encryptedKey = await provider.encrypt(marshal(this.cipherParams.key as Marshalable), p);
                    return {
                        header: { kid: p.id, alg: p.algorithm as JoseAlgorithm, jwk: p.publicKey },
                        encrypted_key: encryptedKey
                    };
                })
            );
        } else {
            jwe.unprotected!.alg = "dir";
        }

        return {
            version: 2,
            jwe: jwe
        };
    }

    async deserialize(raw: RawContainer): Promise<void> {
        const jwe = raw.jwe;

        if (!jwe) {
            throw new CryptoError("invalid_container_data");
        }

        const cipherAlg = jwe.unprotected!.enc as Algorithm;

        Object.assign(this.cipherParams, {
            cipherType: "symmetric",
            algorithm: cipherAlg,
            iv: jwe.iv,
            additionalData: jwe.aad
        });

        const currPart = this.currentParticipant;
        if (currPart && jwe.recipients) {
            const currRecipient = jwe.recipients.find(r => r.header!.kid === currPart.id);
            if (!currRecipient) {
                throw new CryptoError("invalid_container_data");
            }

            this.cipherParams.key = {
                kty: "oct",
                alg: cipherAlg as JoseAlgorithm,
                k: await provider.decrypt(currRecipient.encrypted_key, currPart)
            };
        }

        const pt = await provider.decrypt(jwe.ciphertext, this.cipherParams);
        await this.data.deserialize(unmarshal(pt));
    }
}

export interface KeyDerivationParams {
    algorithm: "pbkdf2";
    hash: "sha-256";
    keySize: SymmetricCipherKeySize;
    iterations: number;
    password?: string;
    salt?: string;
}

export function defaultKeyDerivationParams(): KeyDerivationParams {
    return {
        algorithm: "pbkdf2",
        hash: "sha-256",
        keySize: 256,
        iterations: PBKDF2_ITER_DEFAULT
    };
}

export class PasswordBasedContainer<T extends Serializable> extends Container<T> {
    password: string;

    private async _deriveKey(): Promise<SymmetricKey> {
        if (!this.keyParams.salt) {
            this.keyParams.salt = provider.randomBytes(16);
        }
        this.keyParams.password = this.password;
        return await provider.deriveKey(this.keyParams);
    }

    constructor(
        data: T,
        params?: SymmetricCipherParams,
        public keyParams: KeyDerivationParams = defaultKeyDerivationParams()
    ) {
        super(data, undefined, undefined, params);
    }

    async serialize() {
        this.cipherParams.key = await this._deriveKey();
        const serialized = await super.serialize();
        serialized.keyParams = this.keyParams;
        return serialized;
    }

    async deserialize(raw: RawContainer) {
        this.keyParams = raw.keyParams;
        this.cipherParams.key = await this._deriveKey();
        return super.deserialize(raw);
    }
}
