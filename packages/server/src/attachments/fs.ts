import { join } from "path";
import { readFile, writeFile, ensureDir, remove, readdir, stat } from "fs-extra";
import { Attachment, AttachmentID, AttachmentStorage } from "@padloc/core/src/attachment";
import { VaultID } from "@padloc/core/src/vault";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { FSAttachmentStorageConfig } from "@padloc/core/src/config/attachments/fs";
import { SimpleService } from "@padloc/core/src/service";

export class FSAttachmentStorage extends SimpleService implements AttachmentStorage {
    constructor(public config: FSAttachmentStorageConfig) {
        super();
    }

    private _getPath(vault: VaultID, id: AttachmentID) {
        return join(this.config.dir, vault, id);
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
        await ensureDir(join(this.config.dir, att.vault));
        await writeFile(this._getPath(att.vault, att.id), await att.toBytes());
    }

    async delete(vault: VaultID, id: AttachmentID) {
        await remove(this._getPath(vault, id));
    }

    async deleteAll(vault: VaultID) {
        await remove(join(this.config.dir, vault));
    }

    async getUsage(vault: VaultID) {
        try {
            const files = await readdir(join(this.config.dir, vault));
            let size = 0;
            for (const file of files) {
                const stats = await stat(join(this.config.dir, vault, file));
                size += stats.size;
            }
            return size;
        } catch (e) {
            return 0;
        }
    }
}
