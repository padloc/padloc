import { Record } from "@padlock/core/lib/data.js";
import { Store } from "@padlock/core/lib/store.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import { shared } from "../styles";
import { confirm, prompt } from "../dialog.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import "./loading-button.js";
import "./account-dialog.js";

@element("pl-share-dialog")
export class ShareDialog extends BaseElement {
    @property() records: Record[] = [];

    @query("pl-dialog") private _dialog: Dialog;

    private _resolve: ((store: Store | null) => void) | null;

    _render({ records }: this) {
        const stores = app.stores.filter(s => s.isMember() && s.getPermissions().write);
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
                }

            </style>

            <pl-dialog on-dialog-dismiss="() => this._done()">

                <div class="title">
                    <pl-icon icon="share"></pl-icon>
                    <div>${
                        records.length === 1
                            ? $l("Share '{0}' With...", records[0].name)
                            : $l("Share {0} Items...", records.length.toString())
                    }</div>
                </div>

                ${stores.map(
                    s => html`
                    <div class="store tap" on-click="${() => this._selectStore(s)}">

                        <pl-icon icon="group"></pl-icon>

                        <div class="store-info">

                            <div class="store-name">${s.name}</div>

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

                <button class="tap" on-click="${() => this._createStore()}">${$l("Create New Group...")}</button>

            </pl-dialog>
        `;
    }

    async show(records: Record[]) {
        this.records = records;
        this.requestRender();
        await this.renderComplete;
        this._dialog.open = true;
        return new Promise<Store | null>(resolve => {
            this._resolve = resolve;
        });
    }

    private _done(store?: Store) {
        this._resolve && this._resolve(store || null);
        this._resolve = null;
        this._dialog.open = false;
    }

    async _selectStore(store: Store) {
        this._dialog.open = false;
        const confirmed =
            store.members.length === 1 ||
            (await confirm(
                store.collection.size === 1
                    ? $l("Do you want to share '{0}' with the '{1}' group?", this.records[0].name, store.name)
                    : $l("Do you want to share {0} items with the '{1}' group?"),
                $l("Share"),
                $l("Cancel"),
                { type: "question" }
            ));

        if (confirmed) {
            for (const record of this.records) {
                const { name, fields, tags } = record;
                await app.createRecord(name, store, fields, tags);
            }
            await app.deleteRecords(app.mainStore!, this.records);
            this._done(store);
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

        const store = await app.createStore(storeName);
        this._selectStore(store);
    }
}
