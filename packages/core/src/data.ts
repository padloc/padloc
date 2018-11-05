import { Collection, CollectionItem } from "./collection";
import { AccountID } from "./auth";
import { uuid } from "./util";

export type Tag = string;
export type ItemID = string;

export interface Field {
    name: string;
    value: string;
    masked?: boolean;
}

export function normalizeTag(tag: string): Tag {
    return tag.replace(",", "");
}

export interface VaultItem extends CollectionItem {
    id: ItemID;
    name: string;
    fields: Field[];
    tags: Tag[];
    updatedBy: AccountID;
    lastUsed: Date;
}

export function createVaultItem(name: string, fields?: Field[], tags?: Tag[]): VaultItem {
    return {
        id: uuid(),
        name: name,
        fields: fields || [],
        tags: tags || [],
        updated: new Date(),
        updatedBy: "",
        lastUsed: new Date()
    };
}

export class VaultItemCollection extends Collection<VaultItem> {
    get tags(): string[] {
        const tags = new Set<string>();
        for (const r of this) {
            for (const t of r.tags) {
                tags.add(t);
            }
        }
        return [...tags];
    }

    deserialize(raw: any) {
        return super.deserialize({
            ...raw,
            items: raw.items.map((item: any) => {
                return { ...item, lastUsed: new Date(item.lastUsed) };
            })
        });
    }
}
