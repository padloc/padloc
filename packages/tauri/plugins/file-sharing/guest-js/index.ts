import { invoke } from "@tauri-apps/api/core";

export interface ShareResult { completed: boolean; }
/** Shares a plain filename and base64 bytes. Cancellation resolves with completed=false. */
export function shareFile(name: string, data: string): Promise<ShareResult> {
    return invoke("plugin:file-sharing|share_file", { name, data });
}
