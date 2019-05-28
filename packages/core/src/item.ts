import { uuid } from "./util";
import { Collection, CollectionItem } from "./collection";
import { AccountID } from "./account";
import { AttachmentInfo } from "./attachment";

/** A tag that can be assigned to a [[VaultItem]] */
export type Tag = string;

/** Unique identifier for [[VaultItem]]s */
export type VaultItemID = string;

export type FieldType =
    | "username"
    | "password"
    | "url"
    | "email"
    | "date"
    | "month"
    | "credit"
    | "iban"
    | "bic"
    | "phone"
    | "address"
    | "pin"
    | "totp"
    | "note"
    | "text";

/**
 * Field definition containing meta data for a certain field type
 */
export interface FieldDef {
    /** content type */
    type: FieldType;
    /** regular expression describing pattern of field contents */
    pattern: string;
    /** whether the field should be masked when displayed */
    mask: boolean;
    /** whether the field value can have multiple lines */
    multiline: boolean;
    /** display name */
    toString(): string;
}

/** Available field types and respective meta data */
export const FIELD_DEFS: { [t in FieldType]: FieldDef } = {
    username: {
        type: "username",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "username"
    },
    password: {
        type: "password",
        pattern: ".*",
        mask: true,
        multiline: false,
        toString: () => "password"
    },
    url: {
        type: "url",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "URL"
    },
    email: {
        type: "email",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "email"
    },
    date: {
        type: "date",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "date"
    },
    month: {
        type: "month",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "month"
    },
    credit: {
        type: "credit",
        pattern: "d*",
        mask: true,
        multiline: false,
        toString: () => "credit card #"
    },
    iban: {
        type: "iban",
        pattern: ".*",
        mask: true,
        multiline: false,
        toString: () => "IBAN"
    },
    bic: {
        type: "bic",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "BIC"
    },
    phone: {
        type: "phone",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "phone #"
    },
    pin: {
        type: "pin",
        pattern: "d*",
        mask: true,
        multiline: false,
        toString: () => "PIN"
    },
    address: {
        type: "address",
        pattern: ".*",
        mask: false,
        multiline: true,
        toString: () => "address"
    },
    note: {
        type: "note",
        pattern: ".*",
        mask: false,
        multiline: true,
        toString: () => "note"
    },
    text: {
        type: "text",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "text"
    },
    totp: {
        type: "totp",
        pattern: ".*",
        mask: false,
        multiline: false,
        toString: () => "totp"
    }
};

export interface Field {
    /** field name */
    name: string;
    /** field content */
    value: string;
    /**
     * field type, determining meta data via the corresponding field definition
     * in [[FIELD_DEFS]]
     */
    type: FieldType;
}

/** Normalizes a tag value by removing invalid characters */
export function normalizeTag(tag: string): Tag {
    return tag.replace(",", "");
}

/** Represents an entry within a vault */
export interface VaultItem extends CollectionItem {
    /** unique identfier */
    id: VaultItemID;
    /** item name */
    name: string;
    /** item fields */
    fields: Field[];
    /** array of tags assigned with this item */
    tags: Tag[];
    /** [[Account]] the item was last updated by */
    updatedBy: AccountID;
    /** Last time the item was interacted with */
    lastUsed: Date;
    /** attachments associated with this item */
    attachments: AttachmentInfo[];
}

/** Creates a new vault item */
export async function createVaultItem(name: string, fields?: Field[], tags?: Tag[]): Promise<VaultItem> {
    return {
        id: await uuid(),
        name: name,
        fields: fields || [],
        tags: tags || [],
        updated: new Date(),
        updatedBy: "",
        lastUsed: new Date(),
        attachments: []
    };
}

const matchUsername = /username/i;
const matchPassword = /password/i;
const matchUrl = /url/i;
const matchNote = /\n/;

/** Guesses the most appropriate field type based on field name and value */
export function guessFieldType(field: any): FieldType {
    return field.masked || field.name.match(matchPassword)
        ? "password"
        : field.name.match(matchUsername)
        ? "username"
        : field.name.match(matchUrl)
        ? "url"
        : field.value.match(matchNote)
        ? "note"
        : "text";
}

/** A collection of [[VaultItem]]s */
export class VaultItemCollection extends Collection<VaultItem> {
    /** Aggregated list of tags assigned to the items in this collection */
    get tags(): string[] {
        const tags = new Set<string>();
        for (const r of this) {
            for (const t of r.tags) {
                tags.add(t);
            }
        }
        return [...tags];
    }

    fromRaw(raw: any) {
        return super.fromRaw({
            ...raw,
            items: raw.items.map((item: any) => {
                return {
                    ...item,
                    lastUsed: new Date(item.lastUsed),
                    attachments: item.attachments || [],
                    fields: item.fields.map((field: any) => ({
                        ...field,
                        type: field.type || guessFieldType(field)
                    }))
                };
            })
        });
    }
}
