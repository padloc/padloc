import { S3 } from "aws-sdk";
import { join } from "path";
import { readFile, writeFile, ensureDir, remove, readdir, stat } from "fs-extra";
import { marshal, unmarshal, bytesToString, stringToBytes } from "@padloc/core/src/encoding";
import { Attachment, AttachmentStorage } from "@padloc/core/src/attachment";
import { Vault } from "@padloc/core/src/vault";
import { Err, ErrorCode } from "@padlock/core/src/error";

export interface S3Config {
    bucket: string;
}

export class S3Storage implements AttachmentStorage {
    private _s3: S3;

    private _getKey(att: Attachment) {
        return `${att.vault}_${att.id}`;
    }

    constructor(public config: S3Config) {
        this._s3 = new S3();
    }

    async get(att: Attachment) {
        const obj = await this._s3
            .getObject({
                Bucket: this.config.bucket,
                Key: this._getKey(att)
            })
            .promise();

        const body = obj.Body as Uint8Array;
        await att.deserialize(unmarshal(bytesToString(body)));
        return att;
    }

    async put(att: Attachment) {
        await this._s3.upload({
            Bucket: this.config.bucket,
            Key: this._getKey(att),
            Body: stringToBytes(marshal(await att.serialize()))
        });
    }

    async delete(att: Attachment) {
        await this._s3.deleteObject({
            Bucket: this.config.bucket,
            Key: this._getKey(att)
        });
    }

    async deleteAll() {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async getUsage(): Promise<number> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }
}

export interface FSStorageConfig {
    path: string;
}

export class FileSystemStorage implements AttachmentStorage {
    constructor(public config: FSStorageConfig) {}

    private _getPath(att: Attachment) {
        return join(this.config.path, att.vault, att.id);
    }

    async get(att: Attachment) {
        try {
            const data = await readFile(this._getPath(att));
            await att.deserialize(unmarshal(bytesToString(data)));
            return att;
        } catch (e) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
    }

    async put(att: Attachment) {
        await ensureDir(join(this.config.path, att.vault));
        await writeFile(this._getPath(att), stringToBytes(marshal(await att.serialize())));
    }

    async delete(att: Attachment) {
        await remove(this._getPath(att));
    }

    async deleteAll(vault: Vault) {
        await remove(join(this.config.path, vault.id));
    }

    async getUsage(vault: Vault) {
        const files = await readdir(join(this.config.path, vault.id));
        let size = 0;
        for (const file of files) {
            const stats = await stat(join(this.config.path, vault.id, file));
            size += stats.size;
        }
        return size;
    }
}
