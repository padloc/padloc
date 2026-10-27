import { invoke } from "@tauri-apps/api/core";

export interface BiometricStatus {
    available: boolean;
    kind: "faceID" | "touchID" | "biometric" | "none";
}
/** Native keys are device-bound and protected by the current biometric enrollment. */
export function getStatus(): Promise<BiometricStatus> {
    return invoke("plugin:biometric-keystore|biometric_status");
}
/** key is a base64-encoded 32-byte secret. */
export function storeKey(id: string, key: string): Promise<{ ok: boolean }> {
    return invoke("plugin:biometric-keystore|biometric_store", { id, key });
}
export function getKey(id: string): Promise<{ key: string }> {
    return invoke("plugin:biometric-keystore|biometric_get", { id });
}
