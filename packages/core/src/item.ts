import { translate as $l } from "@padloc/locale/src/translate";
import { base32ToBytes, Serializable, AsSerializable, AsDate } from "./encoding";
import { totp } from "./otp";
import { uuid } from "./util";
import { AccountID } from "./account";
import { AttachmentInfo } from "./attachment";
import { openExternalUrl } from "./platform";
import { add } from "date-fns";

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
    Text = "text",
}

/**
 * Field definition containing meta data for a certain field type
 */
export interface FieldDef {
    /** content type */
    type: FieldType;
    /** regular expression describing pattern of field contents (used for validation) */
    pattern: RegExp;
    /** regular expression describing pattern of field contents (used for matching) */
    matchPattern: RegExp;
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
    actions?: { icon: string; label: string; action: (value: string) => void }[];
}

/** Available field types and respective meta data (order matters for pattern matching) */
export const FIELD_DEFS: { [t in FieldType]: FieldDef } = {
    [FieldType.Username]: {
        type: FieldType.Username,
        pattern: /.*/,
        matchPattern: /.*/,
        mask: false,
        multiline: false,
        icon: "user",
        get name() {
            return $l("Username");
        },
    },
    [FieldType.Password]: {
        type: FieldType.Password,
        pattern: /.*/,
        matchPattern: /.*/,
        mask: true,
        multiline: true,
        icon: "lock",
        get name() {
            return $l("Password");
        },
        format(value, masked) {
            return masked ? value.replace(/./g, "\u2022") : value;
        },
    },
    [FieldType.Email]: {
        type: FieldType.Email,
        pattern: /(.*)@(.*)/,
        matchPattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,8}$/,
        mask: false,
        multiline: false,
        icon: "email",
        get name() {
            return $l("Email Address");
        },
    },
    [FieldType.Url]: {
        type: FieldType.Url,
        pattern: /.*/,
        matchPattern: /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,8}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i,
        mask: false,
        multiline: false,
        icon: "web",
        get name() {
            return $l("URL");
        },
        actions: [
            {
                icon: "web",
                label: $l("Open"),
                action: (value: string) => openExternalUrl(value.startsWith("http") ? value : `https://${value}`),
            },
        ],
    },
    [FieldType.Date]: {
        type: FieldType.Date,
        pattern: /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/,
        matchPattern: /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/,
        mask: false,
        multiline: false,
        icon: "date",
        get name() {
            return $l("Date");
        },
        format(value) {
            return new Date(value).toLocaleDateString();
        },
    },
    [FieldType.Month]: {
        type: FieldType.Month,
        pattern: /^\d{4}-(0[1-9]|1[012])$/,
        matchPattern: /^\d{4}-(0[1-9]|1[012])$/,
        mask: false,
        multiline: false,
        icon: "month",
        get name() {
            return $l("Month");
        },
    },
    [FieldType.Credit]: {
        type: FieldType.Credit,
        pattern: /.*/,
        matchPattern: /^\d{16}/,
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
        },
    },
    [FieldType.Phone]: {
        type: FieldType.Phone,
        pattern: /.*/,
        matchPattern: /\d+/,
        mask: false,
        multiline: false,
        icon: "phone",
        get name() {
            return $l("Phone Number");
        },
    },
    [FieldType.Pin]: {
        type: FieldType.Pin,
        pattern: /.*/,
        matchPattern: /\d+/,
        mask: true,
        multiline: false,
        icon: "lock",
        get name() {
            return $l("PIN");
        },
        format(value, masked) {
            return masked ? value.replace(/./g, "\u2022") : value;
        },
    },
    [FieldType.Text]: {
        type: FieldType.Text,
        pattern: /.*/,
        matchPattern: /.*/,
        mask: false,
        multiline: true,
        icon: "text",
        get name() {
            return $l("Plain Text");
        },
    },
    [FieldType.Note]: {
        type: FieldType.Note,
        pattern: /.*/,
        matchPattern: /(.*)(\n)?(.*)/,
        mask: false,
        multiline: true,
        icon: "note",
        get name() {
            return $l("Richtext / Markdown");
        },
        format(value: string) {
            return value.split("\n")[0] || "";
        },
    },
    [FieldType.Totp]: {
        type: FieldType.Totp,
        pattern: /^([A-Z2-7=]{8})+$/i,
        matchPattern: /^([A-Z2-7=]{8})+$/i,
        mask: false,
        multiline: false,
        icon: "totp",
        get name() {
            return $l("One-Time Password");
        },
        async transform(value: string) {
            return await totp(base32ToBytes(value));
        },
    },
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
        return FIELD_DEFS[this.type] || FIELD_DEFS[FieldType.Text];
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

export enum AuditType {
    WeakPassword = "weak_password",
    ReusedPassword = "reused_password",
    CompromisedPassword = "compromised_password",
    ExpiredItem = "expired_item",
}

export interface AuditResult {
    type: AuditType;
    fieldIndex: number;
}

export type ItemHistoryFieldsChangedOption = "name" | "vaultId" | "fields" | "tags";

export class ItemHistory extends Serializable {
    constructor(vals: Partial<ItemHistory> = {}) {
        super();
        Object.assign(this, vals);
    }

    date: Date = new Date();

    updatedBy: AccountID = "";

    fieldsChanged: ItemHistoryFieldsChangedOption[] = [];

    name: string = "";

