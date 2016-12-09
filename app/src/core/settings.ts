import { Source } from "./source";

const defaults = {
    autoLock: true,
    // Auto lock delay in minutes
    autoLockDelay: 1,
    syncHostUrl: "https://cloud.padlock.io",
    syncCustomHost: false,
    syncEmail: "",
    syncKey: "",
    syncDevice: "",
    syncConnected: false,
    syncAuto: true,
    syncSubStatus: "",
    syncTrialEnd: 0,
    defaultFields: ["username", "password"],
    obfuscateFields: false,
    showedBackupReminder: 0,
    syncRequireSubscription: false,
    syncId: "",
    version: ""
};

export class Settings {
    loaded: boolean;

    // Auto lock settings
    autoLock: boolean;
    // Auto lock delay in minutes
    autoLockDelay: 1;

    // Synchronization settings
    syncHostUrl: string;
    syncCustomHost: boolean;
    syncEmail: string;
    syncToken: string;
    syncConnected: boolean;
    syncAuto: boolean;
    syncSubStatus: string;
    syncTrialEnd: number;
    syncId: string;

    // Record-related settings
    recordDefaultFields: Array<string>;
    recordObfuscateFields: boolean;

    // Miscellaneous settings
    showedBackupReminder: number;
    version: string;

    constructor() {
        // Set defaults
        this.reset();
        // Flag used to indicate if the settings have been loaded from persistent storage initially
        this.loaded = false;
    }

    loadJSON(json: string) {
        let data: any;
        try {
            data = JSON.parse(json);
        } catch (e) {
            data = {};
        }
        // Copy over setting values
        Object.assign(this, data);
    }

    //* Returns a raw JS object containing the current settings
    raw(): Object {
        let obj = {};
        // Extract settings from `Settings` Object based on property names in `properties` member
        for (let prop in defaults) {
            obj[prop] = this[prop];
        }
        return obj;
    }

    toJSON(): string {
        return JSON.stringify(this.raw());
    }

    fetch(source: Source): Promise<void> {
        return source.get()
            .then(json => {
                this.loadJSON(json);
                // Update loaded flag to indicate that data has been loaded from persistent storage at least once
                this.loaded = true;
            });
    }

    save(source: Source): Promise<void> {
        return source.set(this.toJSON());
    }

    reset(): void {
        Object.assign(this, defaults);
    }

}
