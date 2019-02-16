import { localize as $l } from "./locale";
import { Serializable } from "./encoding";

export class DeviceInfo extends Serializable {
    platform: string = "";
    osVersion: string = "";
    id: string = "";
    appVersion: string = "";
    userAgent: string = "";
    locale: string = "en";
    manufacturer?: string;
    model?: string;
    browser?: string;

    constructor(props?: Partial<DeviceInfo>) {
        super();
        props && Object.assign(this, props);
    }
}

export interface Platform {
    setClipboard(val: string): Promise<void>;
    getClipboard(): Promise<string>;
    getDeviceInfo(): Promise<DeviceInfo>;
}

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

export function setPlatform(p: Platform) {
    platform = p;
}

export function getClipboard() {
    return platform.getClipboard();
}

export function setClipboard(val: string) {
    return platform.setClipboard(val);
}

export function getDeviceInfo() {
    return platform.getDeviceInfo();
}

export function deviceDescription(device?: DeviceInfo) {
    if (!device) {
        return $l("Unknown Device");
    }
    return device.browser ? $l("{0} on {1}", device.browser, device.platform) : $l("{0} Device", device.platform);
}

let _isTouch: boolean | undefined = undefined;
//* Checks if the current environment supports touch events
export function isTouch(): boolean {
    if (_isTouch === undefined) {
        try {
            document.createEvent("TouchEvent");
            _isTouch = true;
        } catch (e) {
            _isTouch = false;
        }
    }
    return _isTouch;
}
