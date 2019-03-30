import { Serializable } from "./encoding";
import { uuid } from "./util";

export interface CollectionItem {
    id: string;
    updated?: Date;
}

export interface CollectionChanges<T> {
    added: T[];
    updated: T[];
    removed: T[];
}

export interface Revision {
    id: string;
    date: Date;
    mergedFrom?: [string, string];
}

export class Collection<T extends CollectionItem> extends Serializable implements Iterable<T> {
    revision: Revision = { id: "", date: new Date(0) };

    get size() {
        return this._items.size;
    }

    private _items: Map<string, T>;

    constructor(items: T[] = []) {
        super();
        this._items = new Map(items.map(item => [item.id, item] as [string, T]));
    }

    get(id: string) {
        return this._items.get(id) || null;
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

    async merge(coll: Collection<T>) {
        const changes: CollectionChanges<T> = {
            added: [],
            updated: [],
            removed: []
        };
        const forwardChanges: CollectionChanges<T> = {
            added: [],
            updated: [],
            removed: []
        };

        for (const item of this) {
            // If item does not exist in other collection and was
            // not updated since last merge, that means someone else removed
            // it (as opposed to us adding it) and we need to delete it
            if (!coll.get(item.id)) {
                if (item.updated! <= this.revision.date) {
                    this.remove(item);
                    changes.removed.push(item);
                } else {
                    item.updated! = new Date();
                    forwardChanges.added.push(item);
                }
            }
        }

        for (const item of coll) {
            const existing = this.get(item.id);
            if (!existing) {
                // Item does not exist locally. that means either it has been added remotely
                // or removed locally. Let's find out which...
                if (item.updated! > this.revision.date) {
                    // item has been added or updated after last merge so we'll keep it
                    // even if we may have deleted it locally
                    this._items.set(item.id, item);
                    changes.added.push(item);
                } else {
                    // othwerwise we assume we've removed it and drop it
                    forwardChanges.removed.push(item);
                }
            } else if (existing) {
                if (item.updated! > existing.updated!) {
                    // Remote item is more recent, use it
                    this._items.set(item.id, item);
                    changes.updated.push(item);
                } else if (item.updated! < existing.updated!) {
                    // Ours is more recent, keep ours
                    forwardChanges.updated.push(existing);
                }
            }
        }

        if (!forwardChanges.added.length && !forwardChanges.updated.length && !forwardChanges.removed.length) {
            // No changes occurred locally, so we'll just overwrite the revision with the remote one
            this.revision = coll.revision;
        } else {
            // We've made changes locally, so we need to updated the revision
            this.revision = { id: await uuid(), date: new Date(), mergedFrom: [this.revision.id, coll.revision.id] };
        }

        return changes;
    }

    toRaw() {
        return {
            revision: this.revision,
            items: Array.from(this)
        };
    }

    fromRaw(raw: any) {
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
