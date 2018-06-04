import { uuid } from "./util";
import { getAppVersion } from "./platform";
import { Source } from "./source";

function compareProperty(p: string): (a: Object, b: Object) => number {
    return (a, b) => {
        const x = typeof a[p] === "string" ? a[p].toLowerCase() : a[p];
        const y = typeof b[p] === "string" ? b[p].toLowerCase() : b[p];
        return x > y ? 1 : x < y ? -1 : 0;
    };
}
const compareName = compareProperty("name");

export interface Field {
    name: string;
    value: string;
    masked?: boolean;
}

function normalizeTag(tag: string): string {
    return tag.replace(",", "");
}

export class Record {
    private _tags: Set<string>;
    name: string;
    fields: Array<Field>;
    uuid: string;
    updated: Date;
    removed: boolean;
    lastUsed?: Date;

    constructor(
        name = "",
        fields?: Array<Field>,
        tags?: string[],
        id?: string,
        updated?: Date,
        removed = false,
        lastUsed?: Date
    ) {
        this.name = name;
        this.fields = fields || new Array<Field>();
        if (!Array.isArray(tags)) {
            tags = [];
        }
        this._tags = new Set<string>(tags.map(normalizeTag));
        this.uuid = id || uuid();
        this.updated = updated || new Date();
        this.removed = removed;
        this.lastUsed = lastUsed;
    }

    static fromRaw(obj: any): Record {
        const fields = obj.fields && <Array<Field>>obj.fields;
        const updated = obj.updated && (obj.updated instanceof Date ? obj.updated : new Date(obj.updated));
        const lastUsed = obj.lastUsed && (obj.lastUsed instanceof Date ? obj.lastUsed : new Date(obj.lastUsed));
        const tags = obj.tags || (obj.category && [obj.category]);
        return new Record(obj.name, fields, tags, obj.uuid, updated, obj.removed, lastUsed);
    }

    static compare(a: Record, b: Record): number {
        return compareName(a, b);
    }

    get tags() {
        return [...this._tags];
    }

    addTag(tag: string) {
        this._tags.add(normalizeTag(tag));
    }

    removeTag(tag: string) {
        this._tags.delete(tag);
    }

    hasTag(tag: string) {
        return this._tags.has(tag);
    }

    remove(): void {
        this.name = "";
        this.fields = [];
        this._tags = new Set<string>();
        this.removed = true;
        this.updated = new Date();
    }

    raw(): Object {
        return {
            name: this.name,
            fields: this.fields,
            tags: this.tags,
            uuid: this.uuid,
            updated: this.updated,
            removed: this.removed,
            lastUsed: this.lastUsed
        };
    }
}

export class Collection {
    private _records: Map<string, Record>;

    constructor(records?: Record[]) {
        this._records = new Map<string, Record>();

        if (records) {
            this.add(records);
        }
    }

    get records(): Array<Record> {
        return Array.from(this._records.values());
    }

    get tags(): string[] {
        const tags = new Set<string>();
        for (const r of this.records) {
            for (const t of r.tags) {
                tags.add(t);
            }
        }
        return [...tags];
    }

    async fetch(source: Source): Promise<void> {
        let data = await source.get();
        if (data) {
            let records = JSON.parse(data).map(Record.fromRaw);
            this.add(records);
        }
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
}

export interface Device {
    description: string;
    tokenId: string;
}

export interface Account {
    email: string;
    devices: Device[];
}

export class Settings {
    static defaults = {
        autoLock: true,
        // Auto lock delay in minutes
        autoLockDelay: 5,
        stripePubKey: "",
        syncHostUrl: "https://cloud.padlock.io",
        syncCustomHost: false,
        syncEmail: "",
        syncToken: "",
        syncDevice: "",
        syncConnected: false,
        syncAuto: false,
        syncSubStatus: "",
        syncTrialEnd: 0,
        syncDeviceCount: 0,
        account: undefined,
        defaultFields: ["username", "password"],
        obfuscateFields: false,
        syncRequireSubscription: false,
        syncId: "",
        version: ""
    };

    loaded: boolean;

    // Auto lock settings
    autoLock: boolean;
    // Auto lock delay in minutes
    autoLockDelay: number;

    peekValues: boolean;

    // Stripe settings
    stripePubKey: string;

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
    syncDeviceCount: number;

    account?: Account;

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
        this.version = await getAppVersion();
        // Update loaded flag to indicate that data has been loaded from persistent storage at least once
        this.loaded = true;
    }

    async save(source: Source): Promise<void> {
        await source.set(this.toJSON());
        this.loaded = true;
    }

    clear(): void {
        Object.assign(this, Settings.defaults);
        this.loaded = false;
    }
}
