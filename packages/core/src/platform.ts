import { localize as $l } from "./locale";
import { Serializable } from "./encoding";

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
}

/**
 * Stub implementation of the [[Platform]] interface. Useful for testing
 */
class StubPlatform implements Platform {
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

/** Generates a description text for a given device */
export function deviceDescription(device?: DeviceInfo) {
    if (!device) {
        return $l("Unknown Device");
    }
    return device.browser ? $l("{0} on {1}", device.browser, device.platform) : $l("{0} Device", device.platform);
}
