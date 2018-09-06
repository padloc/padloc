import { Serializable } from "./encoding";
import { AccountID } from "./auth";
import { uuid } from "./util";

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
    updatedBy: AccountID;
    lastUsed: Date;
}

export function createRecord(name: string, fields?: Field[], tags?: Tag[]): Record {
    return {
        id: uuid(),
        name: name,
        fields: fields || [],
        tags: tags || [],
        updated: new Date(),
        updatedBy: "",
        lastUsed: new Date(),
        removed: false
    };
}

export class Collection implements Iterable<Record>, Serializable {
    private _records: Map<string, Record> = new Map<string, Record>();

    get size() {
        return this._records.size;
    }

    get tags(): string[] {
        const tags = new Set<string>();
        for (const r of this) {
            for (const t of r.tags) {
                tags.add(t);
            }
        }
        return [...tags];
    }

    constructor(records?: Record[]) {
        if (records) {
            this.add(records);
        }
    }

    get(id: string) {
        return this._records.get(id);
    }

    add(rec: Record | Array<Record>) {
        const records = Array.isArray(rec) ? rec : [rec];
        for (const r of records) {
            const existing = this._records.get(r.id);
            if (!existing || r.updated > existing.updated) {
                this._records.set(r.id, r);
            }
        }
    }

    remove(rec: Record | Record[]) {
        const records = Array.isArray(rec) ? rec : [rec];
        for (const r of records) {
            r.name = "";
            r.fields = [];
            r.tags = [];
            r.removed = true;
            r.updated = new Date();
        }
    }

    create(name: string, fields?: Field[], tags?: Tag[]): Record {
        return createRecord(name, fields, tags);
    }

    async serialize(): Promise<any> {
        return Array.from(this);
    }

    async deserialize(raw: any[]) {
        const records = raw.map((r: any) => {
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
        this.add(records);
        return this;
    }

    [Symbol.iterator]() {
        return this._records.values();
    }
}
