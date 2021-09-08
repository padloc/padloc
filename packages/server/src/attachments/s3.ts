import { Attachment, AttachmentID, AttachmentStorage } from "@padloc/core/src/attachment";
import { VaultID } from "@padloc/core/src/vault";
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
import { Config, ConfigParam } from "@padloc/core/src/config";

function streamToBytes(stream: Readable): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
        const chunks: any[] = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    });
}

export class S3AttachmentStorageConfig extends Config {
    @ConfigParam()
    region!: string;

    @ConfigParam()
    bucket!: string;

    @ConfigParam()
    endpoint!: string;

    @ConfigParam()
    accessKeyId!: string;

    @ConfigParam()
    secretAccessKey!: string;
}

export class S3AttachmentStorage implements AttachmentStorage {
    private _client: S3Client;

    constructor(public config: S3AttachmentStorageConfig) {
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
