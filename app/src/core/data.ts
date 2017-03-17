import { uuid, compareProperty } from "./util";
import { Source } from "./source";

const compareCategory = compareProperty("category");
const compareName = compareProperty("name");
const compareUuid = compareProperty("uuid");

export interface Field {
    name: string;
    value: string;
}

export class Record {

    name: string;
    fields: Array<Field>;
    category: string;
    uuid: string;
    updated: Date;
    removed: boolean;

    constructor(name = "Unnamed", fields?: Array<Field>, category?: string,
                id?: string, updated?: Date, removed = false) {
        this.name = name;
        this.fields = fields || new Array<Field>();
        this.category = category || "";
        this.uuid = id || uuid();
        this.updated = updated || new Date();
        this.removed = removed;
    }

    static fromRaw(obj: any): Record {
        let fields = obj.fields && <Array<Field>>obj.fields;
        let updated = obj.updated && (obj.updated instanceof Date ? obj.updated : new Date(obj.updated));
        return new Record(obj.name, fields, obj.category, obj.uuid, updated, obj.removed);
    }

    static compare(a: Record, b: Record): number {
        return compareName(a, b) || compareCategory(a, b) || compareUuid(a, b);
    }

    remove(): void {
        this.name = "";
        this.fields = [];
        this.category = "";
        this.removed = true;
        this.updated = new Date();
    }

    raw(): Object {
        return {
            name: this.name,
            fields: this.fields,
            category: this.category,
            uuid: this.uuid,
            updated: this.updated,
            removed: this.removed
        };
    }

}

export class Collection {

    private _records: Map<string, Record>;
    // private dispatcher: EventTarget;

    constructor() {
        this._records = new Map<string, Record>();
        // Helper element for dispatching custom events. This is currently only used for publishing
        // the `update` event
        // this.dispatcher = document.createElement("div");
    }

    get records(): Array<Record> {
        return Array.from(this._records.values()).filter(rec => !rec.removed).sort(Record.compare);
    }

    async fetch(source: Source): Promise<void> {
        let data = await source.get();
        let records = JSON.parse(data).map(Record.fromRaw);
        this.add(records);
    }

    save(source: Source): Promise<void> {
        return source.set(this.toJSON());
    }

    add(rec: Record | Array<Record>) {
        let records = Array.isArray(rec) ? rec : [rec];
        for (let r of records) {
            let existing = this._records.get(r.uuid);
            if (!existing || r.updated > existing.updated) {
                this._records.set(r.uuid, r);
            }
        }
    }

    toJSON(): string {
        return JSON.stringify(this.records.map(rec => rec.raw()));
    }

    clear(): void {
        this._records.clear();
    }

    // addEventListener(type: string, listener: () => {} ): void {
    //     this.dispatcher.addEventListener(type, listener);
    // }
}


export class Settings {

    static defaults = {
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

    loaded: boolean;

    // Auto lock settings
    autoLock: boolean;
    // Auto lock delay in minutes
    autoLockDelay: number;

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
        this.clear();
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
        for (let prop in Settings.defaults) {
            obj[prop] = this[prop];
        }
        return obj;
    }

    toJSON(): string {
        return JSON.stringify(this.raw());
    }

    async fetch(source: Source): Promise<void> {
        let json = await source.get();
        this.loadJSON(json);
        // Update loaded flag to indicate that data has been loaded from persistent storage at least once
        this.loaded = true;
    }

    save(source: Source): Promise<void> {
        return source.set(this.toJSON());
    }

    clear(): void {
        Object.assign(this, Settings.defaults);
    }

}
