import { Serializable } from "./encoding";
import { uuid } from "./util";

export interface CollectionItem {
    id: string;
    updated: Date;
}

export interface CollectionChanges<T> {
    added: T[];
    updated: T[];
    removed: T[];
}

export class Collection<T extends CollectionItem> implements Iterable<T>, Serializable {
    revision: {
        id: string;
        date: Date;
        mergedFrom?: [string, string];
    } = { id: "", date: new Date(0) };

    get size() {
        return this._items.size;
    }

    private _items: Map<string, T>;

    constructor(items: T[] = []) {
        this._items = new Map(items.map(item => [item.id, item] as [string, T]));
    }

    get(id: string) {
        return this._items.get(id);
    }

    update(...items: T[]) {
        for (const item of items) {
            item.updated = new Date();
            this._items.set(item.id, item);
        }
    }

    remove(...items: T[]) {
        for (const item of items) {
            this._items.delete(item.id);
        }
    }

    merge(coll: Collection<T>) {
        const changes: CollectionChanges<T> = {
            added: [],
            updated: [],
            removed: []
        };

        for (const item of this) {
            // If item does not exist in other collection and was
            // not updated since last merge, that means someone else removed
            // it (as opposed to us adding it) and we need to delete it
            if (!coll.get(item.id)) {
                if (item.updated < this.revision.date) {
                    this.remove(item);
                    changes.removed.push(item);
                } else {
                    item.updated = new Date();
                }
            }
        }

        for (const item of coll) {
            const existing = this.get(item.id);
            if (!existing && item.updated > this.revision.date) {
                // item has been added or updated after last merge so we'll keep it
                // even if we may have deleted it locally
                this._items.set(item.id, item);
                changes.added.push(item);
            } else if (existing && item.updated > existing.updated) {
                // always use the more recently updated item
                this._items.set(item.id, item);
                changes.updated.push(item);
            }
        }

        this.revision = { id: uuid(), date: new Date(), mergedFrom: [this.revision.id, coll.revision.id] };

        return changes;
    }

    async serialize(): Promise<any> {
        return {
            revision: this.revision,
            items: Array.from(this)
        };
    }

    async deserialize(raw: any) {
        for (const item of raw.items) {
            if (!(item.updated instanceof Date)) {
                item.updated = new Date(item.updated);
            }
        }
        this._items = new Map(raw.items.map((item: any) => [item.id, item] as [string, T]));
        this.revision = { ...raw.revision, date: new Date(raw.revision.date) };
        return this;
    }

    [Symbol.iterator]() {
        return this._items.values();
    }
}
