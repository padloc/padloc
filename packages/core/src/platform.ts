import { translate as $l } from "@padloc/locale/src/translate";
import { Serializable } from "./encoding";
import { CryptoProvider } from "./crypto";
import { Err, ErrorCode } from "./error";
import { StubCryptoProvider } from "./stub-crypto-provider";
import { Storage, MemoryStorage } from "./storage";

/**
 * Object representing all information available for a given device.
 */
export class DeviceInfo extends Serializable {
    /** Platform/Operating System running on the device */
    platform: string = "";

    /** OS version running on the device */
    osVersion: string = "";

    /** Unique device identifier */
    id: string = "";

    /** Padloc version installed on the device */
    appVersion: string = "";

    /** The user agent of the browser running the application */
    userAgent: string = "";

    /** The devices locale setting */
    locale: string = "en";

    /** The device manufacturer, if available */
    manufacturer: string = "";

    /** The device mode, if available */
    model: string = "";

    /** The browser the application was loaded in, if applicable */
    browser: string = "";

    supportsBioAuth: boolean = false;

    supportsKeyStore: boolean = false;

    get description() {
        return this.browser ? $l("{0} on {1}", this.browser, this.platform) : $l("{0} Device", this.platform);
    }

    fromRaw({
        platform,
        osVersion,
        id,
        appVersion,
        userAgent,
        locale,
        manufacturer,
        model,
        browser,
        supportsBioAuth,
        supportsKeyStore
    }: any) {
        return super.fromRaw({
            platform,
            osVersion,
            id,
            appVersion,
            userAgent,
            locale,
            manufacturer,
            model,
            browser,
            supportsBioAuth,
            supportsKeyStore
        });
    }

    constructor(props?: Partial<DeviceInfo>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Generic interface for various platform APIs
 */
export interface Platform {
    /** Copies the given `text` to the system clipboard */
    setClipboard(text: string): Promise<void>;

    /** Retrieves the current text from the system clipboard */
    getClipboard(): Promise<string>;

    /** Get information about the current device */
    getDeviceInfo(): Promise<DeviceInfo>;

    crypto: CryptoProvider;

    storage: Storage;

    scanQR(): Promise<string>;
    stopScanQR(): Promise<void>;

    isBiometricAuthAvailable(): Promise<boolean>;
    biometricAuth(message?: string): Promise<boolean>;

    isKeyStoreAvailable(): Promise<boolean>;
    keyStoreGet(name: string): Promise<string>;
    keyStoreSet(name: string, val: string): Promise<void>;
    keyStoreDelete(name: string): Promise<void>;

    composeEmail(addr: string, subject: string, message: string): Promise<void>;

    saveFile(name: string, type: string, contents: Uint8Array): Promise<void>;
}

/**
 * Stub implementation of the [[Platform]] interface. Useful for testing
 */
export class StubPlatform implements Platform {
    crypto = new StubCryptoProvider();
    storage: Storage = new MemoryStorage();

    async setClipboard(_val: string) {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async getClipboard() {
        throw new Err(ErrorCode.NOT_SUPPORTED);
        return "";
    }

    async getDeviceInfo() {
        return new DeviceInfo();
    }

    async scanQR() {
        throw new Err(ErrorCode.NOT_SUPPORTED);
        return "";
    }

    async stopScanQR() {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async isBiometricAuthAvailable() {
        return false;
    }

    async biometricAuth() {
        throw new Err(ErrorCode.NOT_SUPPORTED);
        return false;
    }

    async isKeyStoreAvailable() {
        return false;
    }

    async keyStoreGet(_name: string) {
        throw new Err(ErrorCode.NOT_SUPPORTED);
        return "";
    }

    async keyStoreSet(_name: string, _val: string) {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async keyStoreDelete(_name: string) {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async composeEmail(_addr: string, _subject: string, _message: string) {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async saveFile(_name: string, _type: string, _contents: Uint8Array) {}
}

let platform: Platform = new StubPlatform();

/**
 * Set the appropriate [[Platform]] implemenation for the current environment
 */
export function setPlatform(p: Platform) {
    platform = p;
}

/**
 * Get the current [[Platform]] implemenation
 */
export function getPlatform() {
    return platform;
}

/** Copies the given `text` to the system clipboard */
export function getClipboard() {
    return platform.getClipboard();
}

/** Retrieves the current text from the system clipboard */
export function setClipboard(val: string) {
    return platform.setClipboard(val);
}

/** Get information about the current device */
export function getDeviceInfo() {
    return platform.getDeviceInfo();
}

export function getCryptoProvider() {
    return platform.crypto;
}

export function getStorage() {
    return platform.storage;
}

export function scanQR() {
    return platform.scanQR();
}

export function stopScanQR() {
    return platform.stopScanQR();
}

export function isBiometricAuthAvailable() {
    return platform.isBiometricAuthAvailable();
}

export function biometricAuth(message?: string) {
    return platform.biometricAuth(message);
}

export function isKeyStoreAvailable() {
    return platform.isKeyStoreAvailable();
}

export function keyStoreSet(name: string, value: string) {
    return platform.keyStoreSet(name, value);
}

export function keyStoreGet(name: string) {
    return platform.keyStoreGet(name);
}

export function keyStoreDelete(name: string) {
    return platform.keyStoreDelete(name);
}

export function composeEmail(addr: string, subject: string, message: string) {
    return platform.composeEmail(addr, subject, message);
}

export function saveFile(name: string, type: string, contents: Uint8Array): Promise<void> {
    return platform.saveFile(name, type, contents);
}
