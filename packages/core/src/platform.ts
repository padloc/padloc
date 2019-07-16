import { localize as $l } from "./locale";
import { Serializable } from "./encoding";
import { CryptoProvider } from "./crypto";
import { StubCryptoProvider } from "./stub-crypto-provider";

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

    get description() {
        return this.browser ? $l("{0} on {1}", this.browser, this.platform) : $l("{0} Device", this.platform);
    }

    fromRaw({ platform, osVersion, id, appVersion, userAgent, locale, manufacturer, model, browser }: any) {
        return super.fromRaw({ platform, osVersion, id, appVersion, userAgent, locale, manufacturer, model, browser });
    }

    validate() {
        return (
            typeof this.platform === "string" &&
            typeof this.osVersion === "string" &&
            typeof this.id === "string" &&
            typeof this.appVersion === "string" &&
            typeof this.userAgent === "string" &&
            typeof this.locale === "string" &&
            typeof this.manufacturer === "string" &&
            typeof this.model === "string" &&
            typeof this.browser === "string"
        );
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
}

/**
 * Stub implementation of the [[Platform]] interface. Useful for testing
 */
export class StubPlatform implements Platform {
    async setClipboard() {}
    async getClipboard() {
        return "";
    }
    async getDeviceInfo() {
        return new DeviceInfo();
    }
    async checkForUpdates() {}
    async getReviewLink() {
        return "";
    }

    crypto = new StubCryptoProvider();
}

let platform: Platform = new StubPlatform();

/**
 * Set the appropriate [[Platform]] implemenation for the current environment
 */
export function setPlatform(p: Platform) {
    platform = p;
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
