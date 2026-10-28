import { shareFile as nativeShareFile } from "../plugins/file-sharing/guest-js";
import { bytesToBase64 } from "@padloc/core/src/encoding";

export async function shareFile(name: string, contents: Uint8Array): Promise<void> {
    try {
        if (
            !name ||
            name === "." ||
            name === ".." ||
            /[/\\\x00-\x1f\x7f]/.test(name) ||
            new TextEncoder().encode(name).length > 240
        ) {
            throw new Error("Invalid file name.");
        }
        if (contents.byteLength > 64 * 1024 * 1024) throw new Error("File is too large.");
        // Snapshot bytes before the export caller can reuse its buffer.
        await nativeShareFile(name, bytesToBase64(contents, false));
    } catch {
        // Existing export/download callers do not await saveFile. Always handle
        // native errors here, without including file names or plaintext data.
        const { alert } = await import("@padloc/app/src/lib/dialog");
        const { translate } = await import("@padloc/locale/src/translate");
        await alert(translate("Unable to share this file. Please try again. Files must be no larger than 64 MB."), {
            type: "warning",
        });
    }
}
