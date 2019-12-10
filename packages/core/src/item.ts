import { translate as $l } from "@padloc/locale/src/translate";
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
    | "phone"
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
    /** icon used for display */
    icon: string;
    /** display name */
    name: string;
    /** display formatting */
    format?: (value: string, masked: boolean) => string;
}

/** Available field types and respective meta data */
export const FIELD_DEFS: { [t in FieldType]: FieldDef } = {
    username: {
        type: "username",
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "user",
        get name() {
            return $l("Username");
        }
    },
    password: {
        type: "password",
        pattern: ".*",
        mask: true,
        multiline: true,
        icon: "lock",
        get name() {
            return $l("Password");
        },
        format(value, masked) {
            return masked ? value.replace(/./g, "\u2022") : value;
        }
    },
    url: {
        type: "url",
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "web",
        get name() {
            return $l("URL");
        }
    },
    email: {
        type: "email",
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "email",
        get name() {
            return $l("Email Address");
        }
    },
    date: {
        type: "date",
        pattern: "\\d\\d\\d\\d-\\d\\d-\\d\\d",
        mask: false,
        multiline: false,
        icon: "date",
        get name() {
            return $l("Date");
        },
        format(value) {
            return new Date(value).toLocaleDateString();
        }
    },
    month: {
        type: "month",
        pattern: "\\d\\d\\d\\d-\\d\\d",
        mask: false,
        multiline: false,
        icon: "month",
        get name() {
            return $l("Month");
        }
    },
    credit: {
        type: "credit",
        pattern: "\\d*",
        mask: true,
        multiline: false,
        icon: "credit",
        get name() {
            return $l("Credit Card Number");
        },
        format(value, masked) {
            const parts = [];

            for (let i = 0; i < value.length; i += 4) {
                const part = value.slice(i, i + 4);
                parts.push(masked && i < value.length - 4 ? part.replace(/./g, "\u2022") : part);
            }

            return parts.join(" ");
        }
    },
    phone: {
        type: "phone",
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "phone",
        get name() {
            return $l("Phone Number");
        }
    },
    pin: {
        type: "pin",
        pattern: "\\d*",
        mask: true,
        multiline: false,
        icon: "lock",
        get name() {
            return $l("PIN");
        },
        format(value, masked) {
            return masked ? value.replace(/./g, "\u2022") : value;
        }
    },
    totp: {
        type: "totp",
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "totp",
        get name() {
            return $l("Two-Factor Token");
        }
    },
    note: {
        type: "note",
        pattern: ".*",
        mask: false,
        multiline: true,
        icon: "note",
        get name() {
            return $l("Note");
        }
    },
    text: {
        type: "text",
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "text",
        get name() {
            return $l("Other");
        }
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
    /** Accounts that have favorited this item */
    favorited: AccountID[];
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
        lastUsed: new Date(0),
        attachments: [],
        favorited: []
    };
}

const matchUsername = /username/i;
const matchPassword = /password/i;
const matchUrl = /url/i;
const matchNote = /\n/;

/** Guesses the most appropriate field type based on field name and value */
export function guessFieldType({ name = "", value = "", masked }: any): FieldType {
    return masked || name.match(matchPassword)
        ? "password"
        : name.match(matchUsername)
        ? "username"
        : name.match(matchUrl)
        ? "url"
        : value.match(matchNote)
        ? "note"
        : "text";
}

export interface ItemTemplate {
    fields: { name: string; type: FieldType }[];
    icon: string;
    toString(): string;
    attachment?: boolean;
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
    {
        toString: () => $l("Login"),
        icon: "login",
        fields: [
            {
                get name() {
                    return $l("Username");
                },
                type: "username"
            },
            {
                get name() {
                    return $l("Password");
                },
                type: "password"
            },
            {
                get name() {
                    return $l("URL");
                },
                type: "url"
            }
        ]
    },
    {
        toString: () => $l("Credit Card"),
        icon: "credit",
        fields: [
            {
                get name() {
                    return $l("Card Number");
                },
                type: "credit"
            },
            {
                get name() {
                    return $l("Card Owner");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("Valid Until");
                },
                type: "month"
            },
            {
                get name() {
                    return $l("CVC");
                },
                type: "pin"
            },
            {
                get name() {
                    return $l("PIN");
                },
                type: "pin"
            }
        ]
    },
    {
        toString: () => $l("Bank Account"),
        icon: "bank",
        fields: [
            {
                get name() {
                    return $l("Account Owner");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("IBAN");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("BIC");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("Card PIN");
                },
                type: "pin"
            }
        ]
    },
    {
        toString: () => $l("WIFI Password"),
        icon: "wifi",
        fields: [
            {
                get name() {
                    return $l("Name");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("Password");
                },
                type: "password"
            }
        ]
    },
    {
        toString: () => $l("Passport"),
        icon: "passport",
        fields: [
            {
                get name() {
                    return $l("Full Name");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("Passport Number");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("Country");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("Birthdate");
                },
                type: "date"
            },
            {
                get name() {
                    return $l("Birthplace");
                },
                type: "text"
            },
            {
                get name() {
                    return $l("Issued On");
                },
                type: "date"
            },
            {
                get name() {
                    return $l("Expires");
                },
                type: "date"
            }
        ]
    },
    {
        toString: () => $l("Note"),
        icon: "note",
        fields: [
            {
                get name() {
                    return $l("Note");
                },
                type: "note"
            }
        ]
    },
    {
        toString: () => $l("Document"),
        icon: "attachment",
        fields: [],
        attachment: true
    },
    {
        toString: () => $l("Custom"),
        icon: "custom",
        fields: []
    }
];

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
                    fields: item.fields.map(({ name = "", value = "", masked, type }: any) => ({
                        name: name,
                        value: value,
                        type: type || guessFieldType({ name, value, masked })
                    }))
                };
            })
        });
    }
}
