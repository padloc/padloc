import { Vault } from "@padloc/core/lib/vault.js";
import { FieldType, VaultItem } from "@padloc/core/lib/item.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app } from "../init.js";
import { element, html, query } from "./base.js";
import { Input } from "./input.js";
import { Select } from "./select.js";
import { Dialog } from "./dialog.js";

interface Template {
    fields: { name: string; type: FieldType }[];
    toString(): string;
}

const templates: Template[] = [
    {
        toString: () => $l("Web Account"),
        fields: [
            { name: $l("Username"), type: "username" },
            { name: $l("Password"), type: "password" },
            { name: $l("URL"), type: "url" }
        ]
    },
    {
        toString: () => $l("Login"),
        fields: [{ name: $l("Username"), type: "username" }, { name: $l("Password"), type: "password" }]
    },
    {
        toString: () => $l("Credit Card"),
        fields: [
            { name: $l("Card #"), type: "credit" },
            { name: $l("Card Owner"), type: "text" },
            { name: $l("Valid Until"), type: "month" },
            { name: $l("Security Code (CVC)"), type: "pin" },
            { name: $l("PIN"), type: "pin" }
        ]
    },
    {
        toString: () => $l("SIM Card"),
        fields: [
            { name: $l("Phone Number"), type: "phone" },
            { name: $l("PIN"), type: "pin" },
            { name: $l("PUK"), type: "pin" },
            { name: $l("Carrier"), type: "text" }
        ]
    },
    {
        toString: () => $l("Bank Account"),
        fields: [
            { name: $l("Account Owner"), type: "text" },
            { name: $l("IBAN"), type: "iban" },
            { name: $l("BIC"), type: "bic" },
            { name: $l("Card PIN"), type: "pin" }
        ]
    },
    {
        toString: () => $l("WIFI Password"),
        fields: [{ name: $l("Name"), type: "text" }, { name: $l("Password"), type: "password" }]
    },
    {
        toString: () => $l("Passport"),
        fields: [
            { name: $l("Full Name"), type: "text" },
            { name: $l("Number"), type: "text" },
            { name: $l("Country"), type: "text" },
            { name: $l("Birthdate"), type: "date" },
            { name: $l("Birthplace"), type: "text" },
            { name: $l("Issued On"), type: "date" },
            { name: $l("Expires"), type: "date" }
        ]
    },
    {
        toString: () => $l("Note"),
        fields: [{ name: $l("Note"), type: "note" }]
    },
    {
        toString: () => $l("Custom"),
        fields: []
    }
];

@element("pl-create-item-dialog")
export class CreateItemDialog extends Dialog<undefined, VaultItem> {
    @query("#nameInput")
    private _nameInput: Input;
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;
    @query("#templateSelect")
    private _templateSelect: Select<Template>;

    renderContent() {
        return html`
            <style>
                :host {
                    --gutter-size: 12px;
                }

                pl-input,
                pl-select {
                    text-align: center;
                    margin: var(--gutter-size);
                }

                h1 {
                    display: block;
                    text-align: center;
                }
            </style>

            <h1>${$l("Create Vault Item")}</h1>

            <pl-input id="nameInput" .label=${$l("Item Name")} @enter=${() => this._enter()}> </pl-input>

            <pl-select
                id="vaultSelect"
                .options=${app.vaults.filter(v => app.hasWritePermissions(v))}
                .label=${$l("Vault")}
            ></pl-select>

            <pl-select id="templateSelect" .options=${templates} .label=${$l("Item Type")}></pl-select>

            <div class="actions">
                <button @click=${() => this._enter()} class="primary tap">${$l("Create Item")}</button>

                <button @click=${() => this.dismiss()} class="tap">${$l("Cancel")}</button>
            </div>
        `;
    }

    private async _enter() {
        const template = this._templateSelect.selected;
        const item = await app.createItem(
            this._nameInput.value,
            this._vaultSelect.selected!,
            template.fields.map(f => ({ ...f, value: "" }))
        );
        this.done(item);
    }

    async show() {
        await this.updateComplete;
        this._nameInput.value = "";
        this._vaultSelect.selected = app.mainVault!;
        setTimeout(() => this._nameInput.focus(), 100);
        return super.show();
    }
}
