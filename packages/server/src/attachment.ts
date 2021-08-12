// import { S3 } from "aws-sdk";
import { join } from "path";
import { readFile, writeFile, ensureDir, remove, readdir, stat } from "fs-extra";
import { Attachment, AttachmentID, AttachmentStorage } from "@padloc/core/src/attachment";
import { VaultID } from "@padloc/core/src/vault";
import { Err, ErrorCode } from "@padloc/core/src/error";
import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsCommand,
    ObjectIdentifier,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

function streamToBytes(stream: Readable): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
        const chunks: any[] = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    });
}

export interface S3Config {
    region: string;
    bucket: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
}

export class S3Storage implements AttachmentStorage {
    private _client: S3Client;

    constructor(public config: S3Config) {
        this._client = new S3Client({
            region: this.config.region,
            endpoint: this.config.endpoint,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
            },
        });
    }

    async get(vault: VaultID, id: AttachmentID) {
        const obj = await this._client.send(
            new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: `${vault}/${id}`,
            })
        );

        const bytes = await streamToBytes(obj.Body as Readable);
        return new Attachment().fromBytes(bytes);
    }

    async put(att: Attachment) {
        await this._client.send(
            new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: `${att.vault}/${att.id}`,
                Body: att.toBytes(),
            })
        );
    }

    async delete(vault: VaultID, id: AttachmentID) {
        await this._client.send(
            new DeleteObjectCommand({
                Bucket: this.config.bucket,
                Key: `${vault}/${id}`,
            })
        );
    }

    async deleteAll(vault: VaultID) {
        const list = await this._client.send(
            new ListObjectsCommand({
                Bucket: this.config.bucket,
                Prefix: vault,
            })
        );
        if (!list.Contents) {
            return;
        }
        await this._client.send(
            new DeleteObjectsCommand({
                Bucket: this.config.bucket,
                Delete: { Objects: list.Contents as ObjectIdentifier[] },
            })
        );
    }

    async getUsage(vault: VaultID): Promise<number> {
        const list = await this._client.send(
            new ListObjectsCommand({
                Bucket: this.config.bucket,
                Prefix: vault,
            })
        );
        return list.Contents?.reduce((total, entry) => total + (entry.Size || 0), 0) || 0;
    }
}

export interface FSStorageConfig {
    path: string;
}

export class FileSystemStorage implements AttachmentStorage {
    constructor(public config: FSStorageConfig) {}

    private _getPath(vault: VaultID, id: AttachmentID) {
        return join(this.config.path, vault, id);
    }

    async get(vault: VaultID, id: AttachmentID) {
        try {
            const data = await readFile(this._getPath(vault, id));
            const att = await new Attachment().fromBytes(data);
            return att;
        } catch (e) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
    }

    async put(att: Attachment) {
        await ensureDir(join(this.config.path, att.vault));
        await writeFile(this._getPath(att.vault, att.id), await att.toBytes());
    }

    async delete(vault: VaultID, id: AttachmentID) {
        await remove(this._getPath(vault, id));
    }

    async deleteAll(vault: VaultID) {
        await remove(join(this.config.path, vault));
    }

    async getUsage(vault: VaultID) {
        try {
            const files = await readdir(join(this.config.path, vault));
            let size = 0;
            for (const file of files) {
                const stats = await stat(join(this.config.path, vault, file));
                size += stats.size;
            }
            return size;
        } catch (e) {
            return 0;
        }
    }
}
