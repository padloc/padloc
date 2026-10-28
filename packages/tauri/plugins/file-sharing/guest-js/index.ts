import { invoke } from "@tauri-apps/api/core";

export interface ShareResult {
    completed: boolean | null;
}
/** Shares a plain filename and base64 bytes. iOS reports completion/cancellation; Android returns null (delivery unknown). */
export function shareFile(name: string, data: string): Promise<ShareResult> {
    return invoke("plugin:file-sharing|share_file", { name, data });
}
