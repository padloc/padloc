import { uuid } from "./util";
import { Collection, CollectionItem } from "./collection";
import { AccountID } from "./account";
import { AttachmentInfo } from "./attachment";

export type Tag = string;
export type ItemID = string;

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
    | "note"
    | "text";

export interface FieldDef {
    type: FieldType;
    pattern: string;
    mask: boolean;
    multiline: boolean;
    toString(): string;
}

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
    }
};

export interface Field {
    name: string;
    value: string;
    type: FieldType;
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
    attachments: AttachmentInfo[];
}

export function createVaultItem(name: string, fields?: Field[], tags?: Tag[]): VaultItem {
    return {
        id: uuid(),
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
// TODO: We can probably do a lot better
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