    vaultId?: string = undefined;

    @AsSerializable(Field)
    fields: Field[] = [];

    tags: Tag[] = [];
}

export const ITEM_HISTORY_ENTRIES_LIMIT = 10;

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

    /** icon to be displayed for this item */
    icon?: string = undefined;

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

    auditResults: AuditResult[] = [];

    @AsDate()
    lastAudited?: Date = undefined;

    /** Number of days after which the item expires */
    expiresAfter?: number = undefined;

    /** Expiration date, calculated based on [[updated]] and [[expiresAfter]] properties */
    get expiresAt() {
        if (!this.expiresAfter) {
            return undefined;
        }

        return add(this.updated, { days: this.expiresAfter });
    }

    /** item history (first is the most recent change) */
    @AsSerializable(ItemHistory)
    history: ItemHistory[] = [];
}

/** Creates a new vault item */
export async function createVaultItem({
    name = "Unnamed",
    fields = [],
    tags = [],
    icon,
}: Partial<VaultItem>): Promise<VaultItem> {
    return new VaultItem({
        name,
        fields,
        tags,
        icon,
        id: await uuid(),
    });
}

/** Guesses the most appropriate field type based on field name and value */
export function guessFieldType({
    name,
    value = "",
    masked = false,
}: {
    name: string;
    value?: string;
    masked?: boolean;
}): FieldType {
    if (masked) {
        return FieldType.Password;
    }

    const matchedTypeByName = Object.keys(FIELD_DEFS).filter((fieldType) =>
        new RegExp(fieldType, "i").test(name)
    )[0] as FieldType;

    if (matchedTypeByName) {
        return matchedTypeByName;
    }

    // We skip some because they can match anything, and are only really valuable when matched by name
    const fieldTypesToSkipByValue = [FieldType.Username, FieldType.Password];

    const matchedTypeByValue = Object.keys(FIELD_DEFS)
        // @ts-ignore this is a string, deal with it, TypeScript (can't `as` as well)
        .filter((fieldType) => !fieldTypesToSkipByValue.includes(fieldType))
        .filter((fieldType) => FIELD_DEFS[fieldType].matchPattern.test(value))[0] as FieldType;

    if (value !== "" && matchedTypeByValue) {
        return matchedTypeByValue;
    }

    return FieldType.Text;
}

export interface ItemTemplate {
    name?: string;
    fields: { name: string; value?: string; type: FieldType }[];
    icon: string;
    iconSrc?: string;
    toString(): string;
    subTitle?: string;
    attachment?: boolean;
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
    {
        toString: () => $l("Website / App"),
        icon: "web",
        fields: [
            {
                get name() {
                    return $l("Username");
                },
                type: FieldType.Username,
            },
            {
                get name() {
                    return $l("Password");
                },
                type: FieldType.Password,
            },
            {
                get name() {
                    return $l("URL");
                },
                type: FieldType.Url,
            },
        ],
    },
    {
        toString: () => $l("Computer"),
        icon: "desktop",
        fields: [
            {
                get name() {
                    return $l("Username");
                },
                type: FieldType.Username,
            },
            {
                get name() {
                    return $l("Password");
                },
                type: FieldType.Password,
            },
        ],
    },
    {
        toString: () => $l("Credit Card"),
        icon: "credit",
        fields: [
            {
                get name() {
                    return $l("Card Number");
                },
                type: FieldType.Credit,
            },
            {
                get name() {
                    return $l("Card Owner");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("Valid Until");
                },
                type: FieldType.Month,
            },
            {
                get name() {
                    return $l("CVC");
                },
                type: FieldType.Pin,
            },
            {
                get name() {
                    return $l("PIN");
                },
                type: FieldType.Pin,
            },
        ],
    },
    {
        toString: () => $l("Bank Account"),
        icon: "bank",
        fields: [
            {
                get name() {
                    return $l("Account Owner");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("IBAN");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("BIC");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("Card PIN");
                },
                type: FieldType.Pin,
            },
        ],
    },
    {
        toString: () => $l("WIFI Password"),
        icon: "wifi",
        fields: [
            {
                get name() {
                    return $l("Name");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("Password");
                },
                type: FieldType.Password,
            },
        ],
    },
    {
        toString: () => $l("Passport"),
        icon: "passport",
        fields: [
            {
                get name() {
                    return $l("Full Name");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("Passport Number");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("Country");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("Birthdate");
                },
                type: FieldType.Date,
            },
            {
                get name() {
                    return $l("Birthplace");
                },
                type: FieldType.Text,
            },
            {
                get name() {
                    return $l("Issued On");
                },
                type: FieldType.Date,
            },
            {
                get name() {
                    return $l("Expires");
                },
                type: FieldType.Date,
            },
        ],
    },
    {
        toString: () => $l("Note"),
        icon: "note",
        fields: [
            {
                get name() {
                    return $l("Note");
                },
                type: FieldType.Note,
            },
        ],
    },
    {
        toString: () => $l("Authenticator"),
        icon: "totp",
        fields: [
            {
                get name() {
                    return $l("One-Time Password");
                },
                type: FieldType.Totp,
            },
        ],
    },
    {
        toString: () => $l("Document"),
        icon: "attachment",
        fields: [],
        attachment: true,
    },
    {
        toString: () => $l("Custom"),
        icon: "custom",
        fields: [],
    },
];
