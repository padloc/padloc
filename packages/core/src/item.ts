import { translate as $l } from "@padloc/locale/src/translate";
import { base32ToBytes, Serializable, AsSerializable, AsDate } from "./encoding";
import { totp } from "./otp";
import { uuid } from "./util";
import { AccountID } from "./account";
import { AttachmentInfo } from "./attachment";

/** A tag that can be assigned to a [[VaultItem]] */
export type Tag = string;

/** Unique identifier for [[VaultItem]]s */
export type VaultItemID = string;

export enum FieldType {
    Username = "username",
    Password = "password",
    Url = "url",
    Email = "email",
    Date = "date",
    Month = "month",
    Credit = "credit",
    Phone = "phone",
    Pin = "pin",
    Totp = "totp",
    Note = "note",
    Text = "text"
}

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
    /** for values that need to be prepared before being copied / filled */
    transform?: (value: string) => Promise<string>;
}

/** Available field types and respective meta data */
export const FIELD_DEFS: { [t in FieldType]: FieldDef } = {
    [FieldType.Username]: {
        type: FieldType.Username,
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "user",
        get name() {
            return $l("Username");
        }
    },
    [FieldType.Password]: {
        type: FieldType.Password,
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
    [FieldType.Url]: {
        type: FieldType.Url,
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "web",
        get name() {
            return $l("URL");
        }
    },
    [FieldType.Email]: {
        type: FieldType.Email,
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "email",
        get name() {
            return $l("Email Address");
        }
    },
    [FieldType.Date]: {
        type: FieldType.Date,
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
    [FieldType.Month]: {
        type: FieldType.Month,
        pattern: "\\d\\d\\d\\d-\\d\\d",
        mask: false,
        multiline: false,
        icon: "month",
        get name() {
            return $l("Month");
        }
    },
    [FieldType.Credit]: {
        type: FieldType.Credit,
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
    [FieldType.Phone]: {
        type: FieldType.Phone,
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "phone",
        get name() {
            return $l("Phone Number");
        }
    },
    [FieldType.Pin]: {
        type: FieldType.Pin,
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
    [FieldType.Totp]: {
        type: FieldType.Totp,
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "totp",
        get name() {
            return $l("2FA Token");
        },
        async transform(value: string) {
            return await totp(base32ToBytes(value));
        }
    },
    [FieldType.Note]: {
        type: FieldType.Note,
        pattern: ".*",
        mask: false,
        multiline: true,
        icon: "note",
        get name() {
            return $l("Note");
        }
    },
    [FieldType.Text]: {
        type: FieldType.Text,
        pattern: ".*",
        mask: false,
        multiline: false,
        icon: "text",
        get name() {
            return $l("Other");
        }
    }
};

export class Field extends Serializable {
    constructor(vals: Partial<Field> = {}) {
        super();
        Object.assign(this, vals);
    }

    /**
     * field type, determining meta data via the corresponding field definition
     * in [[FIELD_DEFS]]
     */
    type: FieldType = FieldType.Text;
    /** field name */
    name: string = "";
    /** field content */
    value: string = "";

    get def(): FieldDef {
        return FIELD_DEFS[this.type];
    }

    get icon() {
        return this.def.icon;
    }

    async transform() {
        return this.def.transform ? await this.def.transform(this.value) : this.value;
    }

    format(masked: boolean) {
        return this.def.format ? this.def.format(this.value, masked) : this.value;
    }

    protected _fromRaw(raw: any) {
        if (!raw.type) {
            raw.type = guessFieldType(raw);
        }
        return super._fromRaw(raw);
    }
}

/** Normalizes a tag value by removing invalid characters */
export function normalizeTag(tag: string): Tag {
    return tag.replace(",", "");
}

/** Represents an entry within a vault */
export class VaultItem extends Serializable {
    constructor(vals: Partial<VaultItem> = {}) {
        super();
        Object.assign(this, vals);
    }

    /** unique identfier */
    id: VaultItemID = "";

    /** item name */
    name: string = "";

    /** item fields */
    @AsSerializable(Field)
    fields: Field[] = [];

    /** array of tags assigned with this item */
    tags: Tag[] = [];

    /** Date and time of last update */
    @AsDate()
    updated: Date = new Date();

    /** [[Account]] the item was last updated by */
    updatedBy: AccountID = "";

    /**
     * @DEPRECATED
     * Accounts that have favorited this item
     */
    favorited: AccountID[] = [];

    /** attachments associated with this item */
    @AsSerializable(AttachmentInfo)
    attachments: AttachmentInfo[] = [];
}

/** Creates a new vault item */
export async function createVaultItem(name: string, fields: Field[] = [], tags: Tag[] = []): Promise<VaultItem> {
    return new VaultItem({
        name,
        fields,
        tags,
        id: await uuid()
    });
}

const matchUsername = /username/i;
const matchPassword = /password/i;
const matchUrl = /url/i;
const matchNote = /\n/;

/** Guesses the most appropriate field type based on field name and value */
export function guessFieldType({ name = "", value = "", masked }: any): FieldType {
    return masked || name.match(matchPassword)
        ? FieldType.Password
        : name.match(matchUsername)
        ? FieldType.Username
        : name.match(matchUrl)
        ? FieldType.Url
        : value.match(matchNote)
        ? FieldType.Note
        : FieldType.Text;
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
                type: FieldType.Username
            },
            {
                get name() {
                    return $l("Password");
                },
                type: FieldType.Password
            },
            {
                get name() {
                    return $l("URL");
                },
                type: FieldType.Url
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
                type: FieldType.Credit
            },
            {
                get name() {
                    return $l("Card Owner");
                },
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("Valid Until");
                },
                type: FieldType.Month
            },
            {
                get name() {
                    return $l("CVC");
                },
                type: FieldType.Pin
            },
            {
                get name() {
                    return $l("PIN");
                },
                type: FieldType.Pin
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
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("IBAN");
                },
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("BIC");
                },
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("Card PIN");
                },
                type: FieldType.Pin
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
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("Password");
                },
                type: FieldType.Password
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
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("Passport Number");
                },
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("Country");
                },
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("Birthdate");
                },
                type: FieldType.Date
            },
            {
                get name() {
                    return $l("Birthplace");
                },
                type: FieldType.Text
            },
            {
                get name() {
                    return $l("Issued On");
                },
                type: FieldType.Date
            },
            {
                get name() {
                    return $l("Expires");
                },
                type: FieldType.Date
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
                type: FieldType.Note
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
