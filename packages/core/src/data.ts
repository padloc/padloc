import { Serializable, DateString, Marshalable } from "./encoding";
import { PublicKey, PrivateKey, Container, EncryptionScheme } from "./crypto";
import { Storable } from "./storage";
import { uuid } from "./util";

export type AccountID = string;
export type StoreID = string;
export type RecordID = string;

export interface Device {
    description: string;
    tokenId: string;
}

export class Settings implements Storable {
    kind = "settings";
    id = "";

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

    async deserialize(raw: any) {
        // Copy over setting values
        Object.assign(this, raw);
        this.loaded = true;
        return this;
    }

    //* Returns a raw JS object containing the current settings
    async serialize() {
        let obj = {};
        // Extract settings from `Settings` Object based on property names in `properties` member
        for (let prop in Settings.defaults) {
            obj[prop] = this[prop];
        }
        return obj;
    }

    clear(): void {
        Object.assign(this, Settings.defaults);
        this.loaded = false;
    }
}

export interface Field {
    name: string;
    value: string;
    masked?: boolean;
}

function normalizeTag(tag: string): string {
    return tag.replace(",", "");
}

export class Record implements Serializable {
    id: RecordID;
    removed: boolean;
    updated: Date;
    lastUsed: Date;
    private _tags = new Set<string>();

    static compare(a: Record, b: Record): number {
        return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
    }

    constructor(public name = "", public fields: Field[] = [], tags: string[] = []) {
        this.id = uuid();
        this.lastUsed = new Date();
        this.updated = new Date();
        this._tags = new Set<string>(tags);
    }

    get tags() {
        return [...this._tags];
    }

    async deserialize(raw: any) {
        const tags = raw.tags || (raw.category && [raw.category]) || [];
        this.name = raw.name;
        this.fields = raw.fields || [];
        this._tags = new Set<string>(tags.map(normalizeTag));
        this.id = raw.id || raw.uuid || uuid();
        this.removed = raw.removed;
        this.updated = new Date(raw.updated);
        this.lastUsed = new Date(raw.lastUsed);
        return this;
    }

    async serialize() {
        return {
            name: this.name,
            fields: this.fields,
            tags: this.tags,
            id: this.id,
            // For backward compatibility
            uuid: this.id,
            updated: this.updated,
            removed: this.removed,
            lastUsed: this.lastUsed
        };
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
    }
}

export class Store implements Storable {
    kind: "store";
    created: DateString;
    updated: DateString;
    account: Account;
    privateKey: PrivateKey;
    protected container: Container;
    private _records = new Map<string, Record>();

    protected get scheme(): EncryptionScheme {
        return "simple";
    }

    constructor(public id: StoreID = uuid(), records: Record[] = []) {
        this.container = new Container(this.scheme);
        this.addRecords(records);
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

    addRecords(rec: Record | Array<Record>) {
        const records = Array.isArray(rec) ? rec : [rec];
        for (const r of records) {
            const existing = this._records.get(r.id);
            if (!existing || r.updated > existing.updated) {
                this._records.set(r.id, r);
            }
        }
    }

    protected async _serialize() {
        return {
            created: this.created,
            updated: this.updated,
            records: await Promise.all(this.records.map(r => r.serialize()))
        };
    }

    protected async _deserialize(raw: any) {
        this.created = raw.created;
        this.updated = raw.updated;
        const records = await Promise.all(raw.records.map((r: any) => new Record().deserialize(r)));
        this.addRecords(Array.from(records) as Record[]);
        return this;
    }

    get serializer(): Storable {
        return {
            id: this.id,
            kind: this.kind,
            serialize: async () => this._serialize(),
            deserialize: async (raw: any) => this._deserialize(raw)
        };
    }

    protected prepContainer() {
        if (this.account) {
            this.container.user = {
                id: this.account.id,
                publicKey: this.account.publicKey,
                privateKey: this.privateKey
            };
        }
    }

    async serialize(): Promise<Marshalable> {
        this.prepContainer();
        await this.container.set(this.serializer);
        return this.container.serialize();
    }

    async deserialize(raw: any) {
        this.prepContainer();
        await this.container.deserialize(raw);
        await this.container.get(this.serializer);
        return this;
    }

    async clear() {
        this._records = new Map<string, Record>();
        delete this.account;
        delete this.privateKey;
        await this.container.clear();
    }
}

export class MainStore extends Store {
    protected get scheme(): EncryptionScheme {
        return "PBES2";
    }

    settings = new Settings();
    trustedAccounts: PublicAccount[];

    set password(pwd: string | undefined) {
        this.container.password = pwd;
    }

    get password(): string | undefined {
        return this.container.password;
    }

    protected async _serialize() {
        return Object.assign(await super._serialize(), {
            account: await this.account.serialize(),
            settings: await this.settings.serialize(),
            privateKey: this.privateKey,
            trustedAccounts: this.trustedAccounts
        });
    }

    protected async _deserialize(raw: any) {
        if (!this.account) {
            this.account = new Account();
        }
        this.settings.deserialize(raw.settings);
        delete raw.settings;
        await this.account.deserialize(raw.account);
        delete raw.account;
        return super._deserialize(raw);
    }
}

export class SharedStore extends Store {
    protected get scheme(): EncryptionScheme {
        return "shared";
    }
    members: PublicAccount[] = [];

    protected async _serialize() {
        return Object.assign(await super._serialize(), {
            members: this.members
        });
    }

    async addMember(member: Account) {
        this.members.push(member);
        this.prepContainer();
        await this.container.addParticipant(member);
    }
}

export interface PublicAccount {
    id: AccountID;
    email: string;
    publicKey: PublicKey;
    mainStore: StoreID;
}

export class Account implements PublicAccount, Storable {
    kind: "account";
    created: DateString;
    email: string;
    mainStore: StoreID;
    sharedStores: StoreID[] = [];
    publicKey: PublicKey;

    constructor(public id: AccountID = uuid()) {}

    get publicAccount(): PublicAccount {
        return {
            id: this.id,
            email: this.email,
            publicKey: this.publicKey,
            mainStore: this.mainStore
        };
    }

    async serialize() {
        return {
            id: this.id,
            created: this.created,
            email: this.email,
            mainStore: this.mainStore,
            sharedStores: this.sharedStores,
            publicKey: this.publicKey
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
        return this;
    }
}
