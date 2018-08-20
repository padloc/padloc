import { Serializable, DateString, Marshalable } from "./encoding";
import { PublicKey, Container, Permissions, Accessor, AccessorStatus, EncryptionScheme } from "./crypto";
import { Storable } from "./storage";
import { Account, PublicAccount } from "./auth";
import { uuid } from "./util";
import { Err, ErrorCode } from "./error";

export type StoreID = string;
export type RecordID = string;
export type Tag = string;

export interface Field {
    name: string;
    value: string;
    masked?: boolean;
}

export function normalizeTag(tag: string): Tag {
    return tag.replace(",", "");
}

export interface Record {
    id: RecordID;
    removed: boolean;
    name: string;
    fields: Field[];
    tags: Tag[];
    updated: Date;
    updatedBy?: PublicAccount;
    lastUsed?: Date;
}

export function createRecord(name: string, fields?: Field[], tags?: Tag[]) {
    return {
        id: uuid(),
        name: name,
        fields: fields || [],
        tags: tags || [],
        updated: new Date(),
        lastUsed: new Date(),
        removed: false
    };
}

export abstract class Store implements Storable {
    created: DateString = new Date().toISOString();
    updated: DateString = new Date().toISOString();
    name: string = "";

    abstract kind: string;
    abstract pk: string;

    protected abstract _hasAccess: boolean;
    protected _records = new Map<string, Record>();

    constructor(protected _container: Container) {}

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

    removeRecords(rec: Record | Record[]) {
        const records = Array.isArray(rec) ? rec : [rec];
        for (const r of records) {
            r.name = "";
            r.fields = [];
            r.tags = [];
            r.removed = true;
            r.updated = new Date();
        }
    }

    createRecord(name: string, fields?: Field[], tags?: Tag[]): Record {
        return createRecord(name, fields, tags);
    }

    getRecord(id: string) {
        return this._records.get(id);
    }

    protected async _serialize() {
        return {
            records: this.records.map((r: any) => {
                // For backwards compatibility
                r.uuid = r.id;
                return r;
            })
        };
    }

    protected async _deserialize(raw: any) {
        const records = raw.records.map((r: any) => {
            return {
                tags: r.tags || (r.category && [r.category]) || [],
                name: r.name,
                fields: r.fields,
                id: r.id || r.uuid || uuid(),
                removed: r.removed,
                updated: r.updated ? new Date(r.updated) : new Date(),
                updatedBy: r.updatedBy,
                lastUsed: r.lastUsed && new Date(r.lastUsed)
            } as Record;
        });
        this.addRecords(records);
        return this;
    }

    protected get _serializer(): Serializable {
        return {
            serialize: async () => this._serialize(),
            deserialize: async (raw: any) => this._deserialize(raw)
        };
    }

    async serialize(): Promise<Marshalable> {
        if (this._hasAccess) {
            await this._container.set(this._serializer);
        }
        return {
            created: this.created,
            updated: this.updated,
            encryptedData: await this._container.serialize()
        };
    }

    async deserialize(raw: any) {
        await this._container.deserialize(raw.encryptedData);
        if (this._hasAccess) {
            await this._container.get(this._serializer);
        }
        this.created = raw.created;
        this.updated = raw.updated;
        return this;
    }

    async clear() {
        this._records = new Map<string, Record>();
        await this._container.clear();
    }
}

export class AccountStore extends Store {
    constructor(public account?: Account, public local = false, records: Record[] = []) {
        super(new Container("PBES2"));
        this.addRecords(records);
    }

    kind = "account-store";

    get pk() {
        return this.account && !this.local ? this.account.id : "";
    }

    set password(pwd: string | undefined) {
        this._container.password = pwd;
    }

    get password(): string | undefined {
        return this._container.password;
    }

    get _hasAccess() {
        return !!this.password;
    }

    protected async _serialize() {
        return Object.assign(await super._serialize(), {
            privateKey: this.account && this.account.privateKey,
            trustedAccounts: (this.account && this.account.trustedAccounts) || []
        });
    }

    protected async _deserialize(raw: any) {
        if (this.account) {
            this.account.privateKey = raw.privateKey;
            const newAccounts =
                (raw.trustedAccounts &&
                    raw.trustedAccounts.filter(
                        (acc: PublicAccount) => !this.account!.trustedAccounts.some(a => a.id === acc.id)
                    )) ||
                [];
            this.account.trustedAccounts.push(...newAccounts);
        }
        return super._deserialize(raw);
    }

    async clear() {
        await super.clear();
        if (this.account) {
            delete this.account.privateKey;
            this.account.trustedAccounts = [];
        }
    }
}

export class SharedStore extends Store {
    kind = "shared-store";
    _scheme: EncryptionScheme = "shared";

    constructor(public id: string, public account: Account, public name = "") {
        super(new Container("shared"));
        this._container.access = this.account;
    }

    get pk() {
        return this.id;
    }

    get _hasAccess() {
        return this.accessorStatus === "active" && !!this.account.privateKey;
    }

    get accessors() {
        return this._container.accessors;
    }

    get currentAccessor() {
        return this.accessors.find(a => this.account.id === a.id);
    }

    get permissions() {
        const accessor = this.currentAccessor;
        return (accessor && accessor.permissions) || { read: false, write: false, manage: false };
    }

    get accessorStatus(): AccessorStatus {
        const accessor = this.currentAccessor;
        return accessor ? accessor.status : "none";
    }

    mergeAccessors(accessors: Accessor[]) {
        return this._container.mergeAccessors(accessors);
    }

    getEncryptedKey(publicKey: PublicKey) {
        return this._container.getEncryptedKey(publicKey);
    }

    async _serialize() {
        const raw = await super._serialize();
        const publicKeys: { [id: string]: PublicKey } = {};
        for (const accessor of this._container.accessors) {
            publicKeys[accessor.id] = accessor.publicKey;
        }
        return Object.assign(raw, { publicKeys });
    }

    async _deserialize(raw: any) {
        await super._deserialize(raw);

        for (const accessor of this._container.accessors) {
            if (accessor.status === "active" && accessor.publicKey !== raw.publicKeys[accessor.id]) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }
        return this;
    }

    async deserialize(raw: any) {
        await super.deserialize(raw);
        this.name = raw.name;
        this.id = raw.id || this.id;
        return this;
    }

    async serialize() {
        return Object.assign(await super.serialize(), { name: this.name, id: this.id });
    }

    async updateAccess(
        acc: PublicAccount,
        permissions: Permissions = { read: true, write: true, manage: false },
        status: AccessorStatus
    ) {
        if (!acc.publicKey) {
            throw "Public Key is missing on account!";
        }
        const updatedBy = this.currentAccessor ? this.currentAccessor.id : acc.id;
        await this._container.setAccessor({
            id: acc.id,
            email: acc.email,
            name: acc.name,
            publicKey: acc.publicKey,
            encryptedKey: "",
            updated: "",
            permissions,
            updatedBy,
            status
        });
    }

    async revokeAccess(acc: PublicAccount) {
        await this._container.removeAccessor(acc.id);
    }

    getOldAccessors(record: Record) {
        return this.accessors.filter(a => a.status === "removed" && new Date(a.updated) > record.updated);
    }
}
