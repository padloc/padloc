import { Serializable, DateString, Marshalable, Base64String } from "./encoding";
import {
    getProvider,
    RSAPublicKey,
    HMACKey,
    PBES2Container,
    SharedContainer,
    Permissions,
    Accessor,
    AccessorStatus
} from "./crypto";
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

    protected _records = new Map<string, Record>();

    constructor(records?: Record[]) {
        if (records) {
            this.addRecords(records);
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
        return {
            created: this.created,
            updated: this.updated
        };
    }

    async deserialize(raw: any) {
        this.created = raw.created;
        this.updated = raw.updated;
        return this;
    }
}

export class AccountStore extends Store {
    kind = "account-store";

    get pk() {
        return this.account && !this.local ? this.account.id : "";
    }

    private _container: PBES2Container;

    constructor(public account: Account, public local = false, records: Record[] = []) {
        super(records);
        this._container = new PBES2Container();
    }

    set password(pwd: string | undefined) {
        this._container.password = pwd;
    }

    get password(): string | undefined {
        return this._container.password;
    }

    protected async _serialize() {
        return Object.assign(await super._serialize(), {
            privateKey: this.account.privateKey,
            trustedAccounts: this.account.trustedAccounts
        });
    }

    protected async _deserialize(raw: any) {
        this.account.privateKey = raw.privateKey;
        const newAccounts =
            (raw.trustedAccounts &&
                raw.trustedAccounts.filter(
                    (acc: PublicAccount) => !this.account!.trustedAccounts.some(a => a.id === acc.id)
                )) ||
            [];
        this.account.trustedAccounts.push(...newAccounts);
        return super._deserialize(raw);
    }

    async serialize() {
        if (this.password) {
            await this._container.set(this._serializer);
        }
        return Object.assign(await super.serialize(), await this._container.serialize());
    }

    async deserialize(raw: any) {
        await super.deserialize(raw);
        await this._container.deserialize(raw);
        if (this.password) {
            await this._container.get(this._serializer);
        }
        return this;
    }
}

export class Invite {
    created: DateString = new Date().toISOString();
    publicKey: RSAPublicKey = "";
    signedPublicKey: Base64String = "";

    private async _getKey(code: string) {
        return (await getProvider().deriveKey(code, {
            algorithm: "PBKDF2",
            hash: "SHA-256",
            salt: this.email,
            iterations: 1,
            keySize: 256
        })) as HMACKey;
    }

    constructor(public email: string, public code = "") {}

    async accept(publicKey: RSAPublicKey, code: string) {
        this.publicKey = publicKey;
        this.signedPublicKey = await getProvider().sign(await this._getKey(code), this.publicKey, {
            algorithm: "HMAC",
            hash: "SHA-256",
            keySize: 256
        });
    }

    async verify(code: string) {
        return await getProvider().verify(await this._getKey(code), this.signedPublicKey, this.publicKey, {
            algorithm: "HMAC",
            hash: "SHA-256",
            keySize: 256
        });
    }
}

export class SharedStore extends Store {
    kind = "shared-store";

    private _container: SharedContainer;

    constructor(public id: string, public account: Account, public name = "") {
        super();
        this._container = new SharedContainer(this.account);
    }

    get pk() {
        return this.id;
    }

    get hasAccess() {
        return this.accessorStatus === "active" && !!this.account.privateKey;
    }

    get accessors() {
        return this._container.accessors;
    }

    get currentAccessor() {
        return this._container.getAccessor(this.account.id);
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

    async _serialize() {
        const raw = await super._serialize();
        const publicKeys: { [id: string]: RSAPublicKey } = {};
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

    async serialize() {
        if (this.hasAccess) {
            await this._container.set(this._serializer);
        }
        return Object.assign(await super.serialize(), await this._container.serialize(), {
            name: this.name,
            id: this.id
        });
    }

    async deserialize(raw: any) {
        await super.deserialize(raw);
        this.name = raw.name;
        this.id = raw.id || this.id;
        await this._container.deserialize(raw);
        if (this.hasAccess) {
            await this._container.get(this._serializer);
        }
        return this;
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
        await this._container.updateAccessor({
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
