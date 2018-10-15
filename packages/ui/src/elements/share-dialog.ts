import { Record } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { confirm, prompt } from "../dialog.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import "./loading-button.js";
import "./account-dialog.js";

@element("pl-share-dialog")
export class ShareDialog extends BaseElement {
    @property() records: Record[] = [];

    @query("pl-dialog") private _dialog: Dialog;

    private _resolve: ((vault: Vault | null) => void) | null;

    render() {
        const { records } = this;
        const vaults = app.vaults.filter(s => s.isMember() && s.getPermissions().write);
        return html`
            ${shared}

            <style>

                .title {
                    padding: 10px 15px;
                    text-align: center;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    ${mixins.gradientHighlight()}
                    text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                    color: var(--color-tertiary);
                }

                pl-dialog > * {
                    --color-background: var(--color-tertiary);
                    --color-foreground: var(--color-secondary);
                    background: var(--color-background);
                    color: var(--color-foreground);
                    text-shadow: none;
                }

                pl-dialog > :not(:last-child):not(.title) {
                    border-bottom: solid 1px var(--border-color);
                }

                .vault {
                    display: flex;
                    align-items: center;
                    height: 80px;
                    padding: 0 15px;
                }

                .vault > pl-icon {
                    width: 52px;
                    height: 50px;
                    font-size: 26px;
                    margin-right: 15px;
                }

                .vault-info {
                    flex: 1;
                }

                .vault-name {
                    font-weight: bold;
                }

            </style>

            <pl-dialog @dialog-dismiss=${() => this._done()}>

                <div class="title">
                    <pl-icon icon="share"></pl-icon>
                    <div>${
                        records.length === 1
                            ? $l("Share '{0}' With...", records[0].name)
                            : $l("Share {0} Items...", records.length.toString())
                    }</div>
                </div>

                ${vaults.map(
                    s => html`
                    <div class="vault tap" @click=${() => this._selectVault(s)}>

                        <pl-icon icon="group"></pl-icon>

                        <div class="vault-info">

                            <div class="vault-name">${s.name}</div>

                            <div class="tags small">

                                <div class="tag">

                                    <pl-icon icon="group"></pl-icon>

                                    <div>${s.members.length}</div>

                                </div>

                                <div class="tag">

                                    <pl-icon icon="record"></pl-icon>

                                    <div>${s.collection.size}</div>

                                </div>

                            </div>

                        </div>

                    </div>
                `
                )}

                <button class="tap" @click=${() => this._createVault()}>${$l("Create New Group...")}</button>

            </pl-dialog>
        `;
    }

    async show(records: Record[]) {
        this.records = records;
        this.requestUpdate();
        await this.updateComplete;
        this._dialog.open = true;
        return new Promise<Vault | null>(resolve => {
            this._resolve = resolve;
        });
    }

    private _done(vault?: Vault) {
        this._resolve && this._resolve(vault || null);
        this._resolve = null;
        this._dialog.open = false;
    }

    async _selectVault(vault: Vault) {
        this._dialog.open = false;
        const confirmed =
            vault.members.length === 1 ||
            (await confirm(
                vault.collection.size === 1
                    ? $l("Do you want to share '{0}' with the '{1}' group?", this.records[0].name, vault.name)
                    : $l(
                          "Do you want to share {0} items with the '{1}' group?",
                          this.records.length.toString(),
                          vault.name
                      ),
                $l("Share"),
                $l("Cancel"),
                { type: "question" }
            ));

        if (confirmed) {
            for (const record of this.records) {
                const { name, fields, tags } = record;
                await app.createRecord(name, vault, fields, tags);
            }
            await app.deleteRecords(app.mainVault!, this.records);
            this._done(vault);
        } else {
            this._dialog.open = true;
        }
    }

    async _createVault() {
        this._dialog.open = false;
        const vaultName = await prompt($l("Please choose a name for the new group!"), {
            confirmLabel: $l("Create Group"),
            placeholder: $l("Enter Group Name (e.g.: 'Family')"),
            validate: async vaultName => {
                if (!vaultName) {
                    throw $l("Please enter a group name!");
                }
                return vaultName;
            }
        });

        if (!vaultName) {
            this._dialog.open = true;
            return;
        }

        const vault = await app.createVault(vaultName);
        this._selectVault(vault);
    }
}
