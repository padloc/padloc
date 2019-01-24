import { Base64String, bytesToBase64, base64ToBytes } from "./encoding";
import { SimpleContainer } from "./container";
import { getProvider, AESKeyParams } from "./crypto";
import { Err, ErrorCode } from "./error";

function readBlob(blob: Blob): Promise<Base64String> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = bytesToBase64(new Uint8Array(reader.result as ArrayBuffer));
            resolve(result);
        };

        reader.onerror = e => {
            reader.abort();
            reject(e);
        };

        reader.readAsArrayBuffer(blob);
    });
}

export interface AttachmentInfo {
    id: string;
    vault: string;
    name: string;
    size: number;
    type: string;
    key: string;
}

export class Attachment extends SimpleContainer {
    id: string = "";
    vault: string = "";
    name: string = "";
    size: number = 0;
    type: string = "";

    constructor(info?: Partial<AttachmentInfo>) {
        super();
        if (info) {
            this.id = info.id || "";
            this.vault = info.vault || "";
            this.name = info.name || "";
            this.size = info.size || 0;
            this.type = info.type || "";
            this.key = info.key || "";
        }
    }

    get info() {
        return {
            id: this.id,
            vault: this.vault,
            name: this.name,
            type: this.type,
            key: this.key
        };
    }

    async fromBlob(blob: Blob) {
        this.type = blob.type;
        this.size = blob.size;

        const data = await readBlob(blob);

        this.key = await getProvider().generateKey({
            algorithm: "AES",
            keySize: this.encryptionParams.keySize
        } as AESKeyParams);

        await this.set(data);
    }

    async toBlob(): Promise<Blob> {
        const data = await this.get();
        return new Blob([base64ToBytes(data)], { type: this.type });
    }

    async serialize() {
        const info = this.info;
        delete info.key;

        return {
            ...(await super.serialize()),
            ...info
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.vault = raw.vault;
        this.name = raw.name;
        this.size = raw.size;
        this.type = raw.type;
        return super.deserialize(raw);
    }
}

export interface AttachmentStorage {
    put(a: Attachment): Promise<void>;
    get(a: Attachment): Promise<Attachment>;
    delete(a: Attachment): Promise<void>;
}

export class MemoryAttachmentStorage {
    private _storage = new Map<string, Attachment>();

    async put(a: Attachment): Promise<void> {
        this._storage.set(`${a.vault}_${a.id}`, a);
    }

    async get(a: Attachment): Promise<Attachment> {
        const att = this._storage.get(`${a.vault}_${a.id}`);
        if (!att) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
        return att;
    }

    async delete(a: Attachment): Promise<void> {
        this._storage.delete(`${a.vault}_${a.id}`);
    }
}
