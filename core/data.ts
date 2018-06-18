import { Serializable, DateString } from "./encoding";
import { PublicKey, PrivateKey, Container, EncryptionScheme, provider } from "./crypto";
import { Storable, Storage, LocalStorage } from "./storage";
import { uuid } from "./util";

export interface Record {}

export type AccountID = string;
export type ClientID = string;
export type StoreID = string;
export type RecordID = string;

type EditInfo = {
    account: AccountID | undefined;
    date: Date | DateString;
};
//
// function parseEditInfo(raw: string | number | Date | EditInfo): EditInfo {
//     if (typeof raw === "string" || typeof raw === "number" || typeof raw === "undefined" || raw instanceof Date) {
//         return { date: raw ? new Date(raw) : new Date(), account: undefined };
//     } else {
//         return {
//             date: raw.date ? new Date(raw.date) : new Date(),
//             account: raw.account
//         };
//     }
// }

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
    name: string;
    fields: Array<Field> = [];
    removed: boolean;
    updated: Date;
    lastUsed: Date;
    private _tags = new Set<string>();

    static compare(a: Record, b: Record): number {
        return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
    }

    constructor(name = "") {
        this.name = name;
        this.id = uuid();
    }

    get tags() {
        return [...this._tags];
    }

    async deserialize(raw: any): Promise<Record> {
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

export class Store implements Serializable {
    created: EditInfo;
    updated: EditInfo;
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

    get serializer() {
        return {
            id: this.id,
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

    async serialize() {
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
}

export class MainStore extends Store {
    protected get scheme(): EncryptionScheme {
        return "PBES2";
    }

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
            privateKey: this.privateKey,
            trustedAccounts: this.trustedAccounts
        });
    }

    protected async _deserialize(raw: any) {
        if (!this.account) {
            this.account = new Account();
        }
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
    created: DateString;
    email: string;
    mainStore: StoreID;
    sharedStores: StoreID[] = [];
    clients: ClientID[] = [];
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
            clients: this.clients,
            publicKey: this.publicKey
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
        return this;
    }
}

export class ClientMeta implements Storable {
    id = "meta";
    public accounts: PublicAccount[] = [];
    public currentAccount?: PublicAccount;

    async serialize() {
        return {
            accounts: this.accounts,
            currentAccount: this.currentAccount
        };
    }

    async deserialize(raw: any) {
        Object.assign(this, raw);
        return this;
    }
}

export class Client {
    id: ClientID;
    meta: ClientMeta;
    storage: Storage;
    mainStore: MainStore;
    sharedStores: SharedStore[] = [];

    constructor() {
        this.storage = new LocalStorage();
        this.meta = new ClientMeta();
    }

    get account(): Account | undefined {
        return this.mainStore.account;
    }

    get privateKey(): PrivateKey {
        return this.mainStore.privateKey;
    }

    async load() {
        try {
            await this.storage.get(this.meta);
        } catch (e) {
            await this.storage.set(this.meta);
        }
    }

    async init(password: string) {
        const account = new Account(uuid());
        Object.assign(account, await provider.generateKeyPair());
        this.mainStore = new MainStore();
        this.mainStore.account = account;
        account.mainStore = this.mainStore.id;
        await this.setPassword(password);
        const pubAcc = account.publicAccount;
        this.meta.accounts.push(pubAcc);
        this.meta.currentAccount = pubAcc;
        await this.storage.set(this.meta);
    }

    async unlock(password: string) {
        this.mainStore = new MainStore(this.meta.currentAccount!.mainStore);
        this.mainStore.password = password;
        await this.storage.get(this.mainStore);

        for (const id of this.account!.sharedStores) {
            const sharedStore = new SharedStore(id);
            sharedStore.account = this.account!;
            sharedStore.privateKey = this.privateKey!;
            try {
                await this.storage.get(sharedStore);
                this.sharedStores.push(sharedStore);
            } catch (e) {
                console.error("Failed to decrypt shared store with id", sharedStore.id, e);
            }
        }
    }

    async setPassword(password: string) {
        this.mainStore.password = password;
        await this.storage.set(this.mainStore);
    }

    async createSharedStore(): Promise<SharedStore> {
        const store = new SharedStore();
        store.account = this.account!;
        store.privateKey = this.privateKey;
        await store.addMember(this.account!);
        await this.storage.set(store);
        this.sharedStores.push(store);
        this.account!.sharedStores.push(store.id);
        await this.storage.set(this.mainStore);
        return store;
    }
}
