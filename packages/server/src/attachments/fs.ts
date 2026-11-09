import { join } from "path";
import { readFile, writeFile, ensureDir, remove, readdir, stat } from "fs-extra";
import { Attachment, AttachmentID, AttachmentStorage } from "@padloc/core/src/attachment";
import { VaultID } from "@padloc/core/src/vault";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { Config, ConfigParam } from "@padloc/core/src/config";

export class FSAttachmentStorageConfig extends Config {
    @ConfigParam()
    dir: string = "./attachments";
}

export class FSAttachmentStorage implements AttachmentStorage {
    constructor(public config: FSAttachmentStorageConfig) {}

    private _validateID(id: string) {
        // IDs are single path components, never paths (on either POSIX or Windows).
        if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) {
            throw new Err(ErrorCode.BAD_REQUEST, "Invalid attachment storage identifier.");
        }
        return id;
    }

    private _getVaultPath(vault: VaultID) {
        return join(this.config.dir, this._validateID(vault));
    }

    private _getPath(vault: VaultID, id: AttachmentID) {
        return join(this._getVaultPath(vault), this._validateID(id));
    }

    async get(vault: VaultID, id: AttachmentID) {
        const path = this._getPath(vault, id);
        try {
            const data = await readFile(path);
            const att = await new Attachment().fromBytes(data);
            return att;
        } catch (e) {
            throw new Err(ErrorCode.NOT_FOUND);
        }
    }

    async put(att: Attachment) {
        const path = this._getPath(att.vault, att.id);
        await ensureDir(this._getVaultPath(att.vault));
        await writeFile(path, await att.toBytes());
    }

    async delete(vault: VaultID, id: AttachmentID) {
        await remove(this._getPath(vault, id));
    }

    async deleteAll(vault: VaultID) {
        await remove(this._getVaultPath(vault));
    }

    async getUsage(vault: VaultID) {
        const path = this._getVaultPath(vault);
        try {
            const files = await readdir(path);
            let size = 0;
            for (const file of files) {
                const stats = await stat(this._getPath(vault, file));
                size += stats.size;
            }
            return size;
        } catch (e) {
            return 0;
        }
    }
}
