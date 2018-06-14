import { Serializable, marshal, unmarshal, EncodingError } from "./encoding";
import {
    PublicKey,
    PrivateKey,
    SymmetricKey,
    CipherParams,
    KeyDerivationParams,
    SymmetricCipherParams,
    WebCryptoProvider as provider,
    defaultSymmetricCipherParams,
    defaultKeyDerivationParams
} from "./crypto";
import { JWE, Algorithm as JoseAlgorithm } from "./jose";

interface RawContainerV2 {
    version: 2;
    jwe: JWE;
    keyParams?: KeyDerivationParams;
}

type RawContainer = RawContainerV2;

export interface Participant {
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

        // If no content encryption key has been explicitly specified, generate a random one
        if (!this.cipherParams.key) {
            this.cipherParams.key = await provider.randomKey(256);
        }

        const pt = marshal(await this.data.serialize());
        const ct = await provider.encrypt(pt, this.cipherParams);
        // We have to cast this since we are including A256CCM for backward compatibilty
        // This is against the spec but can't be helped
        const enc = { "AES-GCM": "A256GCM", "AES-CCM": "A256CCM" }[this.cipherParams.algorithm] as JoseAlgorithm;

        const jwe: JWE = {
            unprotected: { enc: enc },
            iv: this.cipherParams.iv,
            aad: this.cipherParams.additionalData,
            ciphertext: ct
        };

        if (this.participants) {
            jwe.recipients = await Promise.all(
                this.participants.map(async p => {
                    const params = {
                        cipherType: "asymmetric",
                        algorithm: "RSA-OAEP",
                        key: p.publicKey
                    };
                    const rawKey = (this.cipherParams.key as SymmetricKey).k;
                    const encryptedKey = await provider.encrypt(rawKey, params);
                    return {
                        header: { kid: p.id, alg: "RSA-OAEP", jwk: p.publicKey },
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
            throw new EncodingError("deserialization_error");
        }

        const cipherAlg = jwe.unprotected!.enc!;

        Object.assign(this.cipherParams, {
            cipherType: "symmetric",
            algorithm: { A256GCM: "AES-GCM", A256CCM: "AES-CCM" }[cipherAlg],
            iv: jwe.iv,
            additionalData: jwe.aad
        });

        const currPart = this.currentParticipant;
        if (currPart && jwe.recipients) {
            const currRecipient = jwe.recipients.find(r => r.header!.kid === currPart.id);
            if (!currRecipient) {
                throw new EncodingError("deserialization_error");
            }

            const params: CipherParams = {
                cipherType: "asymmetric",
                algorithm: "RSA-OAEP",
                key: currPart.privateKey
            };

            this.cipherParams.key = {
                kty: "oct",
                alg: cipherAlg as JoseAlgorithm,
                k: await provider.decrypt(currRecipient.encrypted_key, params)
            };
        }

        const pt = await provider.decrypt(jwe.ciphertext, this.cipherParams);
        await this.data.deserialize(unmarshal(pt));
    }
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
        if (!raw.keyParams) {
            throw new EncodingError("deserialization_error");
        }
        this.keyParams = raw.keyParams;
        this.cipherParams.key = await this._deriveKey();
        return super.deserialize(raw);
    }
}

export interface Record {}

export class StoreData implements Serializable {
    constructor(public records: Record[], public privateKey?: PrivateKey) {}

    async serialize() {
        return {
            records: this.records,
            privateKey: this.privateKey
        };
    }

    async deserialize(raw: any) {
        this.records = raw.records;
        this.privateKey = raw.privateKey;
    }
}

export type AccountID = string;
export type StoreID = string;
export type ClientID = string;

export class Account implements Serializable, Participant {
    id: AccountID;
    email: string;
    cipherType: "asymmetric";
    algorithm: Algorithm;
    defaultStore: StoreID;
    stores: StoreID[];
    clients: ClientID[];
    publicKey: PublicKey;
    privateKey: PrivateKey;

    serialize() {
        return Promise.resolve({
            id: this.id,
            email: this.email
        });
    }

    deserialize(raw: any) {
        this.id = raw.id;
        this.email = raw.email;
        return Promise.resolve();
    }
}

export class Store extends PasswordBasedContainer<StoreData> {
    id: StoreID;
    creator: Account;

    constructor(data: StoreData = new StoreData([])) {
        super(data);
        this.password = "asdf";
    }
}

export class Client {
    id: ClientID;
    account: Account;
    store: Store;
}
