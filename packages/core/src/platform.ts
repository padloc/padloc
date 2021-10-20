import { translate as $l } from "@padloc/locale/src/translate";
import { Serializable } from "./encoding";
import { CryptoProvider } from "./crypto";
import { Err, ErrorCode } from "./error";
import { StubCryptoProvider } from "./stub-crypto-provider";
import { Storage, MemoryStorage } from "./storage";
import { AccountStatus, AuthPurpose, AuthType } from "./auth";
import { AccountProvisioning } from "./provisioning";
import { StartAuthRequestResponse } from "./api";

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

    vendorVersion: string = "";

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

    description: string = $l("Unknown Device");

    constructor(props?: Partial<DeviceInfo>) {
        super();
        props && Object.assign(this, props);
    }
}

export interface BiometricKeyStore {
    isSupported(): Promise<boolean>;
    getKey(id: string): Promise<Uint8Array>;
    storeKey(id: string, key: Uint8Array): Promise<void>;
}

export class StubBiometricKeyStore {
    async isSupported() {
        return false;
    }
    getKey(_id: string): Promise<Uint8Array> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }
    storeKey(_id: string, _key: Uint8Array): Promise<void> {
        throw new Err(ErrorCode.NOT_SUPPORTED);
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

    biometricKeyStore: BiometricKeyStore;

    scanQR(): Promise<string>;
    stopScanQR(): Promise<void>;

    composeEmail(addr: string, subject: string, message: string): Promise<void>;

    openExternalUrl(_url: string): void;

    saveFile(name: string, type: string, contents: Uint8Array): Promise<void>;

    readonly supportedAuthTypes: AuthType[];

    registerAuthenticator(opts: {
        purposes: AuthPurpose[];
        type: AuthType;
        data?: any;
        device?: DeviceInfo;
    }): Promise<string>;

    startAuthRequest(opts: {
        purpose: AuthPurpose;
        type?: AuthType;
        email?: string;
        authenticatorId?: string;
        authenticatorIndex?: number;
    }): Promise<StartAuthRequestResponse>;

    completeAuthRequest(
        req: StartAuthRequestResponse
    ): Promise<{
        token: string;
        accountStatus: AccountStatus;
        deviceTrusted: boolean;
        provisioning: AccountProvisioning;
    }>;

    readonly platformAuthType: AuthType | null;
    supportsPlatformAuthenticator(): Promise<boolean>;
    registerPlatformAuthenticator(purposes: AuthPurpose[]): Promise<string>;
    getPlatformAuthToken(_purpose: AuthPurpose[]): Promise<string>;
}

/**
 * Stub implementation of the [[Platform]] interface. Useful for testing
 */
export class StubPlatform implements Platform {
    crypto = new StubCryptoProvider();
    storage: Storage = new MemoryStorage();
    biometricKeyStore = new StubBiometricKeyStore();

    get supportedAuthTypes(): AuthType[] {
        return [];
    }

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

    async composeEmail(_addr: string, _subject: string, _message: string) {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    openExternalUrl(_url: string) {
        throw new Err(ErrorCode.NOT_SUPPORTED);
    }

    async saveFile(_name: string, _type: string, _contents: Uint8Array) {}

    async registerAuthenticator(_opts: {
        purposes: AuthPurpose[];
        type: AuthType;
        data?: any;
        device?: DeviceInfo;
    }): Promise<string> {
        throw "Not implemented";
    }

    async startAuthRequest(_opts: {
        purpose: AuthPurpose;
        type?: AuthType | undefined;
        email?: string | undefined;
        authenticatorId?: string | undefined;
        authenticatorIndex?: number | undefined;
    }): Promise<StartAuthRequestResponse> {
        throw new Error("Method not implemented.");
    }

    async completeAuthRequest(
        _req: StartAuthRequestResponse
    ): Promise<{
        token: string;
        accountStatus: AccountStatus;
        deviceTrusted: boolean;
        provisioning: AccountProvisioning;
    }> {
        throw new Error("Method not implemented.");
    }

    readonly platformAuthType: AuthType | null = null;

    async supportsPlatformAuthenticator() {
        return false;
    }

    registerPlatformAuthenticator(_purpose: AuthPurpose[]): Promise<string> {
        throw "Not implemented";
    }

    getPlatformAuthToken(_purpose: AuthPurpose[]): Promise<string> {
        throw "Not implemented";
    }
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

export function composeEmail(addr: string, subject: string, message: string) {
    return platform.composeEmail(addr, subject, message);
}

export function saveFile(name: string, type: string, contents: Uint8Array): Promise<void> {
    return platform.saveFile(name, type, contents);
}

export function registerAuthenticator(opts: {
    purposes: AuthPurpose[];
    type: AuthType;
    data?: any;
    device?: DeviceInfo;
}): Promise<string> {
    return platform.registerAuthenticator(opts);
}

export function startAuthRequest(opts: {
    purpose: AuthPurpose;
    type?: AuthType;
    email?: string;
    authenticatorId?: string;
    authenticatorIndex?: number;
}): Promise<StartAuthRequestResponse> {
    return platform.startAuthRequest(opts);
}

export function completeAuthRequest(
    req: StartAuthRequestResponse
): Promise<{
    token: string;
    accountStatus: AccountStatus;
    deviceTrusted: boolean;
    provisioning: AccountProvisioning;
}> {
    return platform.completeAuthRequest(req);
}

export async function authenticate(opts: {
    purpose: AuthPurpose;
    type?: AuthType;
    email?: string;
    authenticatorId?: string;
    authenticatorIndex?: number;
}) {
    const req = await startAuthRequest(opts);
    return completeAuthRequest(req);
}

export function supportsPlatformAuthenticator() {
    return platform.supportsPlatformAuthenticator();
}

export function registerPlatformAuthenticator(purposes: AuthPurpose[]) {
    return platform.registerPlatformAuthenticator(purposes);
}

export function getPlatformAuthType() {
    return platform.platformAuthType;
}

export function openExternalUrl(url: string) {
    return platform.openExternalUrl(url);
}
