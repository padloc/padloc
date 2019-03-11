import { Serializable, stringToBytes, base64ToBytes, bytesToBase64 } from "./encoding";
import { Err, ErrorCode } from "./error";
import {
    PBKDF2Params,
    AESKey,
    AESEncryptionParams,
    AESKeyParams,
    RSAEncryptionParams,
    RSAPrivateKey,
    RSAPublicKey,
    getProvider
} from "./crypto";

export type EncryptionScheme = "simple" | "PBES2" | "shared";

export abstract class BaseContainer extends Serializable {
    encryptionParams: AESEncryptionParams = new AESEncryptionParams();
    encryptedData?: Uint8Array;

    protected _key?: AESKey;

    async setData(data: Uint8Array) {
        if (!this._key) {
            throw new Err(ErrorCode.ENCRYPTION_FAILED);
        }

        this.encryptionParams.iv = await getProvider().randomBytes(16);
        // TODO: useful additional authenticated data?
        this.encryptionParams.additionalData = await getProvider().randomBytes(16);

        this.encryptedData = await getProvider().encrypt(this._key, data, this.encryptionParams);
    }

    async getData(): Promise<Uint8Array> {
        if (!this.encryptedData || !this._key) {
            throw new Err(ErrorCode.DECRYPTION_FAILED);
        }
        return await getProvider().decrypt(this._key, this.encryptedData, this.encryptionParams);
    }

    toRaw(exclude: string[] = []) {
        return {
            ...super.toRaw(exclude),
            encryptedData: this.encryptedData ? bytesToBase64(this.encryptedData) : undefined
        };
    }

    validate() {
        return typeof this.encryptedData === "undefined" || this.encryptedData instanceof Uint8Array;
    }

    fromRaw({ encryptionParams, encryptedData }: any) {
        this.encryptionParams.fromRaw(encryptionParams);
        return super.fromRaw({
            encryptedData: encryptedData ? base64ToBytes(encryptedData) : undefined
        });
    }

    abstract unlock(secret: unknown): Promise<void>;
}

export class SimpleContainer extends BaseContainer {
    async unlock(key: AESKey) {
        this._key = key;
    }
}

export class PBES2Container extends BaseContainer {
    keyParams: PBKDF2Params = new PBKDF2Params();

    fromRaw({ keyParams, ...rest }: any) {
        this.keyParams.fromRaw(keyParams);
        return super.fromRaw(rest);
    }

    async unlock(password: string) {
        if (!this.keyParams.salt.length) {
            this.keyParams.salt = await getProvider().randomBytes(16);
        }
        this._key = await getProvider().deriveKey(stringToBytes(password), this.keyParams);
    }
}

export class Accessor extends Serializable {
    id: string = "";
    encryptedKey: Uint8Array = new Uint8Array();

    toRaw() {
        return {
            id: this.id,
            encryptedKey: bytesToBase64(this.encryptedKey)
        };
    }

    validate() {
        return typeof this.id === "string" && this.encryptedKey instanceof Uint8Array;
    }

    fromRaw({ id, encryptedKey }: any) {
        return super.fromRaw({ id, encryptedKey: base64ToBytes(encryptedKey) });
    }
}

export class SharedContainer extends BaseContainer {
    keyParams: RSAEncryptionParams = new RSAEncryptionParams();
    accessors: Accessor[] = [];

    async unlock({ id, privateKey }: { id: string; privateKey: RSAPrivateKey }) {
        if (this._key) {
            // Container is already unlocked, no need to unlock it again
            return;
        }

        const accessor = this.accessors.find(a => a.id === id);
        if (!accessor || !accessor.encryptedKey) {
            throw new Err(ErrorCode.MISSING_ACCESS);
        }
        this._key = await getProvider().decrypt(privateKey, accessor.encryptedKey, this.keyParams);
    }

    async updateAccessors(subjects: { id: string; publicKey: RSAPublicKey }[]) {
        // Get existing data so we can reencrypt it after rotating the key
        let data: Uint8Array | null = null;

        if (this.encryptedData) {
            if (!this._key) {
                throw "Non-empty containers need to be unlocked before accessors can be updated!";
            }
            data = await this.getData();
        }

        // Generate new key
        this._key = await getProvider().generateKey(new AESKeyParams());

        // Reencrypt data with new key
        if (data) {
            await this.setData(data);
        }

        this.accessors = await Promise.all(
            subjects.map(async ({ id, publicKey }) => {
                const accessor = new Accessor();
                accessor.id = id;
                accessor.encryptedKey = await getProvider().encrypt(publicKey, this._key!, this.keyParams);
                return accessor;
            })
        );
    }

    fromRaw({ keyParams, accessors, ...rest }: any) {
        this.keyParams.fromRaw(keyParams);
        this.accessors = accessors.map((a: any) => new Accessor().fromRaw(a));
        return super.fromRaw(rest);
    }
}
