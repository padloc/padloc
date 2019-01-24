import { Serializable, Base64String } from "./encoding";
import { Err, ErrorCode } from "./error";
import {
    PBKDF2Params,
    AESKey,
    RSAPublicKey,
    RSAPrivateKey,
    AESKeyParams,
    AESEncryptionParams,
    RSAEncryptionParams,
    getProvider,
    defaultPBKDF2Params,
    defaultEncryptionParams,
    defaultKeyWrapParams,
    validateAESEncryptionParams,
    validatePBKDF2Params
} from "./crypto";

export type EncryptionScheme = "simple" | "PBES2" | "shared";

export interface BaseRawContainer {
    version: 2;
    scheme: EncryptionScheme;
    encryptionParams: AESEncryptionParams;
    encryptedData: Base64String;
}

export interface SimpleRawContainer extends BaseRawContainer {
    scheme: "simple";
}

export interface PBES2RawContainer extends BaseRawContainer {
    scheme: "PBES2";
    keyParams: PBKDF2Params;
}

export interface SharedRawContainer extends BaseRawContainer {
    scheme: "shared";
    keyParams: RSAEncryptionParams;
    accessors: Accessor[];
}

export type RawContainer = SimpleRawContainer | PBES2RawContainer | SharedRawContainer;

export abstract class Container implements Serializable {
    encryptedData: Base64String = "";
    constructor(public encryptionParams: AESEncryptionParams = defaultEncryptionParams()) {}

    protected abstract _getKey(): Promise<AESKey>;

    async set(data: Base64String) {
        this.encryptionParams = {
            ...this.encryptionParams,
            iv: await getProvider().randomBytes(16),
            // TODO: useful additional authenticated data?
            additionalData: await getProvider().randomBytes(16)
        };

        const key = await this._getKey();
        this.encryptedData = await getProvider().encrypt(key, data, this.encryptionParams);
    }

    async get(): Promise<Base64String> {
        if (!this.encryptedData) {
            return "";
        }
        const key = await this._getKey();
        const pt = await getProvider().decrypt(key, this.encryptedData, this.encryptionParams);
        return pt;
    }

    async serialize() {
        const raw = {
            version: 2,
            encryptionParams: { ...this.encryptionParams },
            encryptedData: this.encryptedData
        };

        return raw as any;
    }

    async deserialize(raw: any) {
        validateAESEncryptionParams(raw.encryptionParams);
        this.encryptionParams = { ...raw.encryptionParams };
        this.encryptedData = raw.encryptedData;
        return this;
    }
}

export class SimpleContainer extends Container {
    key: AESKey = "";

    async _getKey() {
        return this.key;
    }
}

export class PBES2Container extends Container {
    password: string = "";

    constructor(
        public encryptionParams: AESEncryptionParams = defaultEncryptionParams(),
        public keyParams: PBKDF2Params = defaultPBKDF2Params()
    ) {
        super(encryptionParams);
    }

    async _getKey() {
        if (!this.keyParams.salt) {
            this.keyParams.salt = await getProvider().randomBytes(16);
        }
        if (!this.password) {
            throw new Err(ErrorCode.DECRYPTION_FAILED, "No password provided");
        }
        return await getProvider().deriveKey(this.password, this.keyParams);
    }

    async serialize() {
        const raw = await super.serialize();
        (raw as PBES2RawContainer).keyParams = { ...this.keyParams };
        return raw;
    }

    async deserialize(raw: PBES2RawContainer) {
        validatePBKDF2Params(raw.keyParams);
        this.keyParams = { ...raw.keyParams };
        await super.deserialize(raw);
        return this;
    }
}

export interface Accessor {
    id: string;
    publicKey: RSAPublicKey;
    encryptedKey: Base64String;
}

export interface Access {
    id: string;
    privateKey: RSAPrivateKey;
}

export class SharedContainer extends Container {
    private _accessors = new Map<string, Accessor>();
    private _key: AESKey = "";
    private _access: Access | null = null;

    constructor(
        public encryptionParams: AESEncryptionParams = defaultEncryptionParams(),
        public keyParams: RSAEncryptionParams = defaultKeyWrapParams()
    ) {
        super(encryptionParams);
    }

    access({ id, privateKey }: Access) {
        this._access = { id, privateKey };
    }

    hasAccess({ id, publicKey }: { id: string; publicKey: string }) {
        const accessor = this._accessors.get(id);
        return !this.encryptedData || (!!accessor && accessor.publicKey === publicKey);
    }

    async setAccessors(accessors: Accessor[]) {
        this._accessors.clear();
        this._key = await getProvider().generateKey({
            algorithm: "AES",
            keySize: this.encryptionParams.keySize
        } as AESKeyParams);

        await Promise.all(
            accessors.map(async a => {
                a.encryptedKey = await getProvider().encrypt(a.publicKey, await this._getKey(), this.keyParams);
                this._accessors.set(a.id, a);
            })
        );
    }

    async serialize() {
        const raw = await super.serialize();
        (raw as SharedRawContainer).keyParams = { ...this.keyParams };
        (raw as SharedRawContainer).accessors = Array.from(this._accessors.values());
        return raw;
    }

    async deserialize(raw: SharedRawContainer) {
        await super.deserialize(raw);
        this.keyParams = { ...raw.keyParams };
        this._accessors.clear();
        for (const a of raw.accessors) {
            this._accessors.set(a.id, a);
        }
        this._key = "";
        return this;
    }

    protected async _getKey() {
        if (!this._access) {
            throw new Err(ErrorCode.MISSING_ACCESS);
        }
        if (!this._key) {
            const accessor = this._accessors.get(this._access.id);
            if (!accessor || !accessor.encryptedKey) {
                throw new Err(ErrorCode.MISSING_ACCESS);
            }
            this._key = await getProvider().decrypt(this._access.privateKey, accessor.encryptedKey, this.keyParams);
        }
        return this._key;
    }
}
