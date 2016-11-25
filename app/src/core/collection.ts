import { uuid, compareProperty } from "./util";
import { Source } from "./source";
import { Store } from "./store";

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
        return compareCategory(a, b) || compareName(a, b) || compareUuid(a, b);
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
    private dispatcher: EventTarget;

    constructor(private store: Store) {
        this.store = store;
        this._records = new Map<string, Record>();
        // Helper element for dispatching custom events. This is currently only used for publishing
        // the `update` event
        this.dispatcher = document.createElement("div");
    }

    get records(): Array<Record> {
        return Array.from(this._records.values()).filter(rec => !rec.removed).sort(Record.compare);
    }

    fetch(password?: string, rememberPassword?: boolean, source?: Source): Promise<void> {
        return this.store.get(password, rememberPassword, source)
            .then(data => {
                let records = JSON.parse(data).map(Record.fromRaw);
                this.add(records);
            });
    }

    save(password?: string, rememberPassword?: boolean, source?: Source): Promise<void> {
        return this.store.set(this.toJSON(), password, rememberPassword, source);
    }

    // splice(start: number, deleteCount?: number, ...items: Record) {
    //     var rem = this.records.splice(start, deleteCount, ...items);
    //     var e = new CustomEvent("update", {detail: [start, deleteCount, ...items]});
    //     this.dispatcher.dispatchEvent(e);
    //     return rem;
    // }

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

    sync(source: Source, password?: string): Promise<void> {
        return this.fetch(password, false, source)
            .then(() => this.save(password, false, source));
    }

    addEventListener(type: string, listener: () => {} ): void {
        this.dispatcher.addEventListener(type, listener);
    }
}
