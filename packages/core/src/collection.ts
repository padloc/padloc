import { Serializable } from "./encoding";

export interface CollectionItem {
    id: string;
    updated?: Date;
}

/**
 * A collection of items, used for consolidating changes made independently
 * across multiple instances through "merging".
 */
export class Collection<T extends CollectionItem> extends Serializable implements Iterable<T> {
    /** Number of items in this Collection */
    get size() {
        return this._items.size;
    }

    get hasChanges() {
        return !!this._changes.size;
    }

    private _items: Map<string, T>;
    private _changes = new Map<string, Date>();

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
            this._changes.set(item.id, item.updated);
        }
    }

    /**
     * Removes one or more items based on their id.
     */
    remove(...items: T[]) {
        for (const item of items) {
            this._items.delete(item.id);
            this._changes.set(item.id, new Date());
        }
    }

    /**
     * Merges in changes from another [[Collection]] instance.
     */
    merge(coll: Collection<T>) {
        // Delete any items from this collection that don't
        // exist in the other collection and haven't been changed recently
        for (const item of this) {
            if (!this._changes.has(item.id) && !coll.get(item.id)) {
                this._items.delete(item.id);
            }
        }

        // Get changes items from other collection (but only if they haven't recently changed locally)
        for (const item of coll) {
            if (!this._changes.has(item.id)) {
                this._items.set(item.id, item);
            }
        }
    }

    clearChanges(before?: Date) {
        for (const [id, changed] of this._changes.entries()) {
            if (!before || changed <= before) {
                this._changes.delete(id);
            }
        }
    }

    toRaw() {
        return {
            items: Array.from(this),
            changes: [...this._changes]
        };
    }

    fromRaw(raw: any) {
        for (const item of raw.items) {
            if (!(item.updated instanceof Date)) {
                item.updated = new Date(item.updated);
            }
        }
        this._items = new Map(raw.items.map((item: any) => [item.id, item] as [string, T]));
        this._changes = new Map<string, Date>(
            raw.changes && raw.changes.map(([id, date]: [string, string]) => [id, new Date(date)])
        );
        return this;
    }

    [Symbol.iterator]() {
        return this._items.values();
    }
}
