import type browser from "webextension-polyfill";
import { BiometricKeyStore } from "@padloc/core/src/platform";
import { base64ToBytes, bytesToBase64 } from "@padloc/core/src/encoding";

const storageKey = "pl_safariBiometricKey";

/** Each enrollment gets an opaque Keychain handle, scoped to this Safari profile's local storage. */
export class SafariBiometricKeyStore implements BiometricKeyStore {
    constructor(private _browser: typeof browser) {}
    private async _request(operation: string, data: Record<string, string> = {}) {
        const response = await this._browser.runtime.sendNativeMessage("app.padloc.safari", {
            version: 1, operation, ...data,
        }) as { ok?: boolean; error?: string; supported?: boolean; key?: string };
        if (!response || response.ok !== true) throw new Error(response?.error || "Native biometric authentication failed.");
        return response;
    }

    async isSupported() {
        try { return (await this._request("status")).supported === true; } catch (_) { return false; }
    }

    async storeKey(_id: string, key: Uint8Array) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const id = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
        const oldId = (await this._browser.storage.local.get(storageKey))[storageKey];
        await this._request("store", { id, key: bytesToBase64(key, false) });
        try {
            await this._browser.storage.local.set({ [storageKey]: id });
        } catch (error) {
            await this._request("remove", { id });
            throw error;
        }
        if (typeof oldId === "string") await this._request("remove", { id: oldId }).catch(() => {});
    }

    async getKey(_id: string) {
        const id = (await this._browser.storage.local.get(storageKey))[storageKey];
        if (typeof id !== "string") throw new Error("Please re-enroll Biometric Unlock in Safari.");
        const response = await this._request("get", { id });
        if (typeof response.key !== "string") throw new Error("Invalid native biometric response.");
        const key = base64ToBytes(response.key);
        if (key.length !== 32) throw new Error("Invalid native biometric key.");
        return key;
    }
}
