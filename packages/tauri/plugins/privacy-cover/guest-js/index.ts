import { invoke } from "@tauri-apps/api/core";

export interface BackgroundState {
    generation: number;
    pausedAt: number;
    inactive: boolean;
}

export function getBackgroundState(): Promise<BackgroundState> {
    return invoke("plugin:privacy-cover|background_state");
}
export function completeResume(generation: number): Promise<void> {
    return invoke("plugin:privacy-cover|resume_complete", { generation });
}

/** The native cover remains until completeResume acknowledges the current visit. */
export function onResume(callback: () => void): () => void {
    window.addEventListener("padloc-native-resume", callback);
    return () => window.removeEventListener("padloc-native-resume", callback);
}
