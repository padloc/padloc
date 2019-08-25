import { Serializable } from "./encoding";

export interface CollectionItem {
    id: string;
    updated?: Date;
}

export interface CollectionChanges<T> {
    added: T[];
    updated: T[];
    removed: T[];
}

/**
 * A collection of items, used for consolidating changes made independently
 * across multiple instances through "merging".
 */
export class Collection<T extends CollectionItem> extends Serializable implements Iterable<T> {
    /** Time of last merge, essential for merging logic */
    lastMerged: Date = new Date(0);

    /** Number of items in this Collection */
    get size() {
        return this._items.size;
    }

    private _items: Map<string, T>;

    constructor(items: T[] = []) {
        super();
        this._items = new Map(items.map(item => [item.id, item] as [string, T]));
    }

    /** Get an item with a given `id` */
    get(id: string) {
        return this._items.get(id) || null;
    }

    /**
     * Updates one or more items based on their id. If no item with the same id
     * exists, the item will be added to the collection
     */
    update(...items: T[]) {
        for (const item of items) {
            item.updated = new Date();
            this._items.set(item.id, item);
        }
    }

    /**
     * Removes one or more items based on their id.
     */
    remove(...items: T[]) {
        for (const item of items) {
            this._items.delete(item.id);
        }
    }

    /**
     * Merges in changes from another [[Collection]] instance.
     */
    merge(coll: Collection<T>) {
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
                if (item.updated! <= this.lastMerged) {
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
                if (item.updated! > this.lastMerged) {
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
            // No changes occurred locally, so we'll just overwrite the lastMerged date with the remote one
            this.lastMerged = coll.lastMerged;
        } else {
            // We've made changes locally, so we need to update the lastMerged property
            this.lastMerged = new Date();
        }

        return changes;
    }

    toRaw() {
        return {
            lastMerged: this.lastMerged,
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
        this.lastMerged = new Date(raw.lastMerged);
        return this;
    }

    [Symbol.iterator]() {
        return this._items.values();
    }
}
