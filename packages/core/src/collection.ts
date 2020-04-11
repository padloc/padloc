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
    changed = new Set<string>();

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
            this.changed.add(item.id);
        }
    }

    /**
     * Removes one or more items based on their id.
     */
    remove(...items: T[]) {
        for (const item of items) {
            this._items.delete(item.id);
            this.changed.add(item.id);
        }
    }

    /**
     * Merges in changes from another [[Collection]] instance.
     */
    merge(coll: Collection<T>) {
        // Delete any items from this collection that don't
        // exist in the other collection and haven't been changed recently
        for (const item of this) {
            if (!this.changed.has(item.id) && !coll.get(item.id)) {
                console.log("can't find item. deleting...");
                this._items.delete(item.id);
            }
        }

        // Get changes items from other collection (but only if they haven't recently changed locally)
        for (const item of coll) {
            if (!this.changed.has(item.id)) {
                this._items.set(item.id, item);
            }
        }
    }

    toRaw() {
        return {
            items: Array.from(this),
            changed: [...this.changed]
        };
    }

    fromRaw(raw: any) {
        for (const item of raw.items) {
            if (!(item.updated instanceof Date)) {
                item.updated = new Date(item.updated);
            }
        }
        this._items = new Map(raw.items.map((item: any) => [item.id, item] as [string, T]));
        this.changed = new Set<string>(raw.changed);
        return this;
    }

    [Symbol.iterator]() {
        return this._items.values();
    }
}
