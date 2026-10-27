import { getStatus, storeKey, getKey } from "../plugins/biometric-keystore/guest-js";
import { BiometricKeyStore } from "@padloc/core/src/platform";
import { base64ToBytes, bytesToBase64 } from "@padloc/core/src/encoding";
import { Err, ErrorCode } from "@padloc/core/src/error";

async function native<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        const { code, message } = error as { code?: string; message?: string };
        throw new Err(
            code === "not_found"
                ? ErrorCode.NOT_FOUND
                : code === "not_supported"
                ? ErrorCode.NOT_SUPPORTED
                : ErrorCode.AUTHENTICATION_FAILED,
            message || "Biometric authentication failed."
        );
    }
}

export class NativeBiometricKeyStore implements BiometricKeyStore {
    async isSupported() {
        const status = await native(getStatus);
        return status.available;
    }

    async storeKey(id: string, key: Uint8Array) {
        if (key.length !== 32) throw new Err(ErrorCode.BAD_REQUEST, "Invalid biometric key.");
        await native(() => storeKey(id, bytesToBase64(key, false)));
    }

    async getKey(id: string) {
        const { key } = await native(() => getKey(id));
        const bytes = base64ToBytes(key);
        if (bytes.length !== 32) throw new Err(ErrorCode.INVALID_RESPONSE, "Invalid biometric key.");
        return bytes;
    }
}
