import { suite, test, beforeEach, afterEach } from "mocha";
import { assert } from "chai";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, ensureDir, writeFile, readFile, pathExists, remove } from "fs-extra";
import { Attachment } from "@padloc/core/src/attachment";
import { FSAttachmentStorage, FSAttachmentStorageConfig } from "../src/attachments/fs";

suite("Filesystem attachment storage", () => {
    let root: string;
    let storage: FSAttachmentStorage;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "padloc-attachments-"));
        const config = new FSAttachmentStorageConfig();
        config.dir = join(root, "attachments");
        storage = new FSAttachmentStorage(config);
        await ensureDir(join(config.dir, "vault"));
        await writeFile(join(root, "sentinel"), "keep me");
    });

    afterEach(async () => {
        await remove(root);
    });

    async function rejects(operation: Promise<unknown>) {
        let rejected = false;
        try {
            await operation;
        } catch {
            rejected = true;
        }
        assert.isTrue(rejected, "unsafe identifier must be rejected");
    }

    test("rejects traversal before deleting an outside file or directory", async () => {
        await rejects(storage.delete("vault", "../../sentinel"));
        assert.equal(await readFile(join(root, "sentinel"), "utf8"), "keep me");
        await rejects(storage.delete("vault", ".."));
        assert.isTrue(await pathExists(storage.config.dir));
    });

    test("rejects unsafe attachment and vault identifiers across storage operations", async () => {
        const invalidIDs = [
            "",
            ".",
            "..",
            "../sentinel",
            "a/b",
            "a\\b",
            "/tmp/file",
            "C:\\file",
            "a\0b",
            null,
            undefined,
        ];
        for (const id of invalidIDs as string[]) {
            await rejects(storage.delete("vault", id));
            await rejects(storage.get("vault", id));
            await rejects(storage.put(new Attachment({ vault: "vault", id })));
            await rejects(storage.delete(id, "attachment"));
            await rejects(storage.get(id, "attachment"));
            await rejects(storage.put(new Attachment({ vault: id, id: "attachment" })));
            await rejects(storage.deleteAll(id));
            await rejects(storage.getUsage(id));
        }
        assert.equal(await readFile(join(root, "sentinel"), "utf8"), "keep me");
    });

    test("prevents reading or deleting another vault's attachment", async () => {
        const attachment = new Attachment({ vault: "other-vault", id: "attachment" });
        await storage.put(attachment);
        await rejects(storage.get("vault", "../other-vault/attachment"));
        await rejects(storage.delete("vault", "../other-vault/attachment"));
        assert.equal((await storage.get(attachment.vault, attachment.id)).id, attachment.id);
    });

    test("stores, reads, measures and deletes valid attachments", async () => {
        const attachment = new Attachment({ vault: "vault", id: "attachment-123_abc", name: "example.txt" });
        await storage.put(attachment);
        assert.equal((await storage.get(attachment.vault, attachment.id)).name, attachment.name);
        assert.isAbove(await storage.getUsage(attachment.vault), 0);
        await storage.delete(attachment.vault, attachment.id);
        assert.equal(await storage.getUsage(attachment.vault), 0);
        await rejects(storage.get(attachment.vault, attachment.id));
        await storage.put(attachment);
        await storage.deleteAll(attachment.vault);
        assert.isFalse(await pathExists(join(storage.config.dir, attachment.vault)));
    });
});
