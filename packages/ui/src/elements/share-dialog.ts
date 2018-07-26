import { Record, SharedStore } from "@padlock/core/lib/data.js";
import { PublicAccount } from "@padlock/core/lib/auth.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import sharedStyles from "../styles/shared.js";
import { confirm, prompt, choose, getDialog } from "../dialog.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import "./loading-button.js";
import "./account-dialog.js";

@element("pl-share-dialog")
export class ShareDialog extends BaseElement {
    @property() record: Record | null = null;

    @query("pl-dialog") private _dialog: Dialog;

    private _resolve: (() => void) | null;

    _shouldRender() {
        return !!this.record;
    }

    _render({ record }: this) {
        const trusted = app.mainStore.trustedAccounts;
        return html`
            <style>
                ${sharedStyles}

                .title {
                    padding: 10px 15px;
                    text-align: center;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
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

                .store {
                    display: flex;
                    align-items: center;
                    height: 80px;
                    padding: 0 15px;
                }

                .store > pl-icon {
                    width: 52px;
                    height: 50px;
                    font-size: 26px;
                    margin-right: 15px;
                }

                .store-info {
                    flex: 1;
                }

                .store-name {
                    font-weight: bold;
                    line-height: 30px;
                }

            </style>

            <pl-dialog>

                <div class="title">
                    <pl-icon icon="share"></pl-icon>
                    <div>${$l("Share '{0}' With...", record!.name)}</div>
                </div>

                ${app.sharedStores.map(
                    s => html`
                    <div class="store tap" on-click="${() => this._selectStore(s)}">

                        <pl-icon icon="group"></pl-icon>

                        <div class="store-info">

                            <div class="store-name">${s.name}</div>

                            <div class="stats">

                                <div class="stat">

                                    <pl-icon icon="group"></pl-icon>

                                    <div>${s.accessors.length}</div>

                                </div>

                                <div class="stat">

                                    <pl-icon icon="record"></pl-icon>

                                    <div>${s.records.length}</div>

                                </div>

                            </div>

                        </div>

                    </div>
                `
                )}

                <button class="tap" on-click="${() => this._createStore()}">${$l("Create New Group...")}</button>

            </pl-dialog>
        `;
    }

    async show(record: Record) {
        this.record = record;
        this.requestRender();
        await this.renderComplete;
        this._dialog.open = true;
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    private _done() {
        this._resolve && this._resolve();
        this._resolve = null;
        this._dialog.open = false;
    }

    async _selectStore(store: SharedStore) {
        this._dialog.open = false;
        const record = this.record!;
        const confirmed =
            store.accessors.length === 1 ||
            (await confirm(
                $l(
                    "Do you want to share '{0}' with {1} users in the '{2}' group?",
                    record.name,
                    (store.accessors.length - 1).toString(),
                    store.name
                ),
                $l("Share"),
                $l("Cancel"),
                { type: "question" }
            ));

        if (confirmed) {
            const { name, fields, tags } = record;
            await app.deleteRecords(app.mainStore, record);
            await app.createRecord(store, name, fields, tags);
            this._done();
        } else {
            this._dialog.open = true;
        }
    }

    async _createStore() {
        this._dialog.open = false;
        const storeName = await prompt($l("Please choose a name for the new group!"), {
            confirmLabel: $l("Create Group"),
            placeholder: $l("Enter Group Name (e.g.: 'Family')"),
            validate: async storeName => {
                if (!storeName) {
                    throw $l("Please enter a group name!");
                }
                return storeName;
            }
        });

        if (!storeName) {
            this._dialog.open = true;
            return;
        }

        const store = await app.createSharedStore(storeName);
        this._selectStore(store);
    }
}
